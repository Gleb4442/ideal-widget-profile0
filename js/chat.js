/*
 * Chat Core Logic
 * Hilton Chat Widget
 */

import { translations, languagesList } from './config.js';
import * as dom from './dom.js';
import * as rooms from './rooms.js';
import * as openai from './openai.js';
import * as gallery from './gallery.js';

// Language storage key
const LANGUAGE_KEY = 'chat_language';

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
  conversationHistory: [] // Last 10 messages for AI context
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
        conversationHistory: parsed.conversationHistory || []
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
  bookingState.step = determineBookingStep(bookingState.collectedData);

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
// LANGUAGE FUNCTIONS
// ========================================

// Get current translation
export function getTranslation(key) {
  const t = translations[currentLang] || translations['en'];
  return t[key] || translations['en'][key] || key;
}

// Switch language
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
  document.querySelectorAll('.language-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const langCode = option.dataset.lang;
      if (langCode) {
        switchLanguage(langCode);
      }
    });
  });

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

  addMessage('Отлично! Ваше бронирование подтверждено. Наш менеджер свяжется с вами в ближайшее время для финального подтверждения деталей. Благодарим за выбор нашего отеля!', 'ai');

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
