/*
 * Operator Simulation & Escalation State
 * Hilton Chat Widget
 */

// Escalation state — exported as mutable object (never reassigned, only mutated)
export const escalationState = {
  awaitingConfirmation: false,
  isEscalated: false,
  reason: null // 'requested' | 'required'
};

export function resetEscalationState() {
  escalationState.awaitingConfirmation = false;
  escalationState.isEscalated = false;
  escalationState.reason = null;
}

// Operator mode state
export const operatorMode = {
  enabled: false,
  name: 'Денис',
  photo: null,
  connected: false,
  originalLogo: null,
  timeouts: []
};

// ── Header status pill ──

export function updateHeaderStatus(text, showSpinner = true) {
  const pill = document.getElementById('header-status-pill');
  const spinner = pill?.querySelector('.header-status-spinner');
  const statusText = pill?.querySelector('.header-status-text');

  if (!pill) return;

  if (text) {
    if (statusText) statusText.textContent = text;
    if (spinner) spinner.style.display = showSpinner ? 'block' : 'none';
    pill.classList.remove('hidden');
  } else {
    pill.classList.add('hidden');
  }
}

export function hideHeaderStatus() {
  const pill = document.getElementById('header-status-pill');
  if (pill) pill.classList.add('hidden');
}

// ── Operator status bar ──

function updateOperatorStatusBar(text, showSpinner = true) {
  const bar = document.getElementById('operator-status-bar');
  const spinner = bar?.querySelector('.operator-status-spinner');
  const statusText = bar?.querySelector('.operator-status-text');

  if (!bar) return;

  if (text) {
    if (statusText) statusText.textContent = text;
    if (spinner) spinner.style.display = showSpinner ? 'block' : 'none';
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

function hideOperatorStatusBar() {
  const bar = document.getElementById('operator-status-bar');
  if (bar) bar.classList.add('hidden');
}

// ── Simulation ──

export function startOperatorSimulation() {
  operatorMode.timeouts.forEach(t => clearTimeout(t));
  operatorMode.timeouts = [];

  const logoContainer = document.getElementById('hotel-logo-container');
  if (logoContainer && !operatorMode.originalLogo) {
    operatorMode.originalLogo = logoContainer.innerHTML;
  }

  updateOperatorStatusBar('Ищем специалиста...', true);

  const t1 = setTimeout(() => {
    updateOperatorStatusBar('Подключаем оператора...', true);
  }, 4000);
  operatorMode.timeouts.push(t1);

  const t2 = setTimeout(() => {
    const name = operatorMode.name || 'Денис';
    updateOperatorStatusBar(`Оператор ${name} присоединился`, false);
    operatorMode.connected = true;

    if (operatorMode.photo && logoContainer) {
      logoContainer.innerHTML = `<img src="${operatorMode.photo}" class="w-full h-full object-cover rounded-full" alt="Operator">`;
    }

    const t3 = setTimeout(() => hideOperatorStatusBar(), 3000);
    operatorMode.timeouts.push(t3);
  }, 10000);
  operatorMode.timeouts.push(t2);
}

export function stopOperatorSimulation() {
  operatorMode.timeouts.forEach(t => clearTimeout(t));
  operatorMode.timeouts = [];

  operatorMode.connected = false;
  hideOperatorStatusBar();
  resetEscalationState();

  const logoContainer = document.getElementById('hotel-logo-container');
  if (logoContainer && operatorMode.originalLogo) {
    logoContainer.innerHTML = operatorMode.originalLogo;
  }
}

export function setOperatorSettings(name, photo) {
  if (name) operatorMode.name = name;
  if (photo) operatorMode.photo = photo;
}
