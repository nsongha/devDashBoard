/**
 * Sprint Velocity Trends
 * So sánh velocity across time periods (tuần), tính avg + trend direction
 */

import { run, runAsync, getWeekStart } from '../utils/file-helpers.mjs';



/**
 * Determine trend direction based on recent vs overall average
 * @param {number[]} values - Array of values over time
 * @returns {"↑"|"↓"|"→"}
 */
function calculateTrend(values) {
  if (values.length < 3) return '→';

  const recentCount = Math.max(1, Math.floor(values.length / 3));
  const recent = values.slice(-recentCount);
  const earlier = values.slice(0, -recentCount);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  const threshold = earlierAvg * 0.15; // 15% threshold for trend detection
  if (recentAvg > earlierAvg + threshold) return '↑';
  if (recentAvg < earlierAvg - threshold) return '↓';
  return '→';
}

/**
 * Collect velocity trends from a git repository.
 * @param {string} repoPath - Absolute path to git repository
 * @returns {{ periods: Array<{ period: string, commits: number, linesChanged: number }>, avgPerWeek: number, trend: "↑"|"↓"|"→" }}
 */
export function collectVelocityTrends(repoPath) {
  const logRaw = run('git log --since="84 days ago" --format="%H %ai" --numstat', repoPath);
  return _parseVelocityData(logRaw);
}

/**
 * Async version — runs git command non-blocking.
 * @param {string} repoPath
 * @returns {Promise<{ periods: Array, avgPerWeek: number, trend: string }>}
 */
export async function collectVelocityTrendsAsync(repoPath) {
  const logRaw = await runAsync('git log --since="84 days ago" --format="%H %ai" --numstat', repoPath);
  return _parseVelocityData(logRaw);
}

/** @private Shared parsing logic */
function _parseVelocityData(logRaw) {
  if (!logRaw) return { periods: [], avgPerWeek: 0, trend: '→' };

  const weeklyData = {};
  let currentWeek = '';

  for (const line of logRaw.split('\n')) {
    const commitMatch = line.match(/^[a-f0-9]{40}\s+(\d{4}-\d{2}-\d{2})/);
    if (commitMatch) {
      currentWeek = getWeekStart(new Date(commitMatch[1]));
      if (!weeklyData[currentWeek]) {
        weeklyData[currentWeek] = { commits: 0, linesChanged: 0 };
      }
      weeklyData[currentWeek].commits++;
      continue;
    }

    const statMatch = line.match(/^(\d+)\s+(\d+)\s+/);
    if (statMatch && currentWeek) {
      weeklyData[currentWeek].linesChanged += parseInt(statMatch[1]) + parseInt(statMatch[2]);
    }
  }

  const periods = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({ period, ...data }));

  const commitValues = periods.map(p => p.commits);
  const totalCommits = commitValues.reduce((a, b) => a + b, 0);
  const avgPerWeek = periods.length > 0
    ? Math.round((totalCommits / periods.length) * 10) / 10
    : 0;

  const trend = calculateTrend(commitValues);

  return { periods, avgPerWeek, trend };
}

