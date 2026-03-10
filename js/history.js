/*
 * Chat History
 * Hilton Chat Widget
 */

import * as dom from './dom.js';
// Circular imports are resolved at runtime — functions are called, not used at module init time
import { getBookingState, addMessage } from './chat.js';

const HISTORY_KEY = 'chat_history_archive';

let currentHistorySession = null;

export function archiveCurrentSession() {
  const userMessages = dom.messagesContainer.querySelectorAll('.message-wrapper.user');
  if (userMessages.length === 0) return;

  const timestamp = new Date().toISOString();
  const bookingState = getBookingState();
  const summary = bookingState.collectedData.fullName || `Guest (${new Date(timestamp).toLocaleDateString()})`;

  const sessionData = {
    id: `session_${Date.now()}`,
    timestamp,
    summary,
    messages: [
      ...Array.from(dom.messagesContainer.children).map(el => {
        if (el.classList.contains('message-wrapper')) {
          const isUser = el.classList.contains('user');
          const text = el.querySelector('[class^="chat-message"]')?.innerHTML || '';
          const time = el.querySelector('.message-time')?.innerText || '';
          return { type: 'message', sender: isUser ? 'user' : 'ai', text, time };
        }
        return null;
      }).filter(Boolean)
    ]
  };

  try {
    const existingArchive = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    existingArchive.unshift(sessionData);
    if (existingArchive.length > 50) existingArchive.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existingArchive));
  } catch (e) {
    console.error('Error archiving session:', e);
  }
}

function renderHistoryItems(searchQuery = '') {
  const list = document.getElementById('history-list');
  if (!list) return;

  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  list.innerHTML = '';

  const query = searchQuery.toLowerCase().trim();
  const filteredHistory = query === ''
    ? history
    : history.filter(session => {
      const inSummary = session.summary && session.summary.toLowerCase().includes(query);
      const inMessages = session.messages && session.messages.some(msg =>
        msg.text && msg.text.toLowerCase().includes(query)
      );
      return inSummary || inMessages;
    });

  if (filteredHistory.length === 0) {
    list.innerHTML = `
      <div class="text-center text-slate-400 mt-10">
        <p>${query === '' ? 'Немає збережених діалогів' : 'За вашим запитом нічого не знайдено'}</p>
      </div>
    `;
    return;
  }

  const today = new Date().toDateString();
  const groupedHistory = filteredHistory.reduce((acc, session) => {
    const date = new Date(session.timestamp).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  Object.keys(groupedHistory).forEach(dateStr => {
    const header = document.createElement('div');
    header.className = 'px-2 pt-4 pb-2';
    const labelText = dateStr === today ? 'Сегодня' : new Date(dateStr).toLocaleDateString();
    header.innerHTML = `<p class="text-xs font-bold uppercase tracking-widest text-slate-400">${labelText}</p>`;
    list.appendChild(header);

    groupedHistory[dateStr].forEach(session => {
      const timeStr = new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let snippet = 'Диалог сохранен';
      if (session.messages && session.messages.length > 0) {
        const lastMsg = session.messages[session.messages.length - 1];
        snippet = (lastMsg.sender === 'ai' ? 'AI: ' : 'Вы: ') + (lastMsg.text.replace(/<[^>]*>?/gm, '') || snippet);
      }

      const item = document.createElement('div');
      item.className = 'liquid-glass rounded-[2.5rem] p-4 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer mb-3';
      item.innerHTML = `
        <div class="w-14 h-14 rounded-full bg-[#135bec]/10 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[#135bec] fill-1">chat_bubble</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start mb-0.5">
            <h3 class="font-bold text-slate-900 truncate">${session.summary}</h3>
            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-tighter shrink-0 mt-1">${timeStr}</span>
          </div>
          <p class="text-sm text-slate-500 line-clamp-1 leading-relaxed">
            ${snippet}
          </p>
        </div>
      `;
      item.addEventListener('click', () => openHistoryDetail(session));
      list.appendChild(item);
    });
  });
}

function openHistoryDetail(session) {
  const detailView = document.getElementById('history-detail-view');
  const container = document.getElementById('history-detail-messages');
  const dateTitle = document.getElementById('history-detail-date');
  const timeTitle = document.getElementById('history-detail-time');

  if (!detailView || !container) return;

  currentHistorySession = session;
  container.innerHTML = '';

  if (dateTitle) dateTitle.textContent = session.summary;
  if (timeTitle) timeTitle.textContent = new Date(session.timestamp).toLocaleString();

  session.messages.forEach(msg => {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${msg.sender} animate-fade-in`;

    const messageElement = document.createElement('div');
    messageElement.className = `chat-message-${msg.sender} text-base leading-relaxed`;
    messageElement.innerHTML = msg.text;

    if (msg.sender === 'user') {
      const timeElement = document.createElement('span');
      timeElement.className = 'message-time';
      timeElement.innerText = msg.time;
      wrapper.appendChild(timeElement);
      wrapper.appendChild(messageElement);
    } else {
      wrapper.appendChild(messageElement);
    }

    container.appendChild(wrapper);
  });

  detailView.classList.remove('hidden');
  const wrapperMod = document.getElementById('history-modal-wrapper');
  const historyView = document.getElementById('history-view');

  if (wrapperMod) {
    wrapperMod.classList.add('show-detail');
    if (historyView) historyView.classList.add('-translate-x-full');
    setTimeout(() => detailView.classList.remove('translate-y-full'), 10);
  }
}

export function continueHistoryChat() {
  if (!currentHistorySession) return;

  const indicatorHTML = dom.typingIndicator.outerHTML;
  dom.messagesContainer.innerHTML = '';
  dom.messagesContainer.innerHTML = indicatorHTML;
  dom.updateTypingIndicator();

  currentHistorySession.messages.forEach(msg => addMessage(msg.text, msg.sender));

  const bookingState = getBookingState();
  let history = currentHistorySession.messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));
  if (history.length > 10) history = history.slice(-10);
  bookingState.conversationHistory = history;

  const historyView = document.getElementById('history-view');
  const historyDetailView = document.getElementById('history-detail-view');
  const historyModalWrapper = document.getElementById('history-modal-wrapper');

  if (historyView && historyModalWrapper) {
    historyView.classList.add('translate-y-full');
    historyDetailView?.classList.add('translate-y-full');
    historyModalWrapper.classList.add('hidden');

    setTimeout(() => {
      historyModalWrapper.classList.remove('show-detail');
      historyDetailView?.classList.add('hidden');
    }, 500);
  }

  if (dom.messagesContainer) {
    dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
  }

  const messageInput = document.getElementById('message-input');
  if (messageInput) messageInput.focus();
}

export function showHistoryModal() {
  const wrapper = document.getElementById('history-modal-wrapper');
  const view = document.getElementById('history-view');
  if (!wrapper || !view) return;

  if (dom.historySearchInput && !dom.historySearchInput.dataset.searchInited) {
    dom.historySearchInput.addEventListener('input', (e) => renderHistoryItems(e.target.value));
    dom.historySearchInput.dataset.searchInited = 'true';
  }

  if (dom.historySearchInput) dom.historySearchInput.value = '';

  renderHistoryItems();
  wrapper.classList.remove('hidden');

  setTimeout(() => view.classList.remove('translate-y-full'), 10);
}
