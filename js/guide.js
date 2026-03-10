/*
 * Guide Sheet
 * Hilton Chat Widget
 */

import * as dom from './dom.js';
import { showAppDownloadModal } from './app-download.js';

const GUIDE_ITEMS_KEY = 'guide_items';

const DEFAULT_GUIDE_ITEMS = [
  { id: '1', icon: 'user', text: 'Рекомендации нашего шефа' },
  { id: '2', icon: 'spa', text: 'Wellness эксклюзивы' }
];

export function loadGuideItems() {
  try {
    const saved = localStorage.getItem(GUIDE_ITEMS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_GUIDE_ITEMS;
  } catch (e) {
    return DEFAULT_GUIDE_ITEMS;
  }
}

export function saveGuideItems(items) {
  try {
    localStorage.setItem(GUIDE_ITEMS_KEY, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error('Error saving guide items:', e);
    return false;
  }
}

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

export function showGuideSheet() {
  const sheet = dom.guideBottomSheet;
  const content = document.getElementById('guide-sheet-content-inner');
  if (!sheet || !content) return;

  renderGuideItems();
  sheet.classList.remove('hidden');
  setTimeout(() => content.classList.remove('translate-y-full'), 10);
}

export function hideGuideSheet() {
  const sheet = dom.guideBottomSheet;
  const content = document.getElementById('guide-sheet-content-inner');
  if (!sheet || !content) {
    if (sheet) sheet.classList.add('hidden');
    return;
  }

  content.classList.add('translate-y-full');
  setTimeout(() => sheet.classList.add('hidden'), 500);
}

export function initGuideSheetListeners() {
  if (dom.guideBadgeBtn) {
    dom.guideBadgeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const role = dom.guideBadgeBtn.dataset.role;
      if (role === 'app-download') {
        showAppDownloadModal();
      } else if (role === 'guide') {
        showGuideSheet();
      }
    });
  } else {
    console.warn('dom.guideBadgeBtn not found during listener init');
  }

  if (dom.guideSheetClose) {
    dom.guideSheetClose.addEventListener('click', () => hideGuideSheet());
  }

  if (dom.guideTelegramBtn) {
    dom.guideTelegramBtn.addEventListener('click', () => {
      const telegramLink = 'https://t.me/your_hotel_bot';
      window.open(telegramLink, '_blank');
      hideGuideSheet();
    });
  }

  if (dom.guideBottomSheet) {
    dom.guideBottomSheet.addEventListener('click', (e) => {
      if (e.target === dom.guideBottomSheet) hideGuideSheet();
    });
  }
}
