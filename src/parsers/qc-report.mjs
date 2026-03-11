/**
 * QC_REPORT.md Parser
 * Parses test cases, release checklist, and sign-off status
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { findDocsFileContents } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';

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
 * Scans docs/ and subdirectories.
 */
export async function parseQCReportAI(repoPath, config) {
  const files = findDocsFileContents(repoPath, 'QC_REPORT.md');
  if (files.length === 0) return null;

  // AI mode: gộp content → parse 1 lần
  const content = files.map(f => f.content).join('\n\n');
  return parseWithAI(content, extractQCReport, QC_REPORT_AI_PROMPT, config);
}

/**
 * Parse QC_REPORT.md using regex.
 * Scans docs/ and subdirectories — merge results from multiple files.
 * @param {string} repoPath - Repository root path
 * @returns {object|null}
 */
export function parseQCReport(repoPath) {
  const files = findDocsFileContents(repoPath, 'QC_REPORT.md');
  if (files.length === 0) return null;

  // Single file → parse trực tiếp (backwards compatible)
  if (files.length === 1) return extractQCReport(files[0].content);

  // Multiple files → parse từng file rồi merge
  return mergeQCReports(files);
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

  // Try standard section first, then numbered/emoji sections
  const tcSection = extractSection(content, 'Test Cases')
    || findCheckSection(content);
  if (!tcSection) return { total: 0, passed: 0, failed: 0, notRun: 0, blocked: 0, items: [] };

  const lines = tcSection.split('\n');

  for (const line of lines) {
    // Feature heading: ### Feature Name
    const featureMatch = line.match(/^###\s+(.+)/);
    if (featureMatch) {
      currentFeature = featureMatch[1].trim();
      continue;
    }

    // Format A: checkbox — - [x] TC-001: Description (optional bugRef)
    const tcMatch = line.match(/^-\s+\[([x !~])\]\s+(TC-\d+):\s+(.+)/i);
    if (tcMatch) {
      const [, marker, id, rest] = tcMatch;
      let status;
      switch (marker.toLowerCase()) {
        case 'x': status = 'pass'; break;
        case '!': status = 'fail'; break;
        case '~': status = 'blocked'; break;
        default: status = 'not_run';
      }
      let description = rest.trim();
      let bugRef = '';
      const bugMatch = description.match(/\(([A-Z]+-\d+)\)\s*$/);
      if (bugMatch) {
        bugRef = bugMatch[1];
        description = description.replace(/\s*\([A-Z]+-\d+\)\s*$/, '').trim();
      }
      items.push({ id, description, status, feature: currentFeature, bugRef });
      continue;
    }

    // Format B: table row — | `file.py` | ✅ OK | or | file | ❌ FAIL |
    const tableMatch = line.match(/\|\s*`?([^|`]+)`?\s*\|\s*(✅|❌|OK|FAIL|Pass|Fail)[^|]*\|/i);
    if (tableMatch && !line.match(/^\|\s*[-]+\s*\|/) && !line.match(/\|\s*File\s*\|/i)) {
      const fileName = tableMatch[1].trim();
      const statusRaw = tableMatch[2].trim();
      const status = /✅|OK|Pass/i.test(statusRaw) ? 'pass' : 'fail';
      const id = `CHK-${String(items.length + 1).padStart(3, '0')}`;
      items.push({ id, description: fileName, status, feature: currentFeature, bugRef: '' });
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
  if (!section) {
    // Fallback: look for unicode checkboxes (☐/☑/□/☒) anywhere
    return extractUnicodeChecklist(content);
  }

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

/**
 * Fallback: parse unicode checkboxes (□ = pending, ☑/☒ = done)
 */
function extractUnicodeChecklist(content) {
  const items = [];
  const lines = content.split('\n');
  for (const line of lines) {
    // □ Item (pending) or ☐ Item (pending)
    const pendingMatch = line.match(/^[□☐]\s+(.+)/);
    if (pendingMatch) {
      items.push({ text: pendingMatch[1].trim(), done: false });
      continue;
    }
    // ☑ Item (done) or ☒ Item (done) or ✅ Item (done)
    const doneMatch = line.match(/^[☑☒✅]\s+(.+)/);
    if (doneMatch) {
      items.push({ text: doneMatch[1].trim(), done: true });
    }
  }
  const done = items.filter(i => i.done).length;
  return { total: items.length, done, items };
}

// ─── Sign-off ────────────────────────────────────────────────

function extractSignOff(content) {
  const items = [];
  // Try multiple section names
  const section = extractSection(content, 'Sign-off')
    || extractSection(content, 'Sign Off')
    || extractSection(content, 'Kết quả')
    || extractSection(content, 'Result');
  if (!section) return { approved: false, items: [] };

  const lines = section.split('\n');
  for (const line of lines) {
    // Table row: | Role | Name | Status | Date | or | Hạng mục | Kết quả |
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2 && !parts[0].match(/^-+$/) && !parts[0].match(/^(Role|Hạng mục|Category)$/i)) {
      if (parts.length >= 4) {
        // Standard 4-column sign-off
        items.push({ role: parts[0], name: parts[1], status: parts[2], date: parts[3] });
      } else {
        // 2-column result table (Pyng: | Hạng mục | Kết quả |)
        items.push({ role: parts[0], name: '', status: parts[1], date: '' });
      }
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
  // Escape heading for regex (avoid special chars)
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use (?:\\s|$|—) instead of \\b — word boundary breaks on Vietnamese/Unicode chars
  const regex = new RegExp(`^##\\s+(?:\\d+\\.\\s+)?${escaped}(?:\\s|$|—).*$`, 'im');
  const match = content.match(regex);
  if (!match) return null;

  const startIdx = match.index + match[0].length;
  const rest = content.slice(startIdx);
  const nextHeading = rest.match(/^##\s+/m);
  const endIdx = nextHeading ? nextHeading.index : rest.length;

  return rest.slice(0, endIdx).trim();
}

/**
 * Find check/test sections with numbered headings or varied names.
 * Merges content from all matching sections.
 */
function findCheckSection(content) {
  const sections = [];
  // Match: ## N. ... Check, ## N. ... Test, ## Test Cases, etc.
  const regex = /^##\s+(?:\d+\.\s+)?(.+?(?:Check|Test|Compile|Build|Review|Verification).*)$/gim;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const startIdx = match.index + match[0].length;
    const rest = content.slice(startIdx);
    const nextHeading = rest.match(/^##\s+/m);
    const endIdx = nextHeading ? nextHeading.index : rest.length;
    const sectionContent = rest.slice(0, endIdx).trim();
    if (sectionContent) {
      // Preserve section name as feature context
      sections.push(`### ${match[1].trim()}\n${sectionContent}`);
    }
  }
  return sections.length > 0 ? sections.join('\n\n') : null;
}

/**
 * Merge QC reports from multiple files.
 * Test cases items get source tracking. Counts are summed.
 */
function mergeQCReports(files) {
  const merged = {
    testCases: { total: 0, passed: 0, failed: 0, notRun: 0, blocked: 0, items: [] },
    releaseChecklist: { total: 0, done: 0, items: [] },
    signOff: { approved: false, items: [] },
  };

  for (const file of files) {
    const report = extractQCReport(file.content);
    if (!report) continue;

    // Merge test cases with source tracking
    const tc = report.testCases;
    merged.testCases.total += tc.total;
    merged.testCases.passed += tc.passed;
    merged.testCases.failed += tc.failed;
    merged.testCases.notRun += tc.notRun;
    merged.testCases.blocked += tc.blocked;
    for (const item of tc.items) {
      merged.testCases.items.push({ ...item, source: file.source });
    }

    // Merge release checklist
    const rc = report.releaseChecklist;
    merged.releaseChecklist.total += rc.total;
    merged.releaseChecklist.done += rc.done;
    for (const item of rc.items) {
      merged.releaseChecklist.items.push({ ...item, source: file.source });
    }

    // Merge sign-off
    for (const item of report.signOff.items) {
      merged.signOff.items.push({ ...item, source: file.source });
    }
  }

  // Sign-off approved only if ALL sign-offs are approved
  merged.signOff.approved = merged.signOff.items.length > 0 &&
    merged.signOff.items.every(i =>
      i.status.toLowerCase().includes('approved') || i.status.includes('✅')
    );

  return merged;
}
