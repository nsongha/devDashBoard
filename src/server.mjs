/**
 * Dev Dashboard — Server
 * Express app with API routes, serves dashboard UI
 * All data collection logic imported from shared modules in src/
 */

import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

// ─── Shared Modules ──────────────────────────────────────────
import { collectGitStats } from './collectors/git-stats.mjs';
import { parseTaskBoard } from './parsers/task-board.mjs';
import { parseChangelog } from './parsers/changelog.mjs';
import { parseAIContext } from './parsers/ai-context.mjs';
import { parseKnownIssues } from './parsers/known-issues.mjs';
import { parseDecisions } from './parsers/decisions.mjs';
import { parseWorkflows } from './parsers/workflows.mjs';
import { parseSkills } from './parsers/skills.mjs';

// ─── Setup ───────────────────────────────────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const CONFIG_PATH = join(ROOT_DIR, 'config.json');

const app = express();
app.use(express.json());

// ─── Config ──────────────────────────────────────────────────
function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return { projects: [] };
  }
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// ─── Project Data Orchestrator ───────────────────────────────
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

// ─── Static Files ────────────────────────────────────────────
app.use(express.static(join(ROOT_DIR, 'public')));

// ─── Export app for testing ──────────────────────────────────
export { app };

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 4321;

// Chỉ listen khi chạy trực tiếp, không listen khi import từ test
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun) {
  app.listen(PORT, () => {
    const config = loadConfig();
    console.log(`\n  🏗️  Dev Dashboard running at http://localhost:${PORT}`);
    console.log(`  📁 ${config.projects.length} project(s) configured\n`);
  });
}
