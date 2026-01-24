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

// Handle booking edit (cancel and create new)
function handleBookingEdit(bookingId, optionsContainer) {
  const booking = bookings.getBookingById(bookingId);
  if (!booking) return;

  const formatted = bookings.formatBooking(booking);

  if (confirm(`Редактирование бронирования для ${booking.guestName}\n\nТекущие данные:\n• Номер: ${booking.roomName}\n• Заїзд: ${formatted.checkInFormatted}\n• Виїзд: ${formatted.checkOutFormatted}\n• Гостей: ${booking.guests}\n\nДля редактирования:\n1. Текущее бронирование будет отменено\n2. Вы сможете создать новое с другими параметрами\n\nПродолжить?`)) {
    // Cancel current booking
    bookings.cancelBooking(bookingId);

    // Remove options container
    optionsContainer.remove();

    // Show message
    addMessage(`Бронирование для ${booking.guestName} отменено.\n\nТеперь расскажите о новых требованиях:\n• Желаемые даты заезда и выезда\n• Количество гостей\n• Тип номера\n• Особые пожелания`, 'ai');

    // Show Telegram confirmation modal
    setTimeout(() => {
      showTelegramBookingModal();
    }, 800);

    // Reset cancellation state
    resetCancellationState();

    // Reset booking state for new booking
    resetBookingState();
    bookingState.collectedData.fullName = booking.guestName;
    bookingState.collectedData.phone = booking.phone;
    bookingState.collectedData.email = booking.email;
    bookingState.step = 'collecting_dates';
    saveBookingState();

    // Update admin panel if open
    if (typeof window.renderBookingsList === 'function') {
      window.renderBookingsList();
    }
  }
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
function renderLanguageMenu() {
  const submenu = document.getElementById('language-submenu');
  if (!submenu) return;

  submenu.innerHTML = '';
  languagesList.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'language-option';
    btn.dataset.lang = lang.code;
    btn.innerHTML = `
      <span class="lang-flag">${lang.flag}</span>
      <span class="lang-name">${lang.name}</span>
    `;
    submenu.appendChild(btn);
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
function updateLanguageMenuState() {
  document.querySelectorAll('.language-option').forEach(option => {
    if (option.dataset.lang === currentLang) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

// Close language submenu
function closeLanguageSubmenu() {
  if (dom.languageSubmenu) {
    dom.languageSubmenu.classList.remove('show');
  }
  const submenuContainer = document.querySelector('.dropdown-submenu');
  if (submenuContainer) {
    submenuContainer.classList.remove('open');
  }
}

// Toggle language submenu
function toggleLanguageSubmenu() {
  if (dom.languageSubmenu) {
    dom.languageSubmenu.classList.toggle('show');
  }
  const submenuContainer = document.querySelector('.dropdown-submenu');
  if (submenuContainer) {
    submenuContainer.classList.toggle('open');
  }
}

// Get conversation history for external use
export function getConversationHistory() {
  return bookingState.conversationHistory;
}

// Auto Resize Textarea
export function autoResize() {
  dom.messageInput.style.height = 'auto';
  dom.messageInput.style.height = Math.min(dom.messageInput.scrollHeight, 120) + 'px';
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
    // Load booking state when opening chat
    loadBookingState();

    dom.chatWindow.classList.add('open');
    dom.widgetButton.style.display = 'none';
    if (dom.notificationBadge) dom.notificationBadge.style.display = 'none';
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

    const hasPhoto = !!room.mainPhoto;
    const hasGallery = room.gallery && room.gallery.length > 0;

    card.innerHTML = `
      <div class="room-carousel-image-container">
        ${hasPhoto
        ? `<img class="room-carousel-image" src="${room.mainPhoto}" alt="${room.name}">`
        : `<div class="room-carousel-image" style="display:flex;align-items:center;justify-content:center;color:#9ca3af;">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>`
      }
        <div class="room-carousel-overlay">
          <div class="room-carousel-actions">
            ${room.askQuestionEnabled !== false ? `
              <button class="room-carousel-action-btn primary" data-action="ask" data-room-id="${room.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Питання
              </button>
            ` : ''}
            ${hasPhoto || hasGallery ? `
              <button class="room-carousel-action-btn secondary" data-action="photos" data-room-id="${room.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Фото
              </button>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="room-carousel-info">
        <div class="room-carousel-name">${room.name || 'Без назви'}</div>
        <div class="room-carousel-price">${rooms.formatPrice(room.pricePerNight)}</div>
        <div class="room-carousel-area">${rooms.formatArea(room.area)}</div>
      </div>
    `;

    // Handle action button clicks
    card.querySelectorAll('.room-carousel-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const roomId = btn.dataset.roomId;
        if (action === 'ask') {
          enterRoomContext(roomId);
        } else if (action === 'photos') {
          viewRoomPhotos(roomId);
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

    card.innerHTML = `
      <div class="service-carousel-image-container">
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
        ${service.description ? `<div class="service-carousel-description">${service.description}</div>` : ''}
        <div class="service-carousel-price">${services.formatPrice(service.price, service.priceType)}</div>
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

    carousel.appendChild(card);
  });

  carouselWrapper.appendChild(carousel);
  container.appendChild(header);
  container.appendChild(carouselWrapper);
  wrapper.appendChild(container);

  dom.messagesContainer.insertBefore(wrapper, dom.typingIndicator);
  dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
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

  // Check if user wants to cancel/edit booking
  const hasCancellationIntent = detectCancellationIntent(userMessage);

  // Handle cancellation by searching in database
  if (hasCancellationIntent && !cancellationState.isActive) {
    hideTyping();
    setButtonLoading(false);
    isGenerating = false;

    // Start cancellation process with interactive search
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
  const askBtn = document.getElementById('room-ask-question-btn');

  if (detailImage) {
    detailImage.src = room.mainPhoto || '';
    detailImage.style.display = room.mainPhoto ? 'block' : 'none';
  }

  if (detailName) detailName.textContent = room.name || '';
  if (detailArea) detailArea.querySelector('span').textContent = rooms.formatArea(room.area);
  if (detailPrice) detailPrice.textContent = rooms.formatPrice(room.pricePerNight);

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

// Close Room Detail View
export function closeRoomDetailView() {
  const detailView = document.getElementById('room-detail-view');
  if (detailView) {
    detailView.classList.remove('active');
    delete detailView.dataset.roomId;
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

// Initialize Chat Event Listeners
export function initChatListeners() {
  // Input listeners
  dom.messageInput.addEventListener('input', () => {
    autoResize();
    updateSendButtonState();
  });

  // Chat toggle
  dom.widgetButton.addEventListener('click', toggleChat);
  dom.closeButton.addEventListener('click', toggleChat);

  // Send message
  dom.sendButton.addEventListener('click', handleSendMessage);
  dom.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  });

  // Scroll button
  dom.messagesContainer.addEventListener('scroll', checkScrollButtonVisibility);
  dom.scrollToBottomBtn.addEventListener('click', () => {
    dom.messagesContainer.scrollTo({ top: dom.messagesContainer.scrollHeight, behavior: 'smooth' });
  });

  // Reset chat
  dom.resetChatBtn.addEventListener('click', () => dom.modals.reset.classList.remove('hidden'));
  document.getElementById('confirm-reset-btn').addEventListener('click', () => {
    archiveCurrentSession();
    resetChat();
    dom.modals.reset.classList.add('hidden');
  });
  document.getElementById('cancel-reset-btn').addEventListener('click', () => {
    dom.modals.reset.classList.add('hidden');
  });

  // Room detail listeners
  initRoomDetailListeners();

  // Special Booking listeners
  initSpecialBookingListeners();

  // Welcome modal listeners
  initWelcomeListeners();

  // Telegram booking modal listeners
  initTelegramBookingModalListeners();
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
  document.addEventListener('click', (e) => {
    if (dom.headerMenuDropdown && !dom.headerMenuDropdown.contains(e.target) && !dom.headerMenuBtn?.contains(e.target)) {
      closeHeaderMenu();
    }
  });

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

  // Language menu button
  if (dom.languageMenuBtn) {
    dom.languageMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLanguageSubmenu();
    });
  }

  // Language options
  // Render language menu dynamically
  // renderLanguageMenu(); // Moved to initLanguage

  // Language options delegation
  const languageSubmenu = document.getElementById('language-submenu');
  if (languageSubmenu) {
    languageSubmenu.addEventListener('click', (e) => {
      const option = e.target.closest('.language-option');
      if (option) {
        e.stopPropagation();
        const langCode = option.dataset.lang;
        if (langCode) {
          switchLanguage(langCode);
          closeHeaderMenu(); // Close menu after selection
        }
      }
    });
  }

  // Initialize language state on load
  updateLanguageMenuState();
  updateUITexts();
}

// Toggle header menu
function toggleHeaderMenu() {
  if (dom.headerMenuDropdown) {
    dom.headerMenuDropdown.classList.toggle('show');
  }
}

// Close header menu
function closeHeaderMenu() {
  if (dom.headerMenuDropdown) {
    dom.headerMenuDropdown.classList.remove('show');
  }
  // Also close language submenu
  closeLanguageSubmenu();
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

