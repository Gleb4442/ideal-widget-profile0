/*
 * Banner Logic
 * Hilton Chat Widget
 */

import * as dom from './dom.js';
import { checkScrollButtonVisibility } from './chat.js';

// Update Contact Stack
export function updateContactStack() {
  const isChecked = (el) => el && el.checked;
  const stackOrder = [
    { el: dom.banners.telegram, enabled: isChecked(dom.tgToggle) }
  ];

  let currentBottom = 12;

  stackOrder.forEach(item => {
    if (!item.el) return;
    if (item.enabled) {
      item.el.classList.add('show-banner');
      item.el.style.marginBottom = `${currentBottom}px`;
      const isCollapsed = item.el.classList.contains('collapsed');
      const spacing = isCollapsed ? 37 : 75;
      currentBottom += spacing;
    } else {
      item.el.classList.remove('show-banner');
    }
  });

  checkScrollButtonVisibility();
}

// Setup Banner Interactions
export function setupBannerInteractions(bannerId, modalId, externalLink) {
  const banner = document.getElementById(bannerId);
  const modal = document.getElementById(modalId);
  if (!banner || !modal) return;

  const closeBtn = banner.querySelector('.close-banner-btn');
  const confirmBtn = modal.querySelector('button:first-child');
  const cancelBtn = modal.querySelector('.modal-btn-cancel');

  banner.addEventListener('click', function (e) {
    if (e.target.closest('.close-banner-btn')) return;
    if (this.classList.contains('collapsed')) {
      e.preventDefault();
      modal.classList.remove('hidden');
    } else {
      if (externalLink) {
        window.open(externalLink, '_blank');
      } else {
        modal.classList.remove('hidden');
      }
    }
  });

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    banner.classList.add('collapsed');
    updateContactStack();
    checkScrollButtonVisibility();
  });

  confirmBtn.addEventListener('click', () => {
    if (externalLink) window.open(externalLink, '_blank');
    modal.classList.add('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

// Initialize Banners
export function initBanners() {
  setupBannerInteractions('telegram-banner', 'tg-confirmation-modal', 'https://t.me/hilton');

  if (dom.tgToggle) {
    dom.tgToggle.addEventListener('change', updateContactStack);
  }

  updateContactStack();
}
