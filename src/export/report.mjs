/**
 * Report Generator — Dev Dashboard
 * C3: Generate a self-contained static HTML report from project data
 * Served at /reports/:id, link is shareable (read-only, no auth required)
 * Phase 5 — Integrations & Multi-Source
 */

import { randomBytes } from 'crypto';

// ─── Helpers ──────────────────────────────────────

/**
 * Generate a random 8-character hex ID for the report.
 * @returns {string}  e.g. "a3f7c2b1"
 */
export function buildReportId() {
  return randomBytes(4).toString('hex');
}

/**
 * Format a date string for display.
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(date);
  }
}

// ─── HTML Template ─────────────────────────────────

/**
 * Generate a self-contained HTML snapshot report from project data.
 * The output is a single HTML file with inline CSS — no external dependencies.
 *
 * @param {Object} data      - Project data object from collectProject()
 * @param {Object} [options] - Optional override options
 * @param {string} [options.generatedAt] - ISO timestamp override (for testing)
 * @returns {string}  Full HTML string
 */
export function generateReportHtml(data, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const projectName = data?.name || data?.path?.split('/').pop() || 'Unknown Project';
  const version = data?.version || 'N/A';
  const currentPhase = data?.currentPhase || 'N/A';
  const description = data?.description || '';
  const git = data?.git || {};
  const changelog = Array.isArray(data?.changelog) ? data.changelog : [];
  const recentCommits = Array.isArray(git.recentCommits) ? git.recentCommits.slice(0, 20) : [];
  const hotspotFiles = Array.isArray(git.hotspotFiles) ? git.hotspotFiles.slice(0, 10) : [];

  // Stat cards
  const stats = [
    { label: 'Total Commits', value: (git.totalCommits || 0).toLocaleString() },
    { label: 'Lines of Code', value: (git.totalLines || 0).toLocaleString() },
    { label: 'Files Tracked', value: (git.totalFiles || 0).toLocaleString() },
    { label: 'Project Age', value: `${git.projectAgeDays || 0} days` },
    { label: 'Latest Version', value: version },
    { label: 'Current Phase', value: currentPhase },
  ];

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dev Dashboard Report — ${projectName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      line-height: 1.6;
      min-height: 100vh;
    }
    .header {
      background: #161b27;
      border-bottom: 1px solid #2d3748;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .logo { font-size: 18px; font-weight: 800; }
    .logo span { color: #7c6cf0; }
    .badge-read-only {
      background: #2d3748;
      color: #a0aec0;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
    }
    .container { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    .meta { color: #718096; font-size: 14px; margin-bottom: 32px; }
    .meta span { color: #7c6cf0; }
    .desc { color: #a0aec0; margin-bottom: 32px; font-size: 15px; }
    .section { margin-bottom: 40px; }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #718096;
      margin-bottom: 16px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #161b27;
      border: 1px solid #2d3748;
      border-radius: 12px;
      padding: 16px;
    }
    .stat-card .label { font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card .value { font-size: 22px; font-weight: 800; margin-top: 4px; color: #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #2d3748; }
    th { color: #718096; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    tr:hover td { background: rgba(124,108,240,0.05); }
    .hash { font-family: monospace; color: #7c6cf0; font-size: 12px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-purple { background: rgba(124,108,240,0.15); color: #7c6cf0; }
    .badge-green  { background: rgba(72,187,120,0.15);  color: #48bb78; }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #2d3748;
      font-size: 12px;
      color: #4a5568;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🏗️ <span>Dev</span> Dashboard</div>
    <span class="badge-read-only">📋 Read-only Report</span>
  </div>

  <div class="container">
    <h1>${projectName}</h1>
    <div class="meta">
      Generated <span>${formatDate(generatedAt)}</span> at <span>${new Date(generatedAt).toLocaleTimeString('vi-VN')}</span>
      ${data?.path ? ` • <span style="font-family:monospace;font-size:12px">${data.path}</span>` : ''}
    </div>
    ${description ? `<p class="desc">${description}</p>` : ''}

    <!-- Stats -->
    <div class="section">
      <div class="section-title">Project Stats</div>
      <div class="stats-grid">
        ${stats.map(s => `
          <div class="stat-card">
            <div class="label">${s.label}</div>
            <div class="value">${s.value}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Recent Commits -->
    ${recentCommits.length > 0 ? `
    <div class="section">
      <div class="section-title">Recent Commits (${recentCommits.length})</div>
      <table>
        <thead><tr><th>Hash</th><th>Message</th><th>Author</th><th>When</th></tr></thead>
        <tbody>
          ${recentCommits.map(c => `
            <tr>
              <td><span class="hash">${c.hash || ''}</span></td>
              <td>${c.message || ''}</td>
              <td style="color:#718096">${c.author || ''}</td>
              <td style="color:#4a5568;white-space:nowrap">${c.ago || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Changelog -->
    ${changelog.length > 0 ? `
    <div class="section">
      <div class="section-title">Changelog (${changelog.length} versions)</div>
      <table>
        <thead><tr><th>Version</th><th>Date</th><th>Description</th></tr></thead>
        <tbody>
          ${changelog.map(v => `
            <tr>
              <td><span class="badge badge-purple">${v.version || ''}</span></td>
              <td style="color:#718096;white-space:nowrap">${v.date || ''}</td>
              <td>${v.description || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Hotspot Files -->
    ${hotspotFiles.length > 0 ? `
    <div class="section">
      <div class="section-title">🔥 Hotspot Files</div>
      <table>
        <thead><tr><th>Changes</th><th>File</th></tr></thead>
        <tbody>
          ${hotspotFiles.map(f => `
            <tr>
              <td><span class="badge badge-green">${f.count}×</span></td>
              <td style="font-family:monospace;font-size:12px">${f.file || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      Generated by <strong>Dev Dashboard</strong> — ${new Date(generatedAt).toISOString()}
    </div>
  </div>
</body>
</html>`;
}
