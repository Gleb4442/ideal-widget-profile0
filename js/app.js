/*
 * Main Application Entry Point
 * Hilton Chat Widget
 */

import * as dom from './dom.js';
import { initAdmin } from './admin.js';
import { initLanguage, initChatListeners, updateSendButtonState } from './chat.js';
import { initBanners } from './banners.js';
import { initGallery } from './gallery.js';

// Initialize Application
function init() {
  // Initialize admin panel
  initAdmin();

  // Initialize language
  initLanguage();

  // Initialize chat listeners
  initChatListeners();

  // Initialize banners
  initBanners();

  // Initialize photo gallery
  initGallery();

  // Initialize send button state
  updateSendButtonState();

  // Set default positioning
  dom.widgetButton.classList.add('widget-pos-right');
  dom.chatWindow.classList.add('widget-pos-right');

  console.log('Hilton Chat Widget initialized successfully');
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
