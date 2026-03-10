import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const chatPath = path.join(process.cwd(), 'js', 'chat.js');
const chatSource = fs.readFileSync(chatPath, 'utf8');

test('instant booking confirmation helper is defined', () => {
  assert.match(chatSource, /function triggerInstantBookingConfirmation\(\{ forceMessage = false \} = \{\}\) \{/);
  assert.match(chatSource, /showAppDownloadModal\(\);/);
  assert.match(chatSource, /Детали бронирования:/);
  assert.match(chatSource, /Бронирование подтверждено\./);
});

test('completion in extracted-data flow triggers instant confirmation rule', () => {
  assert.match(
    chatSource,
    /if \(bookingState\.step === 'completed' && previousStep !== 'completed'\) \{\s*triggerInstantBookingConfirmation\(\);\s*\}/s
  );
});

