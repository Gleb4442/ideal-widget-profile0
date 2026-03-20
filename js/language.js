/*
 * Language & Translation
 * Hilton Chat Widget
 */

import { translations, languagesList } from './config.js';
import * as dom from './dom.js';
// Circular — called at runtime only, not at module init
import { addMessage, addToConversationHistory, closeHeaderMenu, closeLanguageSubmenu } from './chat.js';

export const LANGUAGE_KEY = 'chat_language';

export let currentLang = localStorage.getItem(LANGUAGE_KEY) || 'en';

export function setCurrentLang(lang) {
  currentLang = lang;
}

export function getTranslation(key) {
  const t = translations[currentLang] || translations['en'];
  return t[key] || translations['en'][key] || key;
}

export function renderLanguageMenu() {
  const list = document.getElementById('language-sheet-list');
  const display = document.getElementById('current-lang-display');

  if (display) display.textContent = currentLang.toUpperCase();
  if (!list) return;

  list.innerHTML = '';
  languagesList.forEach(lang => {
    const btn = document.createElement('button');
    btn.dataset.lang = lang.code;

    const isSelected = lang.code === currentLang;

    if (isSelected) {
      btn.className = 'language-option active';
      btn.innerHTML = `
        <div class="flex items-center space-x-4">
            <div class="w-[52px] h-[52px] rounded-2xl overflow-hidden flex items-center justify-center bg-gray-50 text-3xl shadow-sm border border-gray-100/50">
                ${lang.flag}
            </div>
            <div class="flex flex-col items-start translate-y-[1px]">
              <span class="font-bold text-[17px] text-gray-900 leading-none">${lang.name}</span>
              <span class="text-[12px] text-gray-400 mt-1 font-medium leading-none">${lang.nativeName}</span>
            </div>
        </div>
        <div class="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center shadow-md border-2 border-white">
            <span class="material-symbols-rounded text-white text-[18px]">check</span>
        </div>
      `;
    } else {
      btn.className = 'language-option group';
      btn.innerHTML = `
        <div class="flex items-center space-x-4">
            <div class="w-[52px] h-[52px] rounded-2xl overflow-hidden flex items-center justify-center bg-gray-50/50 text-3xl opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105 group-hover:shadow-sm">
                ${lang.flag}
            </div>
            <div class="flex flex-col items-start translate-y-[1px]">
              <span class="font-medium text-[17px] text-gray-700 group-hover:text-gray-900 transition-colors leading-none">${lang.name}</span>
              <span class="text-[12px] text-gray-400 mt-1 font-medium leading-none">${lang.nativeName}</span>
            </div>
        </div>
        <div class="w-7 h-7 rounded-full bg-gray-100/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 transform scale-75 group-hover:scale-100">
            <span class="material-symbols-rounded text-gray-400 text-[18px]">arrow_forward</span>
        </div>
      `;
    }
    list.appendChild(btn);
  });
}

export function updateUITexts() {
  const t = translations[currentLang] || translations['en'];

  if (dom.messageInput) {
    dom.messageInput.placeholder = t.placeholder || 'Type a message...';
  }

  // Handle text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });

  // Handle placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) el.placeholder = t[key];
  });

  // Handle titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (t[key]) el.title = t[key];
  });

  // Handle aria-labels
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (t[key]) el.setAttribute('aria-label', t[key]);
  });

  renderLanguageMenu();
}

export function switchLanguage(langCode) {
  if (!translations[langCode]) {
    console.warn(`Language ${langCode} not found, falling back to English`);
    langCode = 'en';
  }

  currentLang = langCode;
  localStorage.setItem(LANGUAGE_KEY, langCode);

  updateUITexts();

  if (langCode === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.removeAttribute('dir');
  }

  closeHeaderMenu();
  closeLanguageSubmenu();

  addMessage(getTranslation('welcome'), 'ai');
  addToConversationHistory('assistant', getTranslation('welcome'));
}

export function initLanguage() {
  currentLang = localStorage.getItem(LANGUAGE_KEY) || 'en';
  const t = translations[currentLang] || translations['en'];
  if (dom.messageInput) {
    dom.messageInput.placeholder = t.placeholder || 'Type a message...';
  }
  if (dom.chatButtonText && dom.buttonTextSelect) {
    dom.chatButtonText.textContent = dom.buttonTextSelect.value;
  }
  renderLanguageMenu();
}
