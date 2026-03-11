/**
 * KNOWN_ISSUES.md Parser
 * Parses active issues, resolved issues, and tech debt counts + detailed items
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { findDocsFileContents } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';

const KNOWN_ISSUES_AI_PROMPT = `Parse this KNOWN_ISSUES.md and return JSON:
{
  "active": "number — count of active issues (I- prefix)",
  "resolved": "number — count of resolved issues (R- prefix)",
  "techDebt": "number — count of tech debt items (T- prefix)"
}`;

const KNOWN_ISSUES_DETAILED_AI_PROMPT = `Parse this KNOWN_ISSUES.md and return JSON:
{
  "active": "number",
  "resolved": "number",
  "techDebt": "number",
  "items": [{ "id": "string", "title": "string", "severity": "string", "module": "string", "section": "active|techDebt|resolved" }]
}
Return only the JSON.`;

/**
 * Get combined content from all KNOWN_ISSUES.md files (docs/ + subdirectories).
 * @param {string} repoPath
 * @returns {string}
 */
function getContent(repoPath) {
  const files = findDocsFileContents(repoPath, 'KNOWN_ISSUES.md');
  if (files.length === 0) return '';
  return files.map(f => f.content).join('\n\n');
}

/**
 * Parse KNOWN_ISSUES.md using AI with regex fallback.
 * Scans docs/ and subdirectories.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function parseKnownIssuesAI(repoPath, config) {
  const content = getContent(repoPath);
  if (!content) return { active: 0, resolved: 0, techDebt: 0 };

  return parseWithAI(content, extractCounts, KNOWN_ISSUES_AI_PROMPT, config);
}

/**
 * Parse KNOWN_ISSUES.md for issue counts.
 * Scans docs/ and subdirectories.
 * @param {string} repoPath - Repository root path
 * @returns {{active: number, resolved: number, techDebt: number}}
 */
export function parseKnownIssues(repoPath) {
  const content = getContent(repoPath);
  if (!content) return { active: 0, resolved: 0, techDebt: 0 };
  return extractCounts(content);
}

function extractCounts(content) {
  return {
    active: (content.match(/\| I-\d/g) || []).length,
    resolved: (content.match(/\| R-\d/g) || []).length,
    techDebt: (content.match(/\| T-\d/g) || []).length
  };
}

// ─── Detailed Parser (for Known Issues tab) ──────────────────

/**
 * Parse KNOWN_ISSUES.md using AI with detailed regex fallback.
 * Scans docs/ and subdirectories.
 * @param {string} repoPath
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function parseKnownIssuesDetailedAI(repoPath, config) {
  const files = findDocsFileContents(repoPath, 'KNOWN_ISSUES.md');
  if (files.length === 0) return { active: 0, resolved: 0, techDebt: 0, items: [] };

  // AI mode: gộp content → parse 1 lần
  const content = files.map(f => f.content).join('\n\n');
  return parseWithAI(content, extractDetailed, KNOWN_ISSUES_DETAILED_AI_PROMPT, config);
}

/**
 * Parse KNOWN_ISSUES.md for detailed issue items + counts.
 * Scans docs/ and subdirectories — merge results with source tracking.
 * @param {string} repoPath - Repository root path
 * @returns {{active: number, resolved: number, techDebt: number, items: Array}}
 */
export function parseKnownIssuesDetailed(repoPath) {
  const files = findDocsFileContents(repoPath, 'KNOWN_ISSUES.md');
  if (files.length === 0) return { active: 0, resolved: 0, techDebt: 0, items: [] };

  // Parse từng file riêng → merge, thêm source tracking
  const allItems = [];
  for (const file of files) {
    const result = extractDetailed(file.content);
    for (const item of result.items) {
      allItems.push({ ...item, source: file.source });
    }
  }

  const active = allItems.filter(i => i.section === 'active').length;
  const techDebt = allItems.filter(i => i.section === 'techDebt').length;
  const resolved = allItems.filter(i => i.section === 'resolved').length;

  return { active, resolved, techDebt, items: allItems };
}

/**
 * Extract detailed items from KNOWN_ISSUES.md content.
 * Supports both heading format (### [KI-xxx] Title) and table format (| ID | Desc |).
 * @param {string} content
 * @returns {{active: number, resolved: number, techDebt: number, items: Array}}
 */
function extractDetailed(content) {
  const items = [];

  // Detect current section by scanning for section headings
  let currentSection = 'active';
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section changes
    if (/##\s.*(?:Active|Đang hoạt động)/i.test(line)) {
      currentSection = 'active';
      continue;
    }
    if (/##\s.*Tech\s*Debt/i.test(line)) {
      currentSection = 'techDebt';
      continue;
    }
    if (/##\s.*(?:Resolved|Đã giải quyết)/i.test(line)) {
      currentSection = 'resolved';
      continue;
    }

    // Parse heading format: ### [KI-001] Title or ### [TD-001] Title
    const headingMatch = line.match(/^###\s+\[([A-Z]+-\d+)\]\s+(.+)/);
    if (headingMatch) {
      const id = headingMatch[1];
      const title = headingMatch[2].trim();

      // Look ahead for severity and module in subsequent lines
      let severity = '';
      let module = '';
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.match(/^###\s/)) break; // Next item
        const sevMatch = nextLine.match(/\*\*Mức độ\*\*:\s*(.+)/);
        if (sevMatch) severity = sevMatch[1].trim();
        const modMatch = nextLine.match(/\*\*Module\*\*:\s*`?([^`]+)`?/);
        if (modMatch) module = modMatch[1].trim();
      }

      items.push({ id, title, severity, module, section: currentSection });
      continue;
    }

    // Parse table format: | KI-F001 | Description | ...
    const tableMatch = line.match(/\|\s*([A-Z]+-[A-Z]?\d+)\s*\|\s*(.+?)(?:\||$)/);
    if (tableMatch) {
      const id = tableMatch[1];
      // Clean trailing pipes and whitespace from title
      const title = tableMatch[2].replace(/\s*\|.*$/, '').trim();
      items.push({ id, title, severity: '', module: '', section: currentSection });
    }
  }

  // Compute counts from items
  const active = items.filter(i => i.section === 'active').length;
  const techDebt = items.filter(i => i.section === 'techDebt').length;
  const resolved = items.filter(i => i.section === 'resolved').length;

  return { active, resolved, techDebt, items };
}
