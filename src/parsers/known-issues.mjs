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
  // Format A: table IDs (| I-xxx |, | R-xxx |, | T-xxx |)
  const tableActive = (content.match(/\| I-\d/g) || []).length;
  const tableResolved = (content.match(/\| R-\d/g) || []).length;
  const tableTechDebt = (content.match(/\| T-\d/g) || []).length;

  if (tableActive + tableResolved + tableTechDebt > 0) {
    return { active: tableActive, resolved: tableResolved, techDebt: tableTechDebt };
  }

  // Format B: heading-based (### ISSUE-xxx, ### BUG-xxx, ### TD-xxx, ### [KI-xxx])
  // Count by section detection
  const detailed = extractDetailed(content);
  return { active: detailed.active, resolved: detailed.resolved, techDebt: detailed.techDebt };
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

    // ─── Section detection (expanded) ──────────────────────────
    // Tech Debt MUST be checked before generic Medium/🟡
    if (/##\s.*Tech\s*Debt/i.test(line)) {
      currentSection = 'techDebt';
      continue;
    }
    if (/##\s.*(?:Active|Đang hoạt động)/i.test(line)) {
      currentSection = 'active';
      continue;
    }
    if (/##\s.*(?:Resolved|Đã giải quyết)/i.test(line)) {
      currentSection = 'resolved';
      continue;
    }
    // Pyng-style severity sections → all map to 'active'
    if (/^##\s+🔴\s/i.test(line)) { currentSection = 'active'; continue; }
    if (/^##\s+🟠\s/i.test(line)) { currentSection = 'active'; continue; }
    if (/^##\s+🟡\s/i.test(line)) { currentSection = 'active'; continue; }
    if (/^##\s+🟢\s/i.test(line)) { currentSection = 'active'; continue; }
    if (/^##\s+✅\s/i.test(line)) { currentSection = 'resolved'; continue; }

    // ─── Heading format A: ### [KI-001] Title (brackets) ──────
    const bracketMatch = line.match(/^###\s+\[([A-Z]+-\d+)\]\s+(.+)/);
    if (bracketMatch) {
      const parsed = parseHeadingItem(bracketMatch[1], bracketMatch[2], lines, i, currentSection);
      items.push(parsed);
      continue;
    }

    // ─── Heading format B: ### ISSUE-001: Title (colon, no brackets)
    const colonMatch = line.match(/^###\s+([A-Z]+-\d+):\s+(.+)/);
    if (colonMatch) {
      const parsed = parseHeadingItem(colonMatch[1], colonMatch[2], lines, i, currentSection);
      items.push(parsed);
      continue;
    }

    // ─── Table format: | KI-F001 | Description | ... ─────────
    const tableMatch = line.match(/\|\s*([A-Z]+-[A-Z]?\d+)\s*\|\s*(.+?)(?:\||$)/);
    if (tableMatch) {
      const id = tableMatch[1];
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

/**
 * Parse a heading-format issue item, looking ahead for metadata fields.
 * Supports both DevDash fields (Mức độ, Module) and Pyng fields (Severity, Status, Affects).
 */
function parseHeadingItem(id, rawTitle, lines, lineIdx, defaultSection) {
  // Strip status suffixes like "✅ FIXED" from title
  const title = rawTitle.replace(/\s*[✅❌]\s*(?:FIXED|RESOLVED)\s*$/i, '').trim();

  let severity = '';
  let module = '';
  let section = defaultSection;

  // Look ahead for metadata (up to 12 lines or next heading)
  for (let j = lineIdx + 1; j < Math.min(lineIdx + 12, lines.length); j++) {
    const nextLine = lines[j];
    if (nextLine.match(/^###\s/)) break;

    // Severity: **Mức độ**: xxx OR **Severity**: xxx
    const sevMatch = nextLine.match(/\*\*(?:Mức độ|Severity)\*\*:\s*(.+)/i);
    if (sevMatch) severity = sevMatch[1].trim();

    // Module: **Module**: `path` OR **Affects**: target
    const modMatch = nextLine.match(/\*\*(?:Module|Affects)\*\*:\s*`?([^`]+)`?/i);
    if (modMatch) module = modMatch[1].trim();

    // Status: **Status**: Resolved/Won't Fix → override section
    const statMatch = nextLine.match(/\*\*Status\*\*:\s*(.+)/i);
    if (statMatch) {
      const status = statMatch[1].trim();
      if (/resolved|fixed/i.test(status)) section = 'resolved';
    }
  }

  // TD-xxx IDs → always techDebt regardless of section
  if (/^TD-/i.test(id)) section = 'techDebt';

  return { id, title, severity, module, section };
}
