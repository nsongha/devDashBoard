/**
 * HTML Sanitization Utility (Backend)
 * Escape user-controlled data trước khi render vào HTML templates.
 * Dùng cho report generator và các nơi tạo HTML trên server.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape HTML special characters trong string.
 * @param {string} str - Raw string cần escape
 * @returns {string} Escaped HTML-safe string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);
}
