/**
 * Tabs Module — Tab switching with smooth transitions
 * Extracted from monolithic index.html (B4), upgraded in Phase 2
 */

/**
 * Switch active tab content with fade animation
 * @param {string} tabId - Tab identifier (e.g. 'commits', 'versions')
 * @param {HTMLElement} btn - The clicked tab button element
 */
export function showTab(tabId, btn) {
  // Deactivate all
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  // Activate selected
  const tabContent = document.getElementById('tab-' + tabId);
  if (tabContent) {
    tabContent.classList.add('active');
  }
  btn.classList.add('active');
}
