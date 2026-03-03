/**
 * Author Statistics Collector
 * Thống kê per-author: commit count, lines added/removed, active days, top files
 */

import { run } from '../utils/file-helpers.mjs';

/**
 * Collect per-author statistics from a git repository.
 * @param {string} repoPath - Absolute path to git repository
 * @returns {Array<{ name: string, commits: number, linesAdded: number, linesRemoved: number, activeDays: number, topFiles: string[] }>}
 */
export function collectAuthorStats(repoPath) {
  // Get commit count per author
  const shortlogRaw = run(
    'git shortlog -sne HEAD',
    repoPath
  );

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

  // Get lines added/removed per author (last 90 days for performance)
  const numstatRaw = run(
    'git log --since="90 days ago" --format="%aN" --numstat',
    repoPath
  );

  let currentAuthor = '';
  const authorFiles = {};

  for (const line of numstatRaw.split('\n')) {
    if (!line) continue;

    // Numstat lines: "123\t456\tfilename"
    const statMatch = line.match(/^(\d+)\t(\d+)\t(.+)$/);
    if (statMatch) {
      if (currentAuthor && authors[currentAuthor]) {
        authors[currentAuthor].linesAdded += parseInt(statMatch[1]);
        authors[currentAuthor].linesRemoved += parseInt(statMatch[2]);

        // Track file change counts for top files
        if (!authorFiles[currentAuthor]) authorFiles[currentAuthor] = {};
        const file = statMatch[3];
        authorFiles[currentAuthor][file] = (authorFiles[currentAuthor][file] || 0) + 1;
      }
    } else {
      // Author name line
      currentAuthor = line.trim();
    }
  }

  // Get active days per author (last 90 days)
  const daysRaw = run(
    'git log --since="90 days ago" --format="%aN|%ai"',
    repoPath
  );

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

    // Top 5 most-changed files per author
    if (authorFiles[name]) {
      author.topFiles = Object.entries(authorFiles[name])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([file]) => file);
    }
  }

  // Sort by commit count descending
  return Object.values(authors)
    .sort((a, b) => b.commits - a.commits);
}
