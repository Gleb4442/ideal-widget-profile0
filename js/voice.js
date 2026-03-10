/*
 * Voice Input
 * Hilton Chat Widget
 */

import * as dom from './dom.js';

export function initVoiceInput() {
  const btn = document.getElementById('voice-input-button');
  if (!btn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.classList.add('is-unsupported');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || 'ru-RU';

  let isRecording = false;
  let baseText = '';

  const micIcon = document.getElementById('btn-icon-mic');
  const stopIcon = document.getElementById('btn-icon-mic-stop');

  function startRecording() {
    baseText = dom.messageInput ? dom.messageInput.value : '';
    try { recognition.start(); } catch (e) { }
    isRecording = true;
    btn.classList.add('is-recording');
    if (micIcon) micIcon.style.display = 'none';
    if (stopIcon) stopIcon.style.display = 'block';
  }

  function stopRecording() {
    isRecording = false;
    try { recognition.stop(); } catch (e) { }
    btn.classList.remove('is-recording');
    if (micIcon) micIcon.style.display = 'block';
    if (stopIcon) stopIcon.style.display = 'none';
  }

  btn.addEventListener('click', () => {
    if (isRecording) stopRecording();
    else startRecording();
  });

  recognition.addEventListener('result', (event) => {
    let transcript = '';
    for (const result of event.results) {
      transcript += result[0].transcript;
    }
    if (dom.messageInput) {
      dom.messageInput.value = baseText + (baseText && transcript ? ' ' : '') + transcript;
      dom.messageInput.dispatchEvent(new Event('input'));
    }
  });

  recognition.addEventListener('end', () => {
    if (isRecording) {
      baseText = dom.messageInput ? dom.messageInput.value : '';
      try { recognition.start(); } catch (e) { stopRecording(); }
    } else {
      btn.classList.remove('is-recording');
      if (micIcon) micIcon.style.display = 'block';
      if (stopIcon) stopIcon.style.display = 'none';
    }
  });

  recognition.addEventListener('error', (event) => {
    console.warn('Voice recognition error:', event.error);
    if (event.error !== 'no-speech') stopRecording();
  });
}
