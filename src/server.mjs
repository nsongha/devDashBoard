/**
 * Dev Dashboard — Server
 * Express app with API routes, serves dashboard UI
 * All data collection logic imported from shared modules in src/
 */

import express from 'express';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, basename, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

// ─── Shared Modules ──────────────────────────────────────────
import { collectGitStats, collectGitStatsIncremental } from './collectors/git-stats.mjs';
import { analyzeCommits } from './collectors/commit-analyzer.mjs';
import { collectAuthorStats } from './collectors/author-stats.mjs';
import { collectVelocityTrends } from './collectors/velocity-trends.mjs';
import { detectFileCoupling } from './collectors/file-coupling.mjs';
import { dataCache } from './utils/cache.mjs';
import { startBackgroundRefresh } from './utils/worker.mjs';
import { parseTaskBoard } from './parsers/task-board.mjs';
import { parseChangelog } from './parsers/changelog.mjs';
import { parseAIContext } from './parsers/ai-context.mjs';
import { parseKnownIssues } from './parsers/known-issues.mjs';
import { parseDecisions } from './parsers/decisions.mjs';
import { parseWorkflows } from './parsers/workflows.mjs';
import { parseSkills } from './parsers/skills.mjs';

// ─── AI Parser Variants ──────────────────────────────────────
import { parseTaskBoardAI } from './parsers/task-board.mjs';
import { parseChangelogAI } from './parsers/changelog.mjs';
import { parseAIContextAI } from './parsers/ai-context.mjs';
import { parseKnownIssuesAI } from './parsers/known-issues.mjs';
import { parseDecisionsAI } from './parsers/decisions.mjs';
import { parseWorkflowsAI } from './parsers/workflows.mjs';
import { parseSkillsAI } from './parsers/skills.mjs';

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
async function collectProject(repoPath) {
  const config = loadConfig();
  const useAI = !!config.geminiApiKey;

  // Use incremental git collection when previous data is available
  const cacheKey = `project:${repoPath}`;
  const previousData = dataCache.get(cacheKey);
  const git = previousData?.git
    ? collectGitStatsIncremental(repoPath, previousData.git)
    : collectGitStats(repoPath);

  let context, taskBoard, changelog, issues, decisions, workflows, skills;

  if (useAI) {
    // AI mode: parse song song với fallback regex
    [context, taskBoard, changelog, issues, decisions, workflows, skills] = await Promise.all([
      parseAIContextAI(repoPath, config),
      parseTaskBoardAI(repoPath, config),
      parseChangelogAI(repoPath, config),
      parseKnownIssuesAI(repoPath, config),
      parseDecisionsAI(repoPath, config),
      parseWorkflowsAI(repoPath, config),
      parseSkillsAI(repoPath, config),
    ]);
  } else {
    // Regex mode: giữ nguyên sync parsing
    context = parseAIContext(repoPath);
    taskBoard = parseTaskBoard(repoPath);
    changelog = parseChangelog(repoPath);
    issues = parseKnownIssues(repoPath);
    decisions = parseDecisions(repoPath);
    workflows = parseWorkflows(repoPath);
    skills = parseSkills(repoPath);
  }

  // Normalize array results (AI wrapper may wrap arrays in { items, _source })
  const normalizeArray = (val) => Array.isArray(val) ? val : (val?.items || []);

  return {
    path: repoPath,
    name: context?.name || basename(repoPath),
    description: context?.description || '',
    version: context?.version || 'N/A',
    currentPhase: context?.currentPhase || 'N/A',
    git,
    commitAnalysis: analyzeCommits(repoPath),
    authorStats: collectAuthorStats(repoPath),
    velocityTrends: collectVelocityTrends(repoPath),
    fileCoupling: detectFileCoupling(repoPath),
    taskBoard,
    changelog: normalizeArray(changelog),
    issues,
    decisions: normalizeArray(decisions),
    workflows: normalizeArray(workflows),
    skills: normalizeArray(skills),
    aiMode: useAI,
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

app.get('/api/data/:index', async (req, res) => {
  const config = loadConfig();
  const idx = parseInt(req.params.index);
  if (idx < 0 || idx >= config.projects.length) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const repoPath = config.projects[idx];
  const cacheKey = `project:${repoPath}`;
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return res.set('X-Cache', 'HIT').json(cached);
  }
  try {
    const data = await collectProject(repoPath);
    dataCache.set(cacheKey, data);
    res.set('X-Cache', 'MISS').json(data);
  } catch (err) {
    console.error('[Server] collectProject error:', err);
    res.status(500).json({ error: 'Failed to collect project data' });
  }
});

// ─── Config API (AI Settings + IDE) ──────────────────────────
const VALID_IDE_SCHEMES = ['vscode', 'cursor', 'webstorm', 'zed', 'antigravity'];

app.get('/api/config', (req, res) => {
  const config = loadConfig();
  const masked = config.geminiApiKey
    ? config.geminiApiKey.slice(0, 4) + '***' + config.geminiApiKey.slice(-4)
    : '';
  res.json({
    geminiApiKey: masked,
    hasApiKey: !!config.geminiApiKey,
    ideScheme: config.ideScheme || 'vscode',
  });
});

app.post('/api/config', (req, res) => {
  const { geminiApiKey, ideScheme } = req.body;
  const config = loadConfig();
  if (geminiApiKey !== undefined) {
    config.geminiApiKey = geminiApiKey || '';
  }
  if (ideScheme !== undefined) {
    if (!VALID_IDE_SCHEMES.includes(ideScheme)) {
      return res.status(400).json({ error: `Invalid IDE scheme. Must be one of: ${VALID_IDE_SCHEMES.join(', ')}` });
    }
    config.ideScheme = ideScheme;
  }
  saveConfig(config);
  res.json({ success: true, hasApiKey: !!config.geminiApiKey, ideScheme: config.ideScheme || 'vscode' });
});

app.delete('/api/cache', (req, res) => {
  dataCache.clear();
  res.json({ ok: true, message: 'Cache cleared' });
});

// ─── File Read/Write API (In-Browser Editing) ────────────────

/**
 * Validate and resolve a file path for editing.
 * Returns { absPath, repoPath } or throws with status/message.
 */
function resolveEditablePath(projectIndex, relativePath, config) {
  if (projectIndex === undefined || projectIndex === null || !relativePath) {
    return { error: 'Missing projectIndex or relativePath', status: 400 };
  }

  const idx = parseInt(projectIndex);
  if (idx < 0 || idx >= config.projects.length) {
    return { error: 'Invalid project index', status: 404 };
  }

  const repoPath = config.projects[idx];

  // Security: only allow .md files
  if (extname(relativePath).toLowerCase() !== '.md') {
    return { error: 'Only .md files can be edited', status: 400 };
  }

  // Security: prevent path traversal
  const absPath = resolve(repoPath, relativePath);
  if (!absPath.startsWith(resolve(repoPath))) {
    return { error: 'Invalid file path', status: 400 };
  }

  return { absPath, repoPath, idx };
}

app.get('/api/file', (req, res) => {
  const config = loadConfig();
  const { projectIndex, path: relativePath } = req.query;
  const result = resolveEditablePath(projectIndex, relativePath, config);

  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  const { absPath } = result;

  if (!existsSync(absPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const content = readFileSync(absPath, 'utf-8');
    const stat = statSync(absPath);
    res.json({
      content,
      lastModified: stat.mtimeMs,
      filename: basename(absPath),
    });
  } catch (err) {
    console.error('[Server] Read file error:', err.message);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

app.put('/api/file', (req, res) => {
  const config = loadConfig();
  const { projectIndex, relativePath, content, expectedLastModified } = req.body;
  const result = resolveEditablePath(projectIndex, relativePath, config);

  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  const { absPath, repoPath } = result;

  if (!existsSync(absPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Conflict detection: check if file changed since client loaded it
  if (expectedLastModified) {
    const currentStat = statSync(absPath);
    if (Math.abs(currentStat.mtimeMs - expectedLastModified) > 100) {
      const serverContent = readFileSync(absPath, 'utf-8');
      return res.status(409).json({
        conflict: true,
        serverContent,
        serverLastModified: currentStat.mtimeMs,
        message: 'File was modified externally since you opened it',
      });
    }
  }

  try {
    writeFileSync(absPath, content, 'utf-8');
    const newStat = statSync(absPath);

    // Invalidate cache for this project
    dataCache.invalidate(`project:${repoPath}`);

    res.json({
      success: true,
      lastModified: newStat.mtimeMs,
      filename: basename(absPath),
    });
  } catch (err) {
    console.error('[Server] Write file error:', err.message);
    res.status(500).json({ error: 'Failed to write file' });
  }
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
    console.log(`  📁 ${config.projects.length} project(s) configured`);
    console.log(`  ⚡ Cache + background refresh enabled\n`);

    // Start background data refresh
    startBackgroundRefresh(
      () => loadConfig().projects,
      collectProject,
      dataCache
    );
  });
}
