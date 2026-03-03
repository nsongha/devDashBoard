/**
 * KNOWN_ISSUES.md Parser
 * Parses active issues, resolved issues, and tech debt counts
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';

const KNOWN_ISSUES_AI_PROMPT = `Parse this KNOWN_ISSUES.md and return JSON:
{
  "active": "number — count of active issues (I- prefix)",
  "resolved": "number — count of resolved issues (R- prefix)",
  "techDebt": "number — count of tech debt items (T- prefix)"
}`;

/**
 * Parse KNOWN_ISSUES.md using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function parseKnownIssuesAI(repoPath, config) {
  const content = readFileSafe(join(repoPath, 'docs/KNOWN_ISSUES.md'))
    || readFileSafe(join(repoPath, 'KNOWN_ISSUES.md'));
  if (!content) return { active: 0, resolved: 0, techDebt: 0 };

  return parseWithAI(content, extractCounts, KNOWN_ISSUES_AI_PROMPT, config);
}

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
