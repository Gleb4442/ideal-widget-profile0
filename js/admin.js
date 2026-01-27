/*
 * Admin Panel Logic
 * Hilton Chat Widget
 */

import { fontsList, iconsList } from './config.js';
import * as dom from './dom.js';
import * as rooms from './rooms.js';
import * as bookings from './bookings.js';
import * as services from './services.js';

// Room editing state
let currentEditRoomId = null;
let currentMainPhoto = '';
let currentGallery = [];
let currentBookedDates = [];
let currentRoomReviews = []; // Reviews state
let calendarCurrentMonth = new Date();

// Service editing state
let currentEditServiceId = null;
let currentServiceMainPhoto = '';
let currentServiceGallery = [];
let currentServiceReviews = []; // Reviews state

// Hotel info storage key
const HOTEL_INFO_KEY = 'hotel_info';

// Russian month names
const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Initialize Font Selector
export function initFontSelector() {
  fontsList.forEach(font => {
    const option = document.createElement('option');
    option.value = font;
    option.textContent = font;
    option.style.fontFamily = font;
    if (font === 'Inter') option.selected = true;
    dom.fontSelect.appendChild(option);
  });

  dom.fontSelect.addEventListener('change', (e) => {
    document.documentElement.style.setProperty('--font-main', e.target.value);
  });
}

// Initialize Icon Selector
export function initIconSelector() {
  iconsList.forEach((icon, index) => {
    const div = document.createElement('div');
    div.className = `icon-option ${index === 0 ? 'active' : ''}`;

    const vb = icon.viewBox || "0 0 24 24";
    const str = icon.stroke || "currentColor";
    const strW = icon.strokeWidth || "2";
    const fl = icon.fill || "none";

    div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${vb}" fill="${fl}" stroke="${str}" stroke-width="${strW}" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>`;

    div.onclick = () => {
      document.querySelectorAll('.icon-option').forEach(el => el.classList.remove('active'));
      div.classList.add('active');

      if (icon.id === 'custom-logo') {
        dom.widgetButton.classList.add('custom-logo-selected');
      } else {
        dom.widgetButton.classList.remove('custom-logo-selected');
      }

      const mainStr = icon.stroke === 'none' ? 'none' : 'white';
      const mainFill = icon.fill === 'currentColor' ? 'white' : 'none';
      const mainSize = icon.size || "24";

      if (icon.id === 'custom-logo') {
        dom.widgetButton.style.setProperty('--widget-padding', '2px 18px 2px 11px');
        dom.widgetButton.style.gap = '4px';
      } else {
        dom.widgetButton.style.removeProperty('--widget-padding');
        dom.widgetButton.style.removeProperty('gap');
      }

      dom.widgetIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${mainSize}" height="${mainSize}" viewBox="${vb}" fill="${mainFill}" stroke="${mainStr}" stroke-width="${strW}" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>`;
    };

    dom.iconSelector.appendChild(div);
  });
}

// Initialize Shape Selector
export function initShapeSelector() {
  dom.shapeSelector.querySelectorAll('.shape-option').forEach(opt => {
    opt.addEventListener('click', () => {
      dom.shapeSelector.querySelectorAll('.shape-option').forEach(el => el.classList.remove('active'));
      opt.classList.add('active');
      const shapeClass = opt.dataset.shape;
      dom.widgetButton.classList.remove('shape-pill', 'shape-rounded', 'shape-circle');
      dom.widgetButton.classList.add(shapeClass);
    });
  });
}

// Initialize Offset Controls
export function initOffsetControls() {
  const updateOffset = () => {
    const x = dom.inputOffsetX.value;
    const y = dom.inputOffsetY.value;
    document.documentElement.style.setProperty('--widget-offset-x', `${x}px`);
    document.documentElement.style.setProperty('--widget-offset-y', `${y}px`);
    dom.valOffsetX.textContent = `${x}px`;
    dom.valOffsetY.textContent = `${y}px`;
  };

  dom.inputOffsetX.addEventListener('input', updateOffset);
  dom.inputOffsetY.addEventListener('input', updateOffset);

  dom.inputScale.addEventListener('input', (e) => {
    const val = e.target.value;
    document.documentElement.style.setProperty('--widget-scale', val);
    dom.valScale.textContent = parseFloat(val).toFixed(1);
  });
}

// Initialize Admin Panel Controls
export function initAdminPanelControls() {
  dom.closeAdminBtn.addEventListener('click', () => {
    dom.adminPanel.classList.add('hidden-panel');
    dom.openAdminBtn.classList.remove('hidden-btn');
  });

  dom.openAdminBtn.addEventListener('click', () => {
    dom.adminPanel.classList.remove('hidden-panel');
    dom.openAdminBtn.classList.add('hidden-btn');
  });

  dom.hotelNameInput.addEventListener('input', (e) => {
    dom.hotelNameText.textContent = e.target.value || "Hilton";
  });

  dom.logoUpload.addEventListener('change', function (e) {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        dom.hotelLogoContainer.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-full" alt="Logo">`;
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  dom.animationToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      dom.widgetButton.classList.remove('no-animation');
    } else {
      dom.widgetButton.classList.add('no-animation');
    }
  });

  // Accent Color Logic
  dom.accentColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    dom.colorValueText.textContent = color;
    document.documentElement.style.setProperty('--accent-color', color);

    const hexToRgb = (hex) => {
      let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '37, 99, 235';
    };
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(color));

    const darkenColor = (hex, percent) => {
      let num = parseInt(hex.replace("#", ""), 16);
      let amt = Math.round(2.55 * percent);
      let R = (num >> 16) - amt;
      let G = (num >> 8 & 0x00FF) - amt;
      let B = (num & 0x0000FF) - amt;
      return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };
    document.documentElement.style.setProperty('--accent-hover', darkenColor(color, 20));
  });

  // Button Text
  dom.buttonTextSelect.addEventListener('change', (e) => {
    dom.chatButtonText.textContent = e.target.value;
  });

  // Theme Toggle
  dom.themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      dom.chatWindow.classList.add('dark-mode');
    } else {
      dom.chatWindow.classList.remove('dark-mode');
    }
  });
}

// Initialize Position Selector
export function initPositionSelector() {
  dom.positionSelect.addEventListener('change', (e) => {
    const posClass = e.target.value;
    ['widget-pos-right', 'widget-pos-center', 'widget-pos-left'].forEach(cls => {
      dom.widgetButton.classList.remove(cls);
      dom.chatWindow.classList.remove(cls);
    });
    dom.widgetButton.classList.add(posClass);
    dom.chatWindow.classList.add(posClass);
  });
}

// Initialize Footer Layout
export function initFooterLayout() {
  const updateFooterLayout = () => {
    if (!dom.brandingToggle) return;
    const isBrandingVisible = dom.brandingToggle.checked;
    dom.poweredByContainer.style.display = isBrandingVisible ? 'block' : 'none';
    if (isBrandingVisible) {
      dom.inputAreaWrapper.classList.remove('pb-2');
      dom.inputAreaWrapper.classList.add('pb-0');
    } else {
      dom.inputAreaWrapper.classList.remove('pb-0');
      dom.inputAreaWrapper.classList.add('pb-2');
    }
  };

  if (dom.brandingToggle) {
    dom.brandingToggle.addEventListener('change', updateFooterLayout);
    updateFooterLayout();
  }
}

// ============================================
// HOTEL INFO FUNCTIONS
// ============================================

// Load hotel info from localStorage
export function loadHotelInfo() {
  try {
    return localStorage.getItem(HOTEL_INFO_KEY) || '';
  } catch (e) {
    console.error('Error loading hotel info:', e);
    return '';
  }
}

// Save hotel info to localStorage
export function saveHotelInfo(info) {
  try {
    localStorage.setItem(HOTEL_INFO_KEY, info);
    return true;
  } catch (e) {
    console.error('Error saving hotel info:', e);
    return false;
  }
}

// Initialize hotel info input
export function initHotelInfo() {
  if (dom.hotelInfoInput) {
    // Load saved value
    dom.hotelInfoInput.value = loadHotelInfo();

    // Save on change
    dom.hotelInfoInput.addEventListener('input', (e) => {
      saveHotelInfo(e.target.value);
    });
  }
}

// ============================================
// CALENDAR FUNCTIONS
// ============================================

// Format date to YYYY-MM-DD
function formatDateStr(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Render calendar for current month
function renderCalendar() {
  const calendarGrid = document.getElementById('room-calendar');
  const monthLabel = document.getElementById('calendar-month-label');
  if (!calendarGrid || !monthLabel) return;

  const year = calendarCurrentMonth.getFullYear();
  const month = calendarCurrentMonth.getMonth();

  // Update month label
  monthLabel.textContent = `${MONTH_NAMES_RU[month]} ${year}`;

  // Get first day of month (0 = Sunday, we need Monday = 0)
  const firstDay = new Date(year, month, 1);
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes 6

  // Get number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get today's date
  const today = formatDateStr(new Date());

  // Clear grid
  calendarGrid.innerHTML = '';

  // Add empty cells for days before first day of month
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    calendarGrid.appendChild(emptyCell);
  }

  // Add day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    cell.textContent = day;
    cell.dataset.date = dateStr;

    // Check if date is booked
    if (currentBookedDates.includes(dateStr)) {
      cell.classList.add('booked');
    }

    // Check if today
    if (dateStr === today) {
      cell.classList.add('today');
    }

    // Check if in past
    if (dateStr < today) {
      cell.classList.add('past');
    } else {
      // Add click handler for future dates
      cell.addEventListener('click', () => toggleCalendarDate(dateStr));
    }

    calendarGrid.appendChild(cell);
  }
}

// Toggle date booking status
function toggleCalendarDate(dateStr) {
  const index = currentBookedDates.indexOf(dateStr);
  if (index === -1) {
    currentBookedDates.push(dateStr);
  } else {
    currentBookedDates.splice(index, 1);
  }
  renderCalendar();
}

// Navigate to previous month
function prevMonth() {
  calendarCurrentMonth.setMonth(calendarCurrentMonth.getMonth() - 1);
  renderCalendar();
}

// Navigate to next month
function nextMonth() {
  calendarCurrentMonth.setMonth(calendarCurrentMonth.getMonth() + 1);
  renderCalendar();
}

// Generate random availability
function generateRandomCalendar() {
  currentBookedDates = [];
  const today = new Date();
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

  let currentDate = new Date(today);

  while (currentDate < twoMonthsLater) {
    // Random chance to start a booking block (20% chance)
    if (Math.random() < 0.2) {
      // Random block length 2-5 days
      const blockLength = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < blockLength && currentDate < twoMonthsLater; i++) {
        currentBookedDates.push(formatDateStr(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Skip 1-3 days between blocks
      const gap = Math.floor(Math.random() * 3) + 1;
      currentDate.setDate(currentDate.getDate() + gap);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  renderCalendar();
}

// Initialize calendar controls
function initCalendarControls() {
  const prevBtn = document.getElementById('calendar-prev-month');
  const nextBtn = document.getElementById('calendar-next-month');
  const generateBtn = document.getElementById('calendar-generate-random');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      prevMonth();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      nextMonth();
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      generateRandomCalendar();
    });
  }
}

// Render Rooms Grid in Admin Panel
export function renderRoomsGrid() {
  const grid = document.getElementById('rooms-admin-grid');
  if (!grid) return;

  const allRooms = rooms.getAllRooms();

  grid.innerHTML = allRooms.map(room => `
    <div class="room-admin-card" data-room-id="${room.id}">
      ${room.mainPhoto
      ? `<img src="${room.mainPhoto}" alt="${room.name}">`
      : `<div class="room-admin-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`
    }
      <div class="room-admin-card-overlay">
        <div class="room-admin-card-name">${room.name || 'Без назви'}</div>
        <div class="room-admin-card-price">${rooms.formatPrice(room.pricePerNight)}</div>
      </div>
    </div>
  `).join('');

  // Add click listeners
  grid.querySelectorAll('.room-admin-card').forEach(card => {
    card.addEventListener('click', () => {
      openRoomModal(card.dataset.roomId);
    });
  });
}

// Open Room Modal
export function openRoomModal(roomId = null) {
  const modal = document.getElementById('room-modal-overlay');
  const title = document.getElementById('room-modal-title');
  const deleteBtn = document.getElementById('room-delete-btn');

  currentEditRoomId = roomId;
  currentMainPhoto = '';
  currentGallery = [];
  currentGallery = [];
  currentBookedDates = [];
  currentRoomReviews = []; // Reset reviews
  calendarCurrentMonth = new Date(); // Reset to current month

  if (roomId) {
    const room = rooms.getRoom(roomId);
    if (room) {
      title.textContent = 'Редагувати номер';
      document.getElementById('room-name-input').value = room.name || '';
      document.getElementById('room-description-input').value = room.description || '';
      document.getElementById('room-area-input').value = room.area || '';
      document.getElementById('room-price-input').value = room.pricePerNight || '';
      document.getElementById('room-ask-toggle').checked = room.askQuestionEnabled !== false;
      // Marketing fields
      document.getElementById('room-badge-input').value = room.badge || '';
      document.getElementById('room-left-count-input').value = room.leftCount || 0;
      document.getElementById('room-discount-input').value = room.discount || 0;
      document.getElementById('room-original-price-input').value = room.originalPrice || 0;
      currentMainPhoto = room.mainPhoto || '';
      currentGallery = room.gallery ? [...room.gallery] : [];
      currentMainPhoto = room.mainPhoto || '';
      currentGallery = room.gallery ? [...room.gallery] : [];
      currentBookedDates = room.bookedDates ? [...room.bookedDates] : [];
      currentRoomReviews = room.reviews ? [...room.reviews] : [];
      deleteBtn.style.display = 'flex';
    }
  } else {
    title.textContent = 'Новий номер';
    document.getElementById('room-name-input').value = '';
    document.getElementById('room-description-input').value = '';
    document.getElementById('room-area-input').value = '';
    document.getElementById('room-price-input').value = '';
    document.getElementById('room-ask-toggle').checked = true;
    // Marketing fields - reset
    document.getElementById('room-badge-input').value = '';
    document.getElementById('room-left-count-input').value = 0;
    document.getElementById('room-discount-input').value = 0;
    document.getElementById('room-original-price-input').value = 0;
    deleteBtn.style.display = 'none';
  }

  updateMainPhotoPreview();
  updateGalleryPreview();
  renderRoomReviewsList(); // Render reviews
  renderCalendar();
  modal.classList.add('active');
}

// Close Room Modal
export function closeRoomModal() {
  const modal = document.getElementById('room-modal-overlay');
  modal.classList.remove('active');
  currentEditRoomId = null;
  currentMainPhoto = '';
  currentGallery = [];
}

// Update Main Photo Preview
function updateMainPhotoPreview() {
  const area = document.getElementById('main-photo-upload');
  if (currentMainPhoto) {
    area.innerHTML = `<img src="${currentMainPhoto}" alt="Main photo">`;
    area.classList.add('has-photo');
  } else {
    area.innerHTML = `
      <div class="photo-upload-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>Натисніть для завантаження</span>
      </div>
    `;
    area.classList.remove('has-photo');
  }
}

// Update Gallery Preview
function updateGalleryPreview() {
  const grid = document.getElementById('gallery-upload-grid');
  const addBtn = document.getElementById('gallery-add-btn');

  // Clear existing items except add button
  grid.innerHTML = '';

  currentGallery.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-photo-item';
    item.innerHTML = `
      <img src="${photo}" alt="Gallery photo ${index + 1}">
      <button class="gallery-photo-remove" data-index="${index}">&times;</button>
    `;
    grid.appendChild(item);
  });

  // Re-add the add button
  const newAddBtn = document.createElement('div');
  newAddBtn.id = 'gallery-add-btn';
  newAddBtn.className = 'gallery-add-btn';
  newAddBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span>Додати</span>
  `;
  newAddBtn.addEventListener('click', () => {
    document.getElementById('gallery-photo-input').click();
  });
  grid.appendChild(newAddBtn);

  // Add remove listeners
  grid.querySelectorAll('.gallery-photo-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      currentGallery.splice(index, 1);
      updateGalleryPreview();
    });
  });
}

// Save Room
function saveRoom() {
  const name = document.getElementById('room-name-input').value.trim();
  const description = document.getElementById('room-description-input').value.trim();
  const area = parseInt(document.getElementById('room-area-input').value) || 0;
  const pricePerNight = parseInt(document.getElementById('room-price-input').value) || 0;
  const askQuestionEnabled = document.getElementById('room-ask-toggle').checked;
  // Marketing fields
  const badge = document.getElementById('room-badge-input').value;
  const leftCount = parseInt(document.getElementById('room-left-count-input').value) || 0;
  const discount = parseInt(document.getElementById('room-discount-input').value) || 0;
  const originalPrice = parseInt(document.getElementById('room-original-price-input').value) || 0;

  if (!name) {
    alert('Введіть назву номера');
    return;
  }

  const roomData = {
    name,
    description,
    area,
    pricePerNight,
    mainPhoto: currentMainPhoto,
    gallery: currentGallery,
    askQuestionEnabled,
    askQuestionEnabled,
    bookedDates: currentBookedDates,
    reviews: currentRoomReviews,
    // Marketing fields
    badge,
    leftCount,
    discount,
    originalPrice
  };

  if (currentEditRoomId) {
    rooms.updateRoom(currentEditRoomId, roomData);
  } else {
    rooms.addRoom(roomData);
  }

  closeRoomModal();
  renderRoomsGrid();
}

// Delete Room
function deleteRoom() {
  if (!currentEditRoomId) return;

  if (confirm('Видалити цей номер?')) {
    rooms.deleteRoom(currentEditRoomId);
    closeRoomModal();
    renderRoomsGrid();
  }
}

// Initialize Room Management
export function initRoomManagement() {
  const addBtn = document.getElementById('add-room-btn');
  const modalClose = document.getElementById('room-modal-close');
  const cancelBtn = document.getElementById('room-cancel-btn');
  const saveBtn = document.getElementById('room-save-btn');
  const deleteBtn = document.getElementById('room-delete-btn');
  const mainPhotoUpload = document.getElementById('main-photo-upload');
  const mainPhotoInput = document.getElementById('main-photo-input');
  const galleryAddBtn = document.getElementById('gallery-add-btn');
  const galleryInput = document.getElementById('gallery-photo-input');

  if (addBtn) {
    addBtn.addEventListener('click', () => openRoomModal());
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeRoomModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeRoomModal);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveRoom);
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteRoom);
  }

  // Main photo upload
  if (mainPhotoUpload && mainPhotoInput) {
    mainPhotoUpload.addEventListener('click', () => mainPhotoInput.click());

    mainPhotoInput.addEventListener('change', async function () {
      if (this.files && this.files[0]) {
        try {
          currentMainPhoto = await rooms.compressImage(this.files[0]);
          updateMainPhotoPreview();
        } catch (e) {
          console.error('Error uploading main photo:', e);
        }
      }
    });
  }

  // Gallery photos upload
  if (galleryAddBtn && galleryInput) {
    galleryAddBtn.addEventListener('click', () => galleryInput.click());

    galleryInput.addEventListener('change', async function () {
      if (this.files && this.files.length > 0) {
        for (const file of this.files) {
          try {
            const compressed = await rooms.compressImage(file);
            currentGallery.push(compressed);
          } catch (e) {
            console.error('Error uploading gallery photo:', e);
          }
        }
        updateGalleryPreview();
        this.value = '';
      }
    });
  }

  // Click outside modal to close
  const modalOverlay = document.getElementById('room-modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeRoomModal();
      }
    });
  }

  // Reviews management
  const addReviewBtn = document.getElementById('room-add-review-btn');
  if (addReviewBtn) {
    addReviewBtn.addEventListener('click', () => {
      const author = document.getElementById('room-review-author').value.trim();
      const rating = parseInt(document.getElementById('room-review-rating').value);
      const date = document.getElementById('room-review-date').value;
      const text = document.getElementById('room-review-text').value.trim();

      if (!author || !date || !text) {
        alert('Будь ласка, заповніть всі поля відгуку');
        return;
      }

      currentRoomReviews.push({ author, rating, date, text });
      renderRoomReviewsList();

      // Reset form
      document.getElementById('room-review-author').value = '';
      document.getElementById('room-review-rating').value = '5';
      document.getElementById('room-review-date').value = '';
      document.getElementById('room-review-text').value = '';
    });
  }

  // Initial render
  renderRoomsGrid();
}

// Render Room Reviews List
function renderRoomReviewsList() {
  const list = document.getElementById('room-reviews-list');
  if (!list) return;

  list.innerHTML = '';

  if (currentRoomReviews.length === 0) {
    list.innerHTML = '<div class="text-sm text-gray-500 italic p-2 text-center">Немає відгуків</div>';
    return;
  }

  currentRoomReviews.forEach((review, index) => {
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <div class="review-header">
        <span class="review-author">${review.author}</span>
        <span class="review-rating">${'★'.repeat(review.rating)}</span>
      </div>
      <div class="review-date">${review.date}</div>
      <div class="review-text">${review.text}</div>
      <button class="review-delete-btn" data-index="${index}">&times;</button>
    `;
    list.appendChild(item);
  });

  // Add delete listeners
  list.querySelectorAll('.review-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      currentRoomReviews.splice(index, 1);
      renderRoomReviewsList();
    });
  });

  // ============================================
  // BOOKINGS MANAGEMENT FUNCTIONS
  // ============================================

  let bookingsSearchTerm = '';

  // Render bookings list
  export function renderBookingsList() {
    const container = document.getElementById('bookings-list');
    if (!container) return;

    let allBookings = bookings.getAllBookings();

    // Apply search filter
    if (bookingsSearchTerm) {
      allBookings = bookings.findBookingsByName(bookingsSearchTerm);
    }

    // Sort by check-in date (newest first)
    allBookings.sort((a, b) => b.checkIn.localeCompare(a.checkIn));

    // Update stats
    updateBookingsStats();

    // Render bookings
    if (allBookings.length === 0) {
      container.innerHTML = `
      <div class="bookings-empty">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <div class="bookings-empty-title">Немає бронювань</div>
        <div class="bookings-empty-text">${bookingsSearchTerm ? 'Нічого не знайдено за вашим запитом' : 'Натисніть "Тестові" для генерації демо-даних'}</div>
      </div>
    `;
      return;
    }

    container.innerHTML = allBookings.map(booking => {
      const formatted = bookings.formatBooking(booking);
      return `
      <div class="booking-card ${booking.status}" data-booking-id="${booking.id}">
        <div class="booking-card-header">
          <div>
            <div class="booking-guest-name">${booking.guestName}</div>
            <div class="booking-id">${booking.id}</div>
          </div>
          <div class="booking-status ${booking.status}">${formatted.statusText}</div>
        </div>

        <div class="booking-room">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          ${booking.roomName}
        </div>

        <div class="booking-info">
          <div class="booking-info-item">
            <div class="booking-info-label">Заїзд</div>
            <div class="booking-info-value">${formatted.checkInFormatted}</div>
          </div>
          <div class="booking-info-item">
            <div class="booking-info-label">Виїзд</div>
            <div class="booking-info-value">${formatted.checkOutFormatted}</div>
          </div>
          <div class="booking-info-item">
            <div class="booking-info-label">Ночей</div>
            <div class="booking-info-value">${booking.nights}</div>
          </div>
          <div class="booking-info-item">
            <div class="booking-info-label">Гостей</div>
            <div class="booking-info-value">${booking.guests}</div>
          </div>
          <div class="booking-info-item">
            <div class="booking-info-label">Телефон</div>
            <div class="booking-info-value">${booking.phone}</div>
          </div>
          <div class="booking-info-item">
            <div class="booking-info-label">Ціна</div>
            <div class="booking-info-value">${formatted.totalPriceFormatted}</div>
          </div>
        </div>

        <div class="booking-actions">
          ${booking.status === 'confirmed' ? `
            <button class="booking-action-btn edit" onclick="window.editBooking('${booking.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Редагувати
            </button>
            <button class="booking-action-btn cancel" onclick="window.cancelBookingConfirm('${booking.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Скасувати
            </button>
          ` : ''}
          <button class="booking-action-btn delete" onclick="window.deleteBookingConfirm('${booking.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Видалити
          </button>
        </div>
      </div>
    `;
    }).join('');
  }

  // Update bookings statistics
  function updateBookingsStats() {
    const stats = bookings.getBookingStats();

    const totalEl = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    const cancelledEl = document.getElementById('stat-cancelled');

    if (totalEl) totalEl.textContent = stats.total;
    if (activeEl) activeEl.textContent = stats.active;
    if (cancelledEl) cancelledEl.textContent = stats.cancelled;
  }

  // Cancel booking with confirmation
  window.cancelBookingConfirm = function (bookingId) {
    const booking = bookings.getBookingById(bookingId);
    if (!booking) return;

    if (confirm(`Скасувати бронювання для ${booking.guestName}?`)) {
      bookings.cancelBooking(bookingId);
      renderBookingsList();
    }
  };

  // Delete booking permanently
  window.deleteBookingConfirm = function (bookingId) {
    const booking = bookings.getBookingById(bookingId);
    if (!booking) return;

    if (confirm(`Видалити бронювання для ${booking.guestName} назавжди?\nЦю дію неможливо скасувати.`)) {
      bookings.deleteBooking(bookingId);
      renderBookingsList();
    }
  };

  // Edit booking (cancel and recreate approach)
  window.editBooking = function (bookingId) {
    const booking = bookings.getBookingById(bookingId);
    if (!booking) return;

    const message = `Редагування бронювання для ${booking.guestName}\n\n` +
      `Поточні дані:\n` +
      `• Заїзд: ${bookings.formatBooking(booking).checkInFormatted}\n` +
      `• Виїзд: ${bookings.formatBooking(booking).checkOutFormatted}\n` +
      `• Номер: ${booking.roomName}\n` +
      `• Гостей: ${booking.guests}\n\n` +
      `Для редагування бронювання:\n` +
      `1. Поточне бронювання буде скасовано\n` +
      `2. Гість зможе створити нове бронювання через чат\n\n` +
      `Продовжити?`;

    if (confirm(message)) {
      // Cancel current booking
      bookings.cancelBooking(bookingId);
      renderBookingsList();

      alert(`Бронювання скасовано.\n\nТепер гість ${booking.guestName} може створити нове бронювання через чат з оновленими даними.`);
    }
  };

  // Generate test bookings
  function generateTestBookingsHandler() {
    if (bookings.getAllBookings().length > 0) {
      if (!confirm('Вже є бронювання в базі. Додати ще тестові дані?')) {
        return;
      }
    }

    const generated = bookings.generateTestBookings();
    renderBookingsList();

    // Show guest names for easy testing
    const guestNames = generated
      .filter(b => b.status === 'confirmed')
      .slice(0, 5)
      .map(b => b.guestName)
      .join('\n• ');

    alert(`Згенеровано ${generated.length} тестових бронювань!\n\nПриклади гостей для тестування скасування:\n• ${guestNames}\n\nВи можете знайти бронювання через пошук за ПІБ.`);
  }

  // Initialize bookings search
  function initBookingsSearch() {
    const searchInput = document.getElementById('booking-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      bookingsSearchTerm = e.target.value.trim();
      renderBookingsList();
    });
  }

  // Initialize bookings management
  export function initBookingsManagement() {
    const generateBtn = document.getElementById('generate-test-bookings-btn');

    if (generateBtn) {
      generateBtn.addEventListener('click', generateTestBookingsHandler);
    }

    initBookingsSearch();
    renderBookingsList();

    // Make renderBookingsList available globally for chat integration
    window.renderBookingsList = renderBookingsList;
  }

  // ============================================
  // SERVICES MANAGEMENT FUNCTIONS
  // ============================================

  // Render Services Grid in Admin Panel
  export function renderServicesGrid() {
    const grid = document.getElementById('services-admin-grid');
    if (!grid) return;

    const allServices = services.getAllServices();

    grid.innerHTML = allServices.map(service => `
    <div class="service-admin-card" data-service-id="${service.id}">
      ${service.mainPhoto
        ? `<img src="${service.mainPhoto}" alt="${service.name}">`
        : `<div class="service-admin-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>`
      }
      <div class="service-admin-card-overlay">
        <div class="service-admin-card-name">${service.name || 'Без назви'}</div>
        <div class="service-admin-card-price">${services.formatPrice(service.price, service.priceType)}</div>
      </div>
    </div>
  `).join('');

    // Add click listeners
    grid.querySelectorAll('.service-admin-card').forEach(card => {
      card.addEventListener('click', () => {
        openServiceModal(card.dataset.serviceId);
      });
    });
  }

  // Open Service Modal
  export function openServiceModal(serviceId = null) {
    const modal = document.getElementById('service-modal-overlay');
    const title = document.getElementById('service-modal-title');
    const deleteBtn = document.getElementById('service-delete-btn');

    currentEditServiceId = serviceId;
    currentServiceMainPhoto = '';
    currentServiceGallery = [];

    if (serviceId) {
      const service = services.getService(serviceId);
      if (service) {
        title.textContent = 'Редагувати послугу';
        document.getElementById('service-name-input').value = service.name || '';
        document.getElementById('service-description-input').value = service.description || '';
        document.getElementById('service-price-input').value = service.price || '';
        document.getElementById('service-price-type-input').value = service.priceType || 'fixed';
        document.getElementById('service-category-input').value = service.category || 'general';
        document.getElementById('service-ask-toggle').checked = service.askQuestionEnabled !== false;
        document.getElementById('service-add-booking-toggle').checked = service.addToBookingEnabled !== false;
        // Marketing fields
        document.getElementById('service-badge-input').value = service.badge || '';
        document.getElementById('service-left-count-input').value = service.leftCount || 0;
        document.getElementById('service-discount-input').value = service.discount || 0;
        document.getElementById('service-original-price-input').value = service.originalPrice || 0;
        currentServiceMainPhoto = service.mainPhoto || '';
        currentServiceGallery = service.gallery ? [...service.gallery] : [];
        currentServiceReviews = service.reviews ? [...service.reviews] : [];
        deleteBtn.style.display = 'flex';
      }
    } else {
      title.textContent = 'Нова послуга';
      document.getElementById('service-name-input').value = '';
      document.getElementById('service-description-input').value = '';
      document.getElementById('service-price-input').value = '';
      document.getElementById('service-price-type-input').value = 'fixed';
      document.getElementById('service-category-input').value = 'general';
      document.getElementById('service-ask-toggle').checked = true;
      document.getElementById('service-add-booking-toggle').checked = true;
      // Marketing fields - reset
      document.getElementById('service-badge-input').value = '';
      document.getElementById('service-left-count-input').value = 0;
      document.getElementById('service-discount-input').value = 0;
      document.getElementById('service-original-price-input').value = 0;
      currentServiceReviews = [];
      deleteBtn.style.display = 'none';
    }

    updateServiceMainPhotoPreview();
    updateServiceGalleryPreview();
    renderServiceReviewsList(); // Render reviews
    modal.classList.add('active');
  }

  // Close Service Modal
  export function closeServiceModal() {
    const modal = document.getElementById('service-modal-overlay');
    modal.classList.remove('active');
    currentEditServiceId = null;
    currentServiceMainPhoto = '';
    currentServiceGallery = [];
    currentServiceReviews = [];
  }

  // Update Service Main Photo Preview
  function updateServiceMainPhotoPreview() {
    const area = document.getElementById('service-main-photo-upload');
    if (currentServiceMainPhoto) {
      area.innerHTML = `<img src="${currentServiceMainPhoto}" alt="Main photo">`;
      area.classList.add('has-photo');
    } else {
      area.innerHTML = `
      <div class="photo-upload-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>Натисніть для завантаження</span>
      </div>
    `;
      area.classList.remove('has-photo');
    }
  }

  // Update Service Gallery Preview
  function updateServiceGalleryPreview() {
    const grid = document.getElementById('service-gallery-upload-grid');

    // Clear existing items
    grid.innerHTML = '';

    currentServiceGallery.forEach((photo, index) => {
      const item = document.createElement('div');
      item.className = 'service-gallery-photo-item';
      item.innerHTML = `
      <img src="${photo}" alt="Gallery photo ${index + 1}">
      <button class="service-gallery-photo-remove" data-index="${index}">&times;</button>
    `;
      grid.appendChild(item);
    });

    // Re-add the add button
    const newAddBtn = document.createElement('div');
    newAddBtn.id = 'service-gallery-add-btn';
    newAddBtn.className = 'service-gallery-add-btn';
    newAddBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span>Додати</span>
  `;
    newAddBtn.addEventListener('click', () => {
      document.getElementById('service-gallery-photo-input').click();
    });
    grid.appendChild(newAddBtn);

    // Add remove listeners
    grid.querySelectorAll('.service-gallery-photo-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        currentServiceGallery.splice(index, 1);
        updateServiceGalleryPreview();
      });
    });
  }

  // Save Service
  function saveService() {
    const name = document.getElementById('service-name-input').value.trim();
    const description = document.getElementById('service-description-input').value.trim();
    const price = parseInt(document.getElementById('service-price-input').value) || 0;
    const priceType = document.getElementById('service-price-type-input').value;
    const category = document.getElementById('service-category-input').value;
    const askQuestionEnabled = document.getElementById('service-ask-toggle').checked;
    const addToBookingEnabled = document.getElementById('service-add-booking-toggle').checked;
    // Marketing fields
    const badge = document.getElementById('service-badge-input').value;
    const leftCount = parseInt(document.getElementById('service-left-count-input').value) || 0;
    const discount = parseInt(document.getElementById('service-discount-input').value) || 0;
    const originalPrice = parseInt(document.getElementById('service-original-price-input').value) || 0;

    if (!name) {
      alert('Введіть назву послуги');
      return;
    }

    const serviceData = {
      name,
      description,
      price,
      priceType,
      category,
      mainPhoto: currentServiceMainPhoto,
      gallery: currentServiceGallery,
      reviews: currentServiceReviews,
      askQuestionEnabled,
      addToBookingEnabled,
      // Marketing fields
      badge,
      leftCount,
      discount,
      originalPrice
    };

    if (currentEditServiceId) {
      services.updateService(currentEditServiceId, serviceData);
    } else {
      services.addService(serviceData);
    }

    closeServiceModal();
    renderServicesGrid();
  }

  // Delete Service
  function deleteService() {
    if (!currentEditServiceId) return;

    if (confirm('Видалити цю послугу?')) {
      services.deleteService(currentEditServiceId);
      closeServiceModal();
      renderServicesGrid();
    }
  }

  // Initialize Service Management
  export function initServiceManagement() {
    const addBtn = document.getElementById('add-service-btn');
    const modalClose = document.getElementById('service-modal-close');
    const cancelBtn = document.getElementById('service-cancel-btn');
    const saveBtn = document.getElementById('service-save-btn');
    const deleteBtn = document.getElementById('service-delete-btn');
    const mainPhotoUpload = document.getElementById('service-main-photo-upload');
    const mainPhotoInput = document.getElementById('service-main-photo-input');
    const galleryAddBtn = document.getElementById('service-gallery-add-btn');
    const galleryInput = document.getElementById('service-gallery-photo-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => openServiceModal());
    }

    if (modalClose) {
      modalClose.addEventListener('click', closeServiceModal);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeServiceModal);
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', saveService);
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', deleteService);
    }

    // Main photo upload
    if (mainPhotoUpload && mainPhotoInput) {
      mainPhotoUpload.addEventListener('click', () => mainPhotoInput.click());

      mainPhotoInput.addEventListener('change', async function () {
        if (this.files && this.files[0]) {
          try {
            currentServiceMainPhoto = await services.compressImage(this.files[0]);
            updateServiceMainPhotoPreview();
          } catch (e) {
            console.error('Error uploading service main photo:', e);
          }
        }
      });
    }

    // Gallery photos upload
    if (galleryAddBtn && galleryInput) {
      galleryAddBtn.addEventListener('click', () => galleryInput.click());

      galleryInput.addEventListener('change', async function () {
        if (this.files && this.files.length > 0) {
          for (const file of this.files) {
            try {
              const compressed = await services.compressImage(file);
              currentServiceGallery.push(compressed);
            } catch (e) {
              console.error('Error uploading gallery photo:', e);
            }
          }
          updateServiceGalleryPreview();
          this.value = '';
        }
      });
    }

    // Click outside modal to close
    const modalOverlay = document.getElementById('service-modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          closeServiceModal();
        }
      });
    }

    // Reviews management
    const addReviewBtn = document.getElementById('service-add-review-btn');
    if (addReviewBtn) {
      addReviewBtn.addEventListener('click', () => {
        const author = document.getElementById('service-review-author').value.trim();
        const rating = parseInt(document.getElementById('service-review-rating').value);
        const date = document.getElementById('service-review-date').value;
        const text = document.getElementById('service-review-text').value.trim();

        if (!author || !date || !text) {
          alert('Будь ласка, заповніть всі поля відгуку');
          return;
        }

        currentServiceReviews.push({ author, rating, date, text });
        renderServiceReviewsList();

        // Reset form
        document.getElementById('service-review-author').value = '';
        document.getElementById('service-review-rating').value = '5';
        document.getElementById('service-review-date').value = '';
        document.getElementById('service-review-text').value = '';
      });
    }

    // Initial render
    renderServicesGrid();
  }

  // Render Service Reviews List
  function renderServiceReviewsList() {
    const list = document.getElementById('service-reviews-list');
    if (!list) return;

    list.innerHTML = '';

    if (currentServiceReviews.length === 0) {
      list.innerHTML = '<div class="text-sm text-gray-500 italic p-2 text-center">Немає відгуків</div>';
      return;
    }

    currentServiceReviews.forEach((review, index) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      item.innerHTML = `
        <div class="review-header">
          <span class="review-author">${review.author}</span>
          <span class="review-rating">${'★'.repeat(review.rating)}</span>
        </div>
        <div class="review-date">${review.date}</div>
        <div class="review-text">${review.text}</div>
        <button class="review-delete-btn" data-index="${index}">&times;</button>
      `;
      list.appendChild(item);
    });

    // Add delete listeners
    list.querySelectorAll('.review-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        currentServiceReviews.splice(index, 1);
        renderServiceReviewsList();
      });
    });
  }

  // Initialize All Admin Functions
  export function initAdmin() {
    initFontSelector();
    initIconSelector();
    initShapeSelector();
    initOffsetControls();
    initAdminPanelControls();
    initPositionSelector();
    initFooterLayout();
    initHotelInfo();
    initCalendarControls();
    initRoomManagement();
    initServiceManagement();
    initBookingsManagement();
  }
