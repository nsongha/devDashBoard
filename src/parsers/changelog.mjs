/**
 * CHANGELOG.md Parser
 * Parses version history entries
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join } from 'path';

/**
 * Parse CHANGELOG.md for version entries.
 * @param {string} repoPath - Repository root path
 * @returns {Array<{version: string, date: string, description: string}>}
 */
export function parseChangelog(repoPath) {
  const content = readFileSafe(join(repoPath, 'CHANGELOG.md'));
  if (!content) return [];

  const versions = [];
  const versionRegex = /## \[(.+?)\] — (\d{4}-\d{2}-\d{2})(?: — (.+))?/g;
  let match;

  while ((match = versionRegex.exec(content))) {
    versions.push({
      version: match[1],
      date: match[2],
      description: match[3] || ''
    });
  }
  return versions;
}
