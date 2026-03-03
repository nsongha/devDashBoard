#!/usr/bin/env node
/**
 * Dev Dashboard — Data Collector
 * 
 * Scans git repos + parses .md docs → outputs dashboard.json
 * 
 * Usage:
 *   node collect.mjs /path/to/repo1 /path/to/repo2 ...
 *   node collect.mjs  (default: current directory)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const repos = process.argv.slice(2);
if (repos.length === 0) repos.push(process.cwd());

function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 10000 }).trim();
  } catch {
    return '';
  }
}

function readFileSafe(path) {
  try { return readFileSync(path, 'utf-8'); } catch { return ''; }
}

// ─── Git Stats ───────────────────────────────────────────────
function collectGitStats(repoPath) {
  const totalCommits = parseInt(run('git rev-list --count HEAD', repoPath)) || 0;
  
  // Last 30 days commits per day
  const commitLog = run(
    `git log --since="30 days ago" --format='%ai' | cut -d' ' -f1 | sort | uniq -c | sort -k2`,
    repoPath
  );
  const commitsPerDay = commitLog.split('\n').filter(Boolean).map(line => {
    const [count, date] = line.trim().split(/\s+/);
    return { date, count: parseInt(count) };
  });

  // Last commit
  const lastCommit = run('git log -1 --format="%h — %s (%ar)"', repoPath);

  // Lines of code (fast estimate)
  const locOutput = run(
    `git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.css' '*.md' '*.json' '*.prisma' | head -500 | xargs wc -l 2>/dev/null | tail -1`,
    repoPath
  );
  const totalLines = parseInt(locOutput?.match(/(\d+)\s+total/)?.[1]) || 0;

  // Breakdown by extension
  const extBreakdown = {};
  const extOutput = run(
    `git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.css' '*.md' | head -500 | xargs wc -l 2>/dev/null`,
    repoPath
  );
  for (const line of extOutput.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    if (match && !match[2].includes('total')) {
      const ext = match[2].split('.').pop();
      extBreakdown[ext] = (extBreakdown[ext] || 0) + parseInt(match[1]);
    }
  }

  // Git tags (versions)
  const tags = run('git tag --sort=-creatordate | head -10', repoPath)
    .split('\n').filter(Boolean);

  // Recent commits (last 10)
  const recentCommits = run(
    'git log -10 --format="%h|%s|%ar|%an"',
    repoPath
  ).split('\n').filter(Boolean).map(line => {
    const [hash, message, ago, author] = line.split('|');
    return { hash, message, ago, author };
  });

  // Files count
  const totalFiles = parseInt(run('git ls-files | wc -l', repoPath)) || 0;

  // Branch
  const branch = run('git branch --show-current', repoPath);

  return {
    totalCommits, commitsPerDay, lastCommit, totalLines,
    extBreakdown, tags, recentCommits, totalFiles, branch
  };
}

// ─── Docs Parser ─────────────────────────────────────────────
function parseTaskBoard(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/TASK_BOARD.md'));
  if (!content) return null;

  const streams = [];
  const streamRegex = /## Stream (\w) — (.+)/g;
  let match;
  
  while ((match = streamRegex.exec(content))) {
    const streamId = match[1];
    const streamName = match[2];
    
    // Count statuses in this stream section
    const streamStart = match.index;
    // Stop at ANY next ## heading (not just ## Stream) to avoid capturing Dependency Map, Progress Summary, etc.
    const afterHeader = content.indexOf('\n', streamStart) + 1;
    const nextHeading = content.slice(afterHeader).search(/^## /m);
    const section = nextHeading > 0 
      ? content.slice(streamStart, afterHeader + nextHeading) 
      : content.slice(streamStart);
    
    // Count only in table rows (lines starting with |)
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

  // Parse Progress Summary table
  const progressMatch = content.match(/## Progress Summary[\s\S]*?\| \*\*Σ\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*/);
  const totalTasks = progressMatch ? parseInt(progressMatch[1]) : 0;
  const totalDone = progressMatch ? parseInt(progressMatch[2]) : 0;

  // Phase name
  const phaseMatch = content.match(/# (.+)/);
  const phaseName = phaseMatch ? phaseMatch[1] : 'Unknown Phase';

  return { phaseName, streams, totalTasks, totalDone };
}

function parseChangelog(repoPath) {
  const content = readFileSafe(join(repoPath, 'CHANGELOG.md'));
  if (!content) return [];

  const versions = [];
  const versionRegex = /## \[(.+?)\] — (\d{4}-\d{2}-\d{2})(?: — (.+))?/g;
  let match;

  while ((match = versionRegex.exec(content))) {
    versions.push({
      version: match[1],
      date: match[2],
      description: match[3] || ''
    });
  }
  return versions;
}

function parseAIContext(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/AI_CONTEXT.md'));
  if (!content) return null;

  const projectMatch = content.match(/\*\*(.+?)\*\* — (.+)/);
  const versionMatch = content.match(/Latest version\*\*: (.+)/);
  const phaseMatch = content.match(/Current phase\*\*: (.+)/);

  return {
    name: projectMatch?.[1] || basename(repoPath),
    description: projectMatch?.[2] || '',
    version: versionMatch?.[1] || 'unknown',
    currentPhase: phaseMatch?.[1] || 'unknown'
  };
}

function parseKnownIssues(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/KNOWN_ISSUES.md'));
  if (!content) return { active: 0, resolved: 0, techDebt: 0 };

  const active = (content.match(/\| I-\d/g) || []).length;
  const resolved = (content.match(/\| R-\d/g) || []).length;
  const techDebt = (content.match(/\| T-\d/g) || []).length;
  return { active, resolved, techDebt };
}

function parseDecisions(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/DECISIONS_LOG.md'));
  if (!content) return [];

  const decisions = [];
  const adrRegex = /## ADR-(\d+): (.+)/g;
  let match;
  while ((match = adrRegex.exec(content))) {
    decisions.push({ id: parseInt(match[1]), title: match[2] });
  }
  return decisions;
}

function parseWorkflows(repoPath) {
  const dir = join(repoPath, '.agent/workflows');
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = readFileSafe(join(dir, f));
      const descMatch = content.match(/description:\s*(.+)/);
      return { name: f.replace('.md', ''), description: descMatch?.[1] || '' };
    });
}

function parseSkills(repoPath) {
  const dir = join(repoPath, '.agent/skills');
  if (!existsSync(dir)) return [];

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
        stackVersion: stackMatch?.[1] || ''
      };
    });
}

// ─── Collect All ─────────────────────────────────────────────
const projects = repos.map(repoPath => {
  console.log(`📊 Scanning: ${repoPath}`);
  
  const context = parseAIContext(repoPath);
  const git = collectGitStats(repoPath);
  const taskBoard = parseTaskBoard(repoPath);
  const changelog = parseChangelog(repoPath);
  const issues = parseKnownIssues(repoPath);
  const decisions = parseDecisions(repoPath);
  const workflows = parseWorkflows(repoPath);
  const skills = parseSkills(repoPath);

  return {
    path: repoPath,
    name: context?.name || basename(repoPath),
    description: context?.description || '',
    version: context?.version || git.tags[0] || 'N/A',
    currentPhase: context?.currentPhase || 'N/A',
    git,
    taskBoard,
    changelog,
    issues,
    decisions,
    workflows,
    skills,
    collectedAt: new Date().toISOString()
  };
});

const output = { projects, generatedAt: new Date().toISOString() };
const outPath = join(import.meta.dirname || '/tmp/dev-dashboard', 'dashboard-data.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\n✅ Data written to ${outPath}`);
console.log(`   ${projects.length} project(s) scanned`);
