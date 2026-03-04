/**
 * DECISIONS.md Parser
 * Parses architecture decision records (ADRs)
 * Supports dual mode: regex (default) + AI-powered (optional)
 *
 * Format: ### DEC-xxx: <title>
 *   - **Ngày**: <date>
 *   - **Loại**: <type tags>
 *   - **Trạng thái**: <status emoji + text>
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';

const DECISIONS_AI_PROMPT = `Parse this DECISIONS.md and return a JSON array of decision entries.
Each entry has format "### DEC-xxx: <title>" followed by metadata lines.
Return: [{ "id": "DEC-xxx", "title": "string", "date": "string or empty", "type": "string or empty", "status": "string or empty" }]
Return only the JSON array.`;

/**
 * Parse DECISIONS.md using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<Array>}
 */
export async function parseDecisionsAI(repoPath, config) {
  const content =
    readFileSafe(join(repoPath, 'docs/DECISIONS.md')) ||
    readFileSafe(join(repoPath, 'docs/DECISIONS_LOG.md'));
  if (!content) return [];

  return parseWithAI(content, parseContent, DECISIONS_AI_PROMPT, config);
}

/** @param {string} content */
function parseContent(content) {
  const decisions = [];

  // Match new format: ### DEC-xxx: <title>
  const decRegex = /### (DEC-\d+): (.+)/g;
  let match;
  while ((match = decRegex.exec(content))) {
    const id = match[1];
    const title = match[2].trim();

    // Extract metadata from lines following the heading (until next ### or ---)
    const startIdx = match.index + match[0].length;
    const nextSection = content.indexOf('\n### ', startIdx);
    const nextDivider = content.indexOf('\n---', startIdx);
    const endIdx =
      nextSection === -1 && nextDivider === -1
        ? content.length
        : Math.min(
            nextSection === -1 ? Infinity : nextSection,
            nextDivider === -1 ? Infinity : nextDivider,
          );
    const block = content.slice(startIdx, endIdx);

    const date = extractField(block, 'Ngày') || '';
    const type = extractField(block, 'Loại') || '';
    const status = extractField(block, 'Trạng thái') || '';

    decisions.push({ id, title, date, type, status });
  }

  // Fallback: old format ## ADR-xxx: <title>
  if (decisions.length === 0) {
    const adrRegex = /## ADR-(\d+): (.+)/g;
    while ((match = adrRegex.exec(content))) {
      decisions.push({
        id: `ADR-${match[1]}`,
        title: match[2].trim(),
        date: '',
        type: '',
        status: '✅ Accepted',
      });
    }
  }

  return decisions;
}

/**
 * Extract a metadata field value from a block of text.
 * Matches: - **FieldName**: <value>
 * @param {string} block
 * @param {string} fieldName
 * @returns {string|null}
 */
function extractField(block, fieldName) {
  const regex = new RegExp(
    `\\*\\*${fieldName}\\*\\*:\\s*(.+?)(?:\\n|$)`,
  );
  const m = block.match(regex);
  return m ? m[1].trim() : null;
}

/**
 * Parse DECISIONS.md for decision entries (sync, regex-only).
 * @param {string} repoPath - Repository root path
 * @returns {Array<{id: string, title: string, date: string, type: string, status: string}>}
 */
export function parseDecisions(repoPath) {
  const content =
    readFileSafe(join(repoPath, 'docs/DECISIONS.md')) ||
    readFileSafe(join(repoPath, 'docs/DECISIONS_LOG.md'));
  if (!content) return [];
  return parseContent(content);
}
