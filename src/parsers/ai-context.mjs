/**
 * AI_CONTEXT.md / PROJECT_CONTEXT.md Parser
 * Parses project metadata (name, description, version, phase)
 * Supports dual mode: regex (default) + AI-powered (optional)
 * Fallback chain: AI_CONTEXT.md → PROJECT_CONTEXT.md
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
 * Falls back to PROJECT_CONTEXT.md if AI_CONTEXT.md doesn't exist.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<object|null>}
 */
export async function parseAIContextAI(repoPath, config) {
  const content = readFileSafe(join(repoPath, 'docs/AI_CONTEXT.md'));
  if (content) {
    return parseWithAI(content, parseContent, AI_CONTEXT_PROMPT, config);
  }

  // Fallback: try PROJECT_CONTEXT.md with AI
  const projectCtx = readFileSafe(join(repoPath, 'docs/PROJECT_CONTEXT.md'));
  if (projectCtx) {
    return parseWithAI(projectCtx, parseProjectContext, AI_CONTEXT_PROMPT, config);
  }

  return null;
}

/** @param {string} content - AI_CONTEXT.md format */
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

/** @param {string} content - PROJECT_CONTEXT.md format (flexible) */
function parseProjectContext(content) {
  // === Name extraction ===
  // Pattern 1: "# PROJECT_CONTEXT.md — ProjectName / Subtitle"
  // Pattern 2: "**ProjectName** — description"
  // Pattern 3: "# ProjectName"
  const nameMatch =
    content.match(/^# (?:PROJECT_CONTEXT\.md|[\w_]+) — (.+?)(?:\n|$)/m) ||
    content.match(/\*\*(.+?)\*\* — (.+)/) ||
    content.match(/^# (.+?)(?:\n|$)/m);

  const name = nameMatch?.[1]?.split('/')[0]?.trim() || 'Unknown';

  // === Description extraction ===
  // Pattern 1: "- **Mô tả**: description"
  // Pattern 2: Second group from "**Name** — description"
  // Pattern 3: First blockquote or paragraph after title
  const descMatch =
    content.match(/[-*]\s*\*\*Mô tả\*\*:\s*(.+)/) ||
    content.match(/\*\*\w+\*\* — (.+)/);
  const description = descMatch?.[1] || '';

  // === Version extraction ===
  // Pattern 1: "- **Version**: 1.0.0"
  // Pattern 2: "version: 1.0.0" (YAML-like)
  // Pattern 3: "## Version" heading
  // Pattern 4: "v1.0.0" standalone
  const versionMatch =
    content.match(/[-*]\s*\*\*Version\*\*:\s*(.+)/) ||
    content.match(/^version:\s*(.+)/mi) ||
    content.match(/\bv?(\d+\.\d+\.\d+)\b/);
  const version = versionMatch?.[1]?.split('→')[0]?.trim() || 'unknown';

  // === Phase extraction ===
  // Pattern 1: "- **Phase**: Phase 1" or "**Phase**: MVP Planning"
  // Pattern 2: "## N. Trạng thái dự án" section containing phase info
  // Pattern 3: "Current phase**: Phase X"
  const phaseMatch =
    content.match(/[-*]\s*\*\*Phase\*\*:\s*(.+)/) ||
    content.match(/\*\*Phase\*\*:\s*(.+)/) ||
    content.match(/Current phase\*\*:\s*(.+)/) ||
    content.match(/Phase\*\*:\s*(.+)/i);
  const currentPhase = phaseMatch?.[1]?.trim() || 'unknown';

  return { name, description, version, currentPhase };
}

/**
 * Parse AI_CONTEXT.md (or PROJECT_CONTEXT.md) for project metadata.
 * Fallback chain: AI_CONTEXT.md → PROJECT_CONTEXT.md
 * @param {string} repoPath - Repository root path
 * @returns {object|null}
 */
export function parseAIContext(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/AI_CONTEXT.md'));
  if (content) return parseContent(content);

  // Fallback: try PROJECT_CONTEXT.md
  const projectCtx = readFileSafe(join(repoPath, 'docs/PROJECT_CONTEXT.md'));
  if (projectCtx) return parseProjectContext(projectCtx);

  return null;
}
