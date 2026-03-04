/**
 * GitHub Integration — Frontend Module
 * Fetch và render PR, Issues, CI/CD, Branch comparison cho tab GitHub.
 */

// ─── Fetch helpers ───────────────────────────────

export async function fetchPRStats(owner, repo) {
  const params = new URLSearchParams();
  if (owner) params.set('owner', owner);
  if (repo) params.set('repo', repo);
  const res = await fetch(`/api/github/prs?${params}`);
  return res.json();
}

export async function fetchIssueStats(owner, repo) {
  const params = new URLSearchParams();
  if (owner) params.set('owner', owner);
  if (repo) params.set('repo', repo);
  const res = await fetch(`/api/github/issues?${params}`);
  return res.json();
}

export async function fetchCIStatus(owner, repo) {
  const params = new URLSearchParams();
  if (owner) params.set('owner', owner);
  if (repo) params.set('repo', repo);
  const res = await fetch(`/api/github/ci?${params}`);
  return res.json();
}

export async function fetchBranches(owner, repo) {
  const params = new URLSearchParams();
  if (owner) params.set('owner', owner);
  if (repo) params.set('repo', repo);
  const res = await fetch(`/api/github/branches?${params}`);
  return res.json();
}

export async function fetchCompare(owner, repo, base, head) {
  const params = new URLSearchParams({ owner, repo, base, head });
  const res = await fetch(`/api/github/compare?${params}`);
  return res.json();
}

// ─── Format helpers ──────────────────────────────

function formatDuration(hours) {
  if (!hours && hours !== 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatSec(sec) {
  if (!sec && sec !== 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function renderLabels(labels = []) {
  if (!labels.length) return '';
  return labels
    .map((l) => `<span class="gh-label" style="background:#${l.color}22;color:#${l.color};border-color:#${l.color}44">${l.name}</span>`)
    .join('');
}

// CI status → icon + class
function ciStatusIcon(status) {
  const map = {
    success: '✅',
    failure: '❌',
    in_progress: '🔄',
    cancelled: '⏹️',
    skipped: '⏭️',
    unknown: '❓',
  };
  return map[status] || '❓';
}

function ciStatusClass(status) {
  const map = {
    success: 'gh-ci--success',
    failure: 'gh-ci--failure',
    in_progress: 'gh-ci--running',
    cancelled: 'gh-ci--cancelled',
    skipped: 'gh-ci--cancelled',
    unknown: '',
  };
  return map[status] || '';
}

// ─── Section renderers ───────────────────────────

function renderCISection(ciData) {
  if (!ciData || ciData.available === false) {
    return '<div class="gh-empty-list">CI/CD không khả dụng hoặc repo chưa có GitHub Actions</div>';
  }
  if (ciData.error) {
    return `<div class="gh-empty-list">⚠️ ${ciData.error}</div>`;
  }

  const { passing = 0, failing = 0, running = 0, workflows = [] } = ciData;

  return `
    <div class="gh-ci-summary">
      <span class="gh-ci-badge gh-ci--success">✅ ${passing} passing</span>
      ${failing ? `<span class="gh-ci-badge gh-ci--failure">❌ ${failing} failing</span>` : ''}
      ${running ? `<span class="gh-ci-badge gh-ci--running">🔄 ${running} running</span>` : ''}
    </div>
    <div class="gh-list">
      ${workflows.length
        ? workflows.map((wf) => `
          <div class="gh-item gh-ci-item ${ciStatusClass(wf.status)}">
            <div class="gh-item-meta">
              <span class="gh-ci-status">${ciStatusIcon(wf.status)}</span>
              <span class="gh-ci-name"><a href="${wf.runUrl}" target="_blank" rel="noopener" class="gh-item-title" style="display:inline">${wf.name}</a></span>
              <span class="gh-item-time">${formatRelative(wf.startedAt)}</span>
            </div>
            <div class="gh-ci-meta2">
              <span class="gh-branch-tag">🌿 ${wf.branch || '—'}</span>
              ${wf.commitSha ? `<span class="gh-commit-sha">${wf.commitSha}</span>` : ''}
              ${wf.durationSec ? `<span class="gh-ci-dur">⏱ ${formatSec(wf.durationSec)}</span>` : ''}
              <span class="gh-ci-dots">${(wf.recentRuns || []).slice(0, 8).map((r) => `<span title="${r.status} · ${r.branch}">${ciStatusIcon(r.status)}</span>`).join('')}</span>
            </div>
          </div>`).join('')
        : '<div class="gh-empty-list">Chưa có workflow runs nào</div>'
      }
    </div>`;
}

function renderBranchSection(branchData, owner, repo) {
  if (!branchData || branchData.available === false) {
    return '<div class="gh-empty-list">Branches không khả dụng</div>';
  }
  const branches = branchData.branches || [];

  return `
    <div class="gh-branch-compare">
      <div class="gh-compare-controls">
        <select id="ghBaseSelect" class="filter-select" style="flex:1" onchange="window._app.compareGitHubBranches()">
          ${branches.map((b) => `<option value="${b}">${b}</option>`)}
        </select>
        <span style="color:var(--color-text-dim);padding:0 4px">←→</span>
        <select id="ghHeadSelect" class="filter-select" style="flex:1" onchange="window._app.compareGitHubBranches()">
          ${branches.map((b, i) => `<option value="${b}" ${i === 1 ? 'selected' : ''}>${b}</option>`)}
        </select>
      </div>
      <div id="ghCompareResult" class="gh-compare-result">
        <div class="gh-empty-list" style="padding:var(--spacing-md)">Chọn 2 branches để so sánh</div>
      </div>
    </div>
    <div class="gh-branch-list">
      ${branches.slice(0, 12).map((b) => `
        <span class="gh-branch-chip">🌿 ${b}</span>
      `).join('')}
      ${branches.length > 12 ? `<span class="gh-branch-chip gh-branch-more">+${branches.length - 12} more</span>` : ''}
    </div>`;
}

// ─── Main render ─────────────────────────────────

/**
 * Render toàn bộ tab GitHub.
 * @param {HTMLElement} container
 * @param {{ hasGithubToken: boolean, githubOwner: string, githubRepo: string }} config
 */
export async function renderGitHubTab(container, config) {
  container.innerHTML = `<div class="gh-loading"><span class="spin">⏳</span> Đang tải dữ liệu GitHub...</div>`;

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

  const { githubOwner: owner, githubRepo: repo } = config;

  // Fetch song song: PRs, Issues, CI, Branches
  const [prData, issueData, ciData, branchData] = await Promise.all([
    fetchPRStats(owner, repo),
    fetchIssueStats(owner, repo),
    fetchCIStatus(owner, repo),
    fetchBranches(owner, repo),
  ]);

  // Fatal error
  if (prData?.error && issueData?.error) {
    const detail = prData.detail || issueData.detail || '';
    container.innerHTML = `
      <div class="gh-empty">
        <div class="gh-empty-icon">⚠️</div>
        <h3>Lỗi kết nối GitHub</h3>
        <p>${prData.error}</p>
        ${detail ? `<p style="font-size:12px;color:var(--color-text-dim);max-width:500px;margin:8px auto">${detail}</p>` : ''}
        <p style="font-size:12px;color:var(--color-text-muted)">Kiểm tra lại token và tên repo trong Settings.</p>
      </div>`;
    return;
  }

  const repoLabel = `${owner}/${repo}`;
  const updatedAt = prData?.collectedAt || issueData?.collectedAt || ciData?.collectedAt;

  // Stats grid: 8 cards (PR, Issues, CI, Branches)
  const ciStatusBadge = ciData?.failing > 0 ? '❌' : ciData?.running > 0 ? '🔄' : '✅';

  container.innerHTML = `
    <div class="gh-tab">
      <div class="gh-header">
        <span class="gh-repo-badge">🐙 ${repoLabel}</span>
        <span class="gh-update-time">Updated: ${formatRelative(updatedAt)}</span>
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
          <div class="gh-stat-value">${ciData?.passing ?? '—'}</div>
          <div class="gh-stat-label">CI Passing</div>
        </div>
        <div class="gh-stat-card">
          <div class="gh-stat-value">${ciData?.failing ?? 0}</div>
          <div class="gh-stat-label">CI Failing</div>
        </div>
        <div class="gh-stat-card">
          <div class="gh-stat-value">${branchData?.branches?.length ?? '—'}</div>
          <div class="gh-stat-label">Branches</div>
        </div>
      </div>

      <!-- Row 1: PRs + Issues -->
      <div class="gh-columns">
        <!-- PR Section -->
        <div class="gh-section">
          <div class="gh-section-header">
            <h4>🔀 Pull Requests</h4>
            ${prData?.topLabels?.length
              ? `<div class="gh-top-labels">${prData.topLabels.map((l) => `<span class="gh-label-count">${l.name} <span class="badge">${l.count}</span></span>`).join('')}</div>`
              : ''}
          </div>
          <div class="gh-list">
            ${prData?.recentPRs?.length
              ? prData.recentPRs.map((pr) => `
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
                  </div>`).join('')
              : '<div class="gh-empty-list">Không có PR nào</div>'
            }
          </div>
        </div>

        <!-- Issues Section -->
        <div class="gh-section">
          <div class="gh-section-header">
            <h4>🐛 Issues</h4>
            ${issueData?.topLabels?.length
              ? `<div class="gh-top-labels">${issueData.topLabels.map((l) => `<span class="gh-label-count">${l.name} <span class="badge">${l.count}</span></span>`).join('')}</div>`
              : ''}
          </div>
          ${issueData?.milestones?.length
            ? `<div class="gh-milestones">${issueData.milestones.map((m) => `<div class="gh-milestone"><span>🎯 ${m.title}</span><span class="gh-milestone-stats">${m.openIssues} open · ${m.closedIssues} closed${m.dueOn ? ` · due ${m.dueOn.slice(0, 10)}` : ''}</span></div>`).join('')}</div>`
            : ''}
          <div class="gh-list">
            ${issueData?.recentIssues?.length
              ? issueData.recentIssues.map((issue) => `
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
                  </div>`).join('')
              : '<div class="gh-empty-list">Không có issue nào</div>'
            }
          </div>
        </div>
      </div>

      <!-- Row 2: CI/CD + Branch Comparison -->
      <div class="gh-columns" style="margin-top:var(--spacing-lg)">
        <!-- CI/CD Section -->
        <div class="gh-section">
          <div class="gh-section-header">
            <h4>${ciStatusBadge} CI/CD Pipelines</h4>
          </div>
          ${renderCISection(ciData)}
        </div>

        <!-- Branch Comparison -->
        <div class="gh-section">
          <div class="gh-section-header">
            <h4>🌿 Branches</h4>
          </div>
          ${renderBranchSection(branchData, owner, repo)}
        </div>
      </div>
    </div>`;

  // Store context for compare handler
  container._ghOwner = owner;
  container._ghRepo = repo;
}

/**
 * Handler: so sánh 2 branches đã chọn.
 * Gọi từ window._app.compareGitHubBranches()
 */
export async function compareGitHubBranches() {
  const base = document.getElementById('ghBaseSelect')?.value;
  const head = document.getElementById('ghHeadSelect')?.value;
  const resultEl = document.getElementById('ghCompareResult');
  if (!resultEl || !base || !head) return;

  if (base === head) {
    resultEl.innerHTML = '<div class="gh-empty-list">Hai branches giống nhau</div>';
    return;
  }

  // Lấy owner/repo từ container data
  const tabEl = document.getElementById('tab-github');
  const owner = tabEl?._ghOwner;
  const repo = tabEl?._ghRepo;
  if (!owner || !repo) return;

  resultEl.innerHTML = '<div class="gh-empty-list"><span class="spin">⏳</span> Đang so sánh...</div>';
  const data = await fetchCompare(owner, repo, base, head);

  if (!data || data.error) {
    resultEl.innerHTML = `<div class="gh-empty-list">⚠️ ${data?.error || 'Lỗi khi so sánh'}</div>`;
    return;
  }

  const statusLabel = {
    ahead: `${data.aheadBy} commits ahead`,
    behind: `${data.behindBy} commits behind`,
    diverged: `${data.aheadBy} ahead · ${data.behindBy} behind (diverged)`,
    identical: 'Identical branches',
  }[data.status] || data.status;

  resultEl.innerHTML = `
    <div class="gh-compare-stats">
      <span class="gh-compare-status">${statusLabel}</span>
      <span class="gh-compare-diff">+${data.totalAdditions} / -${data.totalDeletions}</span>
      <a href="${data.diffUrl || '#'}" target="_blank" rel="noopener" class="gh-compare-link">View diff ↗</a>
    </div>
    ${data.commits?.length
      ? `<div class="gh-compare-commits">
          ${data.commits.slice(0, 5).map((c) => `
            <div class="gh-compare-commit">
              <code class="gh-commit-sha">${c.sha}</code>
              <span class="gh-compare-msg">${c.message}</span>
              <span class="gh-author">@${c.author}</span>
            </div>`).join('')}
          ${data.commits.length > 5 ? `<div class="gh-empty-list">+${data.commits.length - 5} more commits</div>` : ''}
        </div>`
      : ''}
  `;
}
