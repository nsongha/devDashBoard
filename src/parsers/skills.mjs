/**
 * Skills Parser
 * Discovers AI skill definitions from .agent/skills/
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

/**
 * Parse skill definitions from .agent/skills/ directory.
 * @param {string} repoPath - Repository root path
 * @returns {Array<{name: string, description: string, version: string, stackVersion: string}>}
 */
export function parseSkills(repoPath) {
  const dir = join(repoPath, '.agent/skills');
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => existsSync(join(dir, f, 'SKILL.md')))
    .map(f => {
      const content = readFileSafe(join(dir, f, 'SKILL.md'));
      const descMatch = content.match(/description:\s*['"]?(.+?)['"]?\s*$/m);
      const versionMatch = content.match(/version:\s*(.+)/);
      const stackMatch = content.match(/stack_version:\s*['"]?(.+?)['"]?\s*$/m);
      return {
        name: f,
        description: descMatch?.[1] || '',
        version: versionMatch?.[1] || 'N/A',
        stackVersion: stackMatch?.[1] || ''
      };
    });
}
