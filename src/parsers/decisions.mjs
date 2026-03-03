/**
 * DECISIONS_LOG.md Parser
 * Parses architecture decision records (ADRs)
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';

const DECISIONS_AI_PROMPT = `Parse this DECISIONS_LOG.md and return a JSON array:
[{ "id": "number", "title": "string — decision title" }]
Return only the JSON array.`;

/**
 * Parse DECISIONS_LOG.md using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<Array>}
 */
export async function parseDecisionsAI(repoPath, config) {
  const content = readFileSafe(join(repoPath, 'docs/DECISIONS_LOG.md'));
  if (!content) return [];

  return parseWithAI(content, parseContent, DECISIONS_AI_PROMPT, config);
}

/** @param {string} content */
function parseContent(content) {
  const decisions = [];
  const adrRegex = /## ADR-(\d+): (.+)/g;
  let match;
  while ((match = adrRegex.exec(content))) {
    decisions.push({ id: parseInt(match[1]), title: match[2] });
  }
  return decisions;
}

/**
 * Parse DECISIONS_LOG.md for ADR entries.
 * @param {string} repoPath - Repository root path
 * @returns {Array<{id: number, title: string}>}
 */
export function parseDecisions(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/DECISIONS_LOG.md'));
  if (!content) return [];
  return parseContent(content);
}
