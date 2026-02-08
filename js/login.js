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
  const phoneInput = document.getElementById('phone-input');
  const confirmLoginBtn = document.getElementById('confirm-login-btn');
  const cancelLoginBtn = document.getElementById('cancel-login-btn');
  const closeSuccessBtn = document.getElementById('close-success-btn');
  const successMessageTitle = document.getElementById('success-message-title');

  if (!loginBtn || !loginModal || !successModal) {
    console.warn('Login modal elements not found');
    return;
  }

  // Open login modal
  loginBtn.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
    phoneInput.value = '';
    phoneInput.focus();
  });

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
    const phoneValue = phoneInput.value.trim();

    if (!phoneValue) {
      phoneInput.style.borderColor = '#ef4444';
      setTimeout(() => {
        phoneInput.style.borderColor = '';
      }, 1500);
      return;
    }

    // Hide login modal
    loginModal.classList.add('hidden');

    // Alternate between login and registration messages
    if (isLogin) {
      successMessageTitle.textContent = 'Вы успешно вошли в свой аккаунт';
    } else {
      successMessageTitle.textContent = 'Вы успешно создали профиль';
    }

    // Toggle state for next time
    isLogin = !isLogin;

    // Show success modal
    successModal.classList.remove('hidden');
  });

  // Handle Enter key in phone input
  phoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmLoginBtn.click();
    }
  });

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
