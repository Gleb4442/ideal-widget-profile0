/*
 * Restaurant Menu Logic
 * Hilton Chat Widget
 */

import { getMenuSettings } from './admin.js';

// Open menu modal
export function openMenuModal() {
  const settings = getMenuSettings();

  if (!settings || !settings.enabled) {
    console.warn('Menu is not enabled');
    return;
  }

  const menuModal = document.getElementById('menu-modal');
  const menuIframe = document.getElementById('menu-iframe');

  if (!menuModal || !menuIframe) {
    console.error('Menu modal or iframe not found');
    return;
  }

  // Set iframe source based on menu type
  if (settings.type === 'link') {
    menuIframe.src = settings.link;
  } else if (settings.type === 'pdf') {
    // Display PDF using data URL
    menuIframe.src = settings.pdfData;
  }

  // Show modal
  menuModal.classList.remove('hidden');
}

// Close menu modal
export function closeMenuModal() {
  const menuModal = document.getElementById('menu-modal');
  const menuIframe = document.getElementById('menu-iframe');

  if (menuModal) {
    menuModal.classList.add('hidden');
  }

  if (menuIframe) {
    menuIframe.src = '';
  }
}

// Check if menu is available
export function isMenuAvailable() {
  const settings = getMenuSettings();
  return settings && settings.enabled && (settings.link || settings.pdfData);
}

// Initialize menu modal
export function initMenuModal() {
  const menuBackBtn = document.getElementById('menu-back-btn');

  if (menuBackBtn) {
    menuBackBtn.addEventListener('click', closeMenuModal);
  }
}
