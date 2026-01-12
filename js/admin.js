/*
 * Admin Panel Logic
 * Hilton Chat Widget
 */

import { fontsList, iconsList } from './config.js';
import * as dom from './dom.js';
import * as rooms from './rooms.js';

// Room editing state
let currentEditRoomId = null;
let currentMainPhoto = '';
let currentGallery = [];
let currentBookedDates = [];
let calendarCurrentMonth = new Date();

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

  dom.logoUpload.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
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
      let num = parseInt(hex.replace("#",""), 16);
      let amt = Math.round(2.55 * percent);
      let R = (num >> 16) - amt;
      let G = (num >> 8 & 0x00FF) - amt;
      let B = (num & 0x0000FF) - amt;
      return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
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
  currentBookedDates = [];
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
      currentMainPhoto = room.mainPhoto || '';
      currentGallery = room.gallery ? [...room.gallery] : [];
      currentBookedDates = room.bookedDates ? [...room.bookedDates] : [];
      deleteBtn.style.display = 'flex';
    }
  } else {
    title.textContent = 'Новий номер';
    document.getElementById('room-name-input').value = '';
    document.getElementById('room-description-input').value = '';
    document.getElementById('room-area-input').value = '';
    document.getElementById('room-price-input').value = '';
    document.getElementById('room-ask-toggle').checked = true;
    deleteBtn.style.display = 'none';
  }

  updateMainPhotoPreview();
  updateGalleryPreview();
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
    bookedDates: currentBookedDates
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

    mainPhotoInput.addEventListener('change', async function() {
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

    galleryInput.addEventListener('change', async function() {
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

  // Initial render
  renderRoomsGrid();
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
}
