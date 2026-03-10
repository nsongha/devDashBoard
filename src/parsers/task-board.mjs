/**
 * TASK_BOARD.md Parser
 * Parses phase progress, streams, and task statuses
 * Supports dual mode: regex (default) + AI-powered (optional)
 */

import { readFileSafe } from '../utils/file-helpers.mjs';
import { parseWithAI } from '../utils/ai-parser.mjs';
import { join } from 'path';

const TASK_BOARD_AI_PROMPT = `Parse this TASK_BOARD.md and return JSON with this exact structure:
{
  "phaseName": "string — the phase title from the first H1 heading",
  "streams": [
    {
      "id": "string — stream identifier (e.g. '🤖 A')",
      "name": "string — stream name after the dash",
      "done": "number — count of ✅ tasks",
      "todo": "number — count of 📋 tasks",
      "progress": "number — count of 🔄 tasks",
      "blocked": "number — count of ⏸️ tasks",
      "total": "number — sum of all tasks"
    }
  ],
  "totalTasks": "number",
  "totalDone": "number"
}`;

/**
 * Parse TASK_BOARD.md using AI with regex fallback.
 * @param {string} repoPath
 * @param {object} config - Config with geminiApiKey
 * @returns {Promise<object|null>}
 */
export async function parseTaskBoardAI(repoPath, config) {
  // Priority: root TASK_BOARD.md (where agents write) → docs/ fallback
  const content = readFileSafe(join(repoPath, 'TASK_BOARD.md'))
    || readFileSafe(join(repoPath, 'docs/TASK_BOARD.md'));
  if (!content) return null;

  return parseWithAI(content, parseContent, TASK_BOARD_AI_PROMPT, config);
}

/**
 * Parse TASK_BOARD.md for phase progress and stream statuses.
 * @param {string} repoPath - Repository root path
 * @returns {object|null}
 */
export function parseTaskBoard(repoPath) {
  // Priority: root TASK_BOARD.md (where agents write) → docs/ fallback
  const content = readFileSafe(join(repoPath, 'TASK_BOARD.md'))
    || readFileSafe(join(repoPath, 'docs/TASK_BOARD.md'));
  if (!content) return null;
  return parseContent(content);
}

function parseContent(content) {
  const streams = [];

  // Support 2 heading formats:
  // Format 1: "## Stream 🛢️ Server — Backend" (ID — Name)
  // Format 2: "## Stream 🛢️ Database & Services" (combined name, no dash)
  const streamRegex = /## Stream (.+)/g;
  let match;

  while ((match = streamRegex.exec(content))) {
    const rawTitle = match[1].trim();

    // Split by em dash if present, otherwise use emoji as ID and rest as name
    let streamId, streamName;
    if (rawTitle.includes('—')) {
      const parts = rawTitle.split('—').map(s => s.trim());
      streamId = parts[0];
      streamName = parts.slice(1).join('—').trim();
    } else {
      // Extract emoji prefix as ID, rest as name
      // e.g. "🛢️ Database & Services" → id="🛢️", name="Database & Services"
      const emojiSplit = rawTitle.match(/^(\S+)\s+(.+)$/);
      if (emojiSplit) {
        streamId = emojiSplit[1];
        streamName = emojiSplit[2];
      } else {
        streamId = rawTitle;
        streamName = rawTitle;
      }
    }

    const streamStart = match.index;
    const afterHeader = content.indexOf('\n', streamStart) + 1;
    const nextHeading = content.slice(afterHeader).search(/^## /m);
    const section = nextHeading > 0
      ? content.slice(streamStart, afterHeader + nextHeading)
      : content.slice(streamStart);

    // Count task statuses from table rows
    const tableRows = section.split('\n').filter(l => l.startsWith('|') && !l.includes('---'));
    // Exclude header row (contains column names like "Task", "Status", "#")
    const dataRows = tableRows.filter(l => !l.match(/\|\s*(#|Task|Status|Priority)\s*\|/i));

    const done = dataRows.filter(l => l.includes('✅')).length;
    const todo = dataRows.filter(l => l.includes('📋')).length;
    const progress = dataRows.filter(l => l.includes('🔄')).length;
    const blocked = dataRows.filter(l => l.includes('⏸️')).length;
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
