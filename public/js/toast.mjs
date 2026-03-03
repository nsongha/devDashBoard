/**
 * Toast Module — Notification system for Dev Dashboard
 * Supports success, error, info variants with auto-dismiss
 */

const TOAST_DURATION = 3000;
const ANIMATION_DURATION = 300;

/**
 * Show a toast notification
 * @param {string} message - Toast message
 * @param {'success'|'error'|'info'} type - Toast type
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), ANIMATION_DURATION);
  }, TOAST_DURATION);
}
