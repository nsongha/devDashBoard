/**
 * Commit Message Analyzer
 * Phân loại commit messages theo Conventional Commits categories
 * và thống kê theo tuần.
 */

import { run } from '../utils/file-helpers.mjs';

/**
 * Category prefixes mapping — order matters (first match wins)
 */
const CATEGORY_PATTERNS = [
  { key: 'feat', patterns: ['feat', 'feature', 'add'] },
  { key: 'fix', patterns: ['fix', 'bugfix', 'hotfix'] },
  { key: 'refactor', patterns: ['refactor', 'restructure'] },
  { key: 'docs', patterns: ['docs', 'doc', 'readme'] },
  { key: 'chore', patterns: ['chore', 'build', 'ci', 'deps', 'bump'] },
  { key: 'test', patterns: ['test', 'tests', 'spec'] },
  { key: 'style', patterns: ['style', 'lint', 'format'] },
  { key: 'perf', patterns: ['perf', 'performance', 'optimize'] },
];

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
 * Categorize a single commit message
 * @param {string} message
 * @returns {string} category key
 */
export function categorizeMessage(message) {
  const lower = message.toLowerCase().trim();

  for (const { key, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      // Match "prefix:" or "prefix(" conventional commit format
      if (lower.startsWith(`${pattern}:`) || lower.startsWith(`${pattern}(`)) {
        return key;
      }
    }
  }

  return 'other';
}

/**
 * Analyze commit messages from a git repository.
 * @param {string} repoPath - Absolute path to git repository
 * @returns {{ categories: Record<string, number>, byWeek: Array<{ week: string } & Record<string, number>> }}
 */
export function analyzeCommits(repoPath) {
  // Get commit messages with dates (last 90 days for weekly breakdown)
  const log = run(
    'git log --since="90 days ago" --format="%ai|%s"',
    repoPath
  );

  const categories = { feat: 0, fix: 0, refactor: 0, docs: 0, chore: 0, test: 0, style: 0, perf: 0, other: 0 };
  const weeklyMap = {};

  for (const line of log.split('\n').filter(Boolean)) {
    const sepIdx = line.indexOf('|');
    if (sepIdx === -1) continue;

    const dateStr = line.slice(0, sepIdx).split(' ')[0];
    const message = line.slice(sepIdx + 1);
    const category = categorizeMessage(message);

    categories[category]++;

    const week = getWeekStart(new Date(dateStr));
    if (!weeklyMap[week]) {
      weeklyMap[week] = { feat: 0, fix: 0, refactor: 0, docs: 0, chore: 0, test: 0, style: 0, perf: 0, other: 0 };
    }
    weeklyMap[week][category]++;
  }

  const byWeek = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, counts]) => ({ week, ...counts }));

  return { categories, byWeek };
}
