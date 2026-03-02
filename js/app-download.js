/*
 * App Download Modal Logic
 * Hilton Chat Widget
 */

// Show App Download Modal
export function showAppDownloadModal() {
    const modal = document.getElementById('app-download-modal');
    const content = document.getElementById('app-download-content-inner');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    // Allow for display: flex to take effect before removing translate
    setTimeout(() => {
        content.classList.remove('translate-y-full');
    }, 10);
}

// Hide App Download Modal
export function hideAppDownloadModal() {
    const modal = document.getElementById('app-download-modal');
    const content = document.getElementById('app-download-content-inner');
    if (!modal || !content) return;

    content.classList.add('translate-y-full');
    // Wait for animation to finish before truly hiding
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 400);
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
            console.log('Google Market clicked');
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
