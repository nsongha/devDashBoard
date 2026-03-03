/**
 * Charts Module — Chart.js rendering for Dev Dashboard
 * Supports dark/light theme detection via CSS custom properties
 * Extracted from monolithic index.html (B3), upgraded in Phase 2
 */

/**
 * Group commit data by period (day/week/month/year)
 * @param {object} gitData - Git stats object with commitsPerDay, commitsPerWeek fields
 * @param {'day'|'week'|'month'|'year'} period
 * @returns {{ labels: string[], counts: number[] }}
 */
function groupCommitsByPeriod(gitData, period) {
  if (period === 'week') {
    // Use pre-computed weekly data (last 12 weeks)
    const data = gitData.commitsPerWeek || [];
    return {
      labels: data.map(d => d.week.slice(5)),   // MM-DD
      counts: data.map(d => d.count),
    };
  }

  // For day/month/year we re-aggregate from commitsPerDay
  const dailyData = gitData.commitsPerDay || [];

  if (period === 'day') {
    return {
      labels: dailyData.map(d => d.date ? d.date.slice(5) : d.date), // MM-DD
      counts: dailyData.map(d => d.count),
    };
  }

  // month or year — need ALL commits; fall back to commitsPerWeek if commitsPerDay is small
  // We group commitsPerWeek data into months/years as best-effort
  const weeklyData = gitData.commitsPerWeek || [];

  if (period === 'month') {
    const monthly = {};
    for (const { week, count } of weeklyData) {
      const key = week.slice(0, 7); // YYYY-MM
      monthly[key] = (monthly[key] || 0) + count;
    }
    // Also include commitsPerDay
    for (const { date, count } of dailyData) {
      if (!date) continue;
      const key = date.slice(0, 7);
      if (!monthly[key]) monthly[key] = 0;
      // daily data may overlap weekly — skip if we already have weekly
    }
    const entries = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: entries.map(([k]) => k.slice(5)), // MM
      counts: entries.map(([, v]) => v),
    };
  }

  if (period === 'year') {
    const yearly = {};
    for (const { week, count } of weeklyData) {
      const key = week.slice(0, 4); // YYYY
      yearly[key] = (yearly[key] || 0) + count;
    }
    const entries = Object.entries(yearly).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: entries.map(([k]) => k),
      counts: entries.map(([, v]) => v),
    };
  }

  // fallback
  return { labels: [], counts: [] };
}

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
    added: get('--chart-added'),
    addedBg: get('--chart-added-bg'),
    removed: get('--chart-removed'),
    removedBg: get('--chart-removed-bg'),
    palette: [
      get('--chart-palette-1'),
      get('--chart-palette-2'),
      get('--chart-palette-3'),
      get('--chart-palette-4'),
      get('--chart-palette-5'),
      get('--chart-palette-6'),
    ],
  };
}

/**
 * Destroy all existing chart instances
 * @param {Object} chartsStore - Object holding Chart.js instances
 */
export function destroyCharts(chartsStore) {
  Object.values(chartsStore).forEach(c => c.destroy());
  for (const key of Object.keys(chartsStore)) {
    delete chartsStore[key];
  }
}

/**
 * Render all dashboard charts with theme-aware colors
 * @param {Object} gitData - Git statistics data (DATA.git)
 * @param {Object} chartsStore - Mutable object to store Chart.js instances
 * @param {'day'|'week'|'month'|'year'} [period='week'] - Time period grouping for commit frequency chart
 */
export function renderCharts(gitData, chartsStore, period = 'week') {
  const g = gitData;
  const t = getThemeColors();

  // Destroy existing charts
  destroyCharts(chartsStore);

  const defaultAnimation = {
    duration: 600,
    easing: 'easeOutQuart',
  };

  // Commit frequency chart — grouped by selected period
  const { labels: commitLabels, counts: commitCounts } = groupCommitsByPeriod(g, period);
  const periodTitles = { day: '30 days', week: '12 weeks', month: 'by month', year: 'by year' };
  const commitChartTitleEl = document.getElementById('commitChartTitle');
  if (commitChartTitleEl) commitChartTitleEl.textContent = `📈 Commit Frequency (${periodTitles[period] || '12 weeks'})`;

  chartsStore.commit = new Chart(document.getElementById('commitChart'), {
    type: 'bar',
    data: {
      labels: commitLabels,
      datasets: [{
        label: 'Commits',
        data: commitCounts,
        backgroundColor: t.bar,
        borderColor: t.barBorder,
        borderWidth: 1,
        borderRadius: 4,
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
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `${ctx.raw} commits (${pct}% of total)`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: t.tick, font: { size: 10 } }, grid: { color: t.grid } },
        y: { ticks: { color: t.tick, font: { size: 10 } }, grid: { color: t.grid } }
      }
    }
  });

  // Language doughnut
  const exts = Object.entries(g.extBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
  chartsStore.lang = new Chart(document.getElementById('langChart'), {
    type: 'doughnut',
    data: {
      labels: exts.map(([ext]) => '.' + ext),
      datasets: [{ data: exts.map(([, v]) => v), backgroundColor: t.palette, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      animation: defaultAnimation,
      plugins: {
        legend: { position: 'right', labels: { color: t.legend, font: { size: 11 }, padding: 8 } },
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
              return ` ${ctx.label}: ${ctx.raw.toLocaleString()} lines (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // Velocity chart (per commit)
  if (g.codeVelocity.length > 0) {
    chartsStore.velocity = new Chart(document.getElementById('velocityChart'), {
      type: 'bar',
      data: {
        labels: g.codeVelocity.map(d => d.hash),
        datasets: [
          {
            label: 'Added',
            data: g.codeVelocity.map(d => d.added),
            backgroundColor: t.added,
            borderRadius: 2,
          },
          {
            label: 'Removed',
            data: g.codeVelocity.map(d => -d.removed),
            backgroundColor: t.removed,
            borderRadius: 2,
          }
        ]
      },
      options: {
        responsive: true,
        animation: defaultAnimation,
        plugins: {
          legend: { labels: { color: t.legend, font: { size: 11 } } },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'Inter', size: 11 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex;
                const d = g.codeVelocity[idx];
                return d ? `${d.hash} — ${d.date}` : '';
              },
              afterTitle: (items) => {
                const idx = items[0]?.dataIndex;
                const d = g.codeVelocity[idx];
                return d?.message || '';
              },
              label: (ctx) => {
                const abs = Math.abs(ctx.raw);
                return ` ${ctx.dataset.label}: ${abs.toLocaleString()} lines`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: t.tick, font: { size: 9, family: 'monospace' }, maxRotation: 45 },
            grid: { display: false }
          },
          y: {
            stacked: true,
            ticks: { color: t.tick, font: { size: 10 } },
            grid: { color: t.grid }
          }
        }
      }
    });
  }

  // Day of week chart
  chartsStore.day = new Chart(document.getElementById('dayChart'), {
    type: 'bar',
    data: {
      labels: g.commitsByDayOfWeek.map(d => d.day),
      datasets: [{
        data: g.commitsByDayOfWeek.map(d => d.count),
        backgroundColor: g.commitsByDayOfWeek.map((d) => {
          const max = Math.max(...g.commitsByDayOfWeek.map(x => x.count));
          return d.count === max ? t.barBorder : t.bar;
        }),
        borderRadius: 4,
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
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `${ctx.raw} commits (${pct}%)`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: t.tick, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: t.tick, font: { size: 10 } }, grid: { color: t.grid } }
      }
    }
  });
}
