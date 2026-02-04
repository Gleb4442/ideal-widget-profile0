/*
 * Main Application Entry Point
 * Hilton Chat Widget
 */

import * as dom from './dom.js';
import { initAdmin } from './admin.js';
import { initLanguage, initChatListeners, updateSendButtonState } from './chat.js';
import { initBanners } from './banners.js';
import { initGallery } from './gallery.js';
import { initMenuModal } from './menu.js';
import * as bookings from './bookings.js';

// Validate critical DOM elements
if (!dom.widgetButton || !dom.chatWindow) {
  console.error('CRITICAL ERROR: Widget elements not found in DOM');
}

// Initialize Application
function init() {
  // Auto-load test bookings if database is empty
  if (bookings.getAllBookings().length === 0) {
    console.log('Loading test bookings...');
    const generated = bookings.generateTestBookings();
    console.log(`✓ ${generated.length} test bookings loaded`);

    // Log guest names for easy reference
    const guestList = generated
      .filter(b => b.status === 'confirmed')
      .slice(0, 10)
      .map(b => `  • ${b.guestName} (${b.id})`)
      .join('\n');
    console.log('Sample guests for testing:\n' + guestList);
  }

  // Initialize admin panel
  try {
    initAdmin();
  } catch (e) { console.error('Admin init failed:', e); }

  // Initialize language
  try {
    initLanguage();
  } catch (e) { console.error('Language init failed:', e); }

  // Initialize chat listeners
  try {
    initChatListeners();
  } catch (e) { console.error('Chat listeners init failed:', e); }

  // Initialize banners
  try {
    initBanners();
  } catch (e) { console.error('Banners init failed:', e); }

  // Initialize photo gallery
  try {
    initGallery();
  } catch (e) { console.error('Gallery init failed:', e); }

  // Initialize menu modal
  try {
    initMenuModal();
  } catch (e) { console.error('Menu modal init failed:', e); }

  // Initialize send button state
  try {
    updateSendButtonState();
  } catch (e) { console.error('Send button init failed:', e); }

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
