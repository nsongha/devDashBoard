/**
 * Workflows Parser
 * Discovers workflow definitions from .agent/workflows/
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

/**
 * Parse workflow files from .agent/workflows/ directory.
 * @param {string} repoPath - Repository root path
 * @returns {Array<{name: string, description: string}>}
 */
export function parseWorkflows(repoPath) {
  const dir = join(repoPath, '.agent/workflows');
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = readFileSafe(join(dir, f));
      const descMatch = content.match(/description:\s*(.+)/);
      return { name: f.replace('.md', ''), description: descMatch?.[1] || '' };
    });
}
