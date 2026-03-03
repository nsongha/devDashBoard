/**
 * PWA Manager — Dev Dashboard
 * Handles Service Worker registration and install prompt (A4)
 */

export class PWAManager {
  constructor() {
    this._deferredPrompt = null;
    this._installed = false;
    this._swRegistration = null;
  }

  /**
   * Register the Service Worker
   */
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker not supported in this browser');
      return;
    }

    // Dev mode (localhost): unregister SW cũ + clear caches để code luôn fresh
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
        if (registrations.length > 0) {
          console.info('[PWA] Dev mode — unregistered SW and cleared caches');
        }
      } catch (err) {
        console.warn('[PWA] Dev cleanup failed:', err);
      }
      return; // Không register SW trên localhost
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this._swRegistration = registration;
      console.info('[PWA] Service Worker registered:', registration.scope);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('[PWA] New SW installed — update available');
            }
          });
        }
      });
    } catch (err) {
      console.error('[PWA] Service Worker registration failed:', err);
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._deferredPrompt = e;
      this._showInstallButton();
      console.info('[PWA] Install prompt captured');
    });

    // Track if already installed
    window.addEventListener('appinstalled', () => {
      this._deferredPrompt = null;
      this._installed = true;
      this._hideInstallButton();
      console.info('[PWA] App installed successfully');
    });

    // Check if running as installed PWA
    if (this.isPWAInstalled()) {
      this._installed = true;
      this._hideInstallButton();
    }
  }

  /**
   * Returns true if the app is running in standalone (installed PWA) mode
   */
  isPWAInstalled() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  /**
   * Trigger the install prompt dialog
   */
  async triggerInstall() {
    if (!this._deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    await this._deferredPrompt.prompt();
    const { outcome } = await this._deferredPrompt.userChoice;
    console.info('[PWA] Install outcome:', outcome);

    this._deferredPrompt = null;
    if (outcome === 'accepted') {
      this._hideInstallButton();
    }
    return outcome === 'accepted';
  }

  /**
   * Show the install button in Settings (if present)
   */
  _showInstallButton() {
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'flex';
  }

  /**
   * Hide the install button (already installed or not available)
   */
  _hideInstallButton() {
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'none';
  }

  /**
   * Returns whether install prompt is available
   */
  get canInstall() {
    return !!this._deferredPrompt;
  }
}
