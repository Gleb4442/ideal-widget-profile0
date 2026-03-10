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
            <span class="font-bold text-[17px] text-gray-900">${lang.name}</span>
        </div>
        <div class="w-6 h-6 rounded-full bg-[#3B82F6] flex items-center justify-center shadow-sm">
            <span class="material-symbols-rounded text-white text-[18px]">check</span>
        </div>
      `;
    } else {
      btn.className = 'language-option';
      btn.innerHTML = `
        <div class="flex items-center space-x-4">
            <div class="w-[52px] h-[52px] rounded-2xl overflow-hidden flex items-center justify-center bg-gray-50/50 text-3xl opacity-90 group-hover:opacity-100 transition-opacity">
                ${lang.flag}
            </div>
            <span class="font-medium text-[17px] text-gray-700 group-hover:text-gray-900 transition-colors">${lang.name}</span>
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

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
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
