/**
 * Skills Parser
 * Discovers AI skill definitions from .agent/skills/
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

const SKILLS_AI_PROMPT = `Parse these SKILL.md contents and return a JSON array:
[{ "name": "string — skill folder name", "description": "string", "version": "string or 'N/A'", "stackVersion": "string or ''" }]
Return only the JSON array.`;

/**
 * Parse skills using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<Array>}
 */
export async function parseSkillsAI(repoPath, config) {
  const dir = join(repoPath, '.agent/skills');
  if (!existsSync(dir)) return [];

  // Collect all SKILL.md contents
  const skillDirs = readdirSync(dir).filter(f => existsSync(join(dir, f, 'SKILL.md')));
  const combined = skillDirs.map(f => {
    const content = readFileSafe(join(dir, f, 'SKILL.md'));
    return `### Skill: ${f}\n${content}`;
  }).join('\n\n');

  if (!combined) return [];

  const regexFallback = () => parseSkillFiles(dir);
  return parseWithAI(combined, regexFallback, SKILLS_AI_PROMPT, config);
}

/**
 * Parse skill files using regex.
 * @param {string} dir
 * @returns {Array}
 */
function parseSkillFiles(dir) {
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
        stackVersion: stackMatch?.[1] || '',
      };
    });
}

/**
 * Parse skill definitions from .agent/skills/ directory.
 * @param {string} repoPath - Repository root path
 * @returns {Array<{name: string, description: string, version: string, stackVersion: string}>}
 */
export function parseSkills(repoPath) {
  const dir = join(repoPath, '.agent/skills');
  if (!existsSync(dir)) return [];
  return parseSkillFiles(dir);
}
