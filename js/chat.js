/*
 * Chat Core Logic
 * Hilton Chat Widget
 */

import { translations } from './config.js';
import * as dom from './dom.js';
import * as rooms from './rooms.js';
import * as openai from './openai.js';
import * as gallery from './gallery.js';

// State
let welcomed = false;
let currentLang = 'ua';
let isGenerating = false;
let selectedRoom = null;
let chatMode = 'general'; // 'general' | 'room-context'

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
  const t = translations[currentLang];
  dom.messageInput.placeholder = t.placeholder;
  dom.chatButtonText.textContent = dom.buttonTextSelect.value;
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
    dom.chatWindow.classList.add('open');
    dom.widgetButton.style.display = 'none';
    if (dom.notificationBadge) dom.notificationBadge.style.display = 'none';
    dom.messageInput.focus();
    if (isMobile) {
      dom.adminPanel.classList.add('hidden-panel');
      dom.openAdminBtn.style.display = 'none';
    }
    if (!welcomed) {
      simulateWelcome();
      welcomed = true;
    }
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

  try {
    let response;

    // Check if we're in room context but user asks about general topic
    if (chatMode === 'room-context' && selectedRoom && openai.isGeneralTopic(userMessage)) {
      // Auto-break room context for general topics
      clearRoomContext(true); // silent - don't add message
      addMessage('Зрозуміло, повертаюсь до загальних питань.', 'ai');

      // Process as general response
      response = await openai.getGeneralAIResponse(userMessage, hotelName);
      hideTyping();
      setButtonLoading(false);
      isGenerating = false;
      addMessage(response.text, 'ai');

      // Show rooms carousel if intent detected
      if (response.showRoomsCarousel) {
        setTimeout(() => addRoomCarousel(), 500);
      }
    } else if (chatMode === 'room-context' && selectedRoom) {
      // Room-specific response
      response = await openai.getRoomAIResponse(userMessage, selectedRoom, hotelName);
      hideTyping();
      setButtonLoading(false);
      isGenerating = false;
      addMessage(response.text, 'ai');
    } else {
      // General response
      response = await openai.getGeneralAIResponse(userMessage, hotelName);
      hideTyping();
      setButtonLoading(false);
      isGenerating = false;
      addMessage(response.text, 'ai');

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
