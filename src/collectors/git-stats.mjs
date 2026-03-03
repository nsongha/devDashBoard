/**
 * Git Stats Collector
 * Collects comprehensive git statistics from a repository.
 * Supports incremental collection — only re-collects when new commits exist.
 */

import { run } from '../utils/file-helpers.mjs';

/**
 * Get ISO date string for the start of the week (Sunday)
 * @param {Date} date
 * @returns {string}
 */
function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

/**
 * Collect comprehensive git statistics from a repository.
 * @param {string} repoPath - Absolute path to the git repository
 * @returns {object} Git stats object
 */
export function collectGitStats(repoPath) {
  const totalCommits = parseInt(run('git rev-list --count HEAD', repoPath)) || 0;

  // First commit date (project birth)
  const firstCommitDate = run('git log --reverse --format="%ai" | head -1', repoPath).split(' ')[0] || '';
  const lastCommitDate = run('git log -1 --format="%ai"', repoPath).split(' ')[0] || '';

  // Project age in days
  const projectAgeDays = firstCommitDate
    ? Math.ceil((Date.now() - new Date(firstCommitDate).getTime()) / 86400000)
    : 0;

  // Avg commits per day
  const avgCommitsPerDay = projectAgeDays > 0 ? (totalCommits / projectAgeDays).toFixed(1) : 0;

  // Commits per week (last 12 weeks)
  const weeklyLog = run(
    `git log --since="84 days ago" --format='%ai' | cut -d' ' -f1`,
    repoPath
  );
  const weeklyData = {};
  for (const dateStr of weeklyLog.split('\n').filter(Boolean)) {
    const d = new Date(dateStr);
    const week = getWeekStart(d);
    weeklyData[week] = (weeklyData[week] || 0) + 1;
  }
  const commitsPerWeek = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // Commits per day (last 30 days)
  const dailyLog = run(
    `git log --since="30 days ago" --format='%ai' | cut -d' ' -f1 | sort | uniq -c | sort -k2`,
    repoPath
  );
  const commitsPerDay = dailyLog.split('\n').filter(Boolean).map(line => {
    const [count, date] = line.trim().split(/\s+/);
    return { date, count: parseInt(count) };
  });

  // Busiest day of week
  const dayOfWeekLog = run(
    `git log --format='%ai' | cut -d' ' -f1`,
    repoPath
  );
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const dateStr of dayOfWeekLog.split('\n').filter(Boolean)) {
    const d = new Date(dateStr);
    dayOfWeekCounts[d.getDay()]++;
  }
  const commitsByDayOfWeek = dayNames.map((name, i) => ({ day: name, count: dayOfWeekCounts[i] }));

  // Hourly distribution
  const hourLog = run(
    `git log --format='%ai' | cut -d' ' -f2 | cut -d: -f1 | sort | uniq -c | sort -k2`,
    repoPath
  );
  const commitsByHour = Array(24).fill(0);
  for (const line of hourLog.split('\n').filter(Boolean)) {
    const [count, hour] = line.trim().split(/\s+/);
    commitsByHour[parseInt(hour)] = parseInt(count);
  }

  // Code velocity: lines added/removed last 12 weeks
  const velocityRaw = run(
    `git log --since="84 days ago" --format='%H %ai' --numstat`,
    repoPath
  );
  const weeklyVelocity = {};
  let currentWeek = '';
  for (const line of velocityRaw.split('\n')) {
    const commitMatch = line.match(/^[a-f0-9]{40}\s+(\d{4}-\d{2}-\d{2})/);
    if (commitMatch) {
      currentWeek = getWeekStart(new Date(commitMatch[1]));
      if (!weeklyVelocity[currentWeek]) weeklyVelocity[currentWeek] = { added: 0, removed: 0 };
    }
    const statMatch = line.match(/^(\d+)\s+(\d+)\s+/);
    if (statMatch && currentWeek) {
      weeklyVelocity[currentWeek].added += parseInt(statMatch[1]);
      weeklyVelocity[currentWeek].removed += parseInt(statMatch[2]);
    }
  }
  const codeVelocity = Object.entries(weeklyVelocity)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({ week, ...data }));

  // Last commit
  const lastCommit = run('git log -1 --format="%h — %s (%ar)"', repoPath);

  // Lines of code
  const locOutput = run(
    `git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.css' '*.md' '*.json' '*.prisma' | head -500 | xargs wc -l 2>/dev/null | tail -1`,
    repoPath
  );
  const totalLines = parseInt(locOutput?.match(/(\d+)\s+total/)?.[1]) || 0;

  // Breakdown by extension
  const extBreakdown = {};
  const extOutput = run(
    `git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.css' '*.md' | head -500 | xargs wc -l 2>/dev/null`,
    repoPath
  );
  for (const line of extOutput.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (match && !match[2].includes('total')) {
      const ext = match[2].split('.').pop();
      extBreakdown[ext] = (extBreakdown[ext] || 0) + parseInt(match[1]);
    }
  }

  // Git tags
  const tags = run('git tag --sort=-creatordate | head -10', repoPath)
    .split('\n').filter(Boolean);

  // Recent commits (last 15)
  const recentCommits = run(
    'git log -15 --format="%h|%s|%ar|%an|%ai"',
    repoPath
  ).split('\n').filter(Boolean).map(line => {
    const [hash, message, ago, author, date] = line.split('|');
    return { hash, message, ago, author, date };
  });

  // Hotspot files (most changed)
  const hotspotRaw = run(
    `git log --since="30 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head -10`,
    repoPath
  );
  const hotspotFiles = hotspotRaw.split('\n').filter(Boolean).map(line => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    return match ? { count: parseInt(match[1]), file: match[2] } : null;
  }).filter(Boolean);

  const totalFiles = parseInt(run('git ls-files | wc -l', repoPath)) || 0;
  const branch = run('git branch --show-current', repoPath);
  const lastCommitHash = run('git rev-parse HEAD', repoPath);

  return {
    totalCommits, commitsPerDay, commitsPerWeek, commitsByDayOfWeek, commitsByHour,
    codeVelocity, lastCommit, totalLines, extBreakdown, tags, recentCommits,
    totalFiles, branch, firstCommitDate, lastCommitDate, projectAgeDays, avgCommitsPerDay,
    hotspotFiles, lastCommitHash
  };
}

/**
 * Incremental git stats collection.
 * Compares HEAD hash with previous data — skips full collection if no new commits.
 * @param {string} repoPath - Absolute path to the git repository
 * @param {object|null} previousData - Previously cached git stats (must include lastCommitHash)
 * @returns {object} Git stats object (same shape as collectGitStats)
 */
export function collectGitStatsIncremental(repoPath, previousData) {
  if (!previousData?.lastCommitHash) {
    return collectGitStats(repoPath);
  }
  const currentHash = run('git rev-parse HEAD', repoPath);
  if (currentHash === previousData.lastCommitHash) {
    return previousData; // No new commits, reuse cached data
  }
  return collectGitStats(repoPath);
}
