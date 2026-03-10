/**
 * App Module — Main application logic for Dev Dashboard
 * Orchestrates all sub-modules: charts, tabs, sidebar, toast, theme
 * Phase 2 — UI/UX Overhaul
 */

import { renderCharts } from './charts.mjs';
import { showTab } from './tabs.mjs';
import { renderSidebar } from './sidebar.mjs';
import { showToast } from './toast.mjs';
import { renderInsightsTab, renderInsightsCharts } from './insights.mjs';
import { initSearch, openSearch, onSearchInput, onSearchKeydown, selectSearchResult, hoverSearchResult } from './search.mjs';
import { initDeepLinks, makeFileLink, makeDiffLink, setIdeScheme } from './deep-links.mjs';
import { openEditor, closeEditor, saveFile } from './editor.mjs';
import { exportAsPng, exportAsPdf, initExport } from './export.mjs';
import { renderGitHubTab, compareGitHubBranches } from './github.mjs';
import { renderTeamTab } from './team.mjs';
import { renderQCTab } from './qc.mjs';
import { initRealtime } from './realtime.mjs';
import { initNotifications, notifyOnEvent, requestNotificationPermission, getNotificationStatus } from './notifications.mjs';
import { PWAManager } from './pwa.mjs';
import { escapeHtml } from './sanitize.mjs';

// ─── State ───────────────────────────────────────
let projects = [];
let activeIdx = 0;
let DATA = null;

const charts = {};
// B1: Flag để lazy render Insights charts chỉ 1 lần khi switch project
let _insightsRendered = false;

// ─── View Mode (C2: Role-based views) ────────────
let _viewMode = localStorage.getItem('viewMode') || 'developer';

// ─── Commit Chart Period ──────────────────────────
let _commitPeriod = localStorage.getItem('commitPeriod') || 'week';

function getViewMode() {
  return _viewMode;
}

function applyViewMode(mode) {
  _viewMode = mode;
  localStorage.setItem('viewMode', mode);
  // Re-render main if data is loaded
  if (DATA) renderMain();
}

// ─── Theme ───────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme');
  const theme = saved || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);

  // Re-render charts with new theme colors
  if (DATA) {
    renderCharts(DATA.git, charts);
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ─── Sidebar Toggle ──────────────────────────────
function initSidebar() {
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (collapsed) {
    setSidebarCollapsed(true, false);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isCollapsed = sidebar.classList.contains('collapsed');
  setSidebarCollapsed(!isCollapsed, true);
  // B4: Update aria-expanded trên button
  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
}

function setSidebarCollapsed(collapsed, persist) {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main');
  const toggle = document.getElementById('sidebarToggle');

  if (collapsed) {
    sidebar.classList.add('collapsed');
    main.classList.add('expanded');
    toggle.classList.add('collapsed');
  } else {
    sidebar.classList.remove('collapsed');
    main.classList.remove('expanded');
    toggle.classList.remove('collapsed');
  }

  if (persist) {
    localStorage.setItem('sidebarCollapsed', collapsed);
  }
}

// ─── Skeleton Loading ────────────────────────────
function showSkeleton() {
  document.getElementById('sidebar').innerHTML = `
    <div style="padding: 0">
      <div class="skeleton skeleton-card" style="height:110px"></div>
      <div class="skeleton skeleton-text" style="width:40%;margin-top:16px"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-text" style="width:40%;margin-top:16px"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>
  `;

  document.getElementById('main').innerHTML = `
    <div class="stats-row">
      <div class="skeleton skeleton-stat"></div>
      <div class="skeleton skeleton-stat"></div>
      <div class="skeleton skeleton-stat"></div>
      <div class="skeleton skeleton-stat"></div>
    </div>
    <div class="charts-row">
      <div class="skeleton skeleton-chart"></div>
      <div class="skeleton skeleton-chart" style="height:180px"></div>
    </div>
    <div class="charts-row">
      <div class="skeleton skeleton-chart" style="height:160px"></div>
      <div class="skeleton skeleton-chart" style="height:160px"></div>
    </div>
    <div class="skeleton skeleton-text" style="width:60%;margin-top:8px"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `;
}

// ─── Data Loading ────────────────────────────────
async function init() {
  initTheme();
  initSidebar();
  await initDeepLinks();
  initSearch(() => DATA, { refreshData });
  initExport();

  const res = await fetch('/api/projects');
  const json = await res.json();
  projects = json.projects;
  if (projects.length > 0) {
    await loadProject(0);
  }


  // B2: Khởi động WebSocket real-time connection
  initRealtime((event, payload) => {
    if (event === 'refresh') {
      refreshData();
    }
    // B4+B5: GitHub webhook events
    if (event === 'github:push' || event === 'github:pr') {
      notifyOnEvent(event, payload);
    }
  });

  // B5: Khởi động notification system
  await initNotifications();
}

async function loadProject(idx) {
  activeIdx = idx;
  const projectShortName = projects[idx]?.split('/').pop() || 'Select...';
  document.getElementById('currentProjectName').textContent = projectShortName;
  window._exportProjectName = projectShortName;
  renderDropdown();

  // Show skeleton loading
  showSkeleton();
  _insightsRendered = false; // B1: reset lazy flag khi switch project

  try {
    const res = await fetch(`/api/data/${idx}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    DATA = await res.json();
    renderSidebar(DATA);
    renderMain();
  } catch (err) {
    // B5: Error state UI thân thiện thay vì skeleton đứng yên
    console.error('[App] loadProject failed:', err);
    renderErrorState(err.message || 'Không thể tải dữ liệu project');
  }
}

// B5: Error state UI
function renderErrorState(message) {
  document.getElementById('main').innerHTML = `
    <div class="error-state" role="alert">
      <div class="error-icon" aria-hidden="true">❌</div>
      <div class="error-title">Không thể tải dữ liệu</div>
      <div class="error-message">${message}</div>
      <button class="btn-primary" onclick="window._app.refreshData()" style="margin-top:16px">
        🔄 Thử lại
      </button>
    </div>
  `;
  document.getElementById('sidebar').innerHTML = `
    <div style="padding:20px;color:var(--color-text-dim);font-size:13px;text-align:center">
      ⚠️ Lỗi tải dữ liệu
    </div>
  `;
}



async function refreshData() {
  await loadProject(activeIdx);
}

// ─── Dropdown ────────────────────────────────────
function toggleDropdown() {
  document.getElementById('dropdownMenu').classList.toggle('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.project-dropdown')) {
    document.getElementById('dropdownMenu').classList.remove('open');
  }
});

function renderDropdown() {
  const menu = document.getElementById('dropdownMenu');
  menu.innerHTML = projects.map((p, i) => `
    <div class="dropdown-item ${i === activeIdx ? 'active' : ''}" onclick="window._app.switchProject(${i})">
      <div>
        <div>${escapeHtml(p.split('/').pop())}</div>
        <div class="path">${escapeHtml(p)}</div>
      </div>
      <button class="remove-btn" onclick="event.stopPropagation(); window._app.removeProject(${i})" title="Remove">✕</button>
    </div>
  `).join('') + `
    <div class="dropdown-divider"></div>
    <button class="add-project-btn" onclick="window._app.openModal()">➕ Add Project</button>
  `;
}

function switchProject(idx) {
  document.getElementById('dropdownMenu').classList.remove('open');
  loadProject(idx);
}

async function removeProject(idx) {
  const name = projects[idx]?.split('/').pop() || 'project';
  await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: projects[idx] }) });
  projects.splice(idx, 1);
  if (activeIdx >= projects.length) activeIdx = Math.max(0, projects.length - 1);
  if (projects.length > 0) loadProject(activeIdx);
  else { renderDropdown(); document.getElementById('sidebar').innerHTML = '<div class="loading">No projects</div>'; }
  showToast(`Removed "${name}"`, 'info');
}

let _addProjectMode = 'local';
let _localFolderPath = '';
let _githubRepos = [];

function openModal() {
  document.getElementById('modal').classList.add('open');
  document.getElementById('dropdownMenu').classList.remove('open');
  switchAddTab('local'); // Reset default
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  // Reset local path state
  _localFolderPath = '';
  const folderPathInput = document.getElementById('folderPathInput');
  if (folderPathInput) folderPathInput.value = '';
  // Giữ nguyên list repos đã load (_githubRepos) để không phải fetch lại
  // Chỉ reset selection và metadata display
  const repoSelect = document.getElementById('githubRepoSelect');
  if (repoSelect) repoSelect.value = '';
  document.getElementById('githubRepoMeta').style.display = 'none';
}

function switchAddTab(tab) {
  _addProjectMode = tab;

  // Toggle buttons
  document.getElementById('tabLocal').classList.toggle('active', tab === 'local');
  document.getElementById('tabLocal').setAttribute('aria-selected', tab === 'local');
  document.getElementById('tabGithub').classList.toggle('active', tab === 'github');
  document.getElementById('tabGithub').setAttribute('aria-selected', tab === 'github');

  // Toggle panels
  document.getElementById('panelLocal').classList.toggle('hidden', tab !== 'local');
  document.getElementById('panelGithub').classList.toggle('hidden', tab !== 'github');

  // Change action button text based on tab
  const addBtn = document.getElementById('addProjectBtn');
  addBtn.textContent = tab === 'local' ? 'Add' : 'Connect';

  if (tab === 'github') {
    // Check nếu có token thì tự động load repos
    checkAndLoadGithubRepos();
  }
}

// ─── Local Folder Logic ───
function onFolderPathInput(event) {
  _localFolderPath = event.target.value.trim();
}

// ─── GitHub Repo Logic ───
async function checkAndLoadGithubRepos() {
  const needsTokenEl = document.getElementById('githubNeedToken');
  const repoArea = document.getElementById('githubRepoArea');

  // Quick check config qua cache API config để xem có token chưa
  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    if (!config.hasGithubToken) {
      needsTokenEl.style.display = 'block';
      repoArea.style.display = 'none';
      return;
    }

    needsTokenEl.style.display = 'none';
    repoArea.style.display = 'block';
    
    // Load data
    loadGithubRepos(false);
  } catch (err) {
    console.error('Lỗi khi kiểm tra GitHub token:', err);
  }
}

async function loadGithubRepos(forceRefresh) {
  const select = document.getElementById('githubRepoSelect');
  select.innerHTML = '<option value="">— Loading repositories… —</option>';
  select.disabled = true;

  try {
    // Thêm query param _t để bypass HTTP cache của browser
    const res = await fetch(`/api/github/repos${forceRefresh ? '?_t=' + Date.now() : ''}`);
    const json = await res.json();

    if (!json.available || !json.repos) {
      select.innerHTML = `<option value="">❌ ${json.reason || 'Lỗi tải danh sách repos'}</option>`;
      return;
    }

    _githubRepos = json.repos;
    
    if (_githubRepos.length === 0) {
      select.innerHTML = '<option value="">(Không có repository nào)</option>';
      return;
    }

    // Render options
    select.innerHTML = '<option value="">— Chọn một repository —</option>' + 
      _githubRepos.map(r => `
        <option value="${r.full_name}">${r.private ? '🔒' : '🌐'} ${r.full_name}</option>
      `).join('');
      
    select.disabled = false;
  } catch (err) {
    console.error('Lỗi load repos:', err);
    select.innerHTML = '<option value="">❌ Network error</option>';
  }
}

function onGithubRepoSelect(event) {
  const fullName = event.target.value;
  const metaArea = document.getElementById('githubRepoMeta');
  
  if (!fullName) {
    metaArea.style.display = 'none';
    return;
  }

  const repo = _githubRepos.find(r => r.full_name === fullName);
  if (!repo) return;

  document.getElementById('githubRepoDesc').textContent = repo.description || '(Không có mô tả)';
  document.getElementById('githubRepoLang').textContent = repo.language ? `• ${repo.language}` : '';
  document.getElementById('githubRepoPrivate').textContent = repo.private ? '• 🔒 Private' : '• 🌐 Public';
  metaArea.style.display = 'block';
}

// ─── Add Action ───
async function addProject() {
  if (_addProjectMode === 'local') {
    const path = _localFolderPath;
    if (!path) {
      showToast('Vui lòng chọn hoặc nhập đường dẫn thư mục', 'error');
      return;
    }

    const res = await fetch('/api/projects', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ path }) 
    });
    const json = await res.json();
    
    if (json.error) {
      showToast(json.error, 'error');
      return;
    }
    
    // Add success
    projects = json.projects;
    closeModal();
    loadProject(projects.length - 1);
    showToast(`Added project "${path.split('/').pop()}"`, 'success');
  } 
  
  else if (_addProjectMode === 'github') {
    const fullName = document.getElementById('githubRepoSelect').value;
    if (!fullName) {
      showToast('Vui lòng chọn một repository', 'error');
      return;
    }

    const [owner, repoName] = fullName.split('/');
    
    // Lưu vào settings: githubOwner và githubRepo
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubOwner: owner, githubRepo: repoName }),
      });
      const json = await res.json();
      
      if (json.success) {
        showToast(`✅ Đã kết nối với GitHub repo: ${fullName}! Mở tab GitHub để xem dữ liệu.`, 'success');
        closeModal();
        // Reload để refresh GitHub cache — chỉ khi đang có project đang xem
        if (projects.length > 0) refreshData();
      } else {
        showToast('Lỗi khi cấu hình GitHub repo', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  }
}

// ─── Main Content Render ─────────────────────────
function renderMain() {
  const g = DATA.git;

  document.getElementById('main').innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="label">Total Commits</div>
        <div class="value">${g.totalCommits.toLocaleString()}</div>
        <div class="sub">since ${g.firstCommitDate}</div>
      </div>
      <div class="stat-card">
        <div class="label">Lines of Code</div>
        <div class="value">${g.totalLines.toLocaleString()}</div>
        <div class="sub">${g.totalFiles} files tracked</div>
      </div>
      <div class="stat-card">
        <div class="label">Versions Released</div>
        <div class="value">${DATA.changelog.length}</div>
        <div class="sub">latest: ${DATA.version}</div>
      </div>
      <div class="stat-card">
        <div class="label">Project Age</div>
        <div class="value">${g.projectAgeDays}<span style="font-size:14px;font-weight:400"> days</span></div>
        <div class="sub">${(g.projectAgeDays / 7).toFixed(0)} weeks</div>
      </div>
    </div>

    <div class="filter-bar">
      <span class="filter-label">📅 Date Range:</span>
      <input type="date" id="chartDateFrom" class="filter-date" onchange="window._app.applyChartFilter()" />
      <span class="filter-sep">→</span>
      <input type="date" id="chartDateTo" class="filter-date" onchange="window._app.applyChartFilter()" />
      <button class="filter-reset" onclick="window._app.resetChartFilter()">✕ Reset</button>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-card-header">
          <h3 id="commitChartTitle">📈 Commit Frequency (12 weeks)</h3>
          <div class="period-toggle" role="group" aria-label="Commit chart period">
            ${['day','week','month','year'].map(p => `
              <button
                class="period-btn ${_commitPeriod === p ? 'active' : ''}"
                onclick="window._app.setCommitPeriod('${p}')"
                aria-pressed="${_commitPeriod === p}"
              >${p.charAt(0).toUpperCase() + p.slice(1)}</button>
            `).join('')}
          </div>
        </div>
        <canvas id="commitChart" height="110"></canvas>
      </div>
      <div class="chart-card">
        <h3>📊 Code by Type</h3>
        <canvas id="langChart" height="110"></canvas>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <h3>🔥 Code Velocity (lines added/removed per commit)</h3>
        <canvas id="velocityChart" height="100"></canvas>
      </div>
      <div class="chart-card">
        <h3>📅 Busiest Day</h3>
        <canvas id="dayChart" height="100"></canvas>
      </div>
    </div>

    <div class="tabs" role="tablist" aria-label="Dashboard sections">
      ${_viewMode !== 'team-lead' ? `<button class="tab active" role="tab" aria-selected="true" aria-controls="tab-commits" id="tab-btn-commits" onclick="window._app.showTab('commits',this)">🔀 Commits</button>` : ''}
      <button class="tab ${_viewMode === 'team-lead' ? 'active' : ''}" role="tab" aria-selected="${_viewMode === 'team-lead'}" aria-controls="tab-versions" id="tab-btn-versions" onclick="window._app.showTab('versions',this)">🏷️ Versions</button>
      ${_viewMode !== 'team-lead' ? `<button class="tab" role="tab" aria-selected="false" aria-controls="tab-hotspots" id="tab-btn-hotspots" onclick="window._app.showTab('hotspots',this)">🔥 Hotspots</button>` : ''}
      <button class="tab" role="tab" aria-selected="false" aria-controls="tab-insights" id="tab-btn-insights" onclick="window._app.showInsightsTab(this)">📊 Insights</button>
      <button class="tab" role="tab" aria-selected="false" aria-controls="tab-team" id="tab-btn-team" onclick="window._app.showTeamTab(this)">👥 Team</button>
      <button class="tab" role="tab" aria-selected="false" aria-controls="tab-workflows" id="tab-btn-workflows" onclick="window._app.showTab('workflows',this)">⚡ Workflows</button>
      <button class="tab" role="tab" aria-selected="false" aria-controls="tab-decisions" id="tab-btn-decisions" onclick="window._app.showTab('decisions',this)">🧭 Decisions</button>
      <button class="tab" role="tab" aria-selected="false" aria-controls="tab-known-issues" id="tab-btn-known-issues" onclick="window._app.showTab('known-issues',this)">🐛 Known Issues</button>
      <button class="tab" role="tab" aria-selected="false" aria-controls="tab-qc" id="tab-btn-qc" onclick="window._app.showQCTab(this)">🧪 QC</button>
      <button class="tab gh-tab-btn" role="tab" aria-selected="false" aria-controls="tab-github" id="tab-btn-github" onclick="window._app.showGitHubTab(this)">🐙 GitHub</button>
    </div>

    <div class="tab-content ${_viewMode !== 'team-lead' ? 'active' : ''}" id="tab-commits" role="tabpanel" aria-labelledby="tab-btn-commits">
      ${renderCommitFilters(g)}
      <div id="commitsTableWrap">
        ${renderCommitsTable(g.recentCommits)}
      </div>
    </div>

    <div class="tab-content ${_viewMode === 'team-lead' ? 'active' : ''}" id="tab-versions" role="tabpanel" aria-labelledby="tab-btn-versions">
      <table>
        <tr><th>Version</th><th>Date</th><th>Description</th></tr>
        ${DATA.changelog.map(v => `
          <tr>
            <td><span class="badge badge-purple">${escapeHtml(v.version)}</span></td>
            <td style="color:var(--color-text-dim)">${escapeHtml(v.date)}</td>
            <td>${escapeHtml(v.description)}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="tab-content" id="tab-hotspots" role="tabpanel" aria-labelledby="tab-btn-hotspots">
      <div class="section-title">Most Changed Files (30 days) — files thường xuyên bị sửa đổi</div>
      <table>
        <tr><th>Changes</th><th>File</th></tr>
        ${g.hotspotFiles.map(f => `
          <tr>
            <td><span class="badge ${f.count > 10 ? 'badge-red' : f.count > 5 ? 'badge-yellow' : 'badge-blue'}">${f.count}×</span></td>
            <td><a class="ide-link" href="${makeFileLink(DATA.path, f.file, 1)}" title="Open in IDE" style="font-family:var(--font-mono);font-size:12px">${escapeHtml(f.file)}<span class="ide-link-icon">↗</span></a></td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="tab-content" id="tab-workflows" role="tabpanel" aria-labelledby="tab-btn-workflows">
      <div class="two-col">
        <div>
          <div class="section-title">Workflows</div>
          <div class="card-list">
            ${DATA.workflows.map(w => `
              <div class="card-item">
                <div>
                  <div class="title">/${escapeHtml(w.name)}</div>
                  <div class="desc">${escapeHtml(w.description)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="section-title">Skills (${DATA.skills.length})</div>
          <div class="card-list">
            ${DATA.skills.map(s => `
              <div class="card-item">
                <div>
                  <div class="title">${escapeHtml(s.name)}</div>
                  <div class="desc">${escapeHtml(s.description)}</div>
                </div>
                <span class="badge badge-blue">v${escapeHtml(s.version)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="tab-content" id="tab-insights" role="tabpanel" aria-labelledby="tab-btn-insights">
      <!-- B1: Insights charts render LAZY khi tab được click lần đầu -->
      ${renderInsightsTab(DATA)}
    </div>

    <div class="tab-content" id="tab-decisions" role="tabpanel" aria-labelledby="tab-btn-decisions">
      <div style="display:flex;justify-content:flex-end;margin-bottom:var(--spacing-sm)">
        <button class="card-edit-btn" style="opacity:1" onclick="window._app.openEditor(${activeIdx}, 'docs/DECISIONS.md')">✏️ Edit File</button>
      </div>
      <div class="card-list">
        ${DATA.decisions.length ? DATA.decisions.map(d => {
          const statusBadge = d.status?.includes('Accepted') ? 'badge-green'
            : d.status?.includes('Superseded') ? 'badge-yellow'
            : d.status?.includes('Rejected') ? 'badge-red'
            : d.status?.includes('Proposed') ? 'badge-blue'
            : 'badge-purple';
          return `
          <div class="card-item">
            <div style="flex:1">
              <div class="title">${escapeHtml(d.id)}: ${escapeHtml(d.title)}</div>
              <div class="desc" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                ${d.date ? `<span style="color:var(--color-text-dim);font-size:12px">📅 ${escapeHtml(d.date)}</span>` : ''}
                ${d.type ? `<span style="color:var(--color-text-muted);font-size:12px">${escapeHtml(d.type)}</span>` : ''}
              </div>
            </div>
            <span class="badge ${statusBadge}">${d.status ? escapeHtml(d.status) : '✅ Accepted'}</span>
          </div>`;
        }).join('') : '<div style="text-align:center;padding:40px;color:var(--color-text-dim)">No decisions logged</div>'}
      </div>
    </div>

    <div class="tab-content" id="tab-known-issues" role="tabpanel" aria-labelledby="tab-btn-known-issues">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-sm);flex-wrap:wrap;gap:8px">
        <div class="ki-filters" role="group" aria-label="Filter known issues">
          <button class="period-btn active" onclick="window._app.filterKnownIssues('all',this)" aria-pressed="true">All</button>
          <button class="period-btn" onclick="window._app.filterKnownIssues('active',this)" aria-pressed="false">🔴 Active (${DATA.issues.active})</button>
          <button class="period-btn" onclick="window._app.filterKnownIssues('techDebt',this)" aria-pressed="false">🔧 Tech Debt (${DATA.issues.techDebt})</button>
          <button class="period-btn" onclick="window._app.filterKnownIssues('resolved',this)" aria-pressed="false">✅ Resolved (${DATA.issues.resolved})</button>
        </div>
        <button class="card-edit-btn" style="opacity:1" onclick="window._app.openEditor(${activeIdx}, 'docs/KNOWN_ISSUES.md')">✏️ Edit File</button>
      </div>
      <div class="card-list" id="known-issues-list">
        ${renderKnownIssuesList(DATA.issues.items || [])}
      </div>
    </div>

    <div class="tab-content" id="tab-team" role="tabpanel" aria-labelledby="tab-btn-team">
      <!-- Rendered lazily by showTeamTab() -->
      <div class="gh-loading"><span class="spin">⏳</span>&nbsp; Click tab Team để tải...</div>
    </div>

    <div class="tab-content" id="tab-qc" role="tabpanel" aria-labelledby="tab-btn-qc">
      <!-- Rendered lazily by showQCTab() -->
      <div class="gh-loading"><span class="spin">⏳</span>&nbsp; Click tab QC để tải...</div>
    </div>

    <div class="tab-content" id="tab-github" role="tabpanel" aria-labelledby="tab-btn-github">
      <!-- Rendered lazily by showGitHubTab() -->
      <div class="gh-loading"><span class="spin" aria-hidden="true">⏳</span>&nbsp; Click tab GitHub để tải...</div>
    </div>
  `;

  renderCharts(DATA.git, charts, _commitPeriod);
  // B1: Insights charts KHÔNG render ở đây — sẽ lazy load khi showInsightsTab() được gọi
}

// B1: Lazy render Insights tab — chỉ render charts lần đầu click
function showInsightsTab(btn) {
  showTab('insights', btn);
  // Update aria-selected
  document.querySelectorAll('.tabs [role="tab"]').forEach(b => {
    b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
  });
  if (!_insightsRendered && DATA) {
    renderInsightsCharts(DATA, charts);
    _insightsRendered = true;
  }
}

// ─── Commit Filters (C4) ─────────────────────────
function renderCommitFilters(g) {
  const authors = [...new Set(g.recentCommits.map(c => c.author))].sort();
  const types = ['feat', 'fix', 'refactor', 'docs', 'chore', 'other'];

  return `
    <div class="commit-filters">
      <select id="filterAuthor" class="filter-select" onchange="window._app.applyCommitFilter()">
        <option value="">👤 All Authors</option>
        ${authors.map(a => `<option value="${a}">${a}</option>`).join('')}
      </select>
      <select id="filterType" class="filter-select" onchange="window._app.applyCommitFilter()">
        <option value="">📋 All Types</option>
        ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <button class="filter-reset" onclick="window._app.resetCommitFilter()">✕ Reset</button>
    </div>
  `;
}

function renderCommitsTable(commits) {
  if (commits.length === 0) {
    return '<div style="text-align:center;padding:40px;color:var(--color-text-dim)">No commits match the current filters</div>';
  }
  return `
    <table>
      <tr><th>Hash</th><th>Message</th><th>Author</th><th>When</th></tr>
      ${commits.map(c => `
        <tr class="commit-row">
          <td><a class="ide-link" href="${makeDiffLink(DATA.path, c.hash)}" title="Open diff in IDE"><code class="mono" style="color:var(--color-accent)">${escapeHtml(c.hash)}</code><span class="ide-link-icon">↗</span></a></td>
          <td>${escapeHtml(c.message)}</td>
          <td style="color:var(--color-text-dim)">${escapeHtml(c.author)}</td>
          <td style="color:var(--color-text-muted);white-space:nowrap">${escapeHtml(c.ago)}</td>
          <div class="commit-tooltip">
            <div><span class="ct-label">Hash:</span> ${escapeHtml(c.hash)}</div>
            <div><span class="ct-label">Author:</span> ${escapeHtml(c.author)}</div>
            <div><span class="ct-label">Date:</span> ${escapeHtml(c.date)}</div>
            <div><span class="ct-label">Message:</span> ${escapeHtml(c.message)}</div>
          </div>
        </tr>
      `).join('')}
    </table>
  `;
}

function detectCommitType(message) {
  const msg = message.toLowerCase();
  if (msg.startsWith('feat:') || msg.startsWith('feat(')) return 'feat';
  if (msg.startsWith('fix:') || msg.startsWith('fix(')) return 'fix';
  if (msg.startsWith('refactor:') || msg.startsWith('refactor(')) return 'refactor';
  if (msg.startsWith('docs:') || msg.startsWith('docs(')) return 'docs';
  if (msg.startsWith('chore:') || msg.startsWith('chore(')) return 'chore';
  return 'other';
}

function applyCommitFilter() {
  if (!DATA) return;
  const author = document.getElementById('filterAuthor')?.value || '';
  const type = document.getElementById('filterType')?.value || '';

  let filtered = DATA.git.recentCommits;
  if (author) filtered = filtered.filter(c => c.author === author);
  if (type) filtered = filtered.filter(c => detectCommitType(c.message) === type);

  const wrap = document.getElementById('commitsTableWrap');
  if (wrap) wrap.innerHTML = renderCommitsTable(filtered);
}

function resetCommitFilter() {
  const authorSel = document.getElementById('filterAuthor');
  const typeSel = document.getElementById('filterType');
  if (authorSel) authorSel.value = '';
  if (typeSel) typeSel.value = '';
  applyCommitFilter();
}

// ─── Chart Date Filter (C3) ──────────────────────
function applyChartFilter() {
  if (!DATA) return;
  const from = document.getElementById('chartDateFrom')?.value;
  const to = document.getElementById('chartDateTo')?.value;

  // Clone git data and filter time-series arrays
  const filteredGit = { ...DATA.git };

  if (from || to) {
    const fromDate = from ? new Date(from) : new Date('1970-01-01');
    const toDate = to ? new Date(to) : new Date('2099-12-31');

    if (filteredGit.commitsPerWeek) {
      filteredGit.commitsPerWeek = filteredGit.commitsPerWeek.filter(d => {
        const date = new Date(d.week);
        return date >= fromDate && date <= toDate;
      });
    }
    if (filteredGit.codeVelocity) {
      filteredGit.codeVelocity = filteredGit.codeVelocity.filter(d => {
        const date = new Date(d.date);
        return date >= fromDate && date <= toDate;
      });
    }
  }

  renderCharts(filteredGit, charts, _commitPeriod);
}

function resetChartFilter() {
  const from = document.getElementById('chartDateFrom');
  const to = document.getElementById('chartDateTo');
  if (from) from.value = '';
  if (to) to.value = '';
  renderCharts(DATA.git, charts, _commitPeriod);
}

// ─── Settings Modal ──────────────────────────────
async function openSettings() {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('open');

  // Load current config
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    document.getElementById('geminiApiKeyInput').value = '';
    document.getElementById('geminiApiKeyInput').placeholder = config.hasApiKey
      ? `Current: ${config.geminiApiKey}` : 'Enter your Gemini API key...';
    document.getElementById('aiStatus').textContent = config.hasApiKey
      ? '🟢 AI mode active — parsers sử dụng Gemini AI' : '⚪ Regex mode — nhập API key để bật AI parsing';
    // Load IDE scheme
    const ideSelect = document.getElementById('ideSchemeSelect');
    if (ideSelect) ideSelect.value = config.ideScheme || 'vscode';
    // Load View Mode
    const viewModeSelect = document.getElementById('viewModeSelect');
    if (viewModeSelect) viewModeSelect.value = _viewMode;
    // Load GitHub settings
    const ghTokenInput = document.getElementById('githubTokenInput');
    const ghOwnerInput = document.getElementById('githubOwnerInput');
    const ghRepoInput = document.getElementById('githubRepoInput');
    if (ghTokenInput) ghTokenInput.placeholder = config.hasGithubToken ? '••••••••• (set)' : 'ghp_...';
    if (ghOwnerInput) ghOwnerInput.value = config.githubOwner || '';
    if (ghRepoInput) ghRepoInput.value = config.githubRepo || '';
  } catch {
    document.getElementById('aiStatus').textContent = '❌ Không thể tải config';
  }
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

async function saveSettings() {
  const apiKey = document.getElementById('geminiApiKeyInput').value.trim();
  const ideScheme = document.getElementById('ideSchemeSelect')?.value || 'vscode';
  const viewMode = document.getElementById('viewModeSelect')?.value || 'developer';
  const githubToken = document.getElementById('githubTokenInput')?.value.trim();
  const githubOwner = document.getElementById('githubOwnerInput')?.value.trim();
  const githubRepo = document.getElementById('githubRepoInput')?.value.trim();

  // Apply view mode locally
  applyViewMode(viewMode);

  // Build payload
  const payload = { ideScheme };
  if (apiKey) payload.geminiApiKey = apiKey;
  if (githubToken !== undefined) payload.githubToken = githubToken;
  if (githubOwner !== undefined) payload.githubOwner = githubOwner;
  if (githubRepo !== undefined) payload.githubRepo = githubRepo;

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      const msgs = [];
      if (apiKey) msgs.push('🤖 AI mode activated!');
      if (githubToken) msgs.push('🐙 GitHub token saved!');
      msgs.push(`🔗 IDE: ${ideScheme}`);
      showToast(msgs.join(' • '), 'success');
      setIdeScheme(ideScheme);
      closeSettings();

      // Reset GitHub config cache khi settings thay đổi
      // để GitHub tab reload config mới khi mở lại
      if (githubToken || githubOwner || githubRepo) {
        _githubConfig = null;
      }

      if (apiKey) {
        // Clear cache + reload để dùng AI parser
        await fetch('/api/cache', { method: 'DELETE' });
        refreshData();
      }
    }
  } catch {
    showToast('Lỗi khi lưu settings', 'error');
  }
}

async function removeApiKey() {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: '' }),
    });
    showToast('API key removed — switched to regex mode', 'info');
    closeSettings();
    await fetch('/api/cache', { method: 'DELETE' });
    refreshData();
  } catch {
    showToast('Lỗi khi xóa API key', 'error');
  }
}

// ─── Team Tab (C1) ──────────────────────────────
function showTeamTab(btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const tabEl = document.getElementById('tab-team');
  if (tabEl) {
    tabEl.classList.add('active');
    tabEl.innerHTML = renderTeamTab(DATA);
  }
}

// ─── QC Tab ──────────────────────────────────────
function showQCTab(btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const tabEl = document.getElementById('tab-qc');
  if (tabEl) {
    tabEl.classList.add('active');
    tabEl.innerHTML = renderQCTab(DATA, activeIdx);
  }
}

// ─── GitHub Tab ──────────────────────────────────
let _githubConfig = null;

async function showGitHubTab(btn) {
  // Deactivate other tabs
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const tabEl = document.getElementById('tab-github');
  if (tabEl) tabEl.classList.add('active');

  // Load config if not loaded yet (cache per session)
  if (!_githubConfig) {
    try {
      const res = await fetch('/api/config');
      _githubConfig = await res.json();
    } catch {
      _githubConfig = { hasGithubToken: false };
    }
  }

  if (tabEl) {
    await renderGitHubTab(tabEl, _githubConfig);
  }
}

// ─── Share Report (C3) ──────────────────────────
async function shareReport() {
  if (!DATA) {
    showToast('Chưa có dữ liệu project để share.', 'error');
    return;
  }

  const btn = document.getElementById('shareReportBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Creating...';
  }

  showToast('🕗 Đang tạo shareable report...', 'info');

  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIndex: activeIdx }),
    });
    const json = await res.json();

    if (!res.ok || json.error) {
      showToast(`❌ ${json.error || 'Lỗi tạo report'}`, 'error');
      return;
    }

    const fullUrl = `${window.location.origin}${json.url}`;

    // Copy link to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast(`✅ Link đã copy vào clipboard! ${json.url}`, 'success');
    } catch {
      showToast(`🔗 Report: ${json.url}`, 'success');
    }
  } catch (err) {
    console.error('[share] Report creation failed:', err);
    showToast('❌ Tạo report thất bại. Kiểm tra console.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔗 Share Report';
    }
  }
}

// ─── Known Issues Tab ────────────────────────────
function renderKnownIssuesList(items, filterSection = 'all') {
  const filtered = filterSection === 'all' ? items : items.filter(i => i.section === filterSection);
  if (filtered.length === 0) {
    return '<div style="text-align:center;padding:40px;color:var(--color-text-dim)">No known issues</div>';
  }
  return filtered.map(item => {
    const sevColor = item.severity === 'Critical' ? 'badge-red'
      : item.severity === 'Medium' ? 'badge-yellow'
      : item.severity === 'Low' ? 'badge-blue'
      : 'badge-purple';
    const sectionIcon = item.section === 'active' ? '🔴'
      : item.section === 'techDebt' ? '🔧'
      : '✅';
    return `
      <div class="card-item">
        <div style="flex:1">
          <div class="title">${sectionIcon} <span class="badge ${sevColor}">${escapeHtml(item.id)}</span> ${escapeHtml(item.title)}</div>
          ${item.module ? `<div class="desc" style="font-family:var(--font-mono);font-size:11px">${escapeHtml(item.module)}</div>` : ''}
          ${item.severity ? `<div class="desc">Severity: ${escapeHtml(item.severity)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function filterKnownIssues(section, btn) {
  if (!DATA) return;
  // Update active state on filter buttons
  const filterGroup = btn?.closest('.ki-filters');
  if (filterGroup) {
    filterGroup.querySelectorAll('.period-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  }
  const listEl = document.getElementById('known-issues-list');
  if (listEl) {
    listEl.innerHTML = renderKnownIssuesList(DATA.issues.items || [], section);
  }
}

// ─── Expose to global scope for inline onclick handlers ──────
window._app = {
  toggleDropdown,
  switchProject,
  removeProject,
  openModal,
  closeModal,
  switchAddTab,
  onFolderPathInput,
  loadGithubRepos,
  onGithubRepoSelect,
  addProject,
  refreshData,
  showTab,
  toggleTheme,
  toggleSidebar,
  openSettings,
  closeSettings,
  saveSettings,
  removeApiKey,
  openSearch,
  onSearchInput,
  setCommitPeriod(period) {
    _commitPeriod = period;
    localStorage.setItem('commitPeriod', period);
    if (!DATA) return;
    // Update active state on buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
      const isActive = btn.textContent.toLowerCase() === period;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
    renderCharts(DATA.git, charts, period);
  },
  onSearchKeydown,
  selectSearchResult,
  hoverSearchResult,
  applyChartFilter,
  resetChartFilter,
  applyCommitFilter,
  resetCommitFilter,
  openEditor,
  closeEditor,
  saveFile,
  exportAsPng: () => exportAsPng(window._exportProjectName || 'dashboard'),
  exportAsPdf: () => exportAsPdf(window._exportProjectName || 'dashboard'),
  shareReport,
  showGitHubTab,
  showTeamTab,
  showQCTab,
  compareGitHubBranches,
  requestNotificationPermission,
  getNotificationStatus,
  getViewMode,
  applyViewMode,
  showInsightsTab, // B1: lazy insights charts
  filterKnownIssues,
};

// ─── Start ───────────────────────────────────────
init();

// ─── PWA — Service Worker Registration ──────────
const _pwa = new PWAManager();
_pwa.register();
window._app.pwa = _pwa;
