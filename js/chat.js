/*
 * Chat Core Logic
 * Hilton Chat Widget
 */

import { translations, languagesList } from './config.js';
import * as dom from './dom.js';
import * as rooms from './rooms.js';
import * as services from './services.js';
import * as openai from './openai.js';
import * as gallery from './gallery.js';
import * as bookings from './bookings.js';
import * as roomService from './roomService.js';

// Language storage key
const LANGUAGE_KEY = 'chat_language';
// History storage key
const HISTORY_KEY = 'chat_history_archive';

// State
let welcomed = false;
let currentLang = localStorage.getItem(LANGUAGE_KEY) || 'en'; // Default to English
let isGenerating = false;
let selectedRoom = null;
let chatMode = 'general'; // 'general' | 'room-context' | 'special-booking'

// Special Booking Mode State
let specialBookingState = {
  isActive: false,
  activatedBy: null, // 'auto' | 'manual'
  stage: 'collecting', // 'collecting' | 'analyzing' | 'finalizing' | 'offer_ready'
  requirements: [],
  currentOffer: null
};

// Status messages for Special Booking stages
const SPECIAL_BOOKING_STATUSES = {
  'checking': 'Проверяем доступность номеров…',
  'collecting': 'Уточняем ваши пожелания…',
  'analyzing': 'Учитываем ваши потребности…',
  'finalizing': 'Уточняем финальные детали…',
  'generating': 'Формируем персональное предложение…'
};

// Booking state storage key
const BOOKING_STATE_KEY = 'booking_state';

// Booking funnel state (persisted to localStorage)
let bookingState = {
  step: 'initial', // 'initial' | 'collecting_name' | 'collecting_phone' | 'collecting_dates' | 'collecting_email' | 'suggesting_rooms' | 'completed'
  collectedData: {
    fullName: null,      // ФИО гостя
    phone: null,         // Номер телефона
    checkIn: null,       // Дата заезда
    checkOut: null,      // Дата выезда
    email: null,         // Email
    guests: null,        // Количество гостей
    preferences: [],     // Предпочтения
    selectedRoom: null   // Выбранный номер
  },
  conversationHistory: [], // Last 10 messages for AI context
  hasActiveBooking: false  // Флаг наличия активного бронирования
};

// Cancellation state
let cancellationState = {
  isActive: false,
  action: null, // 'cancel_only' | 'cancel_and_rebook'
  stage: 'initial', // 'initial' | 'awaiting_search_params' | 'awaiting_confirmation'
  searchAttempts: 0,
  lastSearchType: null
};

// Operator Mode State
let operatorMode = {
  enabled: false,
  name: 'Денис',
  photo: null,
  connected: false,
  originalLogo: null,
  timeouts: []
};

// ===== NOTIFICATION SYSTEM =====
const NOTIFICATION_SETTINGS_KEY = 'chat_notification_settings';

// Notification state
let notificationState = {
  unreadCount: 0,
  soundEnabled: true,
  isTabVisible: true,
  isWidgetOpen: false
};

// Short beep sound as base64 (generated programmatically)
const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1gZGtyd3V0d3R0dnd3d3Z1c3BtaWViXVpYV1hZW11fYWNlZ2lrbG1tbm5tbGtqaGZjYV5bWFVSUE5NTE1OT1FSVFZYWlxeYGJkZWdoaWpqa2tqamlnZWNhXltYVVJPTEpIR0ZGRkdISUpMTlBSVFZYWVtcXV5fYGBhYWFgX15dW1lXVVJQTUtJR0VDQUA/Pj4+P0BCREdJTE5RU1VXWVpbXF1dXl5eXV1cW1lXVVNQTktIRkRBPzw6ODc2NjY3ODo8P0JFSEtOUVNVV1laW1xcXFxcW1pZV1VTUE1KRkNAPTo3NTIwLy4uLi8wMjU4O0BESExQU1ZYWltcXFxcW1pZV1VRUE1JRkI+Ojc0MC4rKSgnJygpKy4xNTo+Q0hMUFRXWltcXV1cW1pYVlNQTEhEQDw4NC8rKCUjISAgISIkJyovNDpAR0xSVllcXl9fXl1bWFVRTUlEPzo1MC0pJSIgHh0cHB0eICMnLDI5P0dOVVteYWNjY2FfXFhTTklDPTcxKyYiHx0bGRkZGhsdICQpLzY9RU5WWF1hZGVlY2BeWlVPS0Q9Ni8pIx8cGRcWFRUWFxkbHiImLDM7RE5WWF1iZWdnZmRhXFdRSkM8NC0mIR0aGBYVFBQUFRcZHCAkKjE4QEpTW2BiZmlqamdjXldQSUA4MCkjHhsYFhQTEhISExUXGh0iJyw0PEZQWWBkaWxub21pZF5XTkU8MysjHhoXFRMSEREREhQWGRwgJSsyOkRNV19lamtvcnJwbGVdVEpBOC8oIh4aFxUSERAPEBAREhUYHCAkKjE5Q0xWX2VrbnJzdnVybl9oXFJHPTQsJR8bFxQREA8ODg8QEhQXGyAmLTU+R1FaZGlwdHd5enl2c2xlW1BFOzIqIx0ZFhQREA4ODQ0OEBIUGBsgJi03QUpVXmhudnp9f4CBgIB9eXRqX1VLPzUtJh8aFhMQDg0MDAwODxMXGx8mLTVARE9YYWpxd3yAgYKCgYB9eXZwaGBWTEM6MikhHBgVEQ4NCwsMDQ8RFRkaHyUqLjY8Q0pRWF5iZ21wcnNzcnFua2ZgWlVQSUI6NC0oIh0aFhQRDw0MCwsNDg8RFhkdIS0xOz1ESFFYX2RnaWlqaWhoZmRgXFdTTkhCPTcxLCckIB0ZFhMRDw4NDAwNDxESFRkdIC0zPD9ERktRVVheYGFhYWBfXVtZVlNPTEhEPzs1MCwpJCAeGxgWExIQDg0MDQ4QExQYHCEqNDg/P0RHTEtOUFFSUlJRUU9NTElGQ0A8OTYyLCooIx4cGhcVExIQDw0NDQ4PERQWGRweIyowNzg8PERERU1PUFBQTk5MS0lGQ0A9Ojc0MC0pJiMfHBoYFhQTEhEQEBARERMVFxobHiElKi8zNjk8PkFDRUdISEdGRUNBPz06NzQxLiomIh8cGhcWFBMSEREQEBESExQWGBocHyIlKSwtMDI0NTY3ODk5OTg3NjQyMC4rKCYjIB4cGhgWFBMSEREREREREhMUFRcZGhwfISMlJyorLC0uLi4uLS0sKyooJyUjIR8eHBoZFxYVFBMSEhISEhITFBUWGBkaHB0fISIjJCUmJiYmJiUlJCMiIR8eHRsaGRgXFhUUFBMTExMTFBQVFhcYGRobHB0eHyAgISEhISEgIB8fHh0cGxoZGBcWFhUVFRQUFBQVFRYWFxgZGhobHB0dHh4eHx8fHx8eHh0dHBsaGRkYFxcWFhYVFRUVFhYWFxcYGRkKGhscHBwdHR0dHR0dHBwcGxsaGhkZGBgXFxcWFhYWFhYWFxcXGBgZGRoKGxsbGxwcHBwcHBwbGxsaGhoZGRkYGBgXFxcXFxcXFxcXFxgYGBkZGRoaGhsbGxsbGxsaGhoaGRkZGRkYGBgYGBcXFxcXFxcYGBgYGRkZGRoaGhoaGhoaGhoZGRkZGRkZGBgYGBgYGBgXFxcYGBgYGBkZGRkZGRkaGhoaGhoZGRkZGRkZGRkYGBgYGBgYGBgYGBgYGBkZGRkZGRkZGRoaGhoaGhkZGRkZGRkZGRkYGBgYGBgYGBgYGBgYGRkZGRkZGRkZGRkZGRoaGhkZGRkZGRkZGRkZGBgYGBgYGBgYGBgZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGBgYGBgYGBgZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZ';

let notificationAudio = null;

// Initialize notification sound
function initNotificationSound() {
  try {
    notificationAudio = new Audio(NOTIFICATION_SOUND_BASE64);
    notificationAudio.volume = 0.5;
  } catch (e) {
    console.log('Could not initialize notification sound:', e);
  }
}

// Load notification settings from localStorage
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

// Save notification settings to localStorage
function saveNotificationSettings() {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({
      soundEnabled: notificationState.soundEnabled
    }));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
}

// Play notification sound
function playNotificationSound() {
  if (!notificationState.soundEnabled || !notificationAudio) return;

  try {
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch(e => {
      // Sound playback may be blocked by browser autoplay policy
      console.log('Sound playback blocked:', e);
    });
  } catch (e) {
    console.log('Error playing sound:', e);
  }
}

// Update notification badge with count
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

// Increment unread count
export function incrementUnreadCount() {
  notificationState.unreadCount++;
  updateNotificationBadge(notificationState.unreadCount);
}

// Reset unread count
export function resetUnreadCount() {
  notificationState.unreadCount = 0;
  updateNotificationBadge(0);
}

// Toggle notification sound on/off
export function toggleNotificationSound() {
  notificationState.soundEnabled = !notificationState.soundEnabled;
  saveNotificationSettings();
  updateSoundToggleUI(notificationState.soundEnabled);
  return notificationState.soundEnabled;
}

// Update sound toggle button UI
function updateSoundToggleUI(isEnabled) {
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const soundStatusText = document.getElementById('sound-status-text');

  if (soundIconOn) soundIconOn.classList.toggle('hidden', !isEnabled);
  if (soundIconOff) soundIconOff.classList.toggle('hidden', isEnabled);
  if (soundStatusText) soundStatusText.textContent = isEnabled ? 'Вкл' : 'Выкл';
}

// Initialize visibility tracking for tab focus
function initVisibilityTracking() {
  document.addEventListener('visibilitychange', () => {
    notificationState.isTabVisible = !document.hidden;

    // If tab becomes visible and widget is open - reset unread count
    if (notificationState.isTabVisible && notificationState.isWidgetOpen) {
      resetUnreadCount();
      hideNewMessagesMarker();
    }
  });
}

// Show "New messages" marker in chat
export function showNewMessagesMarker() {
  const existingMarker = document.getElementById('new-messages-marker');
  if (existingMarker) return;

  // Не показываем маркер если textarea многострочный
  const textarea = document.getElementById('message-input');
  if (textarea) {
    const minHeight = parseInt(getComputedStyle(textarea).minHeight) || 31;
    if (textarea.scrollHeight > minHeight + 5) {
      return;
    }
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

// Hide "New messages" marker
export function hideNewMessagesMarker() {
  const marker = document.getElementById('new-messages-marker');
  if (marker) marker.remove();
}

// Handle new message notification (called from addMessage)
function handleNewMessageNotification(sender) {
  if (sender !== 'ai') return;

  const isWidgetOpen = dom.chatWindow?.classList.contains('open');
  const isTabVisible = !document.hidden;

  notificationState.isWidgetOpen = isWidgetOpen;

  // If widget is closed OR tab is not visible
  if (!isWidgetOpen || !isTabVisible) {
    // Increment unread count
    incrementUnreadCount();

    // Play sound
    playNotificationSound();

    // Show marker if widget is open but tab is not visible
    if (isWidgetOpen && !isTabVisible) {
      showNewMessagesMarker();
    }
  }
}

// Update header status pill
export function updateHeaderStatus(text, showSpinner = true) {
  const pill = document.getElementById('header-status-pill');
  const spinner = pill?.querySelector('.header-status-spinner');
  const statusText = pill?.querySelector('.header-status-text');

  if (!pill) return;

  if (text) {
    if (statusText) statusText.textContent = text;
    if (spinner) spinner.style.display = showSpinner ? 'block' : 'none';
    pill.classList.remove('hidden');
  } else {
    pill.classList.add('hidden');
  }
}

// Hide header status pill
export function hideHeaderStatus() {
  const pill = document.getElementById('header-status-pill');
  if (pill) pill.classList.add('hidden');
}

// Update operator status bar
function updateOperatorStatusBar(text, showSpinner = true) {
  const bar = document.getElementById('operator-status-bar');
  const spinner = bar?.querySelector('.operator-status-spinner');
  const statusText = bar?.querySelector('.operator-status-text');

  if (!bar) return;

  if (text) {
    if (statusText) statusText.textContent = text;
    if (spinner) spinner.style.display = showSpinner ? 'block' : 'none';
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

// Hide operator status bar
function hideOperatorStatusBar() {
  const bar = document.getElementById('operator-status-bar');
  if (bar) bar.classList.add('hidden');
}

// Start operator simulation
export function startOperatorSimulation() {
  // Clear any existing timeouts
  operatorMode.timeouts.forEach(t => clearTimeout(t));
  operatorMode.timeouts = [];

  // Save original logo
  const logoContainer = document.getElementById('hotel-logo-container');
  if (logoContainer && !operatorMode.originalLogo) {
    operatorMode.originalLogo = logoContainer.innerHTML;
  }

  // Stage 1: Searching for specialist (0-4 sec)
  updateOperatorStatusBar('Ищем специалиста...', true);

  // Stage 2: Connecting operator (4-7 sec)
  const t1 = setTimeout(() => {
    updateOperatorStatusBar('Подключаем оператора...', true);
  }, 4000);
  operatorMode.timeouts.push(t1);

  // Stage 3: Operator connected (10 sec)
  const t2 = setTimeout(() => {
    const name = operatorMode.name || 'Денис';
    updateOperatorStatusBar(`Оператор ${name} присоединился`, false);
    operatorMode.connected = true;

    // Change logo to operator photo
    if (operatorMode.photo && logoContainer) {
      logoContainer.innerHTML = `<img src="${operatorMode.photo}" class="w-full h-full object-cover rounded-full" alt="Operator">`;
    }

    // Hide status after 3 seconds
    const t3 = setTimeout(() => {
      hideOperatorStatusBar();
    }, 3000);
    operatorMode.timeouts.push(t3);
  }, 10000);
  operatorMode.timeouts.push(t2);
}

// Stop operator simulation
export function stopOperatorSimulation() {
  // Clear all timeouts
  operatorMode.timeouts.forEach(t => clearTimeout(t));
  operatorMode.timeouts = [];

  operatorMode.connected = false;
  hideOperatorStatusBar();

  // Restore original logo
  const logoContainer = document.getElementById('hotel-logo-container');
  if (logoContainer && operatorMode.originalLogo) {
    logoContainer.innerHTML = operatorMode.originalLogo;
  }
}

// Set operator mode settings
export function setOperatorSettings(name, photo) {
  if (name) operatorMode.name = name;
  if (photo) operatorMode.photo = photo;
}

// Load booking state from localStorage
function loadBookingState() {
  try {
    const saved = localStorage.getItem(BOOKING_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      bookingState = {
        ...bookingState,
        ...parsed,
        collectedData: {
          ...bookingState.collectedData,
          ...(parsed.collectedData || {})
        },
        conversationHistory: parsed.conversationHistory || [],
        hasActiveBooking: parsed.hasActiveBooking || false
      };
    }
  } catch (e) {
    console.error('Error loading booking state:', e);
  }
}

// Save booking state to localStorage
function saveBookingState() {
  try {
    localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(bookingState));
  } catch (e) {
    console.error('Error saving booking state:', e);
  }
}

// Determine current booking step based on collected data
function determineBookingStep(data) {
  if (!data.fullName) return 'collecting_name';
  if (!data.phone) return 'collecting_phone';
  if (!data.checkIn || !data.checkOut) return 'collecting_dates';
  if (!data.email) return 'collecting_email';
  if (!data.selectedRoom) return 'suggesting_rooms';
  return 'completed';
}

// Update booking state with extracted data
function updateBookingStateWithExtracted(extractedData) {
  if (!extractedData) return;

  let updated = false;

  // Update fullName
  if (extractedData.fullName && !bookingState.collectedData.fullName) {
    bookingState.collectedData.fullName = extractedData.fullName;
    updated = true;
  }

  // Update phone
  if (extractedData.phone && !bookingState.collectedData.phone) {
    bookingState.collectedData.phone = extractedData.phone;
    updated = true;
  }

  // Update dates
  if (extractedData.checkIn && !bookingState.collectedData.checkIn) {
    bookingState.collectedData.checkIn = extractedData.checkIn;
    updated = true;
  }
  if (extractedData.checkOut && !bookingState.collectedData.checkOut) {
    bookingState.collectedData.checkOut = extractedData.checkOut;
    updated = true;
  }

  // Update email
  if (extractedData.email && !bookingState.collectedData.email) {
    bookingState.collectedData.email = extractedData.email;
    updated = true;
  }

  // Update guests
  if (extractedData.guests && !bookingState.collectedData.guests) {
    bookingState.collectedData.guests = extractedData.guests;
    updated = true;
  }

  // Update step based on collected data
  const previousStep = bookingState.step;
  bookingState.step = determineBookingStep(bookingState.collectedData);

  // If booking is completed, mark as active
  if (bookingState.step === 'completed' && previousStep !== 'completed') {
    bookingState.hasActiveBooking = true;
    console.log('✅ Booking completed! hasActiveBooking set to true');
    showTelegramBookingModal();
  }

  if (updated) {
    saveBookingState();
  }
}

// Add message to conversation history
function addToConversationHistory(role, content) {
  bookingState.conversationHistory.push({ role, content });

  // Keep only last 10 messages
  if (bookingState.conversationHistory.length > 10) {
    bookingState.conversationHistory = bookingState.conversationHistory.slice(-10);
  }

  saveBookingState();
}

// Reset booking state
function resetBookingState() {
  bookingState = {
    step: 'initial',
    collectedData: {
      fullName: null,
      phone: null,
      checkIn: null,
      checkOut: null,
      email: null,
      guests: null,
      preferences: [],
      selectedRoom: null
    },
    conversationHistory: []
  };
  saveBookingState();
}

// Get booking state for external use
export function getBookingState() {
  return bookingState;
}

// ========================================
// SPECIAL BOOKING MODE FUNCTIONS
// ========================================

// Activate Special Booking mode
export function activateSpecialBookingMode(activatedBy = 'manual') {
  specialBookingState.isActive = true;
  specialBookingState.activatedBy = activatedBy;
  specialBookingState.stage = 'collecting';
  specialBookingState.requirements = [];
  specialBookingState.currentOffer = null;

  chatMode = 'special-booking';

  // Clear room context if active
  if (selectedRoom) {
    clearRoomContext(true);
  }

  // Show status indicator
  showSpecialBookingStatus('checking');

  // Add activation message
  if (activatedBy === 'auto') {
    setTimeout(() => {
      updateSpecialBookingStatus('collecting');
      addMessage('Вижу, что у вас особые пожелания. Позвольте помочь подобрать идеальный вариант. Расскажите подробнее о ваших требованиях — я учту каждую деталь.', 'ai');
      addToConversationHistory('assistant', 'Вижу, что у вас особые пожелания. Позвольте помочь подобрать идеальный вариант. Расскажите подробнее о ваших требованиях — я учту каждую деталь.');
    }, 1500);
  } else {
    setTimeout(() => {
      updateSpecialBookingStatus('collecting');
      addMessage('Режим персонального подбора активирован. Расскажите о ваших пожеланиях: тип поездки, особые требования к номеру, дополнительные услуги — я учту всё, чтобы сделать ваше пребывание идеальным.', 'ai');
      addToConversationHistory('assistant', 'Режим персонального подбора активирован. Расскажите о ваших пожеланиях: тип поездки, особые требования к номеру, дополнительные услуги — я учту всё, чтобы сделать ваше пребывание идеальным.');
    }, 1500);
  }
}

// Deactivate Special Booking mode
export function deactivateSpecialBookingMode(silent = false) {
  specialBookingState.isActive = false;
  specialBookingState.activatedBy = null;
  specialBookingState.stage = 'collecting';
  specialBookingState.requirements = [];
  specialBookingState.currentOffer = null;

  chatMode = 'general';

  // Hide UI elements
  hideSpecialBookingStatus();
  hideSpecialOfferCard();

  if (!silent) {
    addMessage('Режим персонального подбора завершён. Чем ещё могу помочь?', 'ai');
  }
}

// Show Special Booking status indicator
export function showSpecialBookingStatus(stage) {
  const statusContainer = dom.specialBookingStatus;
  if (!statusContainer) return;

  // Get localized status text
  const t = translations[currentLang] || translations['en'];
  const statusTexts = {
    'checking': t.checkingAvailability || 'Checking room availability...',
    'collecting': t.analyzingNeeds || 'Analyzing your needs...',
    'analyzing': t.analyzingNeeds || 'Analyzing your needs...',
    'finalizing': t.finalizingDetails || 'Finalizing details...',
    'generating': t.generatingOffer || 'Generating personal offer...'
  };

  const statusTextEl = statusContainer.querySelector('.status-text');
  if (statusTextEl) {
    statusTextEl.textContent = statusTexts[stage] || statusTexts['collecting'];
    statusTextEl.classList.add('status-text-transition');
    setTimeout(() => statusTextEl.classList.remove('status-text-transition'), 300);
  }

  statusContainer.classList.remove('hidden');
  // Анимация только в special-booking-status, не дублируем в header
}

// Update Special Booking status
export function updateSpecialBookingStatus(stage) {
  specialBookingState.stage = stage;
  showSpecialBookingStatus(stage);
}

// Hide Special Booking status indicator
export function hideSpecialBookingStatus() {
  const statusContainer = dom.specialBookingStatus;
  if (statusContainer) {
    statusContainer.classList.add('hidden');
  }
  // Also hide header status pill (if not in operator mode)
  if (!operatorMode.connected) {
    hideHeaderStatus();
  }
}

// Show Special Offer Card
export function showSpecialOfferCard(offerData) {
  if (!offerData) return;

  specialBookingState.currentOffer = offerData;
  specialBookingState.stage = 'offer_ready';

  // Hide status indicator
  hideSpecialBookingStatus();

  // Populate offer card
  const card = dom.specialOfferCard;
  if (!card) return;

  // Find room by name
  const allRooms = rooms.getAllRooms();
  const matchedRoom = allRooms.find(r =>
    r.name.toLowerCase().includes(offerData.room_name?.toLowerCase()) ||
    offerData.room_name?.toLowerCase().includes(r.name.toLowerCase())
  );

  // Set room image
  if (dom.offerRoomImage) {
    if (matchedRoom?.mainPhoto) {
      dom.offerRoomImage.src = matchedRoom.mainPhoto;
      dom.offerRoomImage.style.display = 'block';
    } else {
      dom.offerRoomImage.src = '';
      dom.offerRoomImage.style.display = 'none';
    }
  }

  // Set room name and price
  if (dom.offerRoomName) {
    dom.offerRoomName.textContent = offerData.room_name || 'Номер';
  }
  if (dom.offerRoomPrice) {
    dom.offerRoomPrice.textContent = offerData.room_price ? `$${offerData.room_price}/ночь` : '';
  }

  // Set dates
  if (dom.offerDates) {
    const checkIn = offerData.check_in || bookingState.collectedData.checkIn || '—';
    const checkOut = offerData.check_out || bookingState.collectedData.checkOut || '—';
    dom.offerDates.textContent = `${checkIn} — ${checkOut}`;
  }

  // Set guests
  if (dom.offerGuests) {
    dom.offerGuests.textContent = offerData.guests || bookingState.collectedData.guests || '—';
  }

  // Set total price
  if (dom.offerTotal) {
    dom.offerTotal.textContent = offerData.total_price ? `$${offerData.total_price}` : '—';
  }

  // Set special notes
  if (dom.offerNotesList) {
    dom.offerNotesList.innerHTML = '';
    const notes = offerData.special_notes || specialBookingState.requirements.map(r => r.label);
    notes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note;
      dom.offerNotesList.appendChild(li);
    });
  }

  // Show card
  card.classList.remove('hidden');
}

// Hide Special Offer Card
export function hideSpecialOfferCard() {
  const card = dom.specialOfferCard;
  if (card) {
    card.classList.add('hidden');
  }
}

// Determine Special Booking stage based on collected data
function determineSpecialBookingStage() {
  const data = bookingState.collectedData;
  const requirements = specialBookingState.requirements;

  // If we have dates, guests, and some requirements - ready for generating
  if (data.checkIn && data.checkOut && requirements.length >= 1) {
    return 'generating';
  }

  // If we have some data - analyzing
  if (data.checkIn || data.checkOut || requirements.length > 0) {
    return 'analyzing';
  }

  return 'collecting';
}

// Check if Special Booking mode should be activated
function shouldActivateSpecialBooking(message, conversationHistory) {
  // Don't activate if already in special mode
  if (specialBookingState.isActive) return false;

  // Use detector from openai module
  const detection = openai.detectComplexRequest(message, conversationHistory);
  return detection.isComplex;
}

// Get Special Booking state for external use
export function getSpecialBookingState() {
  return specialBookingState;
}

// ========================================
// CANCELLATION FUNCTIONS
// ========================================

// Detect if user wants to cancel or edit booking
function detectCancellationIntent(message) {
  const lowerMessage = message.toLowerCase();
  const cancellationKeywords = [
    // Русский
    'отменить бронирование', 'отменить броню', 'отмени бронирование', 'отменить резерв',
    'изменить бронирование', 'изменить детали', 'изменить броню', 'поменять бронирование',
    'отмена бронирования', 'хочу отменить', 'нужно отменить',
    // English
    'cancel booking', 'cancel reservation', 'cancel my booking', 'cancel the booking',
    'edit booking', 'change booking', 'modify booking', 'update booking',
    'want to cancel', 'need to cancel',
    // Украинский
    'скасувати бронювання', 'змінити бронювання', 'відмінити бронювання',
    'скасувати резерв', 'хочу скасувати'
  ];

  return cancellationKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Detect booking modification intent with type (cancel vs edit)
function detectBookingModificationIntent(message) {
  const lowerMessage = message.toLowerCase();

  // Edit keywords (more specific)
  const editKeywords = [
    // Русский
    'изменить дат', 'поменять дат', 'перенести бронь', 'перенести дат',
    'изменить бронирование', 'изменить детали', 'изменить броню', 'поменять бронирование',
    'сменить номер', 'другой номер', 'хочу другие даты',
    // English
    'change date', 'modify date', 'reschedule', 'move booking',
    'change room', 'different room', 'edit booking', 'modify booking',
    // Украинский
    'змінити дат', 'перенести дат', 'змінити бронювання', 'інший номер'
  ];

  // Cancel keywords
  const cancelKeywords = [
    // Русский
    'отменить бронирование', 'отменить броню', 'отмени бронирование',
    'отмена бронирования', 'хочу отменить', 'нужно отменить',
    // English
    'cancel booking', 'cancel reservation', 'want to cancel', 'need to cancel',
    // Украинский
    'скасувати бронювання', 'відмінити бронювання', 'хочу скасувати'
  ];

  const isEdit = editKeywords.some(kw => lowerMessage.includes(kw));
  const isCancel = cancelKeywords.some(kw => lowerMessage.includes(kw));

  if (isEdit) {
    return { hasIntent: true, type: 'edit' };
  } else if (isCancel) {
    return { hasIntent: true, type: 'cancel' };
  }

  return { hasIntent: false, type: null };
}

// Show cancellation options
export function showCancellationOptions() {
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'cancellation-options-container animate-fade-in';
  optionsContainer.id = 'cancellation-options';

  optionsContainer.innerHTML = `
    <div class="cancellation-options-card">
      <div class="cancellation-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Отмена бронирования</span>
      </div>
      <p class="cancellation-description">Выберите действие:</p>
      <div class="cancellation-actions">
        <button class="cancellation-btn primary" data-action="cancel_and_rebook">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          Отменить и создать новое
        </button>
        <button class="cancellation-btn secondary" data-action="cancel_only">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Просто отменить
        </button>
      </div>
    </div>
  `;

  // Add to messages container
  dom.messagesContainer.insertBefore(optionsContainer, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Add event listeners
  const buttons = optionsContainer.querySelectorAll('.cancellation-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      cancellationState.action = action;

      // Hide options
      optionsContainer.remove();

      // Show confirmation
      showCancellationConfirmation(action);
    });
  });
}

// Show cancellation confirmation
export function showCancellationConfirmation(action) {
  const confirmationContainer = document.createElement('div');
  confirmationContainer.className = 'cancellation-confirmation-container animate-fade-in';
  confirmationContainer.id = 'cancellation-confirmation';

  confirmationContainer.innerHTML = `
    <div class="cancellation-confirmation-card">
      <div class="confirmation-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <h3 class="confirmation-title">Подтверждение отмены</h3>
      <p class="confirmation-text">Вы действительно хотите отменить бронирование?</p>
      <div class="confirmation-actions">
        <button class="confirmation-btn confirm" data-action="confirm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Да, отменить
        </button>
        <button class="confirmation-btn cancel" data-action="cancel">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Нет, оставить
        </button>
      </div>
    </div>
  `;

  // Add to messages container
  dom.messagesContainer.insertBefore(confirmationContainer, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Add event listeners
  const confirmBtn = confirmationContainer.querySelector('[data-action="confirm"]');
  const cancelBtn = confirmationContainer.querySelector('[data-action="cancel"]');

  confirmBtn.addEventListener('click', () => {
    confirmationContainer.remove();
    handleCancellationConfirmed(action);
  });

  cancelBtn.addEventListener('click', () => {
    confirmationContainer.remove();
    addMessage('Бронирование сохранено. Чем ещё могу помочь?', 'ai');
    addToConversationHistory('assistant', 'Бронирование сохранено. Чем ещё могу помочь?');
    cancellationState.isActive = false;
    cancellationState.action = null;
  });
}

// Handle cancellation confirmed
function handleCancellationConfirmed(action) {
  // Cancel the booking
  resetBookingState();
  bookingState.hasActiveBooking = false;
  saveBookingState();

  if (action === 'cancel_and_rebook') {
    // User wants to create a new booking
    addMessage('Бронирование отменено. Давайте создадим новое! Расскажите о ваших пожеланиях: даты заезда и выезда, количество гостей, особые требования.', 'ai');
    addToConversationHistory('assistant', 'Бронирование отменено. Давайте создадим новое! Расскажите о ваших пожеланиях: даты заезда и выезда, количество гостей, особые требования.');

    // Reset step to initial
    bookingState.step = 'initial';
    saveBookingState();
  } else {
    // User just wants to cancel
    addMessage('Бронирование отменено. Если передумаете или у вас будут вопросы, обращайтесь!', 'ai');
    addToConversationHistory('assistant', 'Бронирование отменено. Если передумаете или у вас будут вопросы, обращайтесь!');
  }

  // Show Telegram confirmation modal after cancellation
  setTimeout(() => {
    showTelegramBookingModal();
  }, 800);

  cancellationState.isActive = false;
  cancellationState.action = null;
}

// Get cancellation state for external use
export function getCancellationState() {
  return cancellationState;
}

// ========================================
// BOOKING EDIT FUNCTIONS
// ========================================

// Store current booking being edited
let editingBooking = null;

// Show edit booking options
export function showEditBookingOptions(booking) {
  editingBooking = booking;

  const container = document.createElement('div');
  container.className = 'edit-booking-options animate-fade-in';
  container.id = 'edit-booking-options';

  container.innerHTML = `
    <div class="edit-booking-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
        <div style="width: 40px; height: 40px; background: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </div>
        <h4 style="font-weight: 600; font-size: 16px; color: #111827; margin: 0;">Редагування бронювання</h4>
      </div>

      <div style="background: #f9fafb; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <p style="font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5;">
          <strong style="color: #374151;">Гість:</strong> ${booking.guestName}<br>
          <strong style="color: #374151;">Номер:</strong> ${booking.roomName || '—'}<br>
          <strong style="color: #374151;">Дати:</strong> ${booking.checkIn} — ${booking.checkOut}
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-bottom: 14px;">Що ви хочете змінити?</p>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="edit-option-btn" data-action="change-dates" style="
          display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px;
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.2s; text-align: left;
        ">
          <span style="font-size: 18px;">📅</span>
          <span>Змінити дати</span>
        </button>

        <button class="edit-option-btn" data-action="change-room" style="
          display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px;
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.2s; text-align: left;
        ">
          <span style="font-size: 18px;">🏨</span>
          <span>Змінити номер</span>
        </button>

        <button class="edit-option-btn" data-action="change-guests" style="
          display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px;
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
          font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.2s; text-align: left;
        ">
          <span style="font-size: 18px;">👥</span>
          <span>Змінити кількість гостей</span>
        </button>

        <button class="edit-option-btn cancel-edit" data-action="cancel-edit" style="
          display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 16px;
          background: transparent; border: 1px solid #e5e7eb; border-radius: 10px;
          font-size: 13px; font-weight: 500; color: #9ca3af; cursor: pointer; transition: all 0.2s; margin-top: 4px;
        ">
          Скасувати
        </button>
      </div>
    </div>
  `;

  dom.messagesContainer.insertBefore(container, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Add hover effects
  container.querySelectorAll('.edit-option-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('cancel-edit')) {
        btn.style.borderColor = 'var(--accent-color, #2563eb)';
        btn.style.background = '#eff6ff';
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = '#e5e7eb';
      btn.style.background = btn.classList.contains('cancel-edit') ? 'transparent' : '#f9fafb';
    });
  });

  // Event listeners
  container.querySelector('[data-action="change-dates"]').addEventListener('click', () => {
    container.remove();
    showDateChangeWarning(booking);
  });

  container.querySelector('[data-action="change-room"]').addEventListener('click', () => {
    container.remove();
    addMessage('Розкажіть, який номер вас цікавить, або оберіть із доступних:', 'ai');
    setTimeout(() => addRoomCarousel(), 300);
  });

  container.querySelector('[data-action="change-guests"]').addEventListener('click', () => {
    container.remove();
    addMessage('Вкажіть нову кількість гостей для вашого бронювання:', 'ai');
  });

  container.querySelector('[data-action="cancel-edit"]').addEventListener('click', () => {
    container.remove();
    editingBooking = null;
    addMessage('Добре, бронювання залишається без змін. Чим ще можу допомогти?', 'ai');
  });
}

// Show warning when changing dates
function showDateChangeWarning(booking) {
  const container = document.createElement('div');
  container.className = 'date-change-warning animate-fade-in';
  container.id = 'date-change-warning';

  container.innerHTML = `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 16px; padding: 20px;">
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
        <div style="width: 36px; height: 36px; background: #fef3c7; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13" stroke="white" stroke-width="2"></line>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" stroke-width="2"></line>
          </svg>
        </div>
        <div>
          <strong style="color: #92400e; font-size: 15px; display: block; margin-bottom: 4px;">Увага</strong>
          <p style="font-size: 14px; color: #78350f; margin: 0; line-height: 1.5;">
            Зміна дат вимагає скасування поточного бронювання та створення нового.
          </p>
        </div>
      </div>

      <p style="font-size: 14px; color: #78350f; margin-bottom: 16px; line-height: 1.5;">
        Хочете зберегти дані гостя (ПІБ, email, телефон) для нового бронювання?
      </p>

      <div style="display: flex; gap: 10px;">
        <button id="keep-data-btn" style="
          flex: 1; padding: 12px 16px; background: var(--accent-color, #2563eb); color: white;
          border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        ">
          Так, зберегти
        </button>
        <button id="new-data-btn" style="
          flex: 1; padding: 12px 16px; background: white; color: #374151;
          border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer;
          transition: all 0.2s;
        ">
          Ні, ввести заново
        </button>
      </div>
    </div>
  `;

  dom.messagesContainer.insertBefore(container, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Event listeners
  document.getElementById('keep-data-btn').addEventListener('click', () => {
    // Save guest data
    bookingState.collectedData.fullName = booking.guestName;
    bookingState.collectedData.phone = booking.phone;
    bookingState.collectedData.email = booking.email;
    bookingState.collectedData.guests = booking.guests;
    saveBookingState();

    // Cancel old booking
    bookings.cancelBooking(booking.id);

    container.remove();
    editingBooking = null;

    addMessage(
      `Дані збережено! Старе бронювання скасовано.\n\n` +
      `<strong>Збережені дані:</strong>\n` +
      `• ПІБ: ${booking.guestName}\n` +
      `• Email: ${booking.email || '—'}\n` +
      `• Телефон: ${booking.phone || '—'}\n\n` +
      `Тепер вкажіть нові дати заїзду та виїзду:`,
      'ai'
    );

    // Reset booking step to collect dates
    bookingState.step = 'collecting_dates';
    saveBookingState();
  });

  document.getElementById('new-data-btn').addEventListener('click', () => {
    // Cancel old booking
    bookings.cancelBooking(booking.id);

    // Reset all collected data
    resetBookingState();
    saveBookingState();

    container.remove();
    editingBooking = null;

    addMessage(
      'Старе бронювання скасовано. Давайте створимо нове!\n\n' +
      'Будь ласка, вкажіть ваші дані: ПІБ, email, телефон, дати заїзду та виїзду.',
      'ai'
    );
  });
}

// ========================================
// BOOKING CANCELLATION BY NAME FUNCTIONS
// ========================================

// Extract search parameters from cancellation message
function extractBookingSearchParams(message) {
  const result = {
    type: null,
    value: null
  };

  // Check for booking ID (BKG-XXXXX format)
  const bookingIdMatch = message.match(/BKG-[A-Z0-9]+/i);
  if (bookingIdMatch) {
    result.type = 'id';
    result.value = bookingIdMatch[0].toUpperCase();
    return result;
  }

  // Check for email
  const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) {
    result.type = 'email';
    result.value = emailMatch[1];
    return result;
  }

  // Check for phone number (must be 10+ digits)
  const phoneMatch = message.match(/(\+?\d{10,13})/);
  if (phoneMatch) {
    result.type = 'phone';
    result.value = phoneMatch[1];
    return result;
  }

  // Try to extract name ONLY after specific keywords (more strict)
  const namePatternWithKeyword = /(?:для|на имя|на ім'я|по имени|for|на прізвище)\s+([А-ЯЁІЇҐа-яёіїґA-Z][А-ЯЁІЇҐа-яёіїґA-Za-z]+(?:\s+[А-ЯЁІЇҐа-яёіїґA-Z][А-ЯЁІЇҐа-яёіїґA-Za-z]+){1,2})/i;
  const nameMatch = message.match(namePatternWithKeyword);
  if (nameMatch) {
    const extractedName = nameMatch[1].trim();
    // Filter out common action words
    const actionWords = ['хочу', 'отменить', 'скасувати', 'змінити', 'изменить', 'бронирование', 'бронювання', 'резерв', 'cancel', 'change', 'booking'];
    const nameParts = extractedName.toLowerCase().split(/\s+/);
    const hasActionWords = nameParts.some(part => actionWords.includes(part));

    if (!hasActionWords && nameParts.length >= 2) {
      result.type = 'name';
      result.value = extractedName;
      return result;
    }
  }

  return result;
}

// Show search parameter request form
function showBookingSearchForm() {
  const container = document.createElement('div');
  container.className = 'booking-search-form animate-fade-in';
  container.id = 'booking-search-form';
  container.style.cssText = 'margin: 16px 0;';

  container.innerHTML = `
    <div class="ai-message" style="background: #f3f4f6; padding: 16px; border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <strong style="font-size: 15px;">Поиск бронирования</strong>
      </div>

      <p style="margin-bottom: 14px; font-size: 13px; color: #6b7280;">
        Укажите один из параметров для поиска вашего бронирования:
      </p>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div class="search-input-container" style="position: relative;">
          <input type="text" id="booking-search-input" placeholder="Введите ФИО, email, телефон или ID бронирования"
            style="width: 100%; padding: 12px 44px 12px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: all 0.2s;">
          <button id="booking-search-btn" style="
            position: absolute;
            right: 4px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--accent-color, #2563eb);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Знайти
          </button>
        </div>

        <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
          <strong>Примеры:</strong><br>
          • ФИО: Іванов Петро Сергійович<br>
          • Email: ivanov@example.com<br>
          • Телефон: +380501234567<br>
          • ID: BKG-ABC123
        </div>
      </div>
    </div>
  `;

  dom.messagesContainer.insertBefore(container, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Focus input
  const input = container.querySelector('#booking-search-input');
  const searchBtn = container.querySelector('#booking-search-btn');

  if (input) {
    input.focus();

    // Handle input styling
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--accent-color, #2563eb)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#e5e7eb';
    });

    // Search on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performBookingSearch(input.value.trim(), container);
      }
    });
  }

  // Search button handler
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      performBookingSearch(input.value.trim(), container);
    });

    searchBtn.addEventListener('mouseenter', () => {
      searchBtn.style.opacity = '0.9';
    });
    searchBtn.addEventListener('mouseleave', () => {
      searchBtn.style.opacity = '1';
    });
  }
}

// Perform booking search
function performBookingSearch(searchValue, formContainer) {
  if (!searchValue) {
    addMessage('Пожалуйста, введите параметр для поиска.', 'ai');
    return;
  }

  // Extract search parameters
  const searchParams = extractBookingSearchParams(searchValue);

  // If no valid parameters found, try general search
  if (!searchParams.type) {
    // Try name search as fallback
    const foundBookings = bookings.findBookingsByName(searchValue);

    if (foundBookings.length === 0) {
      addMessage(
        `Бронирования по запросу "${searchValue}" не найдены.\n\n` +
        'Проверьте правильность написания или попробуйте другой параметр поиска.',
        'ai'
      );
      cancellationState.searchAttempts++;

      if (cancellationState.searchAttempts >= 3) {
        addMessage(
          'Если у вас возникли сложности с поиском бронирования, обратитесь к администратору или укажите точные данные из письма-подтверждения.',
          'ai'
        );
        resetCancellationState();
      }
      return;
    }

    searchParams.type = 'name';
    searchParams.value = searchValue;
  }

  // Remove form
  if (formContainer) {
    formContainer.remove();
  }

  // Search for bookings
  let foundBookings = [];
  let searchDescription = '';

  switch (searchParams.type) {
    case 'id':
      const booking = bookings.getBookingById(searchParams.value);
      if (booking) foundBookings = [booking];
      searchDescription = `ID ${searchParams.value}`;
      break;

    case 'email':
      foundBookings = bookings.searchBookings({ email: searchParams.value });
      searchDescription = `email ${searchParams.value}`;
      break;

    case 'phone':
      foundBookings = bookings.searchBookings({ phone: searchParams.value });
      searchDescription = `телефон ${searchParams.value}`;
      break;

    case 'name':
      foundBookings = bookings.findBookingsByName(searchParams.value);
      searchDescription = `ФИО "${searchParams.value}"`;
      break;
  }

  if (foundBookings.length === 0) {
    addMessage(
      `Бронирования по параметру ${searchDescription} не найдены.\n\n` +
      'Попробуйте указать другой параметр или проверьте правильность написания.',
      'ai'
    );

    cancellationState.searchAttempts++;
    cancellationState.lastSearchType = searchParams.type;

    // Show form again for retry
    if (cancellationState.searchAttempts < 3) {
      setTimeout(() => showBookingSearchForm(), 500);
    } else {
      addMessage(
        'Если у вас возникли сложности с поиском, обратитесь к администратору.',
        'ai'
      );
      resetCancellationState();
    }
    return;
  }

  // Filter only confirmed bookings
  const confirmedBookings = foundBookings.filter(b => b.status === 'confirmed');

  if (confirmedBookings.length === 0) {
    addMessage(
      `Найдены бронирования по параметру ${searchDescription}, но все они уже отменены или завершены.`,
      'ai'
    );
    resetCancellationState();
    return;
  }

  // Show found bookings with action buttons
  showBookingCancellationOptions(confirmedBookings, searchDescription);
}

// Handle booking cancellation by any parameter
export function handleBookingCancellationByName(userMessage) {
  // Activate cancellation state
  cancellationState.isActive = true;
  cancellationState.stage = 'awaiting_search_params';
  cancellationState.searchAttempts = 0;

  // Try to extract parameters from initial message
  const searchParams = extractBookingSearchParams(userMessage);

  if (searchParams.type) {
    // If we found params in the initial message, search immediately
    performBookingSearch(searchParams.value, null);
  } else {
    // Show interactive search form
    addMessage(
      'Давайте найдем ваше бронирование. Укажите любой известный вам параметр:',
      'ai'
    );
    setTimeout(() => showBookingSearchForm(), 300);
  }
}

// Reset cancellation state
function resetCancellationState() {
  cancellationState.isActive = false;
  cancellationState.action = null;
  cancellationState.stage = 'initial';
  cancellationState.searchAttempts = 0;
  cancellationState.lastSearchType = null;
}

// Show booking cancellation options
function showBookingCancellationOptions(foundBookings, searchDescription = '') {
  const container = document.createElement('div');
  container.className = 'booking-cancellation-options animate-fade-in';
  container.style.cssText = 'margin: 16px 0; display: flex; flex-direction: column; gap: 12px;';

  // Header
  const header = document.createElement('div');
  header.className = 'ai-message';
  header.style.cssText = 'background: #f3f4f6; padding: 12px; border-radius: 8px; margin-bottom: 8px;';

  const searchInfo = searchDescription ? `<br><span style="font-size: 12px; color: #9ca3af;">Поиск по: ${searchDescription}</span>` : '';

  header.innerHTML = `
    <strong>✓ Найдено бронирований: ${foundBookings.length}</strong>${searchInfo}<br>
    <span style="font-size: 13px; color: #6b7280;">Выберите бронирование для отмены или изменения:</span>
  `;
  container.appendChild(header);

  // Booking cards
  foundBookings.forEach(booking => {
    const formatted = bookings.formatBooking(booking);
    const card = document.createElement('div');
    card.className = 'booking-option-card';
    card.style.cssText = `
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
        <div>
          <div style="font-weight: 600; font-size: 15px; color: #1f2937; margin-bottom: 4px;">
            ${booking.guestName}
          </div>
          <div style="font-size: 11px; color: #9ca3af; font-family: monospace;">
            ${booking.id}
          </div>
        </div>
        <div style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
          ${formatted.statusText}
        </div>
      </div>

      <div style="background: #f9fafb; padding: 8px 10px; border-radius: 8px; margin-bottom: 10px; font-size: 13px;">
        <svg style="width: 14px; height: 14px; display: inline; vertical-align: middle; margin-right: 6px; opacity: 0.6;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <strong>${booking.roomName}</strong>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 12px;">
        <div>
          <div style="color: #9ca3af; margin-bottom: 2px;">Заїзд</div>
          <div style="font-weight: 600; color: #1f2937;">${formatted.checkInFormatted}</div>
        </div>
        <div>
          <div style="color: #9ca3af; margin-bottom: 2px;">Виїзд</div>
          <div style="font-weight: 600; color: #1f2937;">${formatted.checkOutFormatted}</div>
        </div>
        <div>
          <div style="color: #9ca3af; margin-bottom: 2px;">Ночей</div>
          <div style="font-weight: 600; color: #1f2937;">${booking.nights}</div>
        </div>
        <div>
          <div style="color: #9ca3af; margin-bottom: 2px;">Гостей</div>
          <div style="font-weight: 600; color: #1f2937;">${booking.guests}</div>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="booking-action-cancel-btn" data-booking-id="${booking.id}" style="
          flex: 1;
          background: #fee2e2;
          color: #991b1b;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Скасувати
        </button>
        <button class="booking-action-edit-btn" data-booking-id="${booking.id}" style="
          flex: 1;
          background: #dbeafe;
          color: #1e40af;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Змінити
        </button>
      </div>
    `;

    // Add hover effect
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'var(--accent-color, #2563eb)';
      card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = '#e5e7eb';
      card.style.boxShadow = 'none';
    });

    container.appendChild(card);
  });

  // Add to messages container
  dom.messagesContainer.insertBefore(container, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Add event listeners for buttons
  container.querySelectorAll('.booking-action-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookingId = btn.dataset.bookingId;
      confirmBookingCancellation(bookingId, container);
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#fecaca';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#fee2e2';
    });
  });

  container.querySelectorAll('.booking-action-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookingId = btn.dataset.bookingId;
      handleBookingEdit(bookingId, container);
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#bfdbfe';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#dbeafe';
    });
  });
}

// Confirm booking cancellation
function confirmBookingCancellation(bookingId, optionsContainer) {
  const booking = bookings.getBookingById(bookingId);
  if (!booking) return;

  if (confirm(`Подтвердите отмену бронирования:\n\nГость: ${booking.guestName}\nНомер: ${booking.roomName}\nДаты: ${bookings.formatBooking(booking).checkInFormatted} - ${bookings.formatBooking(booking).checkOutFormatted}\n\nОтменить это бронирование?`)) {
    // Cancel booking
    bookings.cancelBooking(bookingId);

    // Remove options container
    optionsContainer.remove();

    // Show success message
    addMessage(`✓ Бронирование для ${booking.guestName} успешно отменено.\n\nНомер: ${booking.roomName}\nДаты: ${bookings.formatBooking(booking).checkInFormatted} - ${bookings.formatBooking(booking).checkOutFormatted}\n\nЕсли нужна помощь с новым бронированием, обращайтесь!`, 'ai');

    // Show Telegram confirmation modal
    setTimeout(() => {
      showTelegramBookingModal();
    }, 800);

    // Reset cancellation state
    resetCancellationState();

    // Update admin panel if open
    if (typeof window.renderBookingsList === 'function') {
      window.renderBookingsList();
    }
  }
}

// Handle booking edit (show edit options)
function handleBookingEdit(bookingId, optionsContainer) {
  const booking = bookings.getBookingById(bookingId);
  if (!booking) return;

  // Remove options container
  optionsContainer.remove();

  // Reset cancellation state
  resetCancellationState();

  // Show edit booking options (with beautiful UI)
  showEditBookingOptions(booking);
}

// ========================================
// LANGUAGE FUNCTIONS
// ========================================

// Get current translation
export function getTranslation(key) {
  const t = translations[currentLang] || translations['en'];
  return t[key] || translations['en'][key] || key;
}

// Switch language
// Render Language Menu
// Render Language Menu (Sheet List)
function renderLanguageMenu() {
  const list = document.getElementById('language-sheet-list');
  const display = document.getElementById('current-lang-display');

  // Update current lang display on main menu
  if (display) {
    display.textContent = currentLang.toUpperCase();
  }

  if (!list) return;

  list.innerHTML = '';
  languagesList.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'language-option w-full text-left p-4 hover:bg-gray-50 rounded-xl flex items-center justify-between transition-colors';

    if (lang.code === currentLang) {
      btn.classList.add('bg-blue-50', 'text-blue-600', 'font-medium', 'active');
    } else {
      btn.classList.add('text-gray-700');
    }

    btn.dataset.lang = lang.code;
    btn.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-xl">${lang.flag}</span>
        <span class="text-base">${lang.name}</span>
      </div>
      ${lang.code === currentLang ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ` : ''}
    `;
    list.appendChild(btn);
  });
}

// Switch Language
export function switchLanguage(langCode) {
  if (!translations[langCode]) {
    console.warn(`Language ${langCode} not found, falling back to English`);
    langCode = 'en';
  }

  currentLang = langCode;
  localStorage.setItem(LANGUAGE_KEY, langCode);

  // Update UI texts
  updateUITexts();

  // Update active state in menu
  updateLanguageMenuState();

  // Set RTL for Arabic
  if (langCode === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.removeAttribute('dir');
  }

  // Close menu
  closeHeaderMenu();
  closeLanguageSubmenu();

  // Send welcome message in new language
  addMessage(getTranslation('welcome'), 'ai');
  addToConversationHistory('assistant', getTranslation('welcome'));
}

// Update all UI texts based on current language
export function updateUITexts() {
  const t = translations[currentLang] || translations['en'];

  // Update placeholder
  if (dom.messageInput) {
    dom.messageInput.placeholder = t.placeholder || 'Type a message...';
  }

  // Update data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });

  // Update offer card texts
  const offerBadge = document.querySelector('.offer-badge');
  if (offerBadge) offerBadge.textContent = t.personalOffer || 'Personal Offer';

  const offerSubtitle = document.querySelector('.offer-subtitle');
  if (offerSubtitle) offerSubtitle.textContent = t.selectedForYou || 'Selected specially for you';

  const confirmBtn = dom.offerConfirmBtn;
  if (confirmBtn) {
    const btnText = confirmBtn.querySelector('svg')?.nextSibling;
    if (btnText) {
      confirmBtn.innerHTML = confirmBtn.querySelector('svg').outerHTML + '\n          ' + (t.confirmBooking || 'Confirm Booking');
    }
  }

  const editBtn = dom.offerEditBtn;
  if (editBtn) {
    const btnSvg = editBtn.querySelector('svg');
    if (btnSvg) {
      editBtn.innerHTML = btnSvg.outerHTML + '\n          ' + (t.editDetails || 'Edit Details');
    }
  }

  // Update status texts
  updateSpecialBookingStatusTexts();
}

// Update Special Booking status texts for current language
function updateSpecialBookingStatusTexts() {
  const t = translations[currentLang] || translations['en'];

  // Update the SPECIAL_BOOKING_STATUSES object reference is not possible
  // So we update directly in showSpecialBookingStatus
}

// Update language menu active state
// Update language menu active state
function updateLanguageMenuState() {
  // Re-render the menu to update checkmarks and styles
  renderLanguageMenu();
}



// Get conversation history for external use
export function getConversationHistory() {
  return bookingState.conversationHistory;
}

// Auto Resize Textarea
export function autoResize() {
  dom.messageInput.style.height = 'auto';
  dom.messageInput.style.height = Math.min(dom.messageInput.scrollHeight, 120) + 'px';
  // Update scroll button position when textarea resizes
  updateScrollButtonPosition();
}

// Update scroll button position based on footer height
export function updateScrollButtonPosition() {
  const footerHeight = dom.chatFooter?.offsetHeight || 100;
  const baseOffset = 16;
  const bottomPosition = footerHeight + baseOffset;
  document.documentElement.style.setProperty('--scroll-btn-bottom', `${bottomPosition}px`);
}

// Update Send Button State
export function updateSendButtonState() {
  const hasText = dom.messageInput.value.trim().length > 0;
  if (hasText) {
    dom.sendButton.classList.add('is-active');
  } else {
    dom.sendButton.classList.remove('is-active');
  }
}

// Initialize Language
export function initLanguage() {
  const t = translations[currentLang] || translations['en'];
  if (dom.messageInput) {
    dom.messageInput.placeholder = t.placeholder || 'Type a message...';
  }
  if (dom.chatButtonText && dom.buttonTextSelect) {
    dom.chatButtonText.textContent = dom.buttonTextSelect.value;
  }
  // Update language menu state
  renderLanguageMenu();
  updateLanguageMenuState();
}

// Toggle Chat Window
export function toggleChat() {
  const isOpen = dom.chatWindow.classList.contains('open');
  const isMobile = window.innerWidth < 768;

  if (isOpen) {
    // Closing widget
    notificationState.isWidgetOpen = false;
    dom.chatWindow.classList.remove('open');
    dom.widgetButton.style.display = 'flex';
    if (isMobile) {
      dom.openAdminBtn.style.display = '';
      dom.adminPanel.classList.add('hidden-panel');
      dom.openAdminBtn.classList.remove('hidden-btn');
    }
    // Close room detail view if open
    closeRoomDetailView();
  } else {
    // Opening widget
    notificationState.isWidgetOpen = true;

    // Reset unread notifications
    resetUnreadCount();
    hideNewMessagesMarker();

    // Load booking state when opening chat
    loadBookingState();

    dom.chatWindow.classList.add('open');
    dom.widgetButton.style.display = 'none';
    dom.messageInput.focus();
    if (isMobile) {
      dom.adminPanel.classList.add('hidden-panel');
      dom.openAdminBtn.style.display = 'none';
    }

    // Check welcome state
    checkWelcomeState();

    if (!welcomed && sessionTermsAccepted) {
      simulateWelcome();
      welcomed = true;
    }
  }
}

// Session state for terms acceptance
let sessionTermsAccepted = false;

// Check Welcome State
function checkWelcomeState() {
  if (!sessionTermsAccepted && dom.welcomeModal) {
    dom.welcomeModal.classList.remove('hidden');
  }
}

// Initialize Welcome Listeners
export function initWelcomeListeners() {
  if (dom.welcomeStartBtn) {
    dom.welcomeStartBtn.addEventListener('click', () => {
      sessionTermsAccepted = true;
      if (dom.welcomeModal) dom.welcomeModal.classList.add('hidden');

      // Trigger welcome message if not yet welcomed
      if (!welcomed) {
        simulateWelcome();
        welcomed = true;
      }
    });
  }

  if (dom.legalLinks) {
    dom.legalLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.dataset.url;
        if (dom.legalIframe && dom.legalModal) {
          dom.legalIframe.src = url;
          dom.legalModal.classList.remove('hidden');
        }
      });
    });
  }

  if (dom.legalBackBtn) {
    dom.legalBackBtn.addEventListener('click', () => {
      if (dom.legalModal) {
        dom.legalModal.classList.add('hidden');
        // Optional: clear iframe to stop playing video/audio etc if any
        if (dom.legalIframe) setTimeout(() => { dom.legalIframe.src = ''; }, 300);
      }
    });
  }
}

// Show Typing Indicator
export function showTyping() {
  dom.typingIndicator.classList.remove('hidden');
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
}

// Hide Typing Indicator
export function hideTyping() {
  dom.typingIndicator.classList.add('hidden');
}

// Simulate Welcome Message
export function simulateWelcome() {
  showTyping();
  setTimeout(() => {
    hideTyping();
    addMessage(translations[currentLang].welcome, 'ai');
  }, 1000);
}

// Add Message to Chat
export function addMessage(text, sender) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${sender} animate-fade-in`;

  const messageElement = document.createElement('div');
  messageElement.className = `chat-message-${sender} text-base leading-relaxed`;
  messageElement.innerHTML = text.replace(/\n/g, '<br>');

  const timeElement = document.createElement('span');
  timeElement.className = 'message-time';
  timeElement.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (sender === 'user') {
    wrapper.appendChild(timeElement);
    wrapper.appendChild(messageElement);
  } else {
    wrapper.appendChild(messageElement);
    wrapper.appendChild(timeElement);
  }

  dom.messagesContainer.insertBefore(wrapper, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Handle notification for new AI messages
  handleNewMessageNotification(sender);
}

// Add Room Carousel to Chat
export function addRoomCarousel() {
  const allRooms = rooms.getAllRooms();
  if (allRooms.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai animate-fade-in';

  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'rooms-carousel-wrapper';

  const carousel = document.createElement('div');
  carousel.className = 'rooms-carousel';

  allRooms.forEach(room => {
    const card = document.createElement('div');
    card.className = 'room-carousel-card';
    card.dataset.roomId = room.id;

    const hasMainPhoto = !!room.mainPhoto;
    const hasGallery = room.gallery && room.gallery.length > 0;
    const allPhotos = [];
    if (hasMainPhoto) allPhotos.push(room.mainPhoto);
    if (hasGallery) allPhotos.push(...room.gallery);
    const hasMultiplePhotos = allPhotos.length > 1;

    // Marketing elements
    const badgeInfo = room.badge ? rooms.getBadgeInfo(room.badge) : null;
    const hasDiscount = room.discount > 0 && room.originalPrice > 0;
    const hasLeftCount = room.leftCount > 0;

    // Reviews calculation
    let ratingHTML = '';
    const reviews = room.reviews || [];
    if (reviews.length > 0) {
      const avgRating = (reviews.reduce((sum, r) => sum + parseInt(r.rating), 0) / reviews.length).toFixed(1);
      ratingHTML = `
        <div class="room-carousel-rating">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="rating-value">${avgRating}</span>
          <span class="rating-count">(${reviews.length})</span>
        </div>
      `;
    }

    // Build image track (like services)
    let imageTrackHTML = '';
    if (allPhotos.length > 0) {
      imageTrackHTML = allPhotos.map((photo, idx) =>
        `<img class="room-carousel-image" src="${photo}" alt="${room.name} ${idx + 1}" data-index="${idx}">`
      ).join('');
    } else {
      imageTrackHTML = `
        <div class="room-carousel-image room-carousel-placeholder" style="display:flex;align-items:center;justify-content:center;color:#9ca3af;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
      `;
    }

    // Build dots indicator
    let dotsHTML = '';
    if (hasMultiplePhotos) {
      dotsHTML = `<div class="room-image-dots">` +
        allPhotos.map((_, idx) => `<div class="room-image-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`).join('') +
        `</div>`;
    }

    // Build navigation arrows
    let navHTML = '';
    if (hasMultiplePhotos) {
      navHTML = `
        <button class="room-image-nav prev" disabled>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button class="room-image-nav next">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      `;
    }

    // Marketing badges HTML
    let badgesHTML = '';
    if (badgeInfo) {
      badgesHTML += `<div class="carousel-badge ${badgeInfo.class}">${badgeInfo.label}</div>`;
    }
    if (hasLeftCount) {
      badgesHTML += `<div class="carousel-left-count">Залишилось: ${room.leftCount}</div>`;
    }

    // Price HTML with discount
    let priceHTML = '';
    if (hasDiscount) {
      priceHTML = `
        <div class="room-carousel-price-wrapper">
          <span class="room-carousel-original-price">${rooms.formatPrice(room.originalPrice)}</span>
          <span class="room-carousel-price">${rooms.formatPrice(room.pricePerNight)}</span>
          <span class="room-carousel-discount">-${room.discount}%</span>
        </div>
      `;
    } else {
      priceHTML = `<div class="room-carousel-price">${rooms.formatPrice(room.pricePerNight)}</div>`;
    }

    card.innerHTML = `
      <div class="room-carousel-image-container">
        ${badgesHTML ? `<div class="carousel-badges">${badgesHTML}</div>` : ''}
        <div class="room-carousel-images-track" data-current-index="0">
          ${imageTrackHTML}
        </div>
        ${navHTML}
        ${dotsHTML}
        <div class="room-carousel-overlay">
          <div class="room-carousel-actions">
            <button class="room-carousel-action-btn primary" data-action="book" data-room-id="${room.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Забронювати
            </button>
            ${room.askQuestionEnabled !== false ? `
              <button class="room-carousel-action-btn secondary" data-action="ask" data-room-id="${room.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Питання
              </button>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="room-carousel-info">
        <div class="room-carousel-name">${room.name || 'Без назви'}</div>
        <div class="room-carousel-name">${room.name || 'Без назви'}</div>
        ${ratingHTML}
        ${priceHTML}
        <div class="room-carousel-area">${rooms.formatArea(room.area)}</div>
      </div>
    `;

    // Handle image navigation (like services)
    if (hasMultiplePhotos) {
      const track = card.querySelector('.room-carousel-images-track');
      const prevBtn = card.querySelector('.room-image-nav.prev');
      const nextBtn = card.querySelector('.room-image-nav.next');
      const dots = card.querySelectorAll('.room-image-dot');
      const totalImages = allPhotos.length;

      const updateNav = (currentIndex) => {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === totalImages - 1;
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentIndex);
        });
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      };

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentIndex = parseInt(track.dataset.currentIndex) || 0;
        if (currentIndex > 0) {
          currentIndex--;
          track.dataset.currentIndex = currentIndex;
          updateNav(currentIndex);
        }
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentIndex = parseInt(track.dataset.currentIndex) || 0;
        if (currentIndex < totalImages - 1) {
          currentIndex++;
          track.dataset.currentIndex = currentIndex;
          updateNav(currentIndex);
        }
      });

      // Click on dots
      dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(dot.dataset.index);
          track.dataset.currentIndex = idx;
          updateNav(idx);
        });
      });
    }

    // Handle action button clicks
    card.querySelectorAll('.room-carousel-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const roomId = btn.dataset.roomId;
        if (action === 'book') {
          openRoomDetailView(roomId);
        } else if (action === 'ask') {
          enterRoomContext(roomId);
        }
      });
    });

    // Click on card opens detail view
    card.addEventListener('click', () => {
      openRoomDetailView(room.id);
    });

    carousel.appendChild(card);
  });

  carouselWrapper.appendChild(carousel);
  wrapper.appendChild(carouselWrapper);

  dom.messagesContainer.insertBefore(wrapper, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
}

// ===== ROOMS VIA AGENT =====

// State for room selection mode
let roomSelectionMode = false;

// Show all rooms via agent (from menu)
export function showRoomsViaAgent() {
  const allRooms = rooms.getAllRooms();

  if (allRooms.length === 0) {
    addMessage('На жаль, наразі немає доступних номерів.', 'ai');
    return;
  }

  // Build rooms text description
  let roomsText = '🏨 <strong>Наші номери:</strong>\n\n';

  allRooms.forEach((room, index) => {
    roomsText += `<strong>${index + 1}. ${room.name}</strong>\n`;
    roomsText += `   📐 ${room.area || '—'} м² | 💵 $${room.pricePerNight}/ніч\n`;
    if (room.description) {
      const shortDesc = room.description.length > 80
        ? room.description.slice(0, 80) + '...'
        : room.description;
      roomsText += `   ${shortDesc}\n`;
    }
    roomsText += '\n';
  });

  roomsText += '---\nЯкий тип номера вас цікавить? Розкажіть про ваші побажання — кількість гостей, вид з вікна, поверх чи інші особливі вимоги.';

  addMessage(roomsText, 'ai');
  addToConversationHistory('assistant', roomsText);

  // Show room carousel
  setTimeout(() => {
    addRoomCarousel();
  }, 300);

  // Set room selection mode
  roomSelectionMode = true;
}

// Offer additional services after room selection
export function offerServicesAfterRoomSelection(selectedRoomName) {
  const allServices = services.getAllServices();

  if (allServices.length === 0) return;

  roomSelectionMode = false;

  addMessage(`Чудово! Ви обрали "${selectedRoomName}". Можу запропонувати додаткові послуги для вашого комфорту:`, 'ai');

  // Show services carousel after a short delay
  setTimeout(() => {
    addServicesCarousel();
  }, 500);
}

// Check if room was selected in message (for room selection mode)
export function checkRoomSelectionInMessage(message) {
  if (!roomSelectionMode) return false;

  const allRooms = rooms.getAllRooms();
  const lowerMessage = message.toLowerCase();

  // Check if any room name is mentioned
  const selectedRoom = allRooms.find(room =>
    room.name && lowerMessage.includes(room.name.toLowerCase())
  );

  if (selectedRoom) {
    setRoomContext(selectedRoom);
    offerServicesAfterRoomSelection(selectedRoom.name);
    return true;
  }

  return false;
}

// Add Services Carousel to Chat
export function addServicesCarousel() {
  const allServices = services.getAllServices();
  if (allServices.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai animate-fade-in';

  const container = document.createElement('div');
  container.className = 'services-carousel-container';

  // Header with title
  const header = document.createElement('div');
  header.className = 'services-carousel-header';
  header.innerHTML = `
    <span class="services-carousel-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      Додаткові послуги
    </span>
  `;

  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'services-carousel-wrapper';

  const carousel = document.createElement('div');
  carousel.className = 'services-carousel';

  allServices.forEach(service => {
    const card = document.createElement('div');
    card.className = 'service-carousel-card';
    card.dataset.serviceId = service.id;

    const hasMainPhoto = !!service.mainPhoto;
    const hasGallery = service.gallery && service.gallery.length > 0;
    const allPhotos = [];
    if (hasMainPhoto) allPhotos.push(service.mainPhoto);
    if (hasGallery) allPhotos.push(...service.gallery);
    const hasMultiplePhotos = allPhotos.length > 1;

    // Build image track
    let imageTrackHTML = '';
    if (allPhotos.length > 0) {
      imageTrackHTML = allPhotos.map((photo, idx) =>
        `<img class="service-carousel-image" src="${photo}" alt="${service.name} ${idx + 1}" data-index="${idx}">`
      ).join('');
    } else {
      imageTrackHTML = `
        <div class="service-carousel-image" style="display:flex;align-items:center;justify-content:center;color:#9ca3af;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>
      `;
    }

    // Build dots indicator
    let dotsHTML = '';
    if (hasMultiplePhotos) {
      dotsHTML = `<div class="service-image-dots">` +
        allPhotos.map((_, idx) => `<div class="service-image-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`).join('') +
        `</div>`;
    }

    // Build navigation arrows
    let navHTML = '';
    if (hasMultiplePhotos) {
      navHTML = `
        <button class="service-image-nav prev" disabled>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button class="service-image-nav next">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      `;
    }

    // Marketing elements
    const badgeInfo = service.badge ? services.getBadgeInfo(service.badge) : null;
    const hasDiscount = service.discount > 0 && service.originalPrice > 0;
    const hasLeftCount = service.leftCount > 0;

    // Reviews calculation
    let ratingHTML = '';
    const reviews = service.reviews || [];
    if (reviews.length > 0) {
      const avgRating = (reviews.reduce((sum, r) => sum + parseInt(r.rating), 0) / reviews.length).toFixed(1);
      ratingHTML = `
        <div class="service-carousel-rating">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="rating-value">${avgRating}</span>
          <span class="rating-count">(${reviews.length})</span>
        </div>
      `;
    }

    // Marketing badges HTML
    let badgesHTML = '';
    if (badgeInfo) {
      badgesHTML += `<div class="carousel-badge ${badgeInfo.class}">${badgeInfo.label}</div>`;
    }
    if (hasLeftCount) {
      badgesHTML += `<div class="carousel-left-count">Залишилось: ${service.leftCount}</div>`;
    }

    // Price HTML with discount
    let priceHTML = '';
    if (hasDiscount) {
      priceHTML = `
        <div class="service-carousel-price-wrapper">
          <span class="service-carousel-original-price">${services.formatPrice(service.originalPrice, service.priceType)}</span>
          <span class="service-carousel-price">${services.formatPrice(service.price, service.priceType)}</span>
          <span class="service-carousel-discount">-${service.discount}%</span>
        </div>
      `;
    } else {
      priceHTML = `<div class="service-carousel-price">${services.formatPrice(service.price, service.priceType)}</div>`;
    }

    card.innerHTML = `
      <div class="service-carousel-image-container">
        ${badgesHTML ? `<div class="carousel-badges">${badgesHTML}</div>` : ''}
        <div class="service-carousel-images-track" data-current-index="0">
          ${imageTrackHTML}
        </div>
        ${navHTML}
        ${dotsHTML}
        <div class="service-carousel-overlay">
          <div class="service-carousel-actions">
            ${service.addToBookingEnabled !== false ? `
              <button class="service-carousel-action-btn primary" data-action="add" data-service-id="${service.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Додати
              </button>
            ` : ''}
            ${service.askQuestionEnabled !== false ? `
              <button class="service-carousel-action-btn secondary" data-action="ask" data-service-id="${service.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Питання
              </button>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="service-carousel-info">
        <div class="service-carousel-name">${service.name || 'Без назви'}</div>
        ${ratingHTML}
        ${service.description ? `<div class="service-carousel-description">${service.description}</div>` : ''}
        ${priceHTML}
        <span class="service-carousel-category">${services.getCategoryName(service.category)}</span>
      </div>
    `;

    // Handle image navigation
    if (hasMultiplePhotos) {
      const track = card.querySelector('.service-carousel-images-track');
      const prevBtn = card.querySelector('.service-image-nav.prev');
      const nextBtn = card.querySelector('.service-image-nav.next');
      const dots = card.querySelectorAll('.service-image-dot');
      const totalImages = allPhotos.length;

      const updateNav = (currentIndex) => {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === totalImages - 1;
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentIndex);
        });
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      };

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentIndex = parseInt(track.dataset.currentIndex) || 0;
        if (currentIndex > 0) {
          currentIndex--;
          track.dataset.currentIndex = currentIndex;
          updateNav(currentIndex);
        }
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentIndex = parseInt(track.dataset.currentIndex) || 0;
        if (currentIndex < totalImages - 1) {
          currentIndex++;
          track.dataset.currentIndex = currentIndex;
          updateNav(currentIndex);
        }
      });

      // Click on dots
      dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(dot.dataset.index);
          track.dataset.currentIndex = idx;
          updateNav(idx);
        });
      });
    }

    // Handle action button clicks
    card.querySelectorAll('.service-carousel-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const serviceId = btn.dataset.serviceId;
        const serviceData = services.getService(serviceId);

        if (action === 'add') {
          addMessage(`Хочу додати до бронювання: ${serviceData?.name}`, 'user');
          addToConversationHistory('user', `Хочу додати до бронювання: ${serviceData?.name}`);
          showTyping();
          setTimeout(() => {
            hideTyping();
            addMessage(`Чудово! Послугу "${serviceData?.name}" додано до вашого бронювання. Є ще щось, що вас цікавить?`, 'ai');
            addToConversationHistory('assistant', `Чудово! Послугу "${serviceData?.name}" додано до вашого бронювання. Є ще щось, що вас цікавить?`);
          }, 800);
        } else if (action === 'ask') {
          addMessage(`Маю питання про послугу: ${serviceData?.name}`, 'user');
          addToConversationHistory('user', `Маю питання про послугу: ${serviceData?.name}`);
          showTyping();
          setTimeout(() => {
            hideTyping();
            const description = serviceData?.description || 'Це одна з наших найпопулярніших послуг.';
            addMessage(`${serviceData?.name}\n\n${description}\n\nЦіна: ${services.formatPrice(serviceData?.price, serviceData?.priceType)}\n\nЧим ще можу допомогти?`, 'ai');
            addToConversationHistory('assistant', `${serviceData?.name}: ${description}`);
          }, 800);
        }
      });
    });

    // Handle card click to open detail view (click on info section)
    const infoSection = card.querySelector('.service-carousel-info');
    if (infoSection) {
      infoSection.style.cursor = 'pointer';
      infoSection.addEventListener('click', (e) => {
        e.stopPropagation();
        openServiceDetailView(service.id);
      });
    }

    carousel.appendChild(card);
  });

  carouselWrapper.appendChild(carousel);
  container.appendChild(header);
  container.appendChild(carouselWrapper);
  wrapper.appendChild(container);

  dom.messagesContainer.insertBefore(wrapper, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
}

// Show Room Service Form
export function showRoomServiceForm(category = 'food') {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai animate-fade-in';

  const container = document.createElement('div');
  container.className = 'room-service-container';
  container.innerHTML = generateRoomServiceFormHTML(category);

  wrapper.appendChild(container);
  dom.messagesContainer.insertBefore(wrapper, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;

  // Initialize form listeners
  initRoomServiceFormListeners(container, category);
}

// Generate Room Service Form HTML
function generateRoomServiceFormHTML(category) {
  const categories = roomService.SERVICE_CATEGORIES;

  return `
    <div class="room-service-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
      <h3>Room Service</h3>
    </div>

    <div class="room-service-body">
      <div class="room-number-input-group">
        <label>Номер кімнати</label>
        <input type="text" class="room-number-input" placeholder="напр. 305" maxlength="5" id="rs-room-number">
      </div>

      <div class="service-category-grid" id="rs-categories">
        ${Object.values(categories).map(cat => `
          <button class="service-category-btn ${cat.id === category ? 'active' : ''}" data-category="${cat.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${roomService.getCategoryIcon(cat.id)}
            </svg>
            <span>${cat.nameUa}</span>
          </button>
        `).join('')}
      </div>

      <div class="rs-content-scroll" id="rs-content">
        ${generateCategoryContent(category)}
      </div>

      <div class="rs-order-summary" id="rs-order-summary" style="display: none;">
        <div class="rs-order-summary-title">Ваше замовлення</div>
        <div class="rs-order-items" id="rs-order-items"></div>
        <div class="rs-order-total">
          <span>Всього</span>
          <span id="rs-order-total">$0</span>
        </div>
      </div>

      <div class="rs-special-instructions">
        <textarea placeholder="Особливі побажання (алергії, дієта...)" id="rs-instructions"></textarea>
      </div>

      <button class="rs-submit-btn" id="rs-submit" disabled>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Замовити
      </button>
    </div>
  `;
}

// Generate content based on category
function generateCategoryContent(category) {
  if (category === 'food') {
    return generateFoodMenuContent();
  } else if (category === 'cleaning') {
    return generateOptionsContent(roomService.CLEANING_OPTIONS, 'cleaning');
  } else if (category === 'towels') {
    return generateOptionsContent(roomService.TOWEL_OPTIONS, 'towels');
  } else if (category === 'minibar') {
    return generateOptionsContent(roomService.MINIBAR_OPTIONS, 'minibar');
  }
  return '';
}

// Generate Food Menu HTML
function generateFoodMenuContent() {
  const menu = roomService.RESTAURANT_MENU;
  let html = '<div class="rs-menu-section">';

  for (const [sectionKey, section] of Object.entries(menu)) {
    html += `
      <div class="rs-menu-category">
        <div class="rs-menu-category-title">${section.name}</div>
        <div class="rs-menu-items-list">
          ${section.items.map(item => `
            <div class="rs-menu-item-card" data-item-id="${item.id}" data-item-name="${item.name}" data-price="${item.price}">
              <div class="rs-menu-item-info">
                <div class="rs-menu-item-name">${item.name}</div>
                <div class="rs-menu-item-description">${item.description}</div>
              </div>
              <div class="rs-menu-item-price">$${item.price}</div>
              <div class="rs-menu-item-checkbox">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

// Generate Options Content (for cleaning, towels, minibar)
function generateOptionsContent(options, type) {
  return `
    <div class="rs-service-options">
      ${options.map(opt => `
        <div class="rs-service-option-btn" data-option-id="${opt.id}" data-option-name="${opt.name}" data-type="${type}">
          <div class="rs-service-option-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div class="rs-service-option-info">
            <div class="rs-service-option-name">${opt.name}</div>
            <div class="rs-service-option-desc">${opt.description}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Initialize Room Service Form Event Listeners
function initRoomServiceFormListeners(container, initialCategory) {
  let selectedItems = [];
  let currentCategory = initialCategory;

  // Room number input
  const roomInput = container.querySelector('#rs-room-number');

  // Category buttons
  container.querySelectorAll('.service-category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.service-category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;

      // Clear selection when switching categories
      selectedItems = [];
      updateOrderSummary();

      // Update content
      const contentArea = container.querySelector('#rs-content');
      if (contentArea) {
        contentArea.innerHTML = generateCategoryContent(currentCategory);
        initContentListeners();
      }

      validateForm();
    });
  });

  // Initialize content listeners
  function initContentListeners() {
    // Food menu items
    container.querySelectorAll('.rs-menu-item-card').forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
        const itemId = card.dataset.itemId;
        const itemName = card.dataset.itemName;
        const price = parseFloat(card.dataset.price);

        if (card.classList.contains('selected')) {
          selectedItems.push({ id: itemId, name: itemName, price });
        } else {
          selectedItems = selectedItems.filter(i => i.id !== itemId);
        }

        updateOrderSummary();
        validateForm();
      });
    });

    // Service options (cleaning, towels, minibar)
    container.querySelectorAll('.rs-service-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // For cleaning and minibar - single select; for towels - multi select
        const type = btn.dataset.type;
        if (type === 'towels') {
          btn.classList.toggle('selected');
        } else {
          container.querySelectorAll('.rs-service-option-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        }

        // Update selected items
        if (type === 'towels') {
          const optionId = btn.dataset.optionId;
          const optionName = btn.dataset.optionName;
          if (btn.classList.contains('selected')) {
            if (!selectedItems.find(i => i.id === optionId)) {
              selectedItems.push({ id: optionId, name: optionName, price: 0 });
            }
          } else {
            selectedItems = selectedItems.filter(i => i.id !== optionId);
          }
        } else {
          selectedItems = [{
            id: btn.dataset.optionId,
            name: btn.dataset.optionName,
            price: 0
          }];
        }

        updateOrderSummary();
        validateForm();
      });
    });
  }

  initContentListeners();

  // Update order summary
  function updateOrderSummary() {
    const summaryEl = container.querySelector('#rs-order-summary');
    const itemsEl = container.querySelector('#rs-order-items');
    const totalEl = container.querySelector('#rs-order-total');

    if (selectedItems.length === 0) {
      if (summaryEl) summaryEl.style.display = 'none';
      return;
    }

    if (summaryEl) summaryEl.style.display = 'block';

    if (itemsEl) {
      itemsEl.innerHTML = selectedItems.map(item => `
        <div class="rs-order-item">
          <span class="rs-order-item-name">${item.name}</span>
          ${item.price > 0 ? `<span>$${item.price}</span>` : ''}
        </div>
      `).join('');
    }

    const total = selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
    if (totalEl) {
      totalEl.textContent = total > 0 ? `$${total}` : 'Безкоштовно';
    }
  }

  // Validate form
  function validateForm() {
    const roomNumber = roomInput?.value?.trim() || '';
    const hasItems = selectedItems.length > 0;
    const submitBtn = container.querySelector('#rs-submit');

    if (submitBtn) {
      submitBtn.disabled = !roomNumber || !hasItems;
    }
  }

  // Room number input validation
  if (roomInput) {
    roomInput.addEventListener('input', validateForm);
  }

  // Submit order
  const submitBtn = container.querySelector('#rs-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const roomNumber = roomInput?.value?.trim() || '';
      const instructions = container.querySelector('#rs-instructions')?.value?.trim() || '';

      if (!roomNumber || selectedItems.length === 0) return;

      // Create and submit order
      roomService.createOrder(roomNumber, currentCategory);
      selectedItems.forEach(item => roomService.addItemToOrder(item));
      roomService.setSpecialInstructions(instructions);

      const order = roomService.submitOrder();
      const total = selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);

      // Remove form
      const wrapper = container.closest('.message-wrapper');
      if (wrapper) wrapper.remove();

      // Show confirmation message
      let confirmationText = `Ваше замовлення прийнято!\n\n`;
      confirmationText += `Номер замовлення: ${order.id}\n`;
      confirmationText += `Кімната: ${roomNumber}\n`;
      confirmationText += `Замовлення: ${selectedItems.map(i => i.name).join(', ')}\n`;
      if (total > 0) {
        confirmationText += `Сума: $${total}\n`;
      }
      confirmationText += `\nОрієнтовний час виконання: `;

      if (currentCategory === 'food') {
        confirmationText += '30-45 хвилин';
      } else if (currentCategory === 'cleaning') {
        confirmationText += '15-20 хвилин';
      } else if (currentCategory === 'towels') {
        confirmationText += '10-15 хвилин';
      } else {
        confirmationText += '20-30 хвилин';
      }

      addMessage(confirmationText, 'ai');
      addToConversationHistory('assistant', confirmationText);
    });
  }
}

// Add Room Context Badge
export function addRoomContextBadge(room) {
  const container = document.getElementById('room-context-container');
  if (!container) return;

  // Clear container
  container.innerHTML = '';

  const badge = document.createElement('div');
  badge.className = 'room-context-badge animate-fade-in';
  badge.innerHTML = `
    ${room.mainPhoto
      ? `<img src="${room.mainPhoto}" alt="${room.name}">`
      : `<div style="width:40px;height:40px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        </div>`
    }
    <div class="room-context-badge-info">
      <div class="room-context-badge-name">${room.name}</div>
      <div class="room-context-badge-hint">Обговорюємо цей номер</div>
    </div>
    <div class="room-context-actions">
      <button class="room-context-action room-context-book" data-action="book">Забронювати</button>
      <button class="room-context-action room-context-change" data-action="change">Інший номер</button>
    </div>
  `;

  // Add action button listeners
  badge.querySelector('[data-action="book"]').addEventListener('click', () => {
    // Add booking message
    addMessage('Чудово! Для бронювання номера, будь ласка, зверніться до нашого менеджера або залиште ваші контактні дані.', 'ai');
  });

  badge.querySelector('[data-action="change"]').addEventListener('click', () => {
    clearRoomContext();
    setTimeout(() => addRoomCarousel(), 300);
  });

  container.appendChild(badge);
  container.classList.remove('hidden');
}

// Clear room context
export function clearRoomContext(silent = false) {
  selectedRoom = null;
  chatMode = 'general';

  const container = document.getElementById('room-context-container');
  if (container) {
    container.classList.add('hidden');
    container.innerHTML = '';
  }

  if (!silent) {
    addMessage('Повертаюсь до загального чату. Чим ще можу допомогти?', 'ai');
  }
}

// Set Button Loading State
export function setButtonLoading(isLoading) {
  if (isLoading) {
    dom.sendButton.classList.add('is-loading');
    dom.sendButton.disabled = true;
    dom.messageInput.disabled = true;
  } else {
    dom.sendButton.classList.remove('is-loading');
    dom.sendButton.disabled = false;
    dom.messageInput.disabled = false;
    dom.messageInput.focus();
    autoResize();
  }
}

// Get AI Response (main handler)
export async function getAIResponse(userMessage) {
  const hotelName = document.getElementById('hotel-name-input')?.value || 'Hilton';

  // Add user message to conversation history
  addToConversationHistory('user', userMessage);

  // Check if user is in room selection mode (from menu)
  if (checkRoomSelectionInMessage(userMessage)) {
    hideTyping();
    setButtonLoading(false);
    isGenerating = false;
    return;
  }

  // Check for room service intent
  const rsIntent = roomService.detectRoomServiceIntent(userMessage);
  if (rsIntent.hasIntent) {
    hideTyping();
    setButtonLoading(false);
    isGenerating = false;
    showRoomServiceForm(rsIntent.category);
    return;
  }

  // Check if user wants to cancel/edit booking (with type detection)
  const modificationIntent = detectBookingModificationIntent(userMessage);
  const hasCancellationIntent = detectCancellationIntent(userMessage);

  // Handle booking modification (cancel or edit) by searching in database
  if ((modificationIntent.hasIntent || hasCancellationIntent) && !cancellationState.isActive) {
    hideTyping();
    setButtonLoading(false);
    isGenerating = false;

    // Store the modification type for later use
    cancellationState.modificationType = modificationIntent.type || 'cancel';

    // Start cancellation/edit process with interactive search
    handleBookingCancellationByName(userMessage);
    return;
  }

  // If already in cancellation process, let the search form handle it
  if (cancellationState.isActive && cancellationState.stage === 'awaiting_search_params') {
    hideTyping();
    setButtonLoading(false);
    isGenerating = false;

    // User might be providing search parameters in follow-up message
    performBookingSearch(userMessage, document.getElementById('booking-search-form'));
    return;
  }

  try {
    let response;

    // Check if we should auto-activate Special Booking mode
    if (!specialBookingState.isActive && shouldActivateSpecialBooking(userMessage, bookingState.conversationHistory)) {
      // Extract requirements from message
      const requirements = openai.extractRequirements(userMessage);
      specialBookingState.requirements = requirements;

      activateSpecialBookingMode('auto');

      // Process in special booking mode
      updateSpecialBookingStatus('analyzing');
      response = await openai.getSpecialBookingAIResponse(
        userMessage,
        specialBookingState.requirements,
        bookingState,
        bookingState.conversationHistory,
        determineSpecialBookingStage()
      );

      hideTyping();
      setButtonLoading(false);
      isGenerating = false;

      // Update booking state with extracted data
      if (response.extractedData) {
        updateBookingStateWithExtracted(response.extractedData);
      }

      // Update requirements
      const newRequirements = openai.extractRequirements(userMessage);
      newRequirements.forEach(req => {
        if (!specialBookingState.requirements.find(r => r.type === req.type)) {
          specialBookingState.requirements.push(req);
        }
      });

      addMessage(response.text, 'ai');
      addToConversationHistory('assistant', response.text);

      // Check for offer data
      if (response.hasOffer && response.offerData) {
        showSpecialOfferCard(response.offerData);
      } else {
        // Update status based on progress
        const newStage = determineSpecialBookingStage();
        updateSpecialBookingStatus(newStage);
      }

      return;
    }

    // Handle Special Booking mode responses
    if (chatMode === 'special-booking' && specialBookingState.isActive) {
      // Update requirements from message
      const newRequirements = openai.extractRequirements(userMessage);
      newRequirements.forEach(req => {
        if (!specialBookingState.requirements.find(r => r.type === req.type)) {
          specialBookingState.requirements.push(req);
        }
      });

      // Determine stage
      const stage = determineSpecialBookingStage();
      updateSpecialBookingStatus(stage === 'generating' ? 'generating' : 'analyzing');

      response = await openai.getSpecialBookingAIResponse(
        userMessage,
        specialBookingState.requirements,
        bookingState,
        bookingState.conversationHistory,
        stage
      );

      hideTyping();
      setButtonLoading(false);
      isGenerating = false;

      // Update booking state with extracted data
      if (response.extractedData) {
        updateBookingStateWithExtracted(response.extractedData);
      }

      addMessage(response.text, 'ai');
      addToConversationHistory('assistant', response.text);

      // Check for offer data
      if (response.hasOffer && response.offerData) {
        showSpecialOfferCard(response.offerData);
      } else {
        // Update status based on new progress
        const newStage = determineSpecialBookingStage();
        updateSpecialBookingStatus(newStage);
      }

      return;
    }

    // Check if we're in room context but user asks about general topic
    if (chatMode === 'room-context' && selectedRoom && openai.isGeneralTopic(userMessage)) {
      // Auto-break room context for general topics
      clearRoomContext(true); // silent - don't add message
      addMessage('Зрозуміло, повертаюсь до загальних питань.', 'ai');
      addToConversationHistory('assistant', 'Зрозуміло, повертаюсь до загальних питань.');

      // Process as general response
      response = await openai.getGeneralAIResponse(
        userMessage,
        hotelName,
        bookingState,
        bookingState.conversationHistory
      );
      hideTyping();
      setButtonLoading(false);
      isGenerating = false;

      // Update booking state with extracted data
      if (response.extractedData) {
        updateBookingStateWithExtracted(response.extractedData);
      }

      addMessage(response.text, 'ai');
      addToConversationHistory('assistant', response.text);

      // Show rooms carousel if intent detected
      if (response.showRoomsCarousel) {
        setTimeout(() => addRoomCarousel(), 500);
      }

      // Show services carousel if intent detected
      if (response.showServicesCarousel) {
        setTimeout(() => addServicesCarousel(), response.showRoomsCarousel ? 800 : 500);
      }
    } else if (chatMode === 'room-context' && selectedRoom) {
      // Room-specific response
      response = await openai.getRoomAIResponse(
        userMessage,
        selectedRoom,
        hotelName,
        bookingState,
        bookingState.conversationHistory
      );
      hideTyping();
      setButtonLoading(false);
      isGenerating = false;

      // Update booking state with extracted data
      if (response.extractedData) {
        updateBookingStateWithExtracted(response.extractedData);
      }

      addMessage(response.text, 'ai');
      addToConversationHistory('assistant', response.text);
    } else {
      // General response
      response = await openai.getGeneralAIResponse(
        userMessage,
        hotelName,
        bookingState,
        bookingState.conversationHistory
      );
      hideTyping();
      setButtonLoading(false);
      isGenerating = false;

      // Update booking state with extracted data
      if (response.extractedData) {
        updateBookingStateWithExtracted(response.extractedData);
      }

      addMessage(response.text, 'ai');
      addToConversationHistory('assistant', response.text);

      // Show rooms carousel if intent detected
      if (response.showRoomsCarousel) {
        setTimeout(() => addRoomCarousel(), 500);
      }

      // Show services carousel if intent detected
      if (response.showServicesCarousel) {
        setTimeout(() => addServicesCarousel(), response.showRoomsCarousel ? 800 : 500);
      }
    }
  } catch (error) {
    hideTyping();
    setButtonLoading(false);
    isGenerating = false;
    addMessage('Вибачте, сталася помилка. Спробуйте ще раз.', 'ai');
  }
}

// Handle Send Message
export function handleSendMessage() {
  if (isGenerating) return;

  const text = dom.messageInput.value.trim();
  if (text === '') return;

  isGenerating = true;
  addMessage(text, 'user');
  dom.messageInput.value = '';
  dom.messageInput.style.height = 'auto';
  updateSendButtonState();
  setButtonLoading(true);
  showTyping();
  getAIResponse(text);
}

// Reset Chat
export function resetChat() {
  const indicatorHTML = dom.typingIndicator.outerHTML;
  dom.messagesContainer.innerHTML = '';
  dom.messagesContainer.innerHTML = indicatorHTML;
  dom.updateTypingIndicator();

  dom.scrollToBottomBtn.classList.remove('visible');

  welcomed = false;
  isGenerating = false;
  selectedRoom = null;
  chatMode = 'general';

  // Reset booking state
  resetBookingState();

  // Reset Special Booking state
  specialBookingState = {
    isActive: false,
    activatedBy: null,
    stage: 'collecting',
    requirements: [],
    currentOffer: null
  };
  hideSpecialBookingStatus();
  hideSpecialOfferCard();

  // Reset cancellation state
  cancellationState = {
    isActive: false,
    action: null,
    stage: 'initial',
    searchAttempts: 0,
    lastSearchType: null
  };

  // Clear room context container
  const container = document.getElementById('room-context-container');
  if (container) {
    container.classList.add('hidden');
    container.innerHTML = '';
  }

  setButtonLoading(false);
  simulateWelcome();
  updateSendButtonState();
  closeRoomDetailView();
}

// Check Scroll Button Visibility
export function checkScrollButtonVisibility() {
  const distanceToBottom = dom.messagesContainer.scrollHeight -
    (dom.messagesContainer.scrollTop + dom.messagesContainer.clientHeight);
  const isScrolledUp = distanceToBottom > 100;

  const tgBanner = document.getElementById('telegram-banner');
  const isTgEnabled = document.getElementById('tg-toggle').checked;

  const isBannerExpanded = isTgEnabled && tgBanner &&
    tgBanner.classList.contains('show-banner') &&
    !tgBanner.classList.contains('collapsed');

  if (isScrolledUp && !isBannerExpanded) {
    dom.scrollToBottomBtn.classList.add('visible');
  } else {
    dom.scrollToBottomBtn.classList.remove('visible');
  }
}

// Open Room Detail View
export function openRoomDetailView(roomId) {
  const room = rooms.getRoom(roomId);
  if (!room) return;

  const detailView = document.getElementById('room-detail-view');
  const detailImage = document.getElementById('room-detail-image');
  const detailName = document.getElementById('room-detail-name');
  const detailArea = document.getElementById('room-detail-area');
  const detailPrice = document.getElementById('room-detail-price-value');
  const detailDescription = document.getElementById('room-detail-description');
  const askBtn = document.getElementById('room-ask-question-btn');

  if (detailImage) {
    detailImage.src = room.mainPhoto || '';
    detailImage.style.display = room.mainPhoto ? 'block' : 'none';
  }

  if (detailName) detailName.textContent = room.name || '';
  if (detailArea) detailArea.querySelector('span').textContent = rooms.formatArea(room.area);
  if (detailPrice) detailPrice.textContent = rooms.formatPrice(room.pricePerNight);

  // Show room description
  if (detailDescription) {
    detailDescription.textContent = room.description || '';
  }

  // Render reviews
  renderRoomDetailReviews(room.reviews || []);

  // Show/hide ask question button
  if (askBtn) {
    askBtn.style.display = room.askQuestionEnabled ? 'flex' : 'none';
  }

  // Store room reference
  detailView.dataset.roomId = roomId;

  // Show detail view
  if (detailView) {
    detailView.classList.add('active');
  }
}

// Render reviews in room detail view
function renderRoomDetailReviews(reviews) {
  const reviewsList = document.getElementById('room-reviews-list');
  const reviewsSection = document.getElementById('room-detail-reviews');
  if (!reviewsList) return;

  // Hide section if no reviews
  if (!reviews || reviews.length === 0) {
    if (reviewsSection) reviewsSection.style.display = 'none';
    return;
  }

  if (reviewsSection) reviewsSection.style.display = 'block';

  reviewsList.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div class="review-card-header">
        <span class="review-author">${escapeHtml(review.author || 'Guest')}</span>
        <span class="review-rating">${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - (review.rating || 0))}</span>
      </div>
      <div class="review-date">${review.date || ''}</div>
      <div class="review-text">${escapeHtml(review.text || '')}</div>
    </div>
  `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close Room Detail View
export function closeRoomDetailView() {
  const detailView = document.getElementById('room-detail-view');
  if (detailView) {
    detailView.classList.remove('active');
    delete detailView.dataset.roomId;
  }
}

// Open Service Detail View
export function openServiceDetailView(serviceId) {
  const service = services.getService(serviceId);
  if (!service) return;

  const detailView = document.getElementById('service-detail-view');
  const detailImage = document.getElementById('service-detail-image');
  const detailName = document.getElementById('service-detail-name');
  const detailCategory = document.getElementById('service-detail-category');
  const detailPrice = document.getElementById('service-detail-price-value');
  const detailDescription = document.getElementById('service-detail-description');
  const askBtn = document.getElementById('service-ask-question-btn');

  if (detailImage) {
    detailImage.src = service.mainPhoto || '';
    detailImage.style.display = service.mainPhoto ? 'block' : 'none';
  }

  if (detailName) detailName.textContent = service.name || '';

  if (detailCategory) {
    const categoryInfo = services.getCategoryInfo(service.category);
    detailCategory.textContent = categoryInfo?.name || service.category || '';
  }

  if (detailPrice) detailPrice.textContent = services.formatServicePrice(service);

  // Show service description
  if (detailDescription) {
    detailDescription.textContent = service.description || '';
  }

  // Render reviews
  renderServiceDetailReviews(service.reviews || []);

  // Show/hide ask question button
  if (askBtn) {
    askBtn.style.display = service.askQuestionEnabled ? 'flex' : 'none';
  }

  // Store service reference
  detailView.dataset.serviceId = serviceId;

  // Show detail view
  if (detailView) {
    detailView.classList.add('active');
  }
}

// Render reviews in service detail view
function renderServiceDetailReviews(reviews) {
  const reviewsList = document.getElementById('service-reviews-list');
  const reviewsSection = document.getElementById('service-detail-reviews');
  if (!reviewsList) return;

  // Hide section if no reviews
  if (!reviews || reviews.length === 0) {
    if (reviewsSection) reviewsSection.style.display = 'none';
    return;
  }

  if (reviewsSection) reviewsSection.style.display = 'block';

  reviewsList.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div class="review-card-header">
        <span class="review-author">${escapeHtml(review.author || 'Guest')}</span>
        <span class="review-rating">${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - (review.rating || 0))}</span>
      </div>
      <div class="review-date">${review.date || ''}</div>
      <div class="review-text">${escapeHtml(review.text || '')}</div>
    </div>
  `).join('');
}

// Close Service Detail View
export function closeServiceDetailView() {
  const detailView = document.getElementById('service-detail-view');
  if (detailView) {
    detailView.classList.remove('active');
    delete detailView.dataset.serviceId;
  }
}

// Enter Room Context Mode
export function enterRoomContext(roomId) {
  const room = rooms.getRoom(roomId);
  if (!room) return;

  selectedRoom = room;
  chatMode = 'room-context';

  closeRoomDetailView();
  addRoomContextBadge(room);
  addMessage(`Чудово! Тепер я відповідатиму на питання про номер "${room.name}". Що саме вас цікавить?`, 'ai');
}

// View Room Photos
export function viewRoomPhotos(roomId) {
  const room = rooms.getRoom(roomId);
  if (!room) return;

  const photos = [];
  if (room.mainPhoto) photos.push(room.mainPhoto);
  if (room.gallery && room.gallery.length > 0) {
    photos.push(...room.gallery);
  }

  if (photos.length > 0) {
    gallery.openGallery(photos);
  }
}

// Initialize Room Detail Listeners
export function initRoomDetailListeners() {
  const backBtn = document.getElementById('room-detail-back');
  const askBtn = document.getElementById('room-ask-question-btn');
  const viewPhotosBtn = document.getElementById('room-view-photos-btn');
  const detailView = document.getElementById('room-detail-view');

  if (backBtn) {
    backBtn.addEventListener('click', closeRoomDetailView);
  }

  if (askBtn) {
    askBtn.addEventListener('click', () => {
      const roomId = detailView?.dataset.roomId;
      if (roomId) {
        enterRoomContext(roomId);
      }
    });
  }

  if (viewPhotosBtn) {
    viewPhotosBtn.addEventListener('click', () => {
      const roomId = detailView?.dataset.roomId;
      if (roomId) {
        viewRoomPhotos(roomId);
      }
    });
  }
}

// Initialize Service Detail Listeners
export function initServiceDetailListeners() {
  const backBtn = document.getElementById('service-detail-back');
  const askBtn = document.getElementById('service-ask-question-btn');
  const detailView = document.getElementById('service-detail-view');

  if (backBtn) {
    backBtn.addEventListener('click', closeServiceDetailView);
  }

  if (askBtn) {
    askBtn.addEventListener('click', () => {
      const serviceId = detailView?.dataset.serviceId;
      if (serviceId) {
        const service = services.getService(serviceId);
        if (service) {
          closeServiceDetailView();
          addMessage(`Хочу дізнатися більше про послугу "${service.name}"`, 'user');
          // Trigger AI response about the service
          getAIResponse(`Хочу дізнатися більше про послугу "${service.name}"`);
        }
      }
    });
  }
}

// Initialize Chat Event Listeners
export function initChatListeners() {
  // Initialize notification system
  initNotificationSound();
  loadNotificationSettings();
  initVisibilityTracking();
  updateSoundToggleUI(notificationState.soundEnabled);

  // Input listeners
  if (dom.messageInput) {
    dom.messageInput.addEventListener('input', () => {
      autoResize();
      updateSendButtonState();
      // Скрывать маркер при многострочном вводе
      const minHeight = parseInt(getComputedStyle(dom.messageInput).minHeight) || 31;
      if (dom.messageInput.scrollHeight > minHeight + 5) {
        hideNewMessagesMarker();
      }
    });
    dom.messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    });
  }

  // Chat toggle
  if (dom.widgetButton) {
    dom.widgetButton.addEventListener('click', toggleChat);
  } else {
    console.error('Widget button not found');
  }

  if (dom.closeButton) {
    dom.closeButton.addEventListener('click', toggleChat);
  }

  // Send message
  if (dom.sendButton) {
    dom.sendButton.addEventListener('click', handleSendMessage);
  }

  // Scroll button
  if (dom.messagesContainer) {
    dom.messagesContainer.addEventListener('scroll', checkScrollButtonVisibility);
  }

  if (dom.scrollToBottomBtn) {
    dom.scrollToBottomBtn.addEventListener('click', () => {
      if (dom.messagesContainer) {
        dom.messagesContainer.scrollTo({ top: dom.messagesContainer.scrollHeight, behavior: 'smooth' });
      }
    });
  }

  // Reset chat
  if (dom.resetChatBtn && dom.modals.reset) {
    dom.resetChatBtn.addEventListener('click', () => {
      closeHeaderMenu();
      dom.modals.reset.classList.remove('hidden');
    });
  }
  const confirmReset = document.getElementById('confirm-reset-btn');
  const cancelReset = document.getElementById('cancel-reset-btn');

  if (confirmReset) {
    confirmReset.addEventListener('click', () => {
      archiveCurrentSession();
      resetChat();
      if (dom.modals.reset) dom.modals.reset.classList.add('hidden');
    });
  }

  if (cancelReset) {
    cancelReset.addEventListener('click', () => {
      if (dom.modals.reset) dom.modals.reset.classList.add('hidden');
    });
  }

  // Room detail listeners
  initRoomDetailListeners();

  // Service detail listeners
  initServiceDetailListeners();

  // Special Booking listeners
  initSpecialBookingListeners();

  // Welcome modal listeners
  initWelcomeListeners();

  // Telegram booking modal listeners
  initTelegramBookingModalListeners();

  // Guide sheet listeners
  initGuideSheetListeners();
}

// Initialize Special Booking Event Listeners
export function initSpecialBookingListeners() {
  // Header menu toggle
  if (dom.headerMenuBtn) {
    dom.headerMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHeaderMenu();
    });
  }

  // History menu button
  const historyBtn = document.getElementById('history-menu-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHeaderMenu(); // Close menu
      showHistoryModal();
    });
  }

  // History modal listeners
  const historyView = document.getElementById('history-view');
  const historyCloseBtn = document.getElementById('history-close-btn');
  if (historyView && historyCloseBtn) {
    historyCloseBtn.addEventListener('click', () => {
      historyView.classList.add('hidden');
    });
  }

  // History detail listeners
  const historyDetailBack = document.getElementById('history-detail-back');
  if (historyDetailBack) {
    historyDetailBack.addEventListener('click', () => {
      document.getElementById('history-detail-view').classList.add('hidden');
    });
  }

  // Close menu when clicking outside
  // Close menu when clicking outside (on backdrop)
  const menuBottomSheet = document.getElementById('menu-bottom-sheet');
  if (menuBottomSheet) {
    menuBottomSheet.addEventListener('click', (e) => {
      if (e.target === menuBottomSheet) {
        closeHeaderMenu();
      }
    });
  }

  // Special Booking button in menu
  if (dom.specialBookingBtn) {
    dom.specialBookingBtn.addEventListener('click', () => {
      closeHeaderMenu();
      activateSpecialBookingMode('manual');
    });
  }

  // Cancel Special Booking button
  if (dom.cancelSpecialBookingBtn) {
    dom.cancelSpecialBookingBtn.addEventListener('click', () => {
      deactivateSpecialBookingMode();
    });
  }

  // Offer Confirm button
  if (dom.offerConfirmBtn) {
    dom.offerConfirmBtn.addEventListener('click', () => {
      confirmSpecialOffer();
    });
  }

  // Offer Edit button
  if (dom.offerEditBtn) {
    dom.offerEditBtn.addEventListener('click', () => {
      editSpecialOffer();
    });
  }

  // Sound toggle button in menu
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      toggleNotificationSound();
    });
  }

  // Rooms menu button
  const roomsMenuBtn = document.getElementById('rooms-menu-btn');
  if (roomsMenuBtn) {
    roomsMenuBtn.addEventListener('click', () => {
      closeHeaderMenu();
      showRoomsViaAgent();
    });
  }

  // Language menu button
  const languageMenuBtn = document.getElementById('language-menu-btn');
  if (languageMenuBtn) {
    languageMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLanguageSubmenu();
    });
  }

  // Close menu sheet button
  const menuSheetClose = document.getElementById('menu-sheet-close');
  if (menuSheetClose) {
    menuSheetClose.addEventListener('click', () => {
      closeHeaderMenu();
    });
  }

  // Close language sheet button
  const langSheetClose = document.getElementById('language-sheet-close');
  if (langSheetClose) {
    langSheetClose.addEventListener('click', () => {
      closeLanguageSubmenu();
    });
  }

  // Language options delegation
  // Note: languages are now rendered into language-sheet-list
  const languageSheetList = document.getElementById('language-sheet-list');
  if (languageSheetList) {
    languageSheetList.addEventListener('click', (e) => {
      const option = e.target.closest('.language-option');
      if (option) {
        e.stopPropagation();
        const langCode = option.dataset.lang;
        if (langCode) {
          switchLanguage(langCode);
          closeLanguageSubmenu();
          closeHeaderMenu();
        }
      }
    });
  }

  // Initialize language state on load
  updateLanguageMenuState();
  updateUITexts();
}

// Toggle header menu (Bottom Sheet)
function toggleHeaderMenu() {
  const menuSheet = document.getElementById('menu-bottom-sheet');
  if (menuSheet) {
    menuSheet.classList.toggle('hidden');
  }
}

// Close header menu
function closeHeaderMenu() {
  const menuSheet = document.getElementById('menu-bottom-sheet');
  if (menuSheet) {
    menuSheet.classList.add('hidden');
  }
  // Also close language submenu
  closeLanguageSubmenu();
}

// Toggle language submenu (Sheet)
function toggleLanguageSubmenu() {
  const langSheet = document.getElementById('language-sheet-modal');
  if (langSheet) {
    langSheet.classList.toggle('hidden');
  }
}

// Close language submenu
function closeLanguageSubmenu() {
  const langSheet = document.getElementById('language-sheet-modal');
  if (langSheet) {
    langSheet.classList.add('hidden');
  }
}

// Confirm special offer
function confirmSpecialOffer() {
  hideSpecialOfferCard();

  // Store the selected room
  if (specialBookingState.currentOffer?.room_name) {
    const allRooms = rooms.getAllRooms();
    const matchedRoom = allRooms.find(r =>
      r.name.toLowerCase().includes(specialBookingState.currentOffer.room_name.toLowerCase()) ||
      specialBookingState.currentOffer.room_name.toLowerCase().includes(r.name.toLowerCase())
    );
    if (matchedRoom) {
      bookingState.collectedData.selectedRoom = matchedRoom.name;
      saveBookingState();
    }
  }

  // Mark booking as active
  bookingState.hasActiveBooking = true;
  bookingState.step = 'completed';
  saveBookingState();

  addMessage('Отлично! Ваше бронирование подтверждено. Наш менеджер свяжется с вами в ближайшее время для финального подтверждения деталей. Благодарим за выбор нашего отеля!', 'ai');

  // Show Telegram confirmation modal
  setTimeout(() => {
    showTelegramBookingModal();
  }, 800);

  // Deactivate special mode
  deactivateSpecialBookingMode(true);
}

// Edit special offer - return to chat for adjustments
function editSpecialOffer() {
  hideSpecialOfferCard();
  updateSpecialBookingStatus('collecting');

  addMessage('Конечно! Что именно вы хотели бы изменить? Расскажите о ваших пожеланиях, и я подготовлю обновлённое предложение.', 'ai');
  addToConversationHistory('assistant', 'Конечно! Что именно вы хотели бы изменить? Расскажите о ваших пожеланиях, и я подготовлю обновлённое предложение.');
}

// ========================================
// TELEGRAM BOOKING CONFIRMATION MODAL
// ========================================

// Show Telegram Booking Confirmation Modal
export function showTelegramBookingModal() {
  const modal = document.getElementById('telegram-booking-modal');
  if (!modal) return;

  // Show modal with animation
  setTimeout(() => {
    modal.classList.add('show');
  }, 100);
}

// Hide Telegram Booking Confirmation Modal
export function hideTelegramBookingModal() {
  const modal = document.getElementById('telegram-booking-modal');
  if (!modal) return;

  modal.classList.remove('show');
}

// Initialize Telegram Booking Modal Listeners
export function initTelegramBookingModalListeners() {
  const modal = document.getElementById('telegram-booking-modal');
  const closeBtn = document.getElementById('telegram-booking-close');
  const confirmBtn = document.getElementById('telegram-booking-confirm');
  const laterBtn = document.getElementById('telegram-booking-later');

  if (!modal) return;

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideTelegramBookingModal();
    });
  }

  // Confirm button - redirect to Telegram
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // Get Telegram username or bot link from settings (you can customize this)
      const telegramLink = 'https://t.me/your_hotel_bot'; // Replace with actual bot link

      // Open Telegram
      window.open(telegramLink, '_blank');

      // Close modal
      hideTelegramBookingModal();
    });
  }

  // Later button
  if (laterBtn) {
    laterBtn.addEventListener('click', () => {
      hideTelegramBookingModal();
    });
  }

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideTelegramBookingModal();
    }
  });
}

// Export state getters/setters
export function setCurrentLang(lang) {
  currentLang = lang;
}

export function getCurrentLang() {
  return currentLang;
}

export function getSelectedRoom() {
  return selectedRoom;
}

export function getChatMode() {
  return chatMode;
}

// ========================================
// HISTORY ARCHIVE FUNCTIONS
// ========================================

// Archive current session
function archiveCurrentSession() {
  // Only archive if there are user messages
  const userMessages = dom.messagesContainer.querySelectorAll('.message-wrapper.user');
  if (userMessages.length === 0) return;

  const timestamp = new Date().toISOString();
  const summary = bookingState.collectedData.fullName || `Guest (${new Date(timestamp).toLocaleDateString()})`;

  // Capture current messages HTML for display
  const messagesHTML = dom.messagesContainer.innerHTML;

  const sessionData = {
    id: `session_${Date.now()}`,
    timestamp: timestamp,
    summary: summary,
    messages: [
      ...Array.from(dom.messagesContainer.children).map(el => {
        // Very basic serialization for now - we'll re-render differently or use this
        // Improved: Serialize structure
        if (el.classList.contains('message-wrapper')) {
          const isUser = el.classList.contains('user');
          const text = el.querySelector('[class^="chat-message"]')?.innerHTML || '';
          const time = el.querySelector('.message-time')?.innerText || '';
          return { type: 'message', sender: isUser ? 'user' : 'ai', text, time };
        }
        return null;
      }).filter(Boolean)
    ]
  };

  try {
    const existingArchive = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    existingArchive.unshift(sessionData); // Add to top
    // Limit to 50 sessions
    if (existingArchive.length > 50) existingArchive.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existingArchive));
  } catch (e) {
    console.error('Error archiving session:', e);
  }
}

// Show History Modal (now internal view)
function showHistoryModal() {
  const view = document.getElementById('history-view');
  const list = document.getElementById('history-list');
  if (!view || !list) return;

  // Load history
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

  list.innerHTML = '';

  if (history.length === 0) {
    list.innerHTML = `
        <div class="text-center text-gray-400 mt-10">
          <p>Немає збережених діалогів</p>
        </div>
    `;
  } else {
    history.forEach(session => {
      const date = new Date(session.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const item = document.createElement('div');
      item.className = 'p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer flex justify-between items-center border border-gray-100';
      item.innerHTML = `
            <div>
                <div class="font-medium text-gray-800 text-sm">${session.summary}</div>
                <div class="text-xs text-gray-500">${dateStr} • ${timeStr}</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
      item.addEventListener('click', () => openHistoryDetail(session));
      list.appendChild(item);
    });
  }

  view.classList.remove('hidden');
}

// Open History Detail View
function openHistoryDetail(session) {
  const detailView = document.getElementById('history-detail-view');
  const container = document.getElementById('history-detail-messages');
  const dateTitle = document.getElementById('history-detail-date');
  const timeTitle = document.getElementById('history-detail-time');

  if (!detailView || !container) return;

  container.innerHTML = '';

  // Set headers
  if (dateTitle) dateTitle.textContent = session.summary;
  if (timeTitle) timeTitle.textContent = new Date(session.timestamp).toLocaleString();

  // Render messages
  session.messages.forEach(msg => {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${msg.sender} animate-fade-in`;

    const messageElement = document.createElement('div');
    messageElement.className = `chat-message-${msg.sender} text-base leading-relaxed`;
    messageElement.innerHTML = msg.text;

    if (msg.sender === 'user') {
      const timeElement = document.createElement('span');
      timeElement.className = 'message-time';
      timeElement.innerText = msg.time;
      wrapper.appendChild(timeElement);
      wrapper.appendChild(messageElement);
    } else {
      wrapper.appendChild(messageElement);
    }

    container.appendChild(wrapper);
  });

  detailView.classList.remove('hidden');
}

// ========================================
// GUIDE SHEET FUNCTIONS
// ========================================

// Guide items storage key
const GUIDE_ITEMS_KEY = 'guide_items';

// Default guide items
const DEFAULT_GUIDE_ITEMS = [
  { id: '1', icon: 'user', text: 'Рекомендации нашего шефа' },
  { id: '2', icon: 'spa', text: 'Wellness эксклюзивы' }
];

// Load guide items from storage
export function loadGuideItems() {
  try {
    const saved = localStorage.getItem(GUIDE_ITEMS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_GUIDE_ITEMS;
  } catch (e) {
    return DEFAULT_GUIDE_ITEMS;
  }
}

// Save guide items to storage
export function saveGuideItems(items) {
  try {
    localStorage.setItem(GUIDE_ITEMS_KEY, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error('Error saving guide items:', e);
    return false;
  }
}

// Get icon SVG for guide item
function getGuideItemIcon(iconType) {
  const icons = {
    user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>`,
    chef: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"></path>
      <line x1="6" y1="17" x2="18" y2="17"></line>
    </svg>`,
    spa: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>`,
    star: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`
  };
  return icons[iconType] || icons.star;
}

// Render guide items in the sheet
function renderGuideItems() {
  const container = dom.guideItemsList;
  if (!container) return;

  const items = loadGuideItems();

  container.innerHTML = items.map(item => `
    <div class="guide-item" data-id="${item.id}">
      <div class="guide-item-icon">
        ${getGuideItemIcon(item.icon)}
      </div>
      <span class="guide-item-text">${item.text}</span>
      <svg class="guide-item-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  `).join('');
}

// Show guide sheet
function showGuideSheet() {
  const sheet = dom.guideBottomSheet;
  if (!sheet) return;

  renderGuideItems();
  sheet.classList.remove('hidden');

  // Animate in
  setTimeout(() => {
    const content = sheet.querySelector('.guide-sheet-content');
    if (content) content.style.transform = 'translateY(0)';
  }, 10);
}

// Hide guide sheet
function hideGuideSheet() {
  const sheet = dom.guideBottomSheet;
  if (!sheet) return;

  const content = sheet.querySelector('.guide-sheet-content');
  if (content) content.style.transform = 'translateY(100%)';

  setTimeout(() => {
    sheet.classList.add('hidden');
  }, 300);
}

// Initialize Guide Sheet Listeners
function initGuideSheetListeners() {
  // Badge click - open sheet
  if (dom.guideBadgeBtn) {
    dom.guideBadgeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showGuideSheet();
    });
  }

  // Close button
  if (dom.guideSheetClose) {
    dom.guideSheetClose.addEventListener('click', () => {
      hideGuideSheet();
    });
  }

  // Telegram button
  if (dom.guideTelegramBtn) {
    dom.guideTelegramBtn.addEventListener('click', () => {
      const telegramLink = 'https://t.me/your_hotel_bot';
      window.open(telegramLink, '_blank');
      hideGuideSheet();
    });
  }

  // Close on backdrop click
  if (dom.guideBottomSheet) {
    dom.guideBottomSheet.addEventListener('click', (e) => {
      if (e.target === dom.guideBottomSheet) {
        hideGuideSheet();
      }
    });
  }
}

