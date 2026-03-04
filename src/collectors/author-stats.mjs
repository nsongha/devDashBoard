/**
 * Author Statistics Collector
 * Thống kê per-author: commit count, lines added/removed, active days, top files
 */

import { run, runAsync } from '../utils/file-helpers.mjs';

/**
 * Collect per-author statistics from a git repository.
 * @param {string} repoPath - Absolute path to git repository
 * @returns {Array<{ name: string, commits: number, linesAdded: number, linesRemoved: number, activeDays: number, topFiles: string[] }>}
 */
export function collectAuthorStats(repoPath) {
  const shortlogRaw = run('git shortlog -sne HEAD', repoPath);
  const numstatRaw = run('git log --since="90 days ago" --format="%aN" --numstat', repoPath);
  const daysRaw = run('git log --since="90 days ago" --format="%aN|%ai"', repoPath);
  return _parseAuthorData(shortlogRaw, numstatRaw, daysRaw);
}

/**
 * Async version — runs 3 git commands in parallel.
 * @param {string} repoPath
 * @returns {Promise<Array>}
 */
export async function collectAuthorStatsAsync(repoPath) {
  const [shortlogRaw, numstatRaw, daysRaw] = await Promise.all([
    runAsync('git shortlog -sne HEAD', repoPath),
    runAsync('git log --since="90 days ago" --format="%aN" --numstat', repoPath),
    runAsync('git log --since="90 days ago" --format="%aN|%ai"', repoPath),
  ]);
  return _parseAuthorData(shortlogRaw, numstatRaw, daysRaw);
}

/** @private Shared parsing logic */
function _parseAuthorData(shortlogRaw, numstatRaw, daysRaw) {
  if (!shortlogRaw) return [];

  const authors = {};

  // Parse shortlog: "  123\tAuthor Name <email>"
  for (const line of shortlogRaw.split('\n').filter(Boolean)) {
    const match = line.trim().match(/^(\d+)\t(.+?)(?:\s*<.*>)?$/);
    if (!match) continue;
    const commits = parseInt(match[1]);
    const name = match[2].trim();

    if (!authors[name]) {
      authors[name] = { name, commits: 0, linesAdded: 0, linesRemoved: 0, activeDays: 0, topFiles: [] };
    }
    authors[name].commits += commits;
  }

  // Get lines added/removed per author
  let currentAuthor = '';
  const authorFiles = {};

  for (const line of numstatRaw.split('\n')) {
    if (!line) continue;

    const statMatch = line.match(/^(\d+)\t(\d+)\t(.+)$/);
    if (statMatch) {
      if (currentAuthor && authors[currentAuthor]) {
        authors[currentAuthor].linesAdded += parseInt(statMatch[1]);
        authors[currentAuthor].linesRemoved += parseInt(statMatch[2]);

        if (!authorFiles[currentAuthor]) authorFiles[currentAuthor] = {};
        const file = statMatch[3];
        authorFiles[currentAuthor][file] = (authorFiles[currentAuthor][file] || 0) + 1;
      }
    } else {
      currentAuthor = line.trim();
    }
  }

  // Get active days per author
  const authorDays = {};
  for (const line of daysRaw.split('\n').filter(Boolean)) {
    const sepIdx = line.indexOf('|');
    if (sepIdx === -1) continue;
    const authorName = line.slice(0, sepIdx);
    const date = line.slice(sepIdx + 1).split(' ')[0];

    if (!authorDays[authorName]) authorDays[authorName] = new Set();
    authorDays[authorName].add(date);
  }

  // Merge active days + top files
  for (const [name, author] of Object.entries(authors)) {
    author.activeDays = authorDays[name]?.size || 0;

    if (authorFiles[name]) {
      author.topFiles = Object.entries(authorFiles[name])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([file]) => file);
    }
  }

  return Object.values(authors)
    .sort((a, b) => b.commits - a.commits);
}

