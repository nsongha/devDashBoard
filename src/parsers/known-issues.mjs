/**
 * KNOWN_ISSUES.md Parser
 * Parses active issues, resolved issues, and tech debt counts
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join } from 'path';

/**
 * Parse KNOWN_ISSUES.md for issue counts.
 * @param {string} repoPath - Repository root path
 * @returns {{active: number, resolved: number, techDebt: number}}
 */
export function parseKnownIssues(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/KNOWN_ISSUES.md'));
  if (!content) {
    // Fallback: check root level
    const rootContent = readFileSafe(join(repoPath, 'KNOWN_ISSUES.md'));
    if (!rootContent) return { active: 0, resolved: 0, techDebt: 0 };
    return extractCounts(rootContent);
  }
  return extractCounts(content);
}

function extractCounts(content) {
  return {
    active: (content.match(/\| I-\d/g) || []).length,
    resolved: (content.match(/\| R-\d/g) || []).length,
    techDebt: (content.match(/\| T-\d/g) || []).length
  };
}
