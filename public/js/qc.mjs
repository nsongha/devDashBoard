/**
 * QC Tab Module — Read-only display of QC Report
 * Hiển thị thông tin từ docs/QC_REPORT.md:
 * - Manual test cases (grouped by feature)
 * - Release checklist với progress
 * - Sign-off status
 */

import { escapeHtml } from './sanitize.mjs';

/**
 * Render QC tab content (read-only, parsed from QC_REPORT.md).
 * @param {Object} data - Full project data (DATA)
 * @param {number} activeIdx - Active project index
 * @returns {string} HTML string
 */
export function renderQCTab(data, activeIdx) {
  const qc = data.qcReport || {};
  const tc = qc.testCases || { total: 0, passed: 0, failed: 0, notRun: 0, blocked: 0, items: [] };
  const rl = qc.releaseChecklist || { total: 0, done: 0, items: [] };
  const so = qc.signOff || { approved: false, items: [] };

  if (!tc.items.length && !rl.items.length && !so.items.length) {
    return `
      <div class="section-title" style="margin-bottom:var(--spacing-md)">🧪 QC Report</div>
      <div class="gh-loading" style="flex-direction:column;gap:12px">
        <div style="font-size:16px">Chưa có QC Report</div>
        <div style="color:var(--color-text-dim);font-size:13px">
          Tạo file <code>docs/QC_REPORT.md</code> để hiển thị test cases, release checklist, và sign-off status.
        </div>
        <button class="card-edit-btn" style="opacity:1;margin-top:8px" onclick="window._app.openEditor(${activeIdx}, 'docs/QC_REPORT.md')">✏️ Tạo QC Report</button>
      </div>
    `;
  }

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-md);flex-wrap:wrap;gap:8px">
      <div class="section-title" style="margin:0">🧪 QC Report</div>
      <button class="card-edit-btn" style="opacity:1" onclick="window._app.openEditor(${activeIdx}, 'docs/QC_REPORT.md')">✏️ Edit Report</button>
    </div>

    ${renderSummaryCards(tc, rl, so)}

    ${tc.items.length ? renderTestCases(tc) : ''}

    ${rl.items.length ? renderReleaseChecklist(rl) : ''}

    ${so.items.length ? renderSignOff(so) : ''}
  `;
}

// ─── Summary Cards ───────────────────────────────────────────

function renderSummaryCards(tc, rl, so) {
  const passRate = tc.total > 0 ? Math.round((tc.passed / tc.total) * 100) : 0;
  const passColor = passRate === 100 ? 'var(--color-success, #22c55e)' : passRate >= 80 ? 'var(--color-warning, #f59e0b)' : 'var(--color-danger, #ef4444)';
  const checklistPct = rl.total > 0 ? Math.round((rl.done / rl.total) * 100) : 0;

  return `
    <div class="stats-row" style="margin-bottom:var(--spacing-md)">
      <div class="stat-card">
        <div class="label">Test Cases</div>
        <div class="value">${tc.total}</div>
        <div class="sub" style="color:${passColor}">${tc.passed} pass · ${tc.failed} fail · ${tc.notRun} not run</div>
      </div>
      <div class="stat-card">
        <div class="label">Pass Rate</div>
        <div class="value" style="color:${passColor}">${passRate}%</div>
        <div class="sub">${tc.passed}/${tc.total} passed</div>
      </div>
      <div class="stat-card">
        <div class="label">Release Checklist</div>
        <div class="value">${rl.done}/${rl.total}</div>
        <div class="sub">${checklistPct}% complete</div>
      </div>
      <div class="stat-card">
        <div class="label">Sign-off</div>
        <div class="value">${so.approved ? '✅' : '⏳'}</div>
        <div class="sub">${so.approved ? 'QC Approved' : 'Pending'}</div>
      </div>
    </div>
  `;
}

// ─── Test Cases ──────────────────────────────────────────────

function renderTestCases(tc) {
  // Group by feature
  const features = {};
  for (const item of tc.items) {
    const key = item.feature || 'Uncategorized';
    if (!features[key]) features[key] = [];
    features[key].push(item);
  }

  const featureEntries = Object.entries(features);

  const statusIcon = (s) => {
    switch (s) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'blocked': return '⏸️';
      default: return '⬜';
    }
  };

  const statusBadge = (s) => {
    switch (s) {
      case 'pass': return '<span class="badge badge-green">Pass</span>';
      case 'fail': return '<span class="badge badge-red">Fail</span>';
      case 'blocked': return '<span class="badge badge-yellow">Blocked</span>';
      default: return '<span class="badge">Not Run</span>';
    }
  };

  // Count pass/fail per feature for tab badges
  const featureSummary = (items) => {
    const p = items.filter(i => i.status === 'pass').length;
    const f = items.filter(i => i.status === 'fail').length;
    if (f > 0) return `<span style="color:var(--color-danger,#ef4444);font-size:11px;margin-left:4px">${f}❌</span>`;
    return `<span style="color:var(--color-success,#22c55e);font-size:11px;margin-left:4px">${p}✅</span>`;
  };

  return `
    <div class="qc-test-cases" style="margin-bottom:var(--spacing-lg)">
      <div class="section-title qc-collapse-toggle" onclick="this.closest('.qc-test-cases').classList.toggle('qc-expanded')" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px">
        <span class="qc-chevron" style="transition:transform .2s;display:inline-block;font-size:12px">▶</span>
        ✅ Test Cases (${tc.passed}/${tc.total} passed)
      </div>

      <div class="qc-collapse-body" style="display:none">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <span class="badge badge-green">✅ ${tc.passed} Pass</span>
          ${tc.failed > 0 ? `<span class="badge badge-red">❌ ${tc.failed} Fail</span>` : ''}
          ${tc.notRun > 0 ? `<span class="badge">⬜ ${tc.notRun} Not Run</span>` : ''}
          ${tc.blocked > 0 ? `<span class="badge badge-yellow">⏸️ ${tc.blocked} Blocked</span>` : ''}
        </div>

        <!-- Feature Tabs -->
        <div class="qc-feature-tabs" style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap;border-bottom:1px solid var(--color-border,#333)">
          ${featureEntries.map(([feature, items], idx) => `
            <button class="qc-feature-tab${idx === 0 ? ' active' : ''}"
              data-feature="${escapeHtml(feature)}"
              onclick="
                this.closest('.qc-feature-tabs').querySelectorAll('.qc-feature-tab').forEach(t=>t.classList.remove('active'));
                this.classList.add('active');
                const panels=this.closest('.qc-collapse-body').querySelectorAll('.qc-feature-panel');
                panels.forEach(p=>p.style.display='none');
                panels[${idx}].style.display='block';
              "
            >${escapeHtml(feature)} ${featureSummary(items)}</button>
          `).join('')}
        </div>

        <!-- Feature Panels -->
        ${featureEntries.map(([_feature, items], idx) => `
          <div class="qc-feature-panel" style="display:${idx === 0 ? 'block' : 'none'}">
            <table>
              ${items.map(item => `
                <tr>
                  <td style="width:30px">${statusIcon(item.status)}</td>
                  <td style="font-family:var(--font-mono);font-size:11px;width:60px;color:var(--color-text-dim)">${escapeHtml(item.id)}</td>
                  <td>${escapeHtml(item.description)}</td>
                  <td style="width:80px">${statusBadge(item.status)}</td>
                  ${item.bugRef ? `<td style="font-size:11px;color:var(--color-danger, #ef4444)">${escapeHtml(item.bugRef)}</td>` : '<td></td>'}
                </tr>
              `).join('')}
            </table>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── Release Checklist ───────────────────────────────────────

function renderReleaseChecklist(rl) {
  const pct = rl.total > 0 ? Math.round((rl.done / rl.total) * 100) : 0;

  return `
    <div style="margin-bottom:var(--spacing-lg)">
      <div class="section-title">🚀 Release Checklist (${rl.done}/${rl.total} — ${pct}%)</div>
      <div class="progress-wrap" style="margin-bottom:12px">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="progress-pct">${pct}%</span>
      </div>
      <div class="card-list">
        ${rl.items.map(item => `
          <div class="card-item" style="padding:8px 12px">
            <span style="opacity:${item.done ? '1' : '0.5'}">${item.done ? '✅' : '⬜'} ${escapeHtml(item.text)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── Sign-off ────────────────────────────────────────────────

function renderSignOff(so) {
  return `
    <div style="margin-bottom:var(--spacing-lg)">
      <div class="section-title">✍️ Sign-off ${so.approved ? '<span class="badge badge-green">✅ QC Approved</span>' : '<span class="badge badge-yellow">⏳ Pending</span>'}</div>
      <table>
        <tr><th>Role</th><th>Name</th><th>Status</th><th>Date</th></tr>
        ${so.items.map(item => `
          <tr>
            <td>${escapeHtml(item.role)}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.status)}</td>
            <td style="color:var(--color-text-dim)">${escapeHtml(item.date)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}
