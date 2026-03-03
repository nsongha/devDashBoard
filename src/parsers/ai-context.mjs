/**
 * AI_CONTEXT.md Parser
 * Parses project metadata from AI context file
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join, basename } from 'path';

/**
 * Parse AI_CONTEXT.md (or PROJECT_CONTEXT.md) for project metadata.
 * @param {string} repoPath - Repository root path
 * @returns {object|null}
 */
export function parseAIContext(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/AI_CONTEXT.md'));
  if (!content) return null;

  const projectMatch = content.match(/\*\*(.+?)\*\* — (.+)/);
  const versionMatch = content.match(/Latest version\*\*: (.+)/);
  const phaseMatch = content.match(/Current phase\*\*: (.+)/);

  return {
    name: projectMatch?.[1] || basename(repoPath),
    description: projectMatch?.[2] || '',
    version: versionMatch?.[1] || 'unknown',
    currentPhase: phaseMatch?.[1] || 'unknown'
  };
}
