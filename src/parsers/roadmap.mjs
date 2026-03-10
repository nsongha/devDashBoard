/**
 * DEV_ROADMAP.md Parser
 * Parses project phases, progress, and status from roadmap files
 * Searches: docs/DEV_ROADMAP.md → DEV_ROADMAP.md
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join } from 'path';

/**
 * Read DEV_ROADMAP.md from docs/ or root.
 * @param {string} repoPath
 * @returns {string}
 */
function readRoadmap(repoPath) {
  return readFileSafe(join(repoPath, 'docs/DEV_ROADMAP.md'))
    || readFileSafe(join(repoPath, 'DEV_ROADMAP.md'));
}

/**
 * Parse DEV_ROADMAP.md for phase progress.
 * @param {string} repoPath - Repository root path
 * @returns {object|null} { phases: Array, currentPhase: number }
 */
export function parseRoadmap(repoPath) {
  const content = readRoadmap(repoPath);
  if (!content) return null;
  return parseContent(content);
}

/** @param {string} content */
function parseContent(content) {
  const phases = [];

  // Match phase headings: "## Phase N — Name ..." or "## Phase N: Name ..."
  const phaseRegex = /^## Phase (\d+)\s*[—–:]\s*(.+)$/gm;
  let match;

  while ((match = phaseRegex.exec(content))) {
    const number = parseInt(match[1]);
    const rawTitle = match[2].trim();

    // Extract phase name (before any parenthetical or status marker)
    const name = rawTitle
      .replace(/\s*✅.*$/, '')        // Remove ✅ and after
      .replace(/\s*\(.*\)\s*$/, '')   // Remove trailing (v0.2.0) or (Hoàn thành...)
      .trim();

    // Detect version from (vX.Y.Z) in heading
    const versionMatch = rawTitle.match(/\(v([\d.]+)\)/);
    const version = versionMatch?.[1] || '';

    // Get section content (until next ## or end)
    const sectionStart = match.index;
    const afterHeading = content.indexOf('\n', sectionStart) + 1;
    const nextPhase = content.slice(afterHeading).search(/^## Phase \d/m);
    const nextH2 = content.slice(afterHeading).search(/^## [^#]/m);
    // Use the earlier boundary (next phase or next non-phase h2 like "## Tổng kết")
    let boundary = -1;
    if (nextPhase > 0 && nextH2 > 0) boundary = Math.min(nextPhase, nextH2);
    else if (nextPhase > 0) boundary = nextPhase;
    else if (nextH2 > 0) boundary = nextH2;

    const section = boundary > 0
      ? content.slice(afterHeading, afterHeading + boundary)
      : content.slice(afterHeading);

    // Count checkbox tasks: - [x] (done) vs - [ ] (todo)
    const doneChecks = (section.match(/- \[x\]/gi) || []).length;
    const todoChecks = (section.match(/- \[ \]/g) || []).length;
    const total = doneChecks + todoChecks;

    // Determine status
    let status;
    if (rawTitle.includes('✅') || (total > 0 && todoChecks === 0)) {
      status = 'done';
    } else if (doneChecks > 0 && todoChecks > 0) {
      status = 'active';
    } else {
      status = 'planned';
    }

    phases.push({ number, name, status, done: doneChecks, total, version });
  }

  // Determine current phase: first non-done phase, or last done phase
  let currentPhase = 0;
  const activePhase = phases.find(p => p.status === 'active');
  if (activePhase) {
    currentPhase = activePhase.number;
  } else {
    // First planned phase after all done phases
    const firstPlanned = phases.find(p => p.status === 'planned');
    if (firstPlanned) {
      currentPhase = firstPlanned.number;
    } else if (phases.length > 0) {
      currentPhase = phases[phases.length - 1].number;
    }
  }

  return { phases, currentPhase };
}
