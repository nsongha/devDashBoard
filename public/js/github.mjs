/**
 * GitHub Integration — Frontend Module
 * Fetch và render PR stats + Issues cho tab GitHub.
 */

/**
 * Fetch PR stats từ server.
 * @param {string} [owner]
 * @param {string} [repo]
 * @returns {Promise<object>}
 */
export async function fetchPRStats(owner, repo) {
  const params = new URLSearchParams();
  if (owner) params.set('owner', owner);
  if (repo) params.set('repo', repo);
  const res = await fetch(`/api/github/prs?${params}`);
  return res.json();
}

/**
 * Fetch issue stats từ server.
 * @param {string} [owner]
 * @param {string} [repo]
 * @returns {Promise<object>}
 */
export async function fetchIssueStats(owner, repo) {
  const params = new URLSearchParams();
  if (owner) params.set('owner', owner);
  if (repo) params.set('repo', repo);
  const res = await fetch(`/api/github/issues?${params}`);
  return res.json();
}

/**
 * Format số giờ → chuỗi dễ đọc.
 * @param {number} hours
 * @returns {string}
 */
function formatDuration(hours) {
  if (!hours && hours !== 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

/**
 * Format ISO date → relative time.
 * @param {string} iso
 * @returns {string}
 */
function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Render label badges.
 * @param {Array<{name: string, color: string}>} labels
 * @returns {string} HTML
 */
function renderLabels(labels = []) {
  if (!labels.length) return '';
  return labels
    .map(
      (l) => `<span class="gh-label" style="background:#${l.color}22;color:#${l.color};border-color:#${l.color}44">${l.name}</span>`
    )
    .join('');
}

/**
 * Render toàn bộ tab GitHub.
 * @param {HTMLElement} container
 * @param {{ hasGithubToken: boolean, githubOwner: string, githubRepo: string }} config
 */
export async function renderGitHubTab(container, config) {
  // Loading state
  container.innerHTML = `
    <div class="gh-loading">
      <span class="spin">⏳</span> Đang tải dữ liệu GitHub...
    </div>`;

  if (!config.hasGithubToken) {
    container.innerHTML = `
      <div class="gh-empty">
        <div class="gh-empty-icon">🐙</div>
        <h3>Chưa cấu hình GitHub</h3>
        <p>Vào <strong>⚙️ Settings</strong> để nhập GitHub Token, Owner và Repository.</p>
        <button class="btn-primary" onclick="window._app.openSettings()">⚙️ Mở Settings</button>
      </div>`;
    return;
  }

  if (!config.githubOwner || !config.githubRepo) {
    container.innerHTML = `
      <div class="gh-empty">
        <div class="gh-empty-icon">📋</div>
        <h3>Chưa chọn Repository</h3>
        <p>Vào <strong>⚙️ Settings</strong> để nhập GitHub Owner và Repository name.</p>
        <button class="btn-primary" onclick="window._app.openSettings()">⚙️ Mở Settings</button>
      </div>`;
    return;
  }

  // Fetch song song
  const [prData, issueData] = await Promise.all([
    fetchPRStats(config.githubOwner, config.githubRepo),
    fetchIssueStats(config.githubOwner, config.githubRepo),
  ]);

  // Error states
  if (prData?.error || issueData?.error) {
    const msg = prData?.error || issueData?.error;
    container.innerHTML = `
      <div class="gh-empty">
        <div class="gh-empty-icon">⚠️</div>
        <h3>Lỗi kết nối GitHub</h3>
        <p>${msg}</p>
        <p style="font-size:12px;color:var(--color-text-muted)">Kiểm tra lại token và tên repo trong Settings.</p>
      </div>`;
    return;
  }

  const repoLabel = `${config.githubOwner}/${config.githubRepo}`;

  container.innerHTML = `
    <div class="gh-tab">
      <div class="gh-header">
        <span class="gh-repo-badge">🐙 ${repoLabel}</span>
        <span class="gh-update-time">Updated: ${formatRelative(prData?.collectedAt || issueData?.collectedAt)}</span>
      </div>

      <!-- Stats Overview -->
      <div class="gh-stats-grid">
        <div class="gh-stat-card">
          <div class="gh-stat-value">${prData?.openCount ?? '—'}</div>
          <div class="gh-stat-label">Open PRs</div>
        </div>
        <div class="gh-stat-card">
          <div class="gh-stat-value">${prData?.mergedCount ?? '—'}</div>
          <div class="gh-stat-label">Merged (30d)</div>
        </div>
        <div class="gh-stat-card">
          <div class="gh-stat-value">${formatDuration(prData?.avgMergeTimeHours)}</div>
          <div class="gh-stat-label">Avg Merge Time</div>
        </div>
        <div class="gh-stat-card">
          <div class="gh-stat-value">${issueData?.openCount ?? '—'}</div>
          <div class="gh-stat-label">Open Issues</div>
        </div>
        <div class="gh-stat-card">
          <div class="gh-stat-value">${issueData?.closedCount ?? '—'}</div>
          <div class="gh-stat-label">Closed (30d)</div>
        </div>
        <div class="gh-stat-card">
          <div class="gh-stat-value">${issueData?.milestones?.length ?? 0}</div>
          <div class="gh-stat-label">Milestones</div>
        </div>
      </div>

      <div class="gh-columns">
        <!-- PR Section -->
        <div class="gh-section">
          <div class="gh-section-header">
            <h4>🔀 Pull Requests</h4>
            ${prData?.topLabels?.length ? `<div class="gh-top-labels">${prData.topLabels.map((l) => `<span class="gh-label-count">${l.name} <span class="badge">${l.count}</span></span>`).join('')}</div>` : ''}
          </div>
          <div class="gh-list">
            ${
              prData?.recentPRs?.length
                ? prData.recentPRs
                    .map(
                      (pr) => `
                <div class="gh-item gh-item--${pr.state}">
                  <div class="gh-item-meta">
                    <span class="gh-item-state gh-state--${pr.state}">${pr.state === 'merged' ? '🟣' : '🟢'} ${pr.state}</span>
                    <span class="gh-item-number">#${pr.number}</span>
                    <span class="gh-item-time">${formatRelative(pr.updatedAt)}</span>
                  </div>
                  <a class="gh-item-title" href="${pr.url}" target="_blank" rel="noopener">${pr.title}</a>
                  <div class="gh-item-footer">
                    <span class="gh-author">@${pr.author}</span>
                    ${renderLabels(pr.labels)}
                  </div>
                </div>`
                    )
                    .join('')
                : '<div class="gh-empty-list">Không có PR nào</div>'
            }
          </div>
        </div>

        <!-- Issues Section -->
        <div class="gh-section">
          <div class="gh-section-header">
            <h4>🐛 Issues</h4>
            ${issueData?.topLabels?.length ? `<div class="gh-top-labels">${issueData.topLabels.map((l) => `<span class="gh-label-count">${l.name} <span class="badge">${l.count}</span></span>`).join('')}</div>` : ''}
          </div>
          ${
            issueData?.milestones?.length
              ? `<div class="gh-milestones">
              ${issueData.milestones.map((m) => `<div class="gh-milestone"><span>🎯 ${m.title}</span><span class="gh-milestone-stats">${m.openIssues} open · ${m.closedIssues} closed${m.dueOn ? ` · due ${m.dueOn.slice(0, 10)}` : ''}</span></div>`).join('')}
            </div>`
              : ''
          }
          <div class="gh-list">
            ${
              issueData?.recentIssues?.length
                ? issueData.recentIssues
                    .map(
                      (issue) => `
                <div class="gh-item gh-item--${issue.state}">
                  <div class="gh-item-meta">
                    <span class="gh-item-state gh-state--open">🟢 open</span>
                    <span class="gh-item-number">#${issue.number}</span>
                    <span class="gh-item-time">${formatRelative(issue.updatedAt)}</span>
                    ${issue.comments ? `<span class="gh-comments">💬 ${issue.comments}</span>` : ''}
                  </div>
                  <a class="gh-item-title" href="${issue.url}" target="_blank" rel="noopener">${issue.title}</a>
                  <div class="gh-item-footer">
                    <span class="gh-author">@${issue.author}</span>
                    ${issue.milestone ? `<span class="gh-milestone-tag">🎯 ${issue.milestone}</span>` : ''}
                    ${renderLabels(issue.labels)}
                  </div>
                </div>`
                    )
                    .join('')
                : '<div class="gh-empty-list">Không có issue nào</div>'
            }
          </div>
        </div>
      </div>
    </div>`;
}
