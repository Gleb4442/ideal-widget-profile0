/*
 * Login Modal Functionality
 * Handles user login/registration flow
 */

// Track login state (alternates between login and registration)
let isLogin = true;

export function initLoginModal() {
  const loginBtn = document.getElementById('guide-badge-btn');
  const loginModal = document.getElementById('login-modal');
  const successModal = document.getElementById('login-success-modal');
  const smsCodeInput = document.getElementById('sms-code-input');
  const confirmLoginBtn = document.getElementById('confirm-login-btn');
  const cancelLoginBtn = document.getElementById('cancel-login-btn');
  const closeSuccessBtn = document.getElementById('close-success-btn');
  const successMessageTitle = document.getElementById('success-message-title');

  if (!loginBtn || !loginModal || !successModal) {
    console.warn('Login modal elements not found');
    return;
  }

  // Demo button - no action (App Store & Google Play icons)
  loginBtn.addEventListener('click', (e) => {
    // Prevent any other click handlers on this button
    if (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    // Demo button - no functionality
    return;
  }, { capture: true });

  // Cancel login
  cancelLoginBtn.addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });

  // Close login modal on backdrop click
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add('hidden');
    }
  });

  // Confirm login/registration
  confirmLoginBtn.addEventListener('click', () => {
    const codeValue = smsCodeInput ? smsCodeInput.value.trim() : '';
    const isValidCode = /^\d{4,6}$/.test(codeValue);

    if (!codeValue || !isValidCode) {
      if (smsCodeInput) {
        smsCodeInput.style.borderColor = '#ef4444';
      }
      setTimeout(() => {
        if (smsCodeInput) {
          smsCodeInput.style.borderColor = '';
        }
      }, 1500);
      return;
    }

    // Hide login modal
    loginModal.classList.add('hidden');

    // Alternate between login and registration messages
    if (isLogin) {
      successMessageTitle.textContent = 'Код подтвержден. Вы вошли в аккаунт';
    } else {
      successMessageTitle.textContent = 'Код подтвержден. Профиль создан';
    }

    // Toggle state for next time
    isLogin = !isLogin;

    // Show success modal
    successModal.classList.remove('hidden');
  });

  // Handle Enter key in phone input
  if (smsCodeInput) {
    smsCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmLoginBtn.click();
      }
    });
  }

  // Close success modal
  closeSuccessBtn.addEventListener('click', () => {
    successModal.classList.add('hidden');
  });

  // Close success modal on backdrop click
  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      successModal.classList.add('hidden');
    }
  });

  console.log('✓ Login modal initialized');
}
