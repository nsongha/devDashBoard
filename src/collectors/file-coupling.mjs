/**
 * File Coupling Detection
 * Detect files thường thay đổi cùng nhau (co-change analysis)
 */

import { run } from '../utils/file-helpers.mjs';

/** Minimum co-change count to be considered coupled */
const COUPLING_THRESHOLD = 3;

/**
 * Detect file coupling from a git repository (30 days).
 * Finds pairs of files that frequently change together in the same commit.
 * @param {string} repoPath - Absolute path to git repository
 * @returns {{ pairs: Array<{ fileA: string, fileB: string, count: number }>, threshold: number }}
 */
export function detectFileCoupling(repoPath) {
  // Get files changed per commit (last 30 days)
  const logRaw = run(
    'git log --since="30 days ago" --name-only --pretty=format:"COMMIT_SEP"',
    repoPath
  );

  if (!logRaw) return { pairs: [], threshold: COUPLING_THRESHOLD };

  // Split into commits and collect file lists
  const commits = logRaw
    .split('COMMIT_SEP')
    .filter(Boolean)
    .map(block => block.split('\n').filter(f => f.trim() && f.trim() !== ''));

  // Count co-changes for each file pair
  const pairCounts = {};

  for (const files of commits) {
    // Only process commits with 2-20 files (skip merges/huge refactors)
    if (files.length < 2 || files.length > 20) continue;

    // Generate all pairs from this commit's files
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        // Sort to ensure consistent key
        const [a, b] = [files[i], files[j]].sort();
        const key = `${a}|||${b}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  }

  // Filter by threshold and sort by count
  const pairs = Object.entries(pairCounts)
    .filter(([, count]) => count >= COUPLING_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20) // Limit to top 20 pairs
    .map(([key, count]) => {
      const [fileA, fileB] = key.split('|||');
      return { fileA, fileB, count };
    });

  return { pairs, threshold: COUPLING_THRESHOLD };
}
