/**
 * Git Stats Collector
 * Collects comprehensive git statistics from a repository.
 * Supports incremental collection — only re-collects when new commits exist.
 */

import { run, runAsync, getWeekStart } from '../utils/file-helpers.mjs';
import { existsSync } from 'fs';
import { join } from 'path';


// ─── Empty Stats Template ────────────────────────────────────
const EMPTY_STATS = {
  totalCommits: 0, commitsPerDay: [], commitsPerWeek: [], commitsByDayOfWeek: [],
  commitsByHour: Array(24).fill(0), codeVelocity: [], lastCommit: '', totalLines: 0,
  extBreakdown: {}, tags: [], recentCommits: [], totalFiles: 0, branch: '',
  firstCommitDate: '', lastCommitDate: '', projectAgeDays: 0, avgCommitsPerDay: 0,
  hotspotFiles: [], lastCommitHash: '',
};

// Shared extension/exclude config
const CODE_EXTS = "'*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.css' '*.md' '*.json' '*.prisma' '*.html'";
const EXCLUDE_PATHS = "':!package-lock.json' ':!*.lock' ':!.agent/' ':!node_modules/' ':!public/vendor/'";

// ─── Parse Helpers (shared between sync/async) ──────────────

function parseWeeklyLog(weeklyLog) {
  const weeklyData = {};
  for (const dateStr of weeklyLog.split('\n').filter(Boolean)) {
    const d = new Date(dateStr);
    const week = getWeekStart(d);
    weeklyData[week] = (weeklyData[week] || 0) + 1;
  }
  return Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
}

function parseDailyLog(dailyLog) {
  return dailyLog.split('\n').filter(Boolean).map(line => {
    const [count, date] = line.trim().split(/\s+/);
    return { date, count: parseInt(count) };
  });
}

function parseDayOfWeekLog(dayOfWeekLog) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const dateStr of dayOfWeekLog.split('\n').filter(Boolean)) {
    const d = new Date(dateStr);
    dayOfWeekCounts[d.getDay()]++;
  }
  return dayNames.map((name, i) => ({ day: name, count: dayOfWeekCounts[i] }));
}

function parseHourLog(hourLog) {
  const commitsByHour = Array(24).fill(0);
  for (const line of hourLog.split('\n').filter(Boolean)) {
    const [count, hour] = line.trim().split(/\s+/);
    commitsByHour[parseInt(hour)] = parseInt(count);
  }
  return commitsByHour;
}

function parseVelocityRaw(velocityRaw) {
  const commitVelocity = [];
  let currentCommit = null;
  for (const line of velocityRaw.split('\n')) {
    const commitMatch = line.match(/^([a-f0-9]{40})\s+([a-f0-9]+)\s+(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}\s+\S+\s+(.*)/);
    if (commitMatch) {
      if (currentCommit) commitVelocity.push(currentCommit);
      currentCommit = {
        hash: commitMatch[2],
        date: commitMatch[3],
        message: commitMatch[4].slice(0, 40),
        added: 0,
        removed: 0,
      };
    }
    const statMatch = line.match(/^(\d+)\s+(\d+)\s+/);
    if (statMatch && currentCommit) {
      currentCommit.added += parseInt(statMatch[1]);
      currentCommit.removed += parseInt(statMatch[2]);
    }
  }
  if (currentCommit) commitVelocity.push(currentCommit);
  return commitVelocity.reverse();
}

function parseExtBreakdown(extOutput) {
  const extBreakdown = {};
  for (const line of extOutput.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (match && !match[2].includes('total')) {
      const ext = match[2].split('.').pop();
      extBreakdown[ext] = (extBreakdown[ext] || 0) + parseInt(match[1]);
    }
  }
  return extBreakdown;
}

function parseRecentCommits(raw) {
  if (!raw || !raw.trim()) return [];
  // Split by commit separator
  const blocks = raw.split('§§§\n').filter(Boolean);
  return blocks.map(block => {
    const lines = block.split('\n');
    // First line: hash|message|ago|author|date
    const meta = lines[0];
    const [hash, message, ago, author, date] = meta.split('|');
    if (!hash) return null;

    // Remaining lines: body + shortstat
    let body = '';
    let filesChanged = 0, insertions = 0, deletions = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      // Detect shortstat line: " N files changed, N insertions(+), N deletions(-)"
      const statMatch = line.match(/(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertion)?(?:,\s+(\d+)\s+deletion)?/);
      if (statMatch) {
        filesChanged = parseInt(statMatch[1]) || 0;
        insertions = parseInt(statMatch[2]) || 0;
        deletions = parseInt(statMatch[3]) || 0;
      } else if (line) {
        body += (body ? '\n' : '') + line;
      }
    }
    return { hash, message, ago, author, date, body, filesChanged, insertions, deletions };
  }).filter(Boolean);
}

function parseHotspotFiles(hotspotRaw) {
  return hotspotRaw.split('\n').filter(Boolean).map(line => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    return match ? { count: parseInt(match[1]), file: match[2] } : null;
  }).filter(Boolean);
}

function buildResult(raw) {
  const totalCommits = parseInt(raw.totalCommitsStr) || 0;
  const firstCommitDate = raw.firstCommitDateStr.split(' ')[0] || '';
  const lastCommitDate = raw.lastCommitDateStr.split(' ')[0] || '';
  const projectAgeDays = firstCommitDate
    ? Math.ceil((Date.now() - new Date(firstCommitDate).getTime()) / 86400000)
    : 0;
  const avgCommitsPerDay = projectAgeDays > 0 ? (totalCommits / projectAgeDays).toFixed(1) : 0;
  const totalLines = parseInt(raw.locOutput?.match(/(\d+)\s+total/)?.[1]) || 0;
  const totalFiles = parseInt(raw.totalFilesStr) || 0;

  return {
    totalCommits,
    commitsPerDay: parseDailyLog(raw.dailyLog),
    commitsPerWeek: parseWeeklyLog(raw.weeklyLog),
    commitsByDayOfWeek: parseDayOfWeekLog(raw.dayOfWeekLog),
    commitsByHour: parseHourLog(raw.hourLog),
    codeVelocity: parseVelocityRaw(raw.velocityRaw),
    lastCommit: raw.lastCommit,
    totalLines,
    extBreakdown: parseExtBreakdown(raw.extOutput),
    tags: raw.tagsStr.split('\n').filter(Boolean),
    recentCommits: parseRecentCommits(raw.recentCommitsStr),
    totalFiles,
    branch: raw.branch,
    firstCommitDate,
    lastCommitDate,
    projectAgeDays,
    avgCommitsPerDay,
    hotspotFiles: parseHotspotFiles(raw.hotspotRaw),
    lastCommitHash: raw.lastCommitHash,
  };
}

/**
 * Collect comprehensive git statistics from a repository.
 * @param {string} repoPath - Absolute path to the git repository
 * @returns {object} Git stats object
 */
export function collectGitStats(repoPath) {
  if (!existsSync(join(repoPath, '.git'))) {
    console.warn(`[git-stats] Not a git repo, skipping: ${repoPath}`);
    return { ...EMPTY_STATS };
  }

  const raw = {
    totalCommitsStr: run('git rev-list --count HEAD', repoPath),
    firstCommitDateStr: run('git log --reverse --format="%ai" | head -1', repoPath),
    lastCommitDateStr: run('git log -1 --format="%ai"', repoPath),
    weeklyLog: run(`git log --since="84 days ago" --format='%ai' | cut -d' ' -f1`, repoPath),
    dailyLog: run(`git log --since="30 days ago" --format='%ai' | cut -d' ' -f1 | sort | uniq -c | sort -k2`, repoPath),
    dayOfWeekLog: run(`git log --format='%ai' | cut -d' ' -f1`, repoPath),
    hourLog: run(`git log --format='%ai' | cut -d' ' -f2 | cut -d: -f1 | sort | uniq -c | sort -k2`, repoPath),
    velocityRaw: run(`git log -30 --format='%H %h %ai %s' --numstat`, repoPath),
    lastCommit: run('git log -1 --format="%h — %s (%ar)"', repoPath),
    locOutput: run(`git ls-files -- ${CODE_EXTS} ${EXCLUDE_PATHS} | head -500 | xargs wc -l 2>/dev/null | tail -1`, repoPath),
    extOutput: run(`git ls-files -- ${CODE_EXTS} ${EXCLUDE_PATHS} | head -500 | xargs wc -l 2>/dev/null`, repoPath),
    tagsStr: run('git tag --sort=-creatordate | head -10', repoPath),
    recentCommitsStr: run('git log -15 --format="%h|%s|%ar|%an|%ai%n%b§§§" --shortstat', repoPath),
    hotspotRaw: run(`git log --since="30 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head -10`, repoPath),
    totalFilesStr: run('git ls-files | wc -l', repoPath),
    branch: run('git branch --show-current', repoPath),
    lastCommitHash: run('git rev-parse HEAD', repoPath),
  };

  return buildResult(raw);
}

/**
 * Async version — runs all git commands in parallel via Promise.all().
 * ~3x faster than sync version due to concurrent subprocess execution.
 * @param {string} repoPath - Absolute path to the git repository
 * @returns {Promise<object>} Git stats object
 */
export async function collectGitStatsAsync(repoPath) {
  if (!existsSync(join(repoPath, '.git'))) {
    console.warn(`[git-stats] Not a git repo, skipping: ${repoPath}`);
    return { ...EMPTY_STATS };
  }

  const r = (cmd) => runAsync(cmd, repoPath);

  const [
    totalCommitsStr, firstCommitDateStr, lastCommitDateStr,
    weeklyLog, dailyLog, dayOfWeekLog, hourLog,
    velocityRaw, lastCommit, locOutput, extOutput,
    tagsStr, recentCommitsStr, hotspotRaw,
    totalFilesStr, branch, lastCommitHash,
  ] = await Promise.all([
    r('git rev-list --count HEAD'),
    r('git log --reverse --format="%ai" | head -1'),
    r('git log -1 --format="%ai"'),
    r(`git log --since="84 days ago" --format='%ai' | cut -d' ' -f1`),
    r(`git log --since="30 days ago" --format='%ai' | cut -d' ' -f1 | sort | uniq -c | sort -k2`),
    r(`git log --format='%ai' | cut -d' ' -f1`),
    r(`git log --format='%ai' | cut -d' ' -f2 | cut -d: -f1 | sort | uniq -c | sort -k2`),
    r(`git log -30 --format='%H %h %ai %s' --numstat`),
    r('git log -1 --format="%h — %s (%ar)"'),
    r(`git ls-files -- ${CODE_EXTS} ${EXCLUDE_PATHS} | head -500 | xargs wc -l 2>/dev/null | tail -1`),
    r(`git ls-files -- ${CODE_EXTS} ${EXCLUDE_PATHS} | head -500 | xargs wc -l 2>/dev/null`),
    r('git tag --sort=-creatordate | head -10'),
    r('git log -15 --format="%h|%s|%ar|%an|%ai%n%b§§§" --shortstat'),
    r(`git log --since="30 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head -10`),
    r('git ls-files | wc -l'),
    r('git branch --show-current'),
    r('git rev-parse HEAD'),
  ]);

  return buildResult({
    totalCommitsStr, firstCommitDateStr, lastCommitDateStr,
    weeklyLog, dailyLog, dayOfWeekLog, hourLog,
    velocityRaw, lastCommit, locOutput, extOutput,
    tagsStr, recentCommitsStr, hotspotRaw,
    totalFilesStr, branch, lastCommitHash,
  });
}

/**
 * Incremental git stats collection (async).
 * Compares HEAD hash with previous data — skips full collection if no new commits.
 * @param {string} repoPath - Absolute path to the git repository
 * @param {object|null} previousData - Previously cached git stats (must include lastCommitHash)
 * @returns {Promise<object>} Git stats object (same shape as collectGitStats)
 */
export async function collectGitStatsIncrementalAsync(repoPath, previousData) {
  if (!previousData?.lastCommitHash) {
    return collectGitStatsAsync(repoPath);
  }
  const currentHash = await runAsync('git rev-parse HEAD', repoPath);
  if (currentHash === previousData.lastCommitHash) {
    return previousData;
  }
  return collectGitStatsAsync(repoPath);
}

/**
 * Sync incremental (kept for backward compatibility).
 */
export function collectGitStatsIncremental(repoPath, previousData) {
  if (!previousData?.lastCommitHash) {
    return collectGitStats(repoPath);
  }
  const currentHash = run('git rev-parse HEAD', repoPath);
  if (currentHash === previousData.lastCommitHash) {
    return previousData;
  }
  return collectGitStats(repoPath);
}

