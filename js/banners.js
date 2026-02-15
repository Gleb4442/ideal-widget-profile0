/*
 * Telegram Banner Logic
 * Hilton Chat Widget
 */

import { checkScrollButtonVisibility } from './chat.js';

// Telegram Banner Management
let telegramLink = 'https://t.me/your_bot_or_channel'; // Replace with actual Telegram link

// Initialize Telegram Banner
export function initTelegramBanner() {
  const banner = document.getElementById('telegram-banner');
  const collapsed = document.getElementById('telegram-collapsed');
  const closeBtn = document.getElementById('telegram-close-btn');
  const modal = document.getElementById('telegram-confirmation-modal');
  const proceedBtn = document.getElementById('telegram-proceed-btn');
  const cancelBtn = document.getElementById('telegram-cancel-btn');

  if (!banner || !collapsed || !closeBtn || !modal || !proceedBtn || !cancelBtn) {
    console.warn('Telegram banner elements not found');
    return;
  }

  // Close button - collapse banner
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    collapseBanner();
  });

  // Collapsed button - show modal
  collapsed.addEventListener('click', (e) => {
    e.preventDefault();
    showModal();
  });

  // Proceed button - open Telegram
  proceedBtn.addEventListener('click', () => {
    window.open(telegramLink, '_blank');
    hideModal();
  });

  // Cancel button - close modal
  cancelBtn.addEventListener('click', () => {
    hideModal();
  });

  // Close modal on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal();
    }
  });

  // Show banner initially with animation
  setTimeout(() => {
    if (banner) {
      banner.classList.add('expanded');
    }
  }, 500);
}

function collapseBanner() {
  const banner = document.getElementById('telegram-banner');
  const collapsed = document.getElementById('telegram-collapsed');
  const policyBanner = document.getElementById('policy-consent-banner');

  if (!banner || !collapsed) return;

  // Add collapsing animation
  banner.classList.add('collapsing');

  // After animation, hide banner and show collapsed button
  setTimeout(() => {
    banner.style.display = 'none';
    collapsed.style.display = 'block';
    setTimeout(() => {
      collapsed.classList.add('show');

      // Position above policy banner if it's still visible
      if (policyBanner && !policyBanner.classList.contains('hidden')) {
        collapsed.classList.add('above-banner');
      }

      checkScrollButtonVisibility();
    }, 50);
  }, 300);
}

function showModal() {
  const modal = document.getElementById('telegram-confirmation-modal');
  if (!modal) return;

  modal.style.display = 'flex';
  // Trigger animation
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
}

function hideModal() {
  const modal = document.getElementById('telegram-confirmation-modal');
  if (!modal) return;

  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.display = 'none';
  }, 200);
}

// Set Telegram link (can be called from config or admin panel)
export function setTelegramLink(link) {
  if (link) {
    telegramLink = link;
  }
}

// Get current Telegram link
export function getTelegramLink() {
  return telegramLink;
}

// Initialize all banners
export function initBanners() {
  initTelegramBanner();
}
