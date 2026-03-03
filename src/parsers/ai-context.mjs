/**
 * AI_CONTEXT.md Parser
 * Parses project metadata from AI context file
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';

const AI_CONTEXT_PROMPT = `Parse this project context/AI context markdown file and return JSON:
{
  "name": "string — project name",
  "description": "string — brief project description",
  "version": "string — latest version or 'unknown'",
  "currentPhase": "string — current phase or 'unknown'"
}`;

/**
 * Parse AI_CONTEXT.md using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<object|null>}
 */
export async function parseAIContextAI(repoPath, config) {
  const content = readFileSafe(join(repoPath, 'docs/AI_CONTEXT.md'));
  if (!content) return null;

  return parseWithAI(content, parseContent, AI_CONTEXT_PROMPT, config);
}

/** @param {string} content */
function parseContent(content) {
  const projectMatch = content.match(/\*\*(.+?)\*\* — (.+)/);
  const versionMatch = content.match(/Latest version\*\*: (.+)/);
  const phaseMatch = content.match(/Current phase\*\*: (.+)/);
  return {
    name: projectMatch?.[1] || 'Unknown',
    description: projectMatch?.[2] || '',
    version: versionMatch?.[1] || 'unknown',
    currentPhase: phaseMatch?.[1] || 'unknown',
  };
}

/**
 * Parse AI_CONTEXT.md (or PROJECT_CONTEXT.md) for project metadata.
 * @param {string} repoPath - Repository root path
 * @returns {object|null}
 */
export function parseAIContext(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/AI_CONTEXT.md'));
  if (!content) return null;
  return parseContent(content);
}
