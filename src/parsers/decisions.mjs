/**
 * DECISIONS_LOG.md Parser
 * Parses architecture decision records (ADRs)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join } from 'path';

/**
 * Parse DECISIONS_LOG.md for ADR entries.
 * @param {string} repoPath - Repository root path
 * @returns {Array<{id: number, title: string}>}
 */
export function parseDecisions(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/DECISIONS_LOG.md'));
  if (!content) return [];

  const decisions = [];
  const adrRegex = /## ADR-(\d+): (.+)/g;
  let match;

  while ((match = adrRegex.exec(content))) {
    decisions.push({ id: parseInt(match[1]), title: match[2] });
  }
  return decisions;
}
