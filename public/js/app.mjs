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

// ─── State ───────────────────────────────────────
let projects = [];
let activeIdx = 0;
let DATA = null;
let refreshInterval = null;
let countdown = 30;
const charts = {};

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

  const res = await fetch('/api/projects');
  const json = await res.json();
  projects = json.projects;
  if (projects.length > 0) {
    await loadProject(0);
  }
  startAutoRefresh();
}

async function loadProject(idx) {
  activeIdx = idx;
  document.getElementById('currentProjectName').textContent = projects[idx]?.split('/').pop() || 'Select...';
  renderDropdown();

  // Show skeleton loading
  showSkeleton();

  const res = await fetch(`/api/data/${idx}`);
  DATA = await res.json();
  renderSidebar(DATA);
  renderMain();
}

function startAutoRefresh() {
  countdown = 30;
  clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    countdown--;
    document.getElementById('refreshTimer').textContent = countdown + 's';
    if (countdown <= 0) {
      refreshData();
      countdown = 30;
    }
  }, 1000);
}

async function refreshData() {
  countdown = 30;
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
        <div>${p.split('/').pop()}</div>
        <div class="path">${p}</div>
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

function openModal() {
  document.getElementById('modal').classList.add('open');
  document.getElementById('projectPathInput').focus();
  document.getElementById('dropdownMenu').classList.remove('open');
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }

async function addProject() {
  const path = document.getElementById('projectPathInput').value.trim();
  if (!path) return;
  const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) });
  const json = await res.json();
  if (json.error) {
    showToast(json.error, 'error');
    return;
  }
  projects = json.projects;
  document.getElementById('projectPathInput').value = '';
  closeModal();
  loadProject(projects.length - 1);
  showToast(`Added "${path.split('/').pop()}"`, 'success');
}

document.getElementById('projectPathInput').addEventListener('keydown', e => { if (e.key === 'Enter') addProject(); });

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

    <div class="charts-row">
      <div class="chart-card">
        <h3>📈 Commit Frequency (12 weeks)</h3>
        <canvas id="commitChart" height="110"></canvas>
      </div>
      <div class="chart-card">
        <h3>📊 Code by Type</h3>
        <canvas id="langChart" height="110"></canvas>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <h3>🔥 Code Velocity (lines added/removed per week)</h3>
        <canvas id="velocityChart" height="100"></canvas>
      </div>
      <div class="chart-card">
        <h3>📅 Busiest Day</h3>
        <canvas id="dayChart" height="100"></canvas>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="window._app.showTab('commits',this)">🔀 Commits</button>
      <button class="tab" onclick="window._app.showTab('versions',this)">🏷️ Versions</button>
      <button class="tab" onclick="window._app.showTab('hotspots',this)">🔥 Hotspots</button>
      <button class="tab" onclick="window._app.showTab('insights',this)">📊 Insights</button>
      <button class="tab" onclick="window._app.showTab('workflows',this)">⚡ Workflows</button>
      <button class="tab" onclick="window._app.showTab('decisions',this)">🧭 Decisions</button>
    </div>

    <div class="tab-content active" id="tab-commits">
      <table>
        <tr><th>Hash</th><th>Message</th><th>Author</th><th>When</th></tr>
        ${g.recentCommits.map(c => `
          <tr class="commit-row">
            <td><code class="mono" style="color:var(--color-accent)">${c.hash}</code></td>
            <td>${c.message}</td>
            <td style="color:var(--color-text-dim)">${c.author}</td>
            <td style="color:var(--color-text-muted);white-space:nowrap">${c.ago}</td>
            <div class="commit-tooltip">
              <div><span class="ct-label">Hash:</span> ${c.hash}</div>
              <div><span class="ct-label">Author:</span> ${c.author}</div>
              <div><span class="ct-label">Date:</span> ${c.date}</div>
              <div><span class="ct-label">Message:</span> ${c.message}</div>
            </div>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="tab-content" id="tab-versions">
      <table>
        <tr><th>Version</th><th>Date</th><th>Description</th></tr>
        ${DATA.changelog.map(v => `
          <tr>
            <td><span class="badge badge-purple">${v.version}</span></td>
            <td style="color:var(--color-text-dim)">${v.date}</td>
            <td>${v.description}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="tab-content" id="tab-hotspots">
      <div class="section-title">Most Changed Files (30 days) — files thường xuyên bị sửa đổi</div>
      <table>
        <tr><th>Changes</th><th>File</th></tr>
        ${g.hotspotFiles.map(f => `
          <tr>
            <td><span class="badge ${f.count > 10 ? 'badge-red' : f.count > 5 ? 'badge-yellow' : 'badge-blue'}">${f.count}×</span></td>
            <td style="font-family:var(--font-mono);font-size:12px">${f.file}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <div class="tab-content" id="tab-workflows">
      <div class="two-col">
        <div>
          <div class="section-title">Workflows</div>
          <div class="card-list">
            ${DATA.workflows.map(w => `
              <div class="card-item">
                <div>
                  <div class="title">/${w.name}</div>
                  <div class="desc">${w.description}</div>
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
                  <div class="title">${s.name}</div>
                  <div class="desc">${s.description}</div>
                </div>
                <span class="badge badge-blue">v${s.version}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="tab-content" id="tab-insights">
      ${renderInsightsTab(DATA)}
    </div>

    <div class="tab-content" id="tab-decisions">
      <div class="card-list">
        ${DATA.decisions.length ? DATA.decisions.map(d => `
          <div class="card-item">
            <div class="title">ADR-${String(d.id).padStart(3, '0')}: ${d.title}</div>
            <span class="badge badge-green">✅ Accepted</span>
          </div>
        `).join('') : '<div style="text-align:center;padding:40px;color:var(--color-text-dim)">No decisions logged</div>'}
      </div>
    </div>
  `;

  renderCharts(DATA.git, charts);
  renderInsightsCharts(DATA, charts);
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
  } catch {
    document.getElementById('aiStatus').textContent = '❌ Không thể tải config';
  }
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

async function saveSettings() {
  const apiKey = document.getElementById('geminiApiKeyInput').value.trim();
  if (!apiKey) {
    showToast('Nhập API key trước khi save', 'error');
    return;
  }

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: apiKey }),
    });
    const json = await res.json();
    if (json.success) {
      showToast('🤖 AI mode activated!', 'success');
      closeSettings();
      // Clear cache + reload để dùng AI parser
      await fetch('/api/cache', { method: 'DELETE' });
      refreshData();
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

// ─── Expose to global scope for inline onclick handlers ──────
window._app = {
  toggleDropdown,
  switchProject,
  removeProject,
  openModal,
  closeModal,
  addProject,
  refreshData,
  showTab,
  toggleTheme,
  toggleSidebar,
  openSettings,
  closeSettings,
  saveSettings,
  removeApiKey,
};

// ─── Start ───────────────────────────────────────
init();

