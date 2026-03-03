/**
 * Insights Module — Renders "📊 Insights" tab content + charts
 * Commit categories, author breakdown, velocity trends, file coupling
 */

/**
 * Read current theme colors from CSS custom properties
 */
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (prop) => style.getPropertyValue(prop).trim();
  return {
    grid: get('--chart-grid'),
    tick: get('--chart-tick'),
    legend: get('--chart-legend'),
    bar: get('--chart-bar'),
    barBorder: get('--chart-bar-border'),
    palette: [
      get('--chart-palette-1'),
      get('--chart-palette-2'),
      get('--chart-palette-3'),
      get('--chart-palette-4'),
      get('--chart-palette-5'),
      get('--chart-palette-6'),
    ],
    added: get('--chart-added'),
    removed: get('--chart-removed'),
  };
}

/** Category display config */
const CATEGORY_CONFIG = {
  feat: { label: '✨ Features', color: '#22c55e' },
  fix: { label: '🐛 Fixes', color: '#ef4444' },
  refactor: { label: '♻️ Refactor', color: '#7c6cf0' },
  docs: { label: '📝 Docs', color: '#38bdf8' },
  chore: { label: '🔧 Chore', color: '#f59e0b' },
  test: { label: '🧪 Tests', color: '#a78bfa' },
  style: { label: '🎨 Style', color: '#ec4899' },
  perf: { label: '⚡ Perf', color: '#14b8a6' },
  other: { label: '📦 Other', color: '#6b7280' },
};

/**
 * Render the Insights tab HTML content
 * @param {object} data - Full project data from API
 * @returns {string} HTML string
 */
export function renderInsightsTab(data) {
  const velocity = data.velocityTrends || { periods: [], avgPerWeek: 0, trend: '→' };
  const coupling = data.fileCoupling || { pairs: [], threshold: 3 };
  const authors = data.authorStats || [];

  return `
    <div class="insights-grid">
      <!-- Row 1: Commit Categories + Velocity Summary -->
      <div class="insights-row">
        <div class="chart-card insights-card">
          <h3>🏷️ Commit Categories (90 days)</h3>
          <canvas id="categoryChart" height="160"></canvas>
        </div>
        <div class="chart-card insights-card">
          <h3>📈 Sprint Velocity</h3>
          <div class="velocity-summary">
            <div class="velocity-metric">
              <div class="velocity-value">${velocity.avgPerWeek}</div>
              <div class="velocity-label">avg commits/week</div>
            </div>
            <div class="velocity-metric">
              <div class="velocity-value velocity-trend">${velocity.trend}</div>
              <div class="velocity-label">trend</div>
            </div>
          </div>
          <canvas id="velocityTrendChart" height="110"></canvas>
        </div>
      </div>

      <!-- Row 2: Author Stats -->
      <div class="chart-card insights-card insights-full">
        <h3>👥 Author Breakdown (90 days)</h3>
        ${authors.length > 0 ? `
          <canvas id="authorChart" height="${Math.max(80, authors.length * 30)}"></canvas>
        ` : `
          <div class="insights-empty">No author data available</div>
        `}
      </div>

      <!-- Row 3: File Coupling -->
      <div class="chart-card insights-card insights-full">
        <h3>🔗 File Coupling (30 days) — files that change together ≥ ${coupling.threshold}×</h3>
        ${coupling.pairs.length > 0 ? `
          <table class="coupling-table">
            <tr><th>Co-changes</th><th>File A</th><th>File B</th></tr>
            ${coupling.pairs.map(p => `
              <tr>
                <td><span class="badge ${p.count > 8 ? 'badge-red' : p.count > 5 ? 'badge-yellow' : 'badge-blue'}">${p.count}×</span></td>
                <td style="font-family:var(--font-mono);font-size:12px">${p.fileA}</td>
                <td style="font-family:var(--font-mono);font-size:12px">${p.fileB}</td>
              </tr>
            `).join('')}
          </table>
        ` : `
          <div class="insights-empty">No file coupling detected (threshold ≥ ${coupling.threshold} co-changes)</div>
        `}
      </div>
    </div>
  `;
}

/**
 * Render Insights charts using Chart.js
 * @param {object} data - Full project data from API
 * @param {object} chartsStore - Mutable chart store
 */
export function renderInsightsCharts(data, chartsStore) {
  const t = getThemeColors();
  const defaultAnimation = { duration: 600, easing: 'easeOutQuart' };

  // ── Commit Categories Doughnut ──
  const analysis = data.commitAnalysis;
  if (analysis) {
    const entries = Object.entries(analysis.categories).filter(([, v]) => v > 0);
    const catEl = document.getElementById('categoryChart');
    if (catEl && entries.length > 0) {
      chartsStore.category = new Chart(catEl, {
        type: 'doughnut',
        data: {
          labels: entries.map(([k]) => CATEGORY_CONFIG[k]?.label || k),
          datasets: [{
            data: entries.map(([, v]) => v),
            backgroundColor: entries.map(([k]) => CATEGORY_CONFIG[k]?.color || '#6b7280'),
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          cutout: '60%',
          animation: defaultAnimation,
          plugins: {
            legend: { position: 'right', labels: { color: t.legend, font: { size: 11 }, padding: 6 } },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { family: 'Inter', size: 12 },
              bodyFont: { family: 'Inter', size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = ((ctx.raw / total) * 100).toFixed(1);
                  return ` ${ctx.raw} commits (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  // ── Velocity Trend Line ──
  const velocity = data.velocityTrends;
  if (velocity?.periods?.length > 0) {
    const velEl = document.getElementById('velocityTrendChart');
    if (velEl) {
      chartsStore.velocityTrend = new Chart(velEl, {
        type: 'line',
        data: {
          labels: velocity.periods.map(p => p.period.slice(5)),
          datasets: [{
            label: 'Commits',
            data: velocity.periods.map(p => p.commits),
            borderColor: t.palette[0],
            backgroundColor: t.palette[0] + '20',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: t.palette[0],
          }]
        },
        options: {
          responsive: true,
          animation: defaultAnimation,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { family: 'Inter', size: 12 },
              bodyFont: { family: 'Inter', size: 11 },
              padding: 10,
              cornerRadius: 8,
            }
          },
          scales: {
            x: { ticks: { color: t.tick, font: { size: 10 } }, grid: { color: t.grid } },
            y: { ticks: { color: t.tick, font: { size: 10 } }, grid: { color: t.grid }, beginAtZero: true }
          }
        }
      });
    }
  }

  // ── Author Horizontal Bar ──
  const authors = data.authorStats;
  if (authors?.length > 0) {
    const authEl = document.getElementById('authorChart');
    if (authEl) {
      chartsStore.author = new Chart(authEl, {
        type: 'bar',
        data: {
          labels: authors.map(a => a.name),
          datasets: [{
            label: 'Commits',
            data: authors.map(a => a.commits),
            backgroundColor: t.palette[0] + '80',
            borderColor: t.palette[0],
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          animation: defaultAnimation,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { family: 'Inter', size: 12 },
              bodyFont: { family: 'Inter', size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                afterLabel: (ctx) => {
                  const a = authors[ctx.dataIndex];
                  return [
                    `+${a.linesAdded.toLocaleString()} / -${a.linesRemoved.toLocaleString()} lines`,
                    `${a.activeDays} active days`,
                  ];
                }
              }
            }
          },
          scales: {
            x: { ticks: { color: t.tick, font: { size: 10 } }, grid: { color: t.grid }, beginAtZero: true },
            y: { ticks: { color: t.tick, font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }
  }
}
