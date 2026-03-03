/**
 * Charts Module — Chart.js rendering for Dev Dashboard
 * Extracted from monolithic index.html (B3)
 */

/**
 * Destroy all existing chart instances
 * @param {Object} chartsStore - Object holding Chart.js instances
 */
export function destroyCharts(chartsStore) {
  Object.values(chartsStore).forEach(c => c.destroy());
  // Clear all keys
  for (const key of Object.keys(chartsStore)) {
    delete chartsStore[key];
  }
}

/**
 * Render all dashboard charts
 * @param {Object} gitData - Git statistics data (DATA.git)
 * @param {Object} chartsStore - Mutable object to store Chart.js instances
 */
export function renderCharts(gitData, chartsStore) {
  const g = gitData;

  // Destroy existing charts
  destroyCharts(chartsStore);

  // Commit frequency chart
  chartsStore.commit = new Chart(document.getElementById('commitChart'), {
    type: 'bar',
    data: {
      labels: g.commitsPerWeek.map(d => d.week.slice(5)),
      datasets: [{
        label: 'Commits',
        data: g.commitsPerWeek.map(d => d.count),
        backgroundColor: 'rgba(124,108,240,0.5)',
        borderColor: '#7C6CF0',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#50506a', font: { size: 10 } }, grid: { color: '#1a1a2e' } },
        y: { ticks: { color: '#50506a', font: { size: 10 } }, grid: { color: '#1a1a2e' } }
      }
    }
  });

  // Language doughnut
  const exts = Object.entries(g.extBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const colors = ['#7C6CF0', '#22c55e', '#38bdf8', '#f59e0b', '#ef4444', '#a78bfa'];
  chartsStore.lang = new Chart(document.getElementById('langChart'), {
    type: 'doughnut',
    data: {
      labels: exts.map(([ext]) => '.' + ext),
      datasets: [{ data: exts.map(([, v]) => v), backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { color: '#7878a0', font: { size: 11 }, padding: 8 } }
      }
    }
  });

  // Velocity chart
  if (g.codeVelocity.length > 0) {
    chartsStore.velocity = new Chart(document.getElementById('velocityChart'), {
      type: 'line',
      data: {
        labels: g.codeVelocity.map(d => d.week.slice(5)),
        datasets: [
          {
            label: 'Added',
            data: g.codeVelocity.map(d => d.added),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2,
          },
          {
            label: 'Removed',
            data: g.codeVelocity.map(d => -d.removed),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#7878a0', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#50506a', font: { size: 10 } }, grid: { color: '#1a1a2e' } },
          y: { ticks: { color: '#50506a', font: { size: 10 } }, grid: { color: '#1a1a2e' } }
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
          return d.count === max ? '#7C6CF0' : 'rgba(124,108,240,0.2)';
        }),
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#50506a', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#50506a', font: { size: 10 } }, grid: { color: '#1a1a2e' } }
      }
    }
  });
}
