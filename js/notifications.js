/*
 * Notification System
 * Hilton Chat Widget
 */

import * as dom from './dom.js';

const NOTIFICATION_SETTINGS_KEY = 'chat_notification_settings';

let notificationState = {
  unreadCount: 0,
  soundEnabled: true,
  isTabVisible: true,
  isWidgetOpen: false
};

const NOTIFICATION_SOUND_SRC = './assets/sounds/received-message.caf';
const NOTIFICATION_SOUND_WAV_FALLBACK_SRC = './assets/sounds/received-message.wav';
const NOTIFICATION_SOUND_VOLUME = 0.5;

const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1gZGtyd3V0d3R0dnd3d3Z1c3BtaWViXVpYV1hZW11fYWNlZ2lrbG1tbm5tbGtqaGZjYV5bWFVSUE5NTE1OT1FSVFZYWlxeYGJkZWdoaWpqa2tqamlnZWNhXltYVVJPTEpIR0ZGRkdISUpMTlBSVFZYWVtcXV5fYGBhYWFgX15dW1lXVVJQTUtJR0VDQUA/Pj4+P0BCREdJTE5RU1VXWVpbXF1dXl5eXV1cW1lXVVNQTktIRkRBPzw6ODc2NjY3ODo8P0JFSEtOUVNVV1laW1xcXFxcW1pZV1VTUE1KRkNAPTo3NTIwLy4uLi8wMjU4O0BESExQU1ZYWltcXFxcW1pZV1VRUE1JRkI+Ojc0MC4rKSgnJygpKy4xNTo+Q0hMUFRXWltcXV1cW1pYVlNQTEhEQDw4NC8rKCUjISAgISIkJyovNDpAR0xSVllcXl9fXl1bWFVRTUlEPzo1MC0pJSIgHh0cHB0eICMnLDI5P0dOVVteYWNjY2FfXFhTTklDPTcxKyYiHx0bGRkZGhsdICQpLzY9RU5WWF1hZGVlY2BeWlVPS0Q9Ni8pIx8cGRcWFRUWFxkbHiImLDM7RE5WWF1iZWdnZmRhXFdRSkM8NC0mIR0aGBYVFBQUFRcZHCAkKjE4QEpTW2BiZmlqamdjXldQSUA4MCkjHhsYFhQTEhISExUXGh0iJyw0PEZQWWBkaWxub21pZF5XTkU8MysjHhoXFRMSEREREhQWGRwgJSsyOkRNV19lamtvcnJwbGVdVEpBOC8oIh4aFxUSERAPEBAREhUYHCAkKjE5Q0xWX2VrbnJzdnVybl9oXFJHPTQsJR8bFxQREA8ODg8QEhQXGyAmLTU+R1FaZGlwdHd5enl2c2xlW1BFOzIqIx0ZFhQREA4ODQ0OEBIUGBsgJi03QUpVXmhudnp9f4CBgIB9eXRqX1VLPzUtJh8aFhMQDg0MDAwODxMXGx8mLTVARE9YYWpxd3yAgYKCgYB9eXZwaGBWTEM6MikhHBgVEQ4NCwsMDQ8RFRkaHyUqLjY8Q0pRWF5iZ21wcnNzcnFua2ZgWlVQSUI6NC0oIh0aFhQRDw0MCwsNDg8RFhkdIS0xOz1ESFFYX2RnaWlqaWhoZmRgXFdTTkhCPTcxLCckIB0ZFhMRDw4NDAwNDxESFRkdIC0zPD9ERktRVVheYGFhYWBfXVtZVlNPTEhEPzs1MCwpJCAeGxgWExIQDg0MDQ4QExQYHCEqNDg/P0RHTEtOUFFSUlJRUU9NTElGQ0A8OTYyLCooIx4cGhcVExIQDw0NDQ4PERQWGRweIyowNzg8PERERU1PUFBQTk5MS0lGQ0A9Ojc0MC0pJiMfHBoYFhQTEhEQEBARERMVFxobHiElKi8zNjk8PkFDRUdISEdGRUNBPz06NzQxLiomIh8cGhcWFBMSEREQEBESExQWGBocHyIlKSwtMDI0NTY3ODk5OTg3NjQyMC4rKCYjIB4cGhgWFBMSEREREREREhMUFRcZGhwfISMlJyorLC0uLi4uLS0sKyooJyUjIR8eHBoZFxYVFBMSEhISEhITFBUWGBkaHB0fISIjJCUmJiYmJiUlJCMiIR8eHRsaGRgXFhUUFBMTExMTFBQVFhcYGRobHB0eHyAgISEhISEgIB8fHh0cGxoZGBcWFhUVFRQUFBQVFRYWFxgZGhobHB0dHh4eHx8fHx8eHh0dHBsaGRkYFxcWFhYVFRUVFhYWFxcYGRkKGhscHBwdHR0dHR0dHBwcGxsaGhkZGBgXFxcWFhYWFhYWFxcXGBgZGRoKGxsbGxwcHBwcHBwbGxsaGhoZGRkYGBgXFxcXFxcXFxcXFxgYGBkZGRoaGhsbGxsbGxsaGhoaGRkZGRkYGBgYGBcXFxcXFxcYGBgYGRkZGRoaGhoaGhoaGhoZGRkZGRkZGBgYGBgYGBgXFxcYGBgYGBkZGRkZGRkaGhoaGhoZGRkZGRkZGRkYGBgYGBgYGBgYGBgYGBkZGRkZGRkZGRoaGhoaGhkZGRkZGRkZGRkYGBgYGBgYGBgYGBgYGRkZGRkZGRkZGRkZGRoaGhkZGRkZGRkZGRkZGBgYGBgYGBgYGBgZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGBgYGBgYGBgZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZ';

let notificationAudio = null;
let notificationWavFallbackAudio = null;
let notificationBase64FallbackAudio = null;
let notificationSoundSource = 'base64';

function createNotificationAudio(src) {
  const audio = new Audio(src);
  audio.volume = NOTIFICATION_SOUND_VOLUME;
  audio.preload = 'auto';
  return audio;
}

function switchToBase64Fallback(reason) {
  if (!notificationBase64FallbackAudio) return false;
  notificationAudio = notificationBase64FallbackAudio;
  notificationSoundSource = 'base64';
  console.warn(`Notification sound fallback to base64: ${reason}`);
  return true;
}

function switchToWavFallback(reason) {
  if (!notificationWavFallbackAudio || notificationSoundSource !== 'primary') return false;
  notificationAudio = notificationWavFallbackAudio;
  notificationSoundSource = 'wav';
  console.warn(`Notification sound fallback to wav: ${reason}`);
  return true;
}

function tryReplayCurrentNotificationAudio(contextLabel) {
  if (!notificationAudio) return;
  try {
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch(e => {
      console.log(`Sound playback blocked (${contextLabel}):`, e);
    });
  } catch (e) {
    console.log(`Error replaying sound (${contextLabel}):`, e);
  }
}

function initNotificationSound() {
  try {
    notificationBase64FallbackAudio = createNotificationAudio(NOTIFICATION_SOUND_BASE64);
    notificationWavFallbackAudio = createNotificationAudio(NOTIFICATION_SOUND_WAV_FALLBACK_SRC);
    notificationAudio = createNotificationAudio(NOTIFICATION_SOUND_SRC);
    notificationSoundSource = 'primary';

    notificationAudio.addEventListener('error', () => {
      if (switchToWavFallback('primary sound failed to load')) {
        tryReplayCurrentNotificationAudio('wav fallback after primary load error');
      } else {
        switchToBase64Fallback('primary sound failed to load');
      }
    }, { once: true });

    notificationWavFallbackAudio.addEventListener('error', () => {
      switchToBase64Fallback('wav fallback failed to load');
    }, { once: true });

    notificationAudio.load();
    notificationWavFallbackAudio.load();
    notificationBase64FallbackAudio.load();
  } catch (e) {
    console.log('Could not initialize notification sound:', e);
    if (!switchToBase64Fallback('notification sound initialization failed')) {
      notificationAudio = null;
    }
  }
}

function loadNotificationSettings() {
  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      notificationState.soundEnabled = parsed.soundEnabled ?? true;
    }
  } catch (e) {
    console.error('Error loading notification settings:', e);
  }
}

function saveNotificationSettings() {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({
      soundEnabled: notificationState.soundEnabled
    }));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
}

function playNotificationSound() {
  if (!notificationState.soundEnabled || !notificationAudio) return;

  try {
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch(e => {
      if (notificationSoundSource === 'primary' && switchToWavFallback('primary playback error')) {
        tryReplayCurrentNotificationAudio('wav fallback after primary playback error');
        return;
      }
      if (notificationSoundSource !== 'base64' && switchToBase64Fallback('fallback playback error')) {
        tryReplayCurrentNotificationAudio('base64 fallback after playback error');
        return;
      }
      console.log('Sound playback blocked:', e);
    });
  } catch (e) {
    console.log('Error playing sound:', e);
  }
}

function updateSoundToggleUI(isEnabled) {
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const soundStatusText = document.getElementById('sound-status-text');

  if (soundIconOn) soundIconOn.classList.toggle('hidden', !isEnabled);
  if (soundIconOff) soundIconOff.classList.toggle('hidden', isEnabled);
  if (soundStatusText) soundStatusText.textContent = isEnabled ? 'Вкл' : 'Выкл';
}

function initVisibilityTracking() {
  document.addEventListener('visibilitychange', () => {
    notificationState.isTabVisible = !document.hidden;
    if (notificationState.isTabVisible && notificationState.isWidgetOpen) {
      resetUnreadCount();
      hideNewMessagesMarker();
    }
  });
}

// ── Public API ──

export function initNotificationSystem() {
  initNotificationSound();
  loadNotificationSettings();
  initVisibilityTracking();
  updateSoundToggleUI(notificationState.soundEnabled);
}

export function updateNotificationBadge(count) {
  if (!dom.notificationBadge) return;

  notificationState.unreadCount = count;

  if (count > 0) {
    dom.notificationBadge.textContent = count > 99 ? '99+' : count;
    dom.notificationBadge.style.display = 'flex';
    dom.notificationBadge.classList.add('has-notifications');
  } else {
    dom.notificationBadge.style.display = 'none';
    dom.notificationBadge.classList.remove('has-notifications');
  }
}

export function incrementUnreadCount() {
  notificationState.unreadCount++;
  updateNotificationBadge(notificationState.unreadCount);
}

export function resetUnreadCount() {
  notificationState.unreadCount = 0;
  updateNotificationBadge(0);
}

export function toggleNotificationSound() {
  notificationState.soundEnabled = !notificationState.soundEnabled;
  saveNotificationSettings();
  updateSoundToggleUI(notificationState.soundEnabled);
  return notificationState.soundEnabled;
}

export function showNewMessagesMarker() {
  const existingMarker = document.getElementById('new-messages-marker');
  if (existingMarker) return;

  const textarea = document.getElementById('message-input');
  if (textarea) {
    const minHeight = parseInt(getComputedStyle(textarea).minHeight) || 31;
    if (textarea.scrollHeight > minHeight + 5) return;
  }

  const marker = document.createElement('div');
  marker.id = 'new-messages-marker';
  marker.className = 'new-messages-marker animate-fade-in';
  marker.innerHTML = `
    <div class="marker-content">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
      <span>Нові повідомлення</span>
    </div>
  `;

  marker.addEventListener('click', () => {
    dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
    hideNewMessagesMarker();
  });

  dom.messagesContainer.appendChild(marker);
}

export function hideNewMessagesMarker() {
  const marker = document.getElementById('new-messages-marker');
  if (marker) marker.remove();
}

export function handleNewMessageNotification(sender) {
  if (sender !== 'ai') return;

  const isWidgetOpen = dom.chatWindow?.classList.contains('open');
  const isTabVisible = !document.hidden;

  notificationState.isWidgetOpen = isWidgetOpen;

  if (!isWidgetOpen || !isTabVisible) {
    incrementUnreadCount();
    playNotificationSound();

    if (isWidgetOpen && !isTabVisible) {
      showNewMessagesMarker();
    }
  }
}

export function setWidgetOpen(isOpen) {
  notificationState.isWidgetOpen = isOpen;
}
