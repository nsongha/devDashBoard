#!/usr/bin/env node
/**
 * Dev Dashboard — Data Collector (CLI)
 *
 * Scans git repos + parses .md docs → outputs dashboard-data.json
 *
 * Usage:
 *   node collect.mjs /path/to/repo1 /path/to/repo2 ...
 *   node collect.mjs  (default: current directory)
 */

import { writeFileSync } from 'fs';
import { join, basename } from 'path';

// ─── Shared Modules ──────────────────────────────────────────
import { collectGitStats } from './src/collectors/git-stats.mjs';
import { parseTaskBoard } from './src/parsers/task-board.mjs';
import { parseChangelog } from './src/parsers/changelog.mjs';
import { parseAIContext } from './src/parsers/ai-context.mjs';
import { parseKnownIssues } from './src/parsers/known-issues.mjs';
import { parseDecisions } from './src/parsers/decisions.mjs';
import { parseWorkflows } from './src/parsers/workflows.mjs';
import { parseSkills } from './src/parsers/skills.mjs';
import { parseQCReport } from './src/parsers/qc-report.mjs';

// ─── CLI ─────────────────────────────────────────────────────
const repos = process.argv.slice(2);
if (repos.length === 0) repos.push(process.cwd());

const projects = repos.map(repoPath => {
  console.log(`📊 Scanning: ${repoPath}`);

  const context = parseAIContext(repoPath);
  const git = collectGitStats(repoPath);

  return {
    path: repoPath,
    name: context?.name || basename(repoPath),
    description: context?.description || '',
    version: context?.version || git.tags[0] || 'N/A',
    currentPhase: context?.currentPhase || 'N/A',
    git,
    taskBoard: parseTaskBoard(repoPath),
    changelog: parseChangelog(repoPath),
    issues: parseKnownIssues(repoPath),
    decisions: parseDecisions(repoPath),
    workflows: parseWorkflows(repoPath),
    skills: parseSkills(repoPath),
    qcReport: parseQCReport(repoPath),
    collectedAt: new Date().toISOString()
  };
});

const output = { projects, generatedAt: new Date().toISOString() };
const outPath = join(import.meta.dirname || '/tmp/dev-dashboard', 'dashboard-data.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\n✅ Data written to ${outPath}`);
console.log(`   ${projects.length} project(s) scanned`);
