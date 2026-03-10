/**
 * Dev Dashboard — Server
 * Express app with API routes, serves dashboard UI
 * All data collection logic imported from shared modules in src/
 */

import http from 'http';
import express from 'express';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { join, basename, resolve, extname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { config as loadEnv } from 'dotenv';

// ─── Real-Time Modules ───────────────────────────────────────
import { createWebSocketServer, broadcast } from './utils/websocket.mjs';
import { startGitWatcher } from './utils/git-watcher.mjs';
import { verifyWebhookSignature, parseWebhookEvent } from './webhooks/github-webhook.mjs';

// ─── Shared Modules ──────────────────────────────────────────
import { collectGitStatsIncrementalAsync, collectGitStatsAsync } from './collectors/git-stats.mjs';
import { analyzeCommitsAsync } from './collectors/commit-analyzer.mjs';
import { collectAuthorStatsAsync } from './collectors/author-stats.mjs';
import { collectVelocityTrendsAsync } from './collectors/velocity-trends.mjs';
import { detectFileCouplingAsync } from './collectors/file-coupling.mjs';
import { dataCache } from './utils/cache.mjs';
import { getGithubCache, setGithubCache, invalidateGithubCache, clearAllGithubCache } from './utils/github-cache.mjs';
import { startBackgroundRefresh } from './utils/worker.mjs';
import { parseTaskBoard } from './parsers/task-board.mjs';
import { parseChangelog } from './parsers/changelog.mjs';
import { parseAIContext } from './parsers/ai-context.mjs';
import { parseKnownIssuesDetailed } from './parsers/known-issues.mjs';
import { parseDecisions } from './parsers/decisions.mjs';
import { parseWorkflows } from './parsers/workflows.mjs';
import { parseSkills } from './parsers/skills.mjs';
import { parseQCReport } from './parsers/qc-report.mjs';
import { parseRoadmap } from './parsers/roadmap.mjs';

// ─── GitHub Integrations ─────────────────────────────────────
import { createGitHubClient } from './integrations/github-client.mjs';
import { collectPRStats } from './integrations/github-pr.mjs';
import { collectIssueStats } from './integrations/github-issues.mjs';

// ─── Export / Report Generator ───────────────────────────
import { generateReportHtml, buildReportId } from './export/report.mjs';
import { collectCIStatus } from './integrations/github-ci.mjs';
import { listBranches, compareBranches } from './integrations/github-branches.mjs';

// ─── AI Parser Variants ──────────────────────────────────────
import { parseTaskBoardAI } from './parsers/task-board.mjs';
import { parseChangelogAI } from './parsers/changelog.mjs';
import { parseAIContextAI } from './parsers/ai-context.mjs';
import { parseKnownIssuesDetailedAI } from './parsers/known-issues.mjs';
import { parseDecisionsAI } from './parsers/decisions.mjs';
import { parseWorkflowsAI } from './parsers/workflows.mjs';
import { parseSkillsAI } from './parsers/skills.mjs';
import { parseQCReportAI } from './parsers/qc-report.mjs';

// ─── Setup ───────────────────────────────────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const CONFIG_PATH = join(ROOT_DIR, 'config.json');
const ENV_PATH = join(ROOT_DIR, '.env');
const isDev = process.env.NODE_ENV !== 'production';

// Load .env file vào process.env
loadEnv({ path: ENV_PATH });

const app = express();
app.use(express.json());

// ─── Config ──────────────────────────────────────────────────
// config.json chỉ lưu non-sensitive data (projects, ideScheme)
// Secrets (API keys, tokens) đọc từ process.env (được load từ .env)
// File config được cache in-memory — chỉ đọc file lần đầu hoặc khi invalidate
// Env vars luôn đọc fresh (để test & runtime thay đổi env vẫn hoạt động)
let _fileConfigCache = null;

function loadConfig() {
  if (!_fileConfigCache) {
    try {
      _fileConfigCache = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
      _fileConfigCache = { projects: [] };
    }
  }
  // Merge secrets từ env vào config object — env vars luôn fresh
  return {
    ..._fileConfigCache,
    geminiApiKey: process.env.GEMINI_API_KEY || _fileConfigCache.geminiApiKey || '',
    githubToken: process.env.GITHUB_TOKEN || _fileConfigCache.githubToken || '',
    githubOwner: process.env.GITHUB_OWNER || _fileConfigCache.githubOwner || '',
    githubRepo: process.env.GITHUB_REPO || _fileConfigCache.githubRepo || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || _fileConfigCache.webhookSecret || '',
  };
}

// Chỉ lưu non-sensitive fields vào config.json, KHÔNG lưu secrets
const NON_SENSITIVE_KEYS = ['projects', 'ideScheme', 'viewMode'];
function saveConfig(config) {
  let existing = {};
  try {
    existing = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch { /* ignore */ }
  const toSave = NON_SENSITIVE_KEYS.reduce((acc, key) => {
    if (config[key] !== undefined) acc[key] = config[key];
    return acc;
  }, existing);
  writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2));
  // Invalidate cache để lần đọc tiếp theo reload từ file
  _fileConfigCache = null;
}

// Lưu secrets vào .env file
function saveEnvSecrets(updates) {
  let envContent = '';
  try {
    envContent = readFileSync(ENV_PATH, 'utf-8');
  } catch { /* file chưa tồn tại */ }

  const lines = envContent.split('\n');
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex(l => l.startsWith(`${key}=`));
    const newLine = `${key}=${value}`;
    if (idx >= 0) {
      lines[idx] = newLine;
    } else {
      lines.push(newLine);
    }
    // Cập nhật process.env ngay lập tức để loadConfig() trả về giá trị mới
    process.env[key] = value;
  }
  writeFileSync(ENV_PATH, lines.join('\n'), 'utf-8');
  // Invalidate cache để lần đọc tiếp theo reload từ file + env mới
  _fileConfigCache = null;
}

// ─── Project Data Orchestrator ───────────────────────────────
async function collectProject(repoPath) {
  const config = loadConfig();
  const useAI = !!config.geminiApiKey;

  // ─── Phase 1: Parallel git collection ───────────────────────
  // Tất cả git collectors chạy song song (async subprocess)
  const cacheKey = `project:${repoPath}`;
  const previousData = dataCache.get(cacheKey);

  const [git, commitAnalysis, authorStats, velocityTrends, fileCoupling] = await Promise.all([
    previousData?.git
      ? collectGitStatsIncrementalAsync(repoPath, previousData.git)
      : collectGitStatsAsync(repoPath),
    analyzeCommitsAsync(repoPath),
    collectAuthorStatsAsync(repoPath),
    collectVelocityTrendsAsync(repoPath),
    detectFileCouplingAsync(repoPath),
  ]);

  // ─── Phase 2: Markdown parsers (sync — very fast, local file I/O) ──
  let context, taskBoard, changelog, issues, decisions, workflows, skills, qcReport;
  const roadmap = parseRoadmap(repoPath);

  if (useAI) {
    [context, taskBoard, changelog, issues, decisions, workflows, skills, qcReport] = await Promise.all([
      parseAIContextAI(repoPath, config),
      parseTaskBoardAI(repoPath, config),
      parseChangelogAI(repoPath, config),
      parseKnownIssuesDetailedAI(repoPath, config),
      parseDecisionsAI(repoPath, config),
      parseWorkflowsAI(repoPath, config),
      parseSkillsAI(repoPath, config),
      parseQCReportAI(repoPath, config),
    ]);
  } else {
    context = parseAIContext(repoPath);
    taskBoard = parseTaskBoard(repoPath);
    changelog = parseChangelog(repoPath);
    issues = parseKnownIssuesDetailed(repoPath);
    decisions = parseDecisions(repoPath);
    workflows = parseWorkflows(repoPath);
    skills = parseSkills(repoPath);
    qcReport = parseQCReport(repoPath);
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
    commitAnalysis,
    authorStats,
    velocityTrends,
    fileCoupling,
    taskBoard,
    roadmap,
    changelog: normalizeArray(changelog),
    issues,
    decisions: normalizeArray(decisions),
    workflows: normalizeArray(workflows),
    skills: normalizeArray(skills),
    qcReport,
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

// ─── Browse Folder (macOS native picker via osascript) ───────
app.get('/api/browse', (req, res) => {
  const script = 'tell application "Finder" to activate\n' +
    'set chosenFolder to choose folder with prompt "Chọn thư mục project:"\n' +
    'return POSIX path of chosenFolder';

  execFile('osascript', ['-e', script], { timeout: 60000 }, (err, stdout) => {
    if (err) {
      // User nhấn Cancel hoặc timeout
      return res.json({ cancelled: true });
    }
    const folderPath = stdout.trim().replace(/\/$/, ''); // Bỏ trailing slash
    res.json({ path: folderPath });
  });
});

app.get('/api/data/:index', async (req, res) => {
  const config = loadConfig();
  const idx = parseInt(req.params.index);
  if (idx < 0 || idx >= config.projects.length) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const repoPath = config.projects[idx];
  const cacheKey = `project:${repoPath}`;
  // Dev mode: skip cache để luôn lấy data mới nhất
  const cached = isDev ? null : dataCache.get(cacheKey);
  if (cached) {
    return res.set('X-Cache', 'HIT').json(cached);
  }
  try {
    const data = await collectProject(repoPath);
    if (!isDev) dataCache.set(cacheKey, data);
    res.set('X-Cache', isDev ? 'DEV' : 'MISS').json(data);
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
    hasGithubToken: !!config.githubToken,
    githubOwner: config.githubOwner || '',
    githubRepo: config.githubRepo || '',
    viewMode: config.viewMode || 'developer',
  });
});

app.post('/api/config', (req, res) => {
  const { geminiApiKey, ideScheme, githubToken, githubOwner, githubRepo, viewMode } = req.body;
  const config = loadConfig();

  // Non-sensitive: lưu vào config.json
  if (ideScheme !== undefined) {
    if (!VALID_IDE_SCHEMES.includes(ideScheme)) {
      return res.status(400).json({ error: `Invalid IDE scheme. Must be one of: ${VALID_IDE_SCHEMES.join(', ')}` });
    }
    config.ideScheme = ideScheme;
  }
  if (viewMode !== undefined) {
    if (!['developer', 'team-lead'].includes(viewMode)) {
      return res.status(400).json({ error: 'Invalid viewMode. Must be "developer" or "team-lead"' });
    }
    config.viewMode = viewMode;
  }
  saveConfig(config);

  // Secrets: lưu vào .env
  const envUpdates = {};
  if (geminiApiKey !== undefined) envUpdates['GEMINI_API_KEY'] = geminiApiKey || '';
  const hasGithubChanges = githubToken !== undefined || githubOwner !== undefined || githubRepo !== undefined;
  if (githubToken !== undefined) envUpdates['GITHUB_TOKEN'] = githubToken || '';
  if (githubOwner !== undefined) envUpdates['GITHUB_OWNER'] = githubOwner || '';
  if (githubRepo !== undefined) envUpdates['GITHUB_REPO'] = githubRepo || '';
  if (Object.keys(envUpdates).length > 0) saveEnvSecrets(envUpdates);

  // Invalidate toàn bộ GitHub cache khi settings thay đổi
  // để tránh trả data cũ từ repo/token cũ
  if (hasGithubChanges) {
    clearAllGithubCache();
  }

  const updatedConfig = loadConfig();
  res.json({
    success: true,
    hasApiKey: !!updatedConfig.geminiApiKey,
    ideScheme: updatedConfig.ideScheme || 'vscode',
    hasGithubToken: !!updatedConfig.githubToken,
    githubOwner: updatedConfig.githubOwner || '',
    githubRepo: updatedConfig.githubRepo || '',
    viewMode: updatedConfig.viewMode || 'developer',
  });
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

  // Security: kiểm tra file type trước (trả 400 ngay, không cần project hợp lệ)
  if (extname(relativePath).toLowerCase() !== '.md') {
    return { error: 'Only .md files can be edited', status: 400 };
  }

  // Security: early path traversal detection (không cần project context)
  if (relativePath.includes('..') || relativePath.startsWith('/')) {
    return { error: 'Invalid file path', status: 400 };
  }

  const idx = parseInt(projectIndex);
  if (idx < 0 || idx >= config.projects.length) {
    return { error: 'Invalid project index', status: 404 };
  }

  const repoPath = config.projects[idx];

  // Security: double-check path traversal với absolute path resolution
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

// ─── GitHub API Routes ───────────────────────────────────────

app.get('/api/github/prs', async (req, res) => {
  const config = loadConfig();
  const owner = req.query.owner || config.githubOwner;
  const repo = req.query.repo || config.githubRepo;

  if (!config.githubToken) {
    return res.json({ available: false, reason: 'No GitHub token configured' });
  }
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo. Set in Settings or pass ?owner=&repo=' });
  }

  const cacheKey = `prs:${owner}/${repo}`;
  const cached = getGithubCache(cacheKey);
  if (cached) return res.set('X-Cache', 'HIT').json(cached);

  try {
    const client = createGitHubClient(config);
    // Validate token + repo trước khi fetch data
    const repoCheck = await client.getRepo(owner, repo);
    if (!repoCheck) {
      return res.status(502).json({
        error: `Failed to fetch PR data from GitHub`,
        detail: `Không thể truy cập repo "${owner}/${repo}". Kiểm tra: (1) Token có quyền truy cập repo, (2) Tên owner/repo đúng, (3) Fine-grained token cần permission "Pull requests: Read"`,
      });
    }
    const data = await collectPRStats(client, owner, repo);
    if (!data) {
      return res.status(502).json({ error: 'Failed to fetch PR data from GitHub' });
    }
    setGithubCache(cacheKey, data);
    res.set('X-Cache', 'MISS').json(data);
  } catch (err) {
    console.error('[Server] /api/github/prs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/github/issues', async (req, res) => {
  const config = loadConfig();
  const owner = req.query.owner || config.githubOwner;
  const repo = req.query.repo || config.githubRepo;

  if (!config.githubToken) {
    return res.json({ available: false, reason: 'No GitHub token configured' });
  }
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo. Set in Settings or pass ?owner=&repo=' });
  }

  const cacheKey = `issues:${owner}/${repo}`;
  const cached = getGithubCache(cacheKey);
  if (cached) return res.set('X-Cache', 'HIT').json(cached);

  try {
    const client = createGitHubClient(config);
    const data = await collectIssueStats(client, owner, repo);
    if (!data) {
      return res.status(502).json({ error: 'Failed to fetch issue data from GitHub' });
    }
    setGithubCache(cacheKey, data);
    res.set('X-Cache', 'MISS').json(data);
  } catch (err) {
    console.error('[Server] /api/github/issues error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/github/ci', async (req, res) => {
  const config = loadConfig();
  const owner = req.query.owner || config.githubOwner;
  const repo = req.query.repo || config.githubRepo;

  if (!config.githubToken) {
    return res.json({ available: false, reason: 'No GitHub token configured' });
  }
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo' });
  }

  const cacheKey = `ci:${owner}/${repo}`;
  const cached = getGithubCache(cacheKey);
  if (cached) return res.set('X-Cache', 'HIT').json(cached);

  try {
    const client = createGitHubClient(config);
    const data = await collectCIStatus(client, owner, repo);
    if (!data) {
      return res.status(502).json({ error: 'Failed to fetch CI data from GitHub' });
    }
    setGithubCache(cacheKey, data);
    res.set('X-Cache', 'MISS').json(data);
  } catch (err) {
    console.error('[Server] /api/github/ci error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/github/branches', async (req, res) => {
  const config = loadConfig();
  const owner = req.query.owner || config.githubOwner;
  const repo = req.query.repo || config.githubRepo;

  if (!config.githubToken) {
    return res.json({ available: false, reason: 'No GitHub token configured' });
  }
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo' });
  }

  const cacheKey = `branches:${owner}/${repo}`;
  const cached = getGithubCache(cacheKey);
  if (cached) return res.set('X-Cache', 'HIT').json(cached);

  try {
    const client = createGitHubClient(config);
    const data = await listBranches(client, owner, repo);
    if (!data) {
      return res.status(502).json({ error: 'Failed to fetch branches from GitHub' });
    }
    setGithubCache(cacheKey, data);
    res.set('X-Cache', 'MISS').json({ branches: data });
  } catch (err) {
    console.error('[Server] /api/github/branches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/github/compare', async (req, res) => {
  const config = loadConfig();
  const owner = req.query.owner || config.githubOwner;
  const repo = req.query.repo || config.githubRepo;
  const base = req.query.base;
  const head = req.query.head;

  if (!config.githubToken) {
    return res.json({ available: false, reason: 'No GitHub token configured' });
  }
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo' });
  }
  if (!base || !head) {
    return res.status(400).json({ error: 'Missing base or head branch. Pass ?base=main&head=feature' });
  }

  const cacheKey = `compare:${owner}/${repo}/${base}...${head}`;
  const cached = getGithubCache(cacheKey);
  if (cached) return res.set('X-Cache', 'HIT').json(cached);

  try {
    const client = createGitHubClient(config);
    const data = await compareBranches(client, owner, repo, base, head);
    if (!data) {
      return res.status(502).json({ error: 'Failed to compare branches' });
    }
    setGithubCache(cacheKey, data);
    res.set('X-Cache', 'MISS').json(data);
  } catch (err) {
    console.error('[Server] /api/github/compare error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List repos của authenticated user (dùng cho Add Project → GitHub tab)
app.get('/api/github/repos', async (req, res) => {
  const config = loadConfig();

  if (!config.githubToken) {
    return res.json({ available: false, reason: 'No GitHub token configured' });
  }

  const cacheKey = 'github:repos';
  const cached = getGithubCache(cacheKey);
  if (cached) return res.set('X-Cache', 'HIT').json(cached);

  try {
    const client = createGitHubClient(config);
    // Lấy tối đa 100 repos (cả public + private), sort theo updated_at
    const data = await client.request('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member');
    if (!data) {
      return res.status(502).json({ available: false, reason: 'Failed to fetch repos from GitHub' });
    }

    const repos = data.map(r => ({
      full_name: r.full_name,
      name: r.name,
      owner: r.owner?.login || '',
      clone_url: r.clone_url,
      ssh_url: r.ssh_url,
      private: r.private,
      description: r.description || '',
      language: r.language || '',
      updated_at: r.updated_at,
    }));

    const result = { available: true, repos };
    setGithubCache(cacheKey, result);
    res.set('X-Cache', 'MISS').json(result);
  } catch (err) {
    console.error('[Server] /api/github/repos error:', err);
    res.status(500).json({ available: false, reason: 'Internal server error' });
  }
});

// ─── GitHub Webhook Route (B4) ────────────────────────────────

// Raw body middleware chỉ cho webhook route — cần râw bytes để verify HMAC signature
app.post('/api/webhooks/github',
  express.raw({ type: 'application/json', limit: '5mb' }),
  async (req, res) => {
    const config = loadConfig();
    const signature = req.headers['x-hub-signature-256'] || '';
    const eventType = req.headers['x-github-event'] || '';
    const deliveryId = req.headers['x-github-delivery'] || '';

    // Verify signature nếu có webhook secret
    if (config.webhookSecret) {
      if (!verifyWebhookSignature(req.body, signature, config.webhookSecret)) {
        console.warn('[Webhook] Invalid signature from GitHub delivery:', deliveryId);
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const event = parseWebhookEvent(eventType, payload);
    if (!event) {
      return res.status(400).json({ error: 'Unrecognized event type' });
    }

    console.log(`[Webhook] GitHub event: ${event.type}`, event.data);

    // Ping event — acknowledge và không làm gì thêm
    if (event.type === 'ping') {
      return res.json({ ok: true, message: 'Webhook configured successfully' });
    }

    // Broadcast event qua WebSocket đến tất cả clients
    if (event.type === 'push') {
      broadcast('github:push', event.data);
      // Invalidate GitHub PR cache vì push có thể trigger merged PRs
      const repoFullName = event.data.repoFullName;
      if (repoFullName) {
        const [owner, repo] = repoFullName.split('/');
        if (owner && repo) {
          invalidateGithubCache(`prs:${owner}/${repo}`);
          invalidateGithubCache(`issues:${owner}/${repo}`);
          console.log(`[Webhook] Invalidated GitHub cache for ${repoFullName}`);
        }
      }
    } else if (event.type === 'pull_request') {
      broadcast('github:pr', event.data);
      // Invalidate PR cache khi PR đᬋợc update
      const repoFullName = event.data.repoFullName;
      if (repoFullName) {
        invalidateGithubCache(`prs:${repoFullName}`);
      }
    } else {
      broadcast('github:event', event);
    }

    res.json({ ok: true, event: event.type });
  }
);

// ─── Report API (C3: Shareable Reports) ───────────────────────

const REPORTS_DIR = join(ROOT_DIR, 'public', 'reports');

app.post('/api/reports', async (req, res) => {
  const config = loadConfig();
  const { projectIndex } = req.body;

  const idx = parseInt(projectIndex);
  if (isNaN(idx) || idx < 0 || idx >= config.projects.length) {
    return res.status(400).json({ error: 'Invalid project index' });
  }

  const repoPath = config.projects[idx];
  const cacheKey = `project:${repoPath}`;

  try {
    // Use cached data if available, otherwise collect
    let data = dataCache.get(cacheKey);
    if (!data) {
      data = await collectProject(repoPath);
      dataCache.set(cacheKey, data);
    }

    // Ensure reports directory exists
    if (!existsSync(REPORTS_DIR)) {
      mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const id = buildReportId();
    const html = generateReportHtml(data);
    const filename = `${id}.html`;
    const filePath = join(REPORTS_DIR, filename);

    writeFileSync(filePath, html, 'utf-8');

    const url = `/reports/${filename}`;
    console.log(`[Server] Report created: ${url}`);

    res.json({ id, url, filename });
  } catch (err) {
    console.error('[Server] /api/reports error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ─── Static Files (B1: Performance — cache control headers) ──
// Dev mode: no-cache cho tất cả files để reflect thay đổi ngay
// Production: Assets (CSS/JS) → cache 1h; HTML → no-cache
app.use(express.static(join(ROOT_DIR, 'public'), {
  setHeaders(res, filePath) {
    if (isDev) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(css|js|mjs|woff2?|ico|png|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// ─── Export for testing ─────────────────────────────────────

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 4321;

// Tạo HTTP server từ Express app để WebSocket có thể upgrade
const httpServer = http.createServer(app);

// Export httpServer cho testing nếu cần
export { app, httpServer };

// Chỉ listen khi chạy trực tiếp, không listen khi import từ test
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun) {
  httpServer.listen(PORT, () => {
    const config = loadConfig();
    console.log(`\n  🏗️  Dev Dashboard running at http://localhost:${PORT}`);
    console.log(`  📁 ${config.projects.length} project(s) configured`);
    if (isDev) {
      console.log(`  🔧 Dev mode — cache disabled, files always fresh`);
    } else {
      console.log(`  ⚡ Production — cache + background refresh enabled`);
    }

    // Start background data refresh (chỉ production)
    if (!isDev) {
      startBackgroundRefresh(
        () => loadConfig().projects,
        collectProject,
        dataCache
      );
    }

    // B1: Khởi động WebSocket server
    createWebSocketServer(httpServer);

    // B3: Start git watcher cho tất cả projects
    // Invalidate cache trước khi broadcast để data luôn mới
    const projects = loadConfig().projects;
    if (projects.length > 0) {
      startGitWatcher(projects, (type, payload) => {
        // Invalidate cache cho project vừa thay đổi
        if (payload?.repoPath) {
          dataCache.invalidate(`project:${payload.repoPath}`);
        }
        broadcast(type, payload);
      });
    }
  });
}
