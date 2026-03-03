/**
 * Workflows Parser
 * Discovers workflow definitions from .agent/workflows/
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

const WORKFLOWS_AI_PROMPT = `Parse these workflow file contents and return a JSON array:
[{ "name": "string — workflow name (filename without .md)", "description": "string — workflow description" }]
Return only the JSON array.`;

/**
 * Parse workflows using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<Array>}
 */
export async function parseWorkflowsAI(repoPath, config) {
  const dir = join(repoPath, '.agent/workflows');
  if (!existsSync(dir)) return [];

  // Collect all workflow file contents into one string for AI
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  const combined = files.map(f => {
    const content = readFileSafe(join(dir, f));
    return `### File: ${f}\n${content}`;
  }).join('\n\n');

  if (!combined) return [];

  const regexFallback = () => parseWorkflowFiles(dir);
  return parseWithAI(combined, regexFallback, WORKFLOWS_AI_PROMPT, config);
}

/**
 * Parse workflow files using regex.
 * @param {string} dir
 * @returns {Array}
 */
function parseWorkflowFiles(dir) {
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = readFileSafe(join(dir, f));
      const descMatch = content.match(/description:\s*(.+)/);
      return { name: f.replace('.md', ''), description: descMatch?.[1] || '' };
    });
}

/**
 * Parse workflow files from .agent/workflows/ directory.
 * @param {string} repoPath - Repository root path
 * @returns {Array<{name: string, description: string}>}
 */
export function parseWorkflows(repoPath) {
  const dir = join(repoPath, '.agent/workflows');
  if (!existsSync(dir)) return [];
  return parseWorkflowFiles(dir);
}
