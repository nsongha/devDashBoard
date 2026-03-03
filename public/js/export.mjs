/**
 * Export Module — Dev Dashboard
 * C1: Export dashboard as PNG using html2canvas (client-side, no server dep)
 * C2: Export dashboard as PDF using html2canvas + jsPDF (client-side, no server dep)
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
 * Build a safe filename for the exported PDF.
 * @param {string} projectName
 * @param {Date}   date
 * @returns {string}  e.g. "dashboard-my-project-2026-03-03.pdf"
 */
export function buildPdfFilename(projectName, date = new Date()) {
  const safeName = (projectName || 'dashboard').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const dateStr = date.toISOString().slice(0, 10);
  return `dashboard-${safeName}-${dateStr}.pdf`;
}

/**
 * Check if html2canvas is available on the global scope.
 * @returns {boolean}
 */
export function isHtml2CanvasAvailable() {
  return typeof window !== 'undefined' && typeof window.html2canvas === 'function';
}

/**
 * Check if jsPDF is available on the global scope.
 * @returns {boolean}
 */
export function isJsPdfAvailable() {
  return typeof window !== 'undefined' &&
    (typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined');
}

// ─── Core Export Logic — PNG ────────────────────────

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

// ─── Core Export Logic — PDF ────────────────────────

/**
 * Capture the dashboard element and trigger a PDF download.
 * Uses html2canvas to rasterize, then jsPDF to create the PDF in A4 landscape.
 * @param {string} projectName - Name used in the downloaded filename
 */
export async function exportAsPdf(projectName = 'dashboard') {
  if (!isHtml2CanvasAvailable()) {
    showToast('❌ html2canvas chưa sẵn sàng. Thử reload trang.', 'error');
    return;
  }
  if (!isJsPdfAvailable()) {
    showToast('❌ jsPDF chưa sẵn sàng. Thử reload trang.', 'error');
    return;
  }

  const btn = document.getElementById('exportPdfBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Exporting...';
  }

  showToast('📄 Đang xuất PDF...', 'info');

  try {
    const target = document.querySelector('.app') || document.body;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDark ? '#0f1117' : '#f4f5f9';

    // Capture at scale 1.5 (PDF doesn't need full retina)
    const canvas = await window.html2canvas(target, {
      backgroundColor: bgColor,
      scale: 1.5,
      useCORS: true,
      logging: false,
      removeContainer: true,
    });

    // A4 landscape dimensions in mm
    const PDF_W = 297;
    const PDF_H = 210;

    // Determine jsPDF constructor (CDN exposes it differently)
    const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF;
    const pdf = new jsPDFCtor({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgW = canvas.width;
    const imgH = canvas.height;

    // Scale image to fit A4 landscape, preserving aspect ratio
    const ratio = Math.min(PDF_W / imgW, PDF_H / imgH);
    const scaledW = imgW * ratio;
    const scaledH = imgH * ratio;

    // Center on the page
    const offsetX = (PDF_W - scaledW) / 2;
    const offsetY = (PDF_H - scaledH) / 2;

    pdf.addImage(imgData, 'JPEG', offsetX, offsetY, scaledW, scaledH);

    // Add metadata
    pdf.setProperties({
      title: `Dev Dashboard — ${projectName}`,
      subject: 'Project dashboard export',
      creator: 'Dev Dashboard',
      created: new Date(),
    });

    const filename = buildPdfFilename(projectName);
    pdf.save(filename);

    showToast('✅ Đã xuất PDF! File đã được download.', 'success');
  } catch (err) {
    console.error('[export] PDF export failed:', err);
    showToast('❌ Xuất PDF thất bại. Kiểm tra console.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📄 Export PDF';
    }
  }
}

// ─── Init ─────────────────────────────────────────

/**
 * Initialize the export module.
 * Called once from app.mjs after DOM is ready.
 */
export function initExport() {
  // Keyboard shortcut: Cmd+Shift+E → PNG, Cmd+Shift+P → PDF
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        const name = window._exportProjectName || 'dashboard';
        exportAsPng(name);
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        const name = window._exportProjectName || 'dashboard';
        exportAsPdf(name);
      }
    }
  });
}
