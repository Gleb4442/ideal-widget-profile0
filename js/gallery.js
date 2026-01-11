/*
 * Photo Gallery Module
 * Hilton Chat Widget
 */

// Gallery state
let currentPhotos = [];
let currentIndex = 0;

// DOM Elements (cached on init)
let overlay = null;
let image = null;
let counter = null;
let prevBtn = null;
let nextBtn = null;
let closeBtn = null;
let dotsContainer = null;

// Initialize gallery
export function initGallery() {
  overlay = document.getElementById('photo-gallery-overlay');
  image = document.getElementById('photo-gallery-image');
  counter = document.getElementById('photo-gallery-counter');
  prevBtn = document.getElementById('photo-gallery-prev');
  nextBtn = document.getElementById('photo-gallery-next');
  closeBtn = document.getElementById('photo-gallery-close');
  dotsContainer = document.getElementById('photo-gallery-dots');

  if (!overlay) return;

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeGallery);
  }

  // Navigation buttons
  if (prevBtn) {
    prevBtn.addEventListener('click', showPrevious);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', showNext);
  }

  // Keyboard navigation
  document.addEventListener('keydown', handleKeydown);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('photo-gallery-content')) {
      closeGallery();
    }
  });

  // Touch swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        showNext();
      } else {
        showPrevious();
      }
    }
  }
}

// Handle keyboard navigation
function handleKeydown(e) {
  if (!overlay || !overlay.classList.contains('active')) return;

  switch (e.key) {
    case 'ArrowLeft':
      showPrevious();
      break;
    case 'ArrowRight':
      showNext();
      break;
    case 'Escape':
      closeGallery();
      break;
  }
}

// Open gallery with photos
export function openGallery(photos, startIndex = 0) {
  if (!photos || photos.length === 0) return;

  currentPhotos = photos;
  currentIndex = Math.min(startIndex, photos.length - 1);

  updateGalleryView();
  renderDots();

  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close gallery
export function closeGallery() {
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  currentPhotos = [];
  currentIndex = 0;
}

// Show previous photo
function showPrevious() {
  if (currentPhotos.length === 0) return;

  currentIndex = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length;
  updateGalleryView();
  updateDots();
}

// Show next photo
function showNext() {
  if (currentPhotos.length === 0) return;

  currentIndex = (currentIndex + 1) % currentPhotos.length;
  updateGalleryView();
  updateDots();
}

// Go to specific photo
function goToPhoto(index) {
  if (index < 0 || index >= currentPhotos.length) return;

  currentIndex = index;
  updateGalleryView();
  updateDots();
}

// Update gallery view
function updateGalleryView() {
  if (!image || !counter || currentPhotos.length === 0) return;

  image.src = currentPhotos[currentIndex];
  counter.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;

  // Update navigation buttons state
  if (prevBtn) {
    prevBtn.disabled = currentPhotos.length <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentPhotos.length <= 1;
  }
}

// Render dots indicators
function renderDots() {
  if (!dotsContainer) return;

  dotsContainer.innerHTML = currentPhotos.map((_, index) => `
    <span class="photo-gallery-dot ${index === currentIndex ? 'active' : ''}" data-index="${index}"></span>
  `).join('');

  // Add click listeners to dots
  dotsContainer.querySelectorAll('.photo-gallery-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      goToPhoto(parseInt(dot.dataset.index));
    });
  });
}

// Update dots active state
function updateDots() {
  if (!dotsContainer) return;

  dotsContainer.querySelectorAll('.photo-gallery-dot').forEach((dot, index) => {
    dot.classList.toggle('active', index === currentIndex);
  });
}

// Check if gallery is open
export function isGalleryOpen() {
  return overlay && overlay.classList.contains('active');
}

// Get current photo index
export function getCurrentIndex() {
  return currentIndex;
}

// Get total photos count
export function getPhotosCount() {
  return currentPhotos.length;
}
