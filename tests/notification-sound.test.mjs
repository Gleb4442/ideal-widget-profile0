import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = process.cwd();
const chatPath = path.join(repoRoot, 'js', 'chat.js');
const chatSource = fs.readFileSync(chatPath, 'utf8');

const MP3_SRC = './assets/sounds/telegram-like-message.mp3';
const WAV_SRC = './assets/sounds/telegram-like-message.wav';

function buildNotificationHarness({ rejectPlayFor = new Set() } = {}) {
  const sectionStart = chatSource.indexOf('// ===== NOTIFICATION SYSTEM =====');
  const sectionEnd = chatSource.indexOf('// Update notification badge with count');

  assert.notEqual(sectionStart, -1, 'notification section start not found');
  assert.notEqual(sectionEnd, -1, 'notification section end not found');

  class MockAudio {
    static __instances = [];

    constructor(src) {
      this.src = src;
      this.volume = 1;
      this.preload = 'metadata';
      this.currentTime = 0;
      this.playCalls = 0;
      this.loadCalls = 0;
      this.listeners = new Map();
      MockAudio.__instances.push(this);
    }

    addEventListener(type, callback, options = {}) {
      const existing = this.listeners.get(type) ?? [];
      existing.push({ callback, once: Boolean(options.once) });
      this.listeners.set(type, existing);
    }

    emit(type) {
      const existing = this.listeners.get(type) ?? [];
      if (existing.length === 0) return;

      const keep = [];
      for (const entry of existing) {
        entry.callback();
        if (!entry.once) keep.push(entry);
      }
      this.listeners.set(type, keep);
    }

    load() {
      this.loadCalls += 1;
    }

    play() {
      this.playCalls += 1;
      if (rejectPlayFor.has(this.src)) {
        return Promise.reject(new Error(`play rejected for ${this.src}`));
      }
      return Promise.resolve();
    }
  }

  const sourceSlice = chatSource.slice(sectionStart, sectionEnd);
  const expose = `
globalThis.__notificationTest = {
  initNotificationSound,
  playNotificationSound,
  notificationState,
  getInstances: () => Audio.__instances
};
`;

  const context = {
    Audio: MockAudio,
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    Promise
  };

  vm.createContext(context);
  vm.runInContext(`${sourceSlice}\n${expose}`, context, { filename: 'notification-sound-slice.js' });

  return context.__notificationTest;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test('notification sources and fallback constants are configured', () => {
  assert.match(
    chatSource,
    /const NOTIFICATION_SOUND_SRC = '\.\/assets\/sounds\/telegram-like-message\.mp3';/
  );
  assert.match(
    chatSource,
    /const NOTIFICATION_SOUND_WAV_FALLBACK_SRC = '\.\/assets\/sounds\/telegram-like-message\.wav';/
  );
  assert.match(chatSource, /audio\.preload = 'auto';/);
});

test('sound files exist in assets/sounds and are non-empty', () => {
  const mp3Path = path.join(repoRoot, 'assets', 'sounds', 'telegram-like-message.mp3');
  const wavPath = path.join(repoRoot, 'assets', 'sounds', 'telegram-like-message.wav');

  const mp3Stat = fs.statSync(mp3Path);
  const wavStat = fs.statSync(wavPath);

  assert.ok(mp3Stat.isFile(), 'mp3 file must exist');
  assert.ok(wavStat.isFile(), 'wav fallback file must exist');
  assert.ok(mp3Stat.size > 0, 'mp3 file must be non-empty');
  assert.ok(wavStat.size > 0, 'wav file must be non-empty');
});

test('init fallback: mp3 load error switches playback to wav', async () => {
  const harness = buildNotificationHarness();
  harness.initNotificationSound();

  const instances = harness.getInstances();
  const mp3 = instances.find((a) => a.src === MP3_SRC);
  const wav = instances.find((a) => a.src === WAV_SRC);

  assert.ok(mp3, 'mp3 audio instance should exist');
  assert.ok(wav, 'wav fallback instance should exist');
  assert.equal(mp3.preload, 'auto');
  assert.equal(wav.preload, 'auto');

  mp3.emit('error');
  await flushMicrotasks();

  assert.ok(wav.playCalls >= 1, 'wav should be replayed after mp3 load error');
});

test('playback fallback: mp3 play rejection switches to wav', async () => {
  const harness = buildNotificationHarness({ rejectPlayFor: new Set([MP3_SRC]) });
  harness.initNotificationSound();

  const instances = harness.getInstances();
  const mp3 = instances.find((a) => a.src === MP3_SRC);
  const wav = instances.find((a) => a.src === WAV_SRC);

  harness.playNotificationSound();
  await flushMicrotasks();

  assert.equal(mp3.playCalls, 1, 'mp3 should be attempted first');
  assert.ok(wav.playCalls >= 1, 'wav should be used after mp3 play rejection');
});

test('new-message notification trigger conditions remain unchanged', () => {
  assert.match(
    chatSource,
    /function handleNewMessageNotification\(sender\)\s*{[\s\S]*if \(sender !== 'ai'\) return;/
  );
  assert.match(chatSource, /if \(!isWidgetOpen \|\| !isTabVisible\) \{/);
  assert.match(chatSource, /\/\/ Play sound[\s\S]*playNotificationSound\(\);/);
});
