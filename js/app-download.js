/*
 * App Download Modal Logic
 * Hilton Chat Widget
 */

// Show App Download Modal
export function showAppDownloadModal() {
    const modal = document.getElementById('app-download-modal');
    if (!modal) return;

    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.remove('hidden-important'); // Just in case it's used

    // Explicitly set style to ensure it's visible
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Hide App Download Modal
export function hideAppDownloadModal() {
    const modal = document.getElementById('app-download-modal');
    if (!modal) return;

    modal.classList.remove('active');

    // Wait for animation to finish before truly hiding
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Initialize App Download Modal Listeners
export function initAppDownloadModalListeners() {
    const modal = document.getElementById('app-download-modal');
    const latertBtn = document.getElementById('app-download-later');
    const appStoreBtn = document.getElementById('btn-app-store');
    const googlePlayBtn = document.getElementById('btn-google-play');

    if (!modal) return;

    // Later button
    if (latertBtn) {
        latertBtn.addEventListener('click', () => {
            hideAppDownloadModal();
        });
    }

    // Store buttons (just for tracking or preventing default if needed)
    if (appStoreBtn) {
        appStoreBtn.addEventListener('click', (e) => {
            // e.preventDefault();
            console.log('App Store clicked');
            // window.open('https://apps.apple.com/...', '_blank');
            hideAppDownloadModal();
        });
    }

    if (googlePlayBtn) {
        googlePlayBtn.addEventListener('click', (e) => {
            // e.preventDefault();
            console.log('Google Play clicked');
            // window.open('https://play.google.com/...', '_blank');
            hideAppDownloadModal();
        });
    }

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideAppDownloadModal();
        }
    });
}
