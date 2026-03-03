/**
 * Sidebar Module — Sidebar rendering for Dev Dashboard
 * Extracted from monolithic index.html (B5), updated in Phase 2
 */

/**
 * Render the sidebar with project data
 * @param {Object} data - Full project data object (DATA)
 */
export function renderSidebar(data) {
  const tb = data.taskBoard;
  const g = data.git;
  const totalDone = tb?.totalDone || 0;
  const totalTasks = tb?.totalTasks || 0;
  const pct = totalTasks > 0 ? Math.round(totalDone / totalTasks * 100) : 0;

  document.getElementById('sidebar').innerHTML = `
    <div class="phase-card">
      <h2>${tb?.phaseName || data.currentPhase || 'No active phase'}</h2>
      <div class="phase-meta">${data.version} · ${g.branch}</div>
      ${totalTasks > 0 ? `
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span class="progress-pct">${pct}% <span style="font-weight:400;font-size:11px">(${totalDone}/${totalTasks})</span></span>
        </div>
      ` : ''}
    </div>

    ${tb?.streams.length ? `
      <div class="sidebar-section">
        <div class="sidebar-title">Streams</div>
        ${tb.streams.map(s => {
          const pct = Math.round(s.done / s.total * 100);
          const icon = pct === 100 ? '✅' : s.blocked > 0 ? '⏸️' : s.progress > 0 ? '🔄' : '📋';
          return `
            <div class="stream-item">
              <span style="width:16px">${icon}</span>
              <span style="flex-shrink:0;width:90px;font-size:12px">${s.name.split('—')[0].trim().substring(0,14)}</span>
              <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
              <span class="count">${s.done}/${s.total}</span>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <div class="sidebar-section">
      <div class="sidebar-title">Health</div>
      <div class="sidebar-stat">
        <span>🔴 Active Issues</span>
        <span class="val ${data.issues.active > 0 ? 'warn' : 'ok'}">${data.issues.active}</span>
      </div>
      <div class="sidebar-stat">
        <span>✅ Resolved</span>
        <span class="val ok">${data.issues.resolved}</span>
      </div>
      <div class="sidebar-stat">
        <span>🔧 Tech Debt</span>
        <span class="val ${data.issues.techDebt > 3 ? 'warn' : ''}">${data.issues.techDebt}</span>
      </div>
      <div class="sidebar-stat">
        <span>🧭 Decisions</span>
        <span class="val">${data.decisions.length}</span>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-title">Project Info</div>
      <div class="sidebar-stat">
        <span>📅 Age</span>
        <span class="val">${g.projectAgeDays} days</span>
      </div>
      <div class="sidebar-stat">
        <span>📊 Avg/day</span>
        <span class="val">${g.avgCommitsPerDay} commits</span>
      </div>
      <div class="sidebar-stat">
        <span>⚡ Workflows</span>
        <span class="val">${data.workflows.length}</span>
      </div>
      <div class="sidebar-stat">
        <span>🧠 Skills</span>
        <span class="val">${data.skills.length}</span>
      </div>
    </div>
  `;
}
