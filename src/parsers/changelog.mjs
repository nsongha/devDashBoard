/**
 * CHANGELOG.md Parser
 * Parses version history entries
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';

const CHANGELOG_AI_PROMPT = `Parse this CHANGELOG.md and return a JSON array with this structure:
[{ "version": "string", "date": "YYYY-MM-DD", "description": "string — brief summary" }]
Return only the JSON array.`;

/**
 * Parse CHANGELOG.md using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<Array>}
 */
export async function parseChangelogAI(repoPath, config) {
  const content = readFileSafe(join(repoPath, 'CHANGELOG.md'));
  if (!content) return [];

  return parseWithAI(content, parseContent, CHANGELOG_AI_PROMPT, config);
}

/** @param {string} content */
function parseContent(content) {
  const versions = [];
  const versionRegex = /## \[(.+?)\] — (\d{4}-\d{2}-\d{2})(?: — (.+))?/g;
  let match;
  while ((match = versionRegex.exec(content))) {
    versions.push({ version: match[1], date: match[2], description: match[3] || '' });
  }
  return versions;
}

/**
 * Parse CHANGELOG.md for version entries (regex mode).
 * @param {string} repoPath - Repository root path
 * @returns {Array<{version: string, date: string, description: string}>}
 */
export function parseChangelog(repoPath) {
  const content = readFileSafe(join(repoPath, 'CHANGELOG.md'));
  if (!content) return [];
  return parseContent(content);
}

