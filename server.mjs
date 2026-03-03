/**
 * Dev Dashboard — Server
 * Live data collection from git + docs, serves dashboard UI
 */

import express from 'express';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const app = express();
app.use(express.json());

const CONFIG_PATH = join(__dirname, 'config.json');

function loadConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')); }
  catch { return { projects: [] }; }
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function run(cmd, cwd) {
  try { return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 15000 }).trim(); }
  catch { return ''; }
}

function readFileSafe(path) {
  try { return readFileSync(path, 'utf-8'); } catch { return ''; }
}

// ─── Git Stats ───────────────────────────────────────────────
function collectGitStats(repoPath) {
  const totalCommits = parseInt(run('git rev-list --count HEAD', repoPath)) || 0;
  
  // First commit date (project birth)
  const firstCommitDate = run('git log --reverse --format="%ai" | head -1', repoPath).split(' ')[0] || '';
  const lastCommitDate = run('git log -1 --format="%ai"', repoPath).split(' ')[0] || '';
  
  // Project age in days
  const projectAgeDays = firstCommitDate 
    ? Math.ceil((Date.now() - new Date(firstCommitDate).getTime()) / 86400000) 
    : 0;
  
  // Avg commits per day
  const avgCommitsPerDay = projectAgeDays > 0 ? (totalCommits / projectAgeDays).toFixed(1) : 0;

  // Commits per week (last 12 weeks)
  const weeklyLog = run(
    `git log --since="84 days ago" --format='%ai' | cut -d' ' -f1`,
    repoPath
  );
  const weeklyData = {};
  for (const dateStr of weeklyLog.split('\n').filter(Boolean)) {
    const d = new Date(dateStr);
    const week = getWeekStart(d);
    weeklyData[week] = (weeklyData[week] || 0) + 1;
  }
  const commitsPerWeek = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // Commits per day (last 30 days) 
  const dailyLog = run(
    `git log --since="30 days ago" --format='%ai' | cut -d' ' -f1 | sort | uniq -c | sort -k2`,
    repoPath
  );
  const commitsPerDay = dailyLog.split('\n').filter(Boolean).map(line => {
    const [count, date] = line.trim().split(/\s+/);
    return { date, count: parseInt(count) };
  });

  // Busiest day of week
  const dayOfWeekLog = run(
    `git log --format='%ai' | cut -d' ' -f1`,
    repoPath
  );
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeekCounts = [0,0,0,0,0,0,0];
  for (const dateStr of dayOfWeekLog.split('\n').filter(Boolean)) {
    const d = new Date(dateStr);
    dayOfWeekCounts[d.getDay()]++;
  }
  const commitsByDayOfWeek = dayNames.map((name, i) => ({ day: name, count: dayOfWeekCounts[i] }));

  // Hourly distribution
  const hourLog = run(
    `git log --format='%ai' | cut -d' ' -f2 | cut -d: -f1 | sort | uniq -c | sort -k2`,
    repoPath
  );
  const commitsByHour = Array(24).fill(0);
  for (const line of hourLog.split('\n').filter(Boolean)) {
    const [count, hour] = line.trim().split(/\s+/);
    commitsByHour[parseInt(hour)] = parseInt(count);
  }

  // Code velocity: lines added/removed last 12 weeks
  const velocityRaw = run(
    `git log --since="84 days ago" --format='%H %ai' --numstat`,
    repoPath
  );
  const weeklyVelocity = {};
  let currentWeek = '';
  for (const line of velocityRaw.split('\n')) {
    const commitMatch = line.match(/^[a-f0-9]{40}\s+(\d{4}-\d{2}-\d{2})/);
    if (commitMatch) {
      currentWeek = getWeekStart(new Date(commitMatch[1]));
      if (!weeklyVelocity[currentWeek]) weeklyVelocity[currentWeek] = { added: 0, removed: 0 };
    }
    const statMatch = line.match(/^(\d+)\s+(\d+)\s+/);
    if (statMatch && currentWeek) {
      weeklyVelocity[currentWeek].added += parseInt(statMatch[1]);
      weeklyVelocity[currentWeek].removed += parseInt(statMatch[2]);
    }
  }
  const codeVelocity = Object.entries(weeklyVelocity)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({ week, ...data }));

  // Last commit
  const lastCommit = run('git log -1 --format="%h — %s (%ar)"', repoPath);

  // Lines of code
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

  // Git tags
  const tags = run('git tag --sort=-creatordate | head -10', repoPath)
    .split('\n').filter(Boolean);

  // Recent commits (last 15)
  const recentCommits = run(
    'git log -15 --format="%h|%s|%ar|%an|%ai"',
    repoPath
  ).split('\n').filter(Boolean).map(line => {
    const [hash, message, ago, author, date] = line.split('|');
    return { hash, message, ago, author, date };
  });

  // Hotspot files (most changed)
  const hotspotRaw = run(
    `git log --since="30 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head -10`,
    repoPath
  );
  const hotspotFiles = hotspotRaw.split('\n').filter(Boolean).map(line => {
    const match = line.trim().match(/^(\d+)\s+(.+)$/);
    return match ? { count: parseInt(match[1]), file: match[2] } : null;
  }).filter(Boolean);

  const totalFiles = parseInt(run('git ls-files | wc -l', repoPath)) || 0;
  const branch = run('git branch --show-current', repoPath);

  return {
    totalCommits, commitsPerDay, commitsPerWeek, commitsByDayOfWeek, commitsByHour,
    codeVelocity, lastCommit, totalLines, extBreakdown, tags, recentCommits,
    totalFiles, branch, firstCommitDate, lastCommitDate, projectAgeDays, avgCommitsPerDay,
    hotspotFiles
  };
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

// ─── Docs Parsers ────────────────────────────────────────────
function parseTaskBoard(repoPath) {
  const content = readFileSafe(join(repoPath, 'docs/TASK_BOARD.md'));
  if (!content) return null;

  const streams = [];
  const streamRegex = /## Stream (\w) — (.+)/g;
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

function parseChangelog(repoPath) {
  const content = readFileSafe(join(repoPath, 'CHANGELOG.md'));
  if (!content) return [];
  const versions = [];
  const versionRegex = /## \[(.+?)\] — (\d{4}-\d{2}-\d{2})(?: — (.+))?/g;
  let match;
  while ((match = versionRegex.exec(content))) {
    versions.push({ version: match[1], date: match[2], description: match[3] || '' });
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
  return {
    active: (content.match(/\| I-\d/g) || []).length,
    resolved: (content.match(/\| R-\d/g) || []).length,
    techDebt: (content.match(/\| T-\d/g) || []).length
  };
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
  return readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const content = readFileSafe(join(dir, f));
    const descMatch = content.match(/description:\s*(.+)/);
    return { name: f.replace('.md', ''), description: descMatch?.[1] || '' };
  });
}

function parseSkills(repoPath) {
  const dir = join(repoPath, '.agent/skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => existsSync(join(dir, f, 'SKILL.md'))).map(f => {
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

function collectProject(repoPath) {
  const context = parseAIContext(repoPath);
  return {
    path: repoPath,
    name: context?.name || basename(repoPath),
    description: context?.description || '',
    version: context?.version || 'N/A',
    currentPhase: context?.currentPhase || 'N/A',
    git: collectGitStats(repoPath),
    taskBoard: parseTaskBoard(repoPath),
    changelog: parseChangelog(repoPath),
    issues: parseKnownIssues(repoPath),
    decisions: parseDecisions(repoPath),
    workflows: parseWorkflows(repoPath),
    skills: parseSkills(repoPath),
    collectedAt: new Date().toISOString()
  };
}

// ─── API Routes ──────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  const config = loadConfig();
  res.json({ projects: config.projects });
});

app.post('/api/projects', (req, res) => {
  const { path: repoPath } = req.body;
  if (!repoPath || !existsSync(repoPath)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const config = loadConfig();
  if (!config.projects.includes(repoPath)) {
    config.projects.push(repoPath);
    saveConfig(config);
  }
  res.json({ projects: config.projects });
});

app.delete('/api/projects', (req, res) => {
  const { path: repoPath } = req.body;
  const config = loadConfig();
  config.projects = config.projects.filter(p => p !== repoPath);
  saveConfig(config);
  res.json({ projects: config.projects });
});

app.get('/api/data/:index', (req, res) => {
  const config = loadConfig();
  const idx = parseInt(req.params.index);
  if (idx < 0 || idx >= config.projects.length) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const data = collectProject(config.projects[idx]);
  res.json(data);
});

// Serve static files
app.use(express.static(__dirname));

const PORT = process.env.PORT || 4321;
app.listen(PORT, () => {
  const config = loadConfig();
  console.log(`\n  🏗️  Dev Dashboard running at http://localhost:${PORT}`);
  console.log(`  📁 ${config.projects.length} project(s) configured\n`);
});
