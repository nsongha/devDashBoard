/**
 * Tabs Module — Tab switching logic for Dev Dashboard
 * Extracted from monolithic index.html (B4)
 */

/**
 * Switch active tab content
 * @param {string} tabId - Tab identifier (e.g. 'commits', 'versions')
 * @param {HTMLElement} btn - The clicked tab button element
 */
export function showTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');
}
