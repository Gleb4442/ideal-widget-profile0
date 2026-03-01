/*
 * DOM Element References
 * Hilton Chat Widget
 */

// Main Widget Elements
export const widgetButton = document.getElementById('chat-widget-button');
export const chatWindow = document.getElementById('chat-window');
export const closeButton = document.getElementById('chat-close-button');
export const messagesContainer = document.getElementById('chat-messages');
export const messageInput = document.getElementById('message-input');
export const sendButton = document.getElementById('send-button');
export const notificationBadge = document.getElementById('chat-notification-badge');
export const btnIconSend = document.getElementById('btn-icon-send');
export const resetChatBtn = document.getElementById('reset-chat-btn');
export const chatButtonText = document.querySelector('.chat-button-text');
export const scrollToBottomBtn = document.getElementById('scroll-to-bottom-btn');
export const brandingToggle = document.getElementById('branding-toggle');
export const poweredByContainer = document.getElementById('powered-by-container');
export const chatFooter = document.getElementById('chat-footer');
export const inputAreaWrapper = document.getElementById('input-area-wrapper');

// Admin Panel Elements
export const adminPanel = document.getElementById('admin-panel');
export const openAdminBtn = document.getElementById('open-admin-btn');
export const closeAdminBtn = document.getElementById('close-admin-btn');
export const accentColorPicker = document.getElementById('accent-color-picker');
export const colorValueText = document.getElementById('color-value-text');
export const themeToggle = document.getElementById('theme-toggle');
export const hotelNameInput = document.getElementById('hotel-name-input');
export const logoUpload = document.getElementById('logo-upload');
export const hotelNameText = document.getElementById('hotel-name-text');
export const hotelLogoContainer = document.getElementById('hotel-logo-container');
export const buttonTextSelect = document.getElementById('button-text-select');
export const animationToggle = document.getElementById('animation-toggle');
export const positionSelect = document.getElementById('position-select');
export const hotelInfoInput = document.getElementById('hotel-info-input');

// Offset & Scale Controls
export const inputOffsetX = document.getElementById('input-offset-x');
export const inputOffsetY = document.getElementById('input-offset-y');
export const valOffsetX = document.getElementById('val-offset-x');
export const valOffsetY = document.getElementById('val-offset-y');
export const inputScale = document.getElementById('input-scale');
export const valScale = document.getElementById('val-scale');
export const fontSelect = document.getElementById('font-select');
export const shapeSelector = document.getElementById('shape-selector');
export const iconSelector = document.getElementById('icon-selector');
export const widgetIconContainer = document.getElementById('widget-icon-container');

// Toggles
export const tgToggle = document.getElementById('tg-toggle');
export const cancellationBannerToggle = document.getElementById('cancellation-banner-toggle');

// Banners
export const banners = {
  telegram: document.getElementById('telegram-banner'),
  cancellation: document.getElementById('cancellation-banner')
};

// Modals
export const modals = {
  reset: document.getElementById('reset-confirmation-modal'),
  telegram: document.getElementById('tg-confirmation-modal')
};

// Welcome & Legal Modals
export const welcomeModal = document.getElementById('welcome-modal');
export const welcomeStartBtn = document.getElementById('welcome-start-btn');
export const legalModal = document.getElementById('legal-modal');
export const legalBackBtn = document.getElementById('legal-back-btn');
export const legalIframe = document.getElementById('legal-iframe');
export const legalLinks = document.querySelectorAll('.legal-link');
export const policyConsentBanner = document.getElementById('policy-consent-banner');
export const policyLinks = document.querySelectorAll('.policy-link');

// Special Booking Elements
export const headerMenuBtn = document.getElementById('header-menu-btn');
export const headerMenuDropdown = document.getElementById('header-menu-dropdown');
export const specialBookingStatus = document.getElementById('special-booking-status');
export const specialOfferCard = document.getElementById('special-offer-card');
export const offerRoomImage = document.getElementById('offer-room-image');
export const offerRoomName = document.getElementById('offer-room-name');
export const offerRoomPrice = document.getElementById('offer-room-price');
export const offerDates = document.getElementById('offer-dates');
export const offerGuests = document.getElementById('offer-guests');
export const offerTotal = document.getElementById('offer-total');
export const offerNotesList = document.getElementById('offer-notes-list');
export const offerConfirmBtn = document.getElementById('offer-confirm-btn');
export const offerEditBtn = document.getElementById('offer-edit-btn');

// Language Selector Elements
export const languageMenuBtn = document.getElementById('language-menu-btn');
export const languageSubmenu = document.getElementById('language-submenu');
export const languageOptions = document.querySelectorAll('.language-option');

// Header Status Pill (Special Booking / Operator Mode)
export const headerStatusPill = document.getElementById('header-status-pill');
export const headerStatusSpinner = document.querySelector('.header-status-spinner');
export const headerStatusText = document.querySelector('.header-status-text');
export const onlineIndicator = document.getElementById('online-indicator');

// Operator Mode Elements (Admin)
export const operatorModeToggle = document.getElementById('operator-mode-toggle');
export const operatorSettings = document.getElementById('operator-settings');
export const operatorNameInput = document.getElementById('operator-name-input');
export const operatorPhotoInput = document.getElementById('operator-photo-input');
export const operatorPhotoPreview = document.getElementById('operator-photo-preview');

// Guide Elements
export const guideBadgeBtn = document.getElementById('guide-badge-btn');
export const guideBottomSheet = document.getElementById('guide-bottom-sheet');
export const guideSheetClose = document.getElementById('guide-sheet-close');
export const guideTelegramBtn = document.getElementById('guide-telegram-btn');
export const guideItemsList = document.getElementById('guide-items-list');

// Mutable reference for typing indicator (needs re-assignment after reset)
export let typingIndicator = document.getElementById('typing-indicator');

export function updateTypingIndicator() {
  typingIndicator = document.getElementById('typing-indicator');
  return typingIndicator;
}
