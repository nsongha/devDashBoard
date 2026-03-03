/**
 * Team Tab Module
 * Hiển thị team statistics: top contributors, commit activity heatmap
 * Data source: DATA.authorStats (từ author-stats.mjs collector)
 */

// Day of week labels
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Render full Team tab content
 * @param {Object} data - Full project data (DATA)
 * @returns {string} HTML string
 */
export function renderTeamTab(data) {
  const authors = data.authorStats || [];

  if (authors.length === 0) {
    return `
      <div style="text-align:center;padding:60px 20px;color:var(--color-text-dim)">
        <div style="font-size:48px;margin-bottom:16px">👥</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">No team data available</div>
        <div style="font-size:13px;color:var(--color-text-muted)">Git log is empty or no commits found in this repository.</div>
      </div>
    `;
  }

  const totalCommits = authors.reduce((s, a) => s + a.commits, 0);
  const totalLinesAdded = authors.reduce((s, a) => s + a.linesAdded, 0);

  return `
    <div class="team-container">
      <!-- Summary Stats -->
      <div class="team-summary">
        <div class="team-stat-card">
          <div class="label">Team Size</div>
          <div class="value">${authors.length}</div>
          <div class="sub">contributors</div>
        </div>
        <div class="team-stat-card">
          <div class="label">Total Commits</div>
          <div class="value">${totalCommits.toLocaleString()}</div>
          <div class="sub">all time</div>
        </div>
        <div class="team-stat-card">
          <div class="label">Lines Added</div>
          <div class="value">${totalLinesAdded.toLocaleString()}</div>
          <div class="sub">last 90 days</div>
        </div>
        <div class="team-stat-card">
          <div class="label">Top Contributor</div>
          <div class="value" style="font-size:16px;word-break:break-word">${authors[0]?.name || '—'}</div>
          <div class="sub">${authors[0]?.commits || 0} commits</div>
        </div>
      </div>

      <!-- Top Contributors Table -->
      <div class="section-title" style="margin-top:var(--spacing-lg)">👑 Top Contributors (All Time)</div>
      ${renderContributorsTable(authors)}

      <!-- Day-of-Week Activity Heatmap -->
      <div class="section-title" style="margin-top:var(--spacing-lg)">📅 Active Days (Last 90 Days)</div>
      ${renderActiveDaysChart(authors)}
    </div>
  `;
}

/**
 * Render contributors ranked table
 */
function renderContributorsTable(authors) {
  const medals = ['🥇', '🥈', '🥉'];
  const totalCommits = authors.reduce((s, a) => s + a.commits, 0);

  return `
    <table class="team-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Contributor</th>
          <th>Commits</th>
          <th>Share</th>
          <th>Lines Added</th>
          <th>Lines Removed</th>
          <th>Active Days</th>
          <th>Top Files</th>
        </tr>
      </thead>
      <tbody>
        ${authors.map((a, i) => {
          const share = totalCommits > 0 ? ((a.commits / totalCommits) * 100).toFixed(1) : 0;
          const barWidth = Math.round((a.commits / (authors[0]?.commits || 1)) * 100);
          const initials = a.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const hue = hashToHue(a.name);

          return `
            <tr>
              <td style="font-size:18px;text-align:center">${medals[i] || `${i + 1}`}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="author-avatar" style="background:hsl(${hue},60%,45%)">${initials}</div>
                  <div>
                    <div style="font-weight:600;font-size:13px">${escapeHtml(a.name)}</div>
                    <div class="commit-bar-wrap">
                      <div class="commit-bar" style="width:${barWidth}%;background:hsl(${hue},60%,45%)"></div>
                    </div>
                  </div>
                </div>
              </td>
              <td><span class="badge badge-blue">${a.commits.toLocaleString()}</span></td>
              <td style="color:var(--color-text-dim)">${share}%</td>
              <td style="color:var(--color-success)">+${a.linesAdded.toLocaleString()}</td>
              <td style="color:var(--color-error)">-${a.linesRemoved.toLocaleString()}</td>
              <td>${a.activeDays} days</td>
              <td style="font-family:var(--font-mono);font-size:11px;color:var(--color-text-muted)">
                ${a.topFiles.slice(0, 2).map(f => `<div>${escapeHtml(f)}</div>`).join('')}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Render active days bar chart per author
 */
function renderActiveDaysChart(authors) {
  const maxDays = Math.max(...authors.map(a => a.activeDays), 1);
  const top5 = authors.slice(0, 8);

  return `
    <div class="active-days-chart">
      ${top5.map(a => {
        const pct = Math.round((a.activeDays / maxDays) * 100);
        const hue = hashToHue(a.name);
        const initials = a.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        return `
          <div class="active-day-row">
            <div class="active-day-author">
              <div class="author-avatar author-avatar-sm" style="background:hsl(${hue},60%,45%)">${initials}</div>
              <span>${escapeHtml(a.name)}</span>
            </div>
            <div class="active-day-bar-wrap">
              <div class="active-day-bar" style="width:${pct}%;background:hsl(${hue},60%,45%)"></div>
            </div>
            <div class="active-day-count">${a.activeDays}d</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Hash author name to a consistent hue (0-360)
 */
function hashToHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
