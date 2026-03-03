/**
 * TASK_BOARD.md Parser
 * Parses phase progress, streams, and task statuses
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { join } from 'path';

/**
 * Parse TASK_BOARD.md for phase progress and stream statuses.
 * @param {string} repoPath - Repository root path
 * @returns {object|null}
 */
export function parseTaskBoard(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/TASK_BOARD.md'));
  if (!content) {
    // Fallback: check root level
    const rootContent = readFileSafe(join(repoPath, 'TASK_BOARD.md'));
    if (!rootContent) return null;
    return parseContent(rootContent);
  }
  return parseContent(content);
}

function parseContent(content) {
  const streams = [];
  const streamRegex = /## Stream (.+?) — (.+)/g;
  let match;

  while ((match = streamRegex.exec(content))) {
    const streamId = match[1];
    const streamName = match[2];
    const streamStart = match.index;
    const afterHeader = content.indexOf('\n', streamStart) + 1;
    const nextHeading = content.slice(afterHeader).search(/^## /m);
    const section = nextHeading > 0
      ? content.slice(streamStart, afterHeader + nextHeading)
      : content.slice(streamStart);

    const tableRows = section.split('\n').filter(l => l.startsWith('|') && !l.includes('---'));
    const done = tableRows.filter(l => l.includes('✅')).length;
    const todo = tableRows.filter(l => l.includes('📋')).length;
    const progress = tableRows.filter(l => l.includes('🔄')).length;
    const blocked = tableRows.filter(l => l.includes('⏸️')).length;
    const total = done + todo + progress + blocked;

    if (total > 0) {
      streams.push({ id: streamId, name: streamName, done, todo, progress, blocked, total });
    }
  }

  const phaseMatch = content.match(/# (.+)/);
  const phaseName = phaseMatch ? phaseMatch[1] : 'Unknown';
  const totalTasks = streams.reduce((s, st) => s + st.total, 0);
  const totalDone = streams.reduce((s, st) => s + st.done, 0);

  return { phaseName, streams, totalTasks, totalDone };
}
