/**
 * QC_REPORT.md Parser
 * Parses test cases, release checklist, and sign-off status
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';

const QC_REPORT_AI_PROMPT = `Parse this QC_REPORT.md and return JSON:
{
  "testCases": {
    "total": "number",
    "passed": "number",
    "failed": "number",
    "notRun": "number",
    "blocked": "number",
    "items": [{ "id": "string", "description": "string", "status": "pass|fail|not_run|blocked", "feature": "string", "bugRef": "string (optional)" }]
  },
  "releaseChecklist": {
    "total": "number",
    "done": "number",
    "items": [{ "text": "string", "done": "boolean" }]
  },
  "signOff": {
    "approved": "boolean",
    "items": [{ "role": "string", "name": "string", "status": "string", "date": "string" }]
  }
}
Return only the JSON.`;

/**
 * Parse QC_REPORT.md using AI with regex fallback.
 */
export async function parseQCReportAI(repoPath, config) {
  const content = readFileSafe(join(repoPath, 'docs/QC_REPORT.md'))
    || readFileSafe(join(repoPath, 'QC_REPORT.md'));
  if (!content) return null;

  return parseWithAI(content, extractQCReport, QC_REPORT_AI_PROMPT, config);
}

/**
 * Parse QC_REPORT.md using regex.
 * @param {string} repoPath - Repository root path
 * @returns {object|null}
 */
export function parseQCReport(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/QC_REPORT.md'))
    || readFileSafe(join(repoPath, 'QC_REPORT.md'));
  if (!content) return null;
  return extractQCReport(content);
}

/**
 * Extract QC report data from markdown content.
 * Expected format:
 *   ## Test Cases
 *   ### Feature Name
 *   - [x] TC-001: Description           → pass
 *   - [ ] TC-002: Description           → not_run
 *   - [!] TC-003: Description           → fail
 *   - [~] TC-004: Description           → blocked
 *   - [!] TC-005: Description (KI-001)  → fail + bugRef
 *
 *   ## Release Checklist
 *   - [x] Item done
 *   - [ ] Item pending
 *
 *   ## Sign-off
 *   | Role | Name | Status | Date |
 */
function extractQCReport(content) {
  const testCases = extractTestCases(content);
  const releaseChecklist = extractReleaseChecklist(content);
  const signOff = extractSignOff(content);

  return { testCases, releaseChecklist, signOff };
}

// ─── Test Cases ──────────────────────────────────────────────

function extractTestCases(content) {
  const items = [];
  let currentFeature = 'General';

  // Find the "Test Cases" section
  const tcSection = extractSection(content, 'Test Cases');
  if (!tcSection) return { total: 0, passed: 0, failed: 0, notRun: 0, blocked: 0, items: [] };

  const lines = tcSection.split('\n');

  for (const line of lines) {
    // Feature heading: ### Feature Name
    const featureMatch = line.match(/^###\s+(.+)/);
    if (featureMatch) {
      currentFeature = featureMatch[1].trim();
      continue;
    }

    // Test case: - [x] TC-001: Description (optional bugRef)
    const tcMatch = line.match(/^-\s+\[([x !~])\]\s+(TC-\d+):\s+(.+)/i);
    if (tcMatch) {
      const [, marker, id, rest] = tcMatch;

      // Parse status from marker
      let status;
      switch (marker.toLowerCase()) {
        case 'x': status = 'pass'; break;
        case '!': status = 'fail'; break;
        case '~': status = 'blocked'; break;
        default: status = 'not_run';
      }

      // Extract bug reference: (KI-001) or (BUG-123)
      let description = rest.trim();
      let bugRef = '';
      const bugMatch = description.match(/\(([A-Z]+-\d+)\)\s*$/);
      if (bugMatch) {
        bugRef = bugMatch[1];
        description = description.replace(/\s*\([A-Z]+-\d+\)\s*$/, '').trim();
      }

      items.push({ id, description, status, feature: currentFeature, bugRef });
    }
  }

  const passed = items.filter(i => i.status === 'pass').length;
  const failed = items.filter(i => i.status === 'fail').length;
  const blocked = items.filter(i => i.status === 'blocked').length;
  const notRun = items.filter(i => i.status === 'not_run').length;

  return { total: items.length, passed, failed, notRun, blocked, items };
}

// ─── Release Checklist ───────────────────────────────────────

function extractReleaseChecklist(content) {
  const items = [];
  const section = extractSection(content, 'Release Checklist');
  if (!section) return { total: 0, done: 0, items: [] };

  const lines = section.split('\n');
  for (const line of lines) {
    const match = line.match(/^-\s+\[([x ])\]\s+(.+)/i);
    if (match) {
      items.push({
        text: match[2].trim(),
        done: match[1].toLowerCase() === 'x'
      });
    }
  }

  const done = items.filter(i => i.done).length;
  return { total: items.length, done, items };
}

// ─── Sign-off ────────────────────────────────────────────────

function extractSignOff(content) {
  const items = [];
  const section = extractSection(content, 'Sign-off');
  if (!section) return { approved: false, items: [] };

  const lines = section.split('\n');
  for (const line of lines) {
    // Table row: | Role | Name | Status | Date |
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 4 && !parts[0].match(/^-+$/) && parts[0] !== 'Role') {
      items.push({
        role: parts[0],
        name: parts[1],
        status: parts[2],
        date: parts[3]
      });
    }
  }

  const approved = items.length > 0 && items.every(i =>
    i.status.toLowerCase().includes('approved') || i.status.includes('✅')
  );

  return { approved, items };
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Extract a section from markdown content by heading.
 * Returns content between ## Heading and the next ## heading.
 */
function extractSection(content, heading) {
  const regex = new RegExp(`^##\\s+${heading}\\b.*$`, 'im');
  const match = content.match(regex);
  if (!match) return null;

  const startIdx = match.index + match[0].length;
  const rest = content.slice(startIdx);
  const nextHeading = rest.match(/^##\s+/m);
  const endIdx = nextHeading ? nextHeading.index : rest.length;

  return rest.slice(0, endIdx).trim();
}
