/**
 * Export Module — Dev Dashboard
 * C1: Export dashboard as PNG using html2canvas (client-side, no server dep)
 * Phase 5 — Integrations & Multi-Source
 */

import { showToast } from './toast.mjs';

// ─── Helpers ──────────────────────────────────────

/**
 * Build a safe filename for the exported PNG.
 * @param {string} projectName - Short name of the project (no slashes)
 * @param {Date}   date        - Date to use in filename (default: now)
 * @returns {string}  e.g. "dashboard-my-project-2026-03-03.png"
 */
export function buildFilename(projectName, date = new Date()) {
  const safeName = (projectName || 'dashboard').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  return `dashboard-${safeName}-${dateStr}.png`;
}

/**
 * Check if html2canvas is available on the global scope.
 * @returns {boolean}
 */
export function isHtml2CanvasAvailable() {
  return typeof window !== 'undefined' && typeof window.html2canvas === 'function';
}

// ─── Core Export Logic ─────────────────────────────

/**
 * Capture the dashboard element and trigger a PNG download.
 * @param {string} projectName - Name used in the downloaded filename
 */
export async function exportAsPng(projectName = 'dashboard') {
  if (!isHtml2CanvasAvailable()) {
    showToast('❌ html2canvas chưa sẵn sàng. Thử reload trang.', 'error');
    return;
  }

  const btn = document.getElementById('exportPngBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Exporting...';
  }

  showToast('📸 Đang xuất PNG...', 'info');

  try {
    // Target the full app container (sidebar + main)
    const target = document.querySelector('.app') || document.body;

    // Color scheme for html2canvas — match current theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDark ? '#0f1117' : '#f4f5f9';

    const canvas = await window.html2canvas(target, {
      backgroundColor: bgColor,
      scale: 2,               // retina quality
      useCORS: true,          // allow cross-origin images
      logging: false,
      removeContainer: true,
    });

    // Trigger download
    const filename = buildFilename(projectName);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('✅ Đã xuất PNG! File đã được download.', 'success');
  } catch (err) {
    console.error('[export] PNG export failed:', err);
    showToast('❌ Xuất PNG thất bại. Kiểm tra console.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📸 Export PNG';
    }
  }
}

// ─── Init ─────────────────────────────────────────

/**
 * Initialize the export module.
 * Called once from app.mjs after DOM is ready.
 */
export function initExport() {
  // Keyboard shortcut: Cmd+Shift+E
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'e') {
      e.preventDefault();
      // Delegate to app to get current project name
      const name = window._exportProjectName || 'dashboard';
      exportAsPng(name);
    }
  });
}
