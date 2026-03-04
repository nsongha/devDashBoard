# Dev Dashboard — Project Context

> Đọc file này trước khi làm bất cứ việc gì. Cập nhật lần cuối: 2026-03-04 (Post-release hotfixes — v1.0.0)

## Project Overview

- **Mô tả**: Dashboard trực quan hóa project stats (git, docs, workflows) từ bất kỳ git repo nào. Hỗ trợ AI-assisted development workflow.
- **Mô hình**: Internal tool / Developer tool
- **Đối tượng**: Solo dev hoặc small team dùng AI coding agent
- **Deployment**: Local (localhost:4321)

## Tech Stack

| Layer       | Technology                 | Version                                                 |
| ----------- | -------------------------- | ------------------------------------------------------- |
| Backend     | Node.js + Express          | ES Modules, Express 4.21                                |
| Frontend    | Vanilla HTML + ES Modules  | Modular JS + Chart.js CDN                               |
| Testing     | Vitest + Supertest         | vitest 4.x, supertest 7.x                               |
| WebSocket   | `ws` package               | ws 8.x                                                  |
| Linting     | ESLint + Prettier          | ESLint 10.x (flat config), Prettier 3.x                 |
| Data Source | Git CLI + Markdown parsing | Regex + optional Gemini AI                              |
| Caching     | In-memory (DataCache)      | TTL 60s (prod) / 0s (dev) + background refresh          |
| Config      | `config.json` + `.env`     | Non-sensitive / Secrets tách nhau                       |
| Secrets     | `.env` (dotenv)            | GEMINI_API_KEY, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO |

## Architecture

- **Cấu trúc repo**: Single repo, modular (`src/`, `public/`, `tests/`, `scripts/`, `docs/`)
- **API format**: REST — base URL `http://localhost:4321/api`
- **Data flow**: `Dashboard (public/) ←→ Express Server (src/) ←→ Git CLI + Markdown Files`
- **Dev mode**: `NODE_ENV=development` → tắt tất cả cache layers, SW không register, HTTP no-cache

## Modules hiện có

### Backend (`src/`)

- `src/server.mjs` — Express server: API routes + project data orchestration + cache + dev mode
- `src/utils/file-helpers.mjs` — Shared utilities (run, runAsync, readFileSafe, getWeekStart)
- `src/utils/cache.mjs` — In-memory DataCache with TTL (skip cache khi dev mode)
- `src/utils/worker.mjs` — Background data refresh worker (chỉ chạy production)
- `src/utils/gemini-client.mjs` — Gemini REST API client (fetch-based)
- `src/utils/ai-parser.mjs` — AI parser wrapper (try AI → fallback regex)
- `src/utils/websocket.mjs` — WebSocket server (heartbeat, broadcast)
- `src/utils/git-watcher.mjs` — fs.watch .git/refs/ → broadcast git:commit event (filter `.lock` + `remotes/`)
- `src/utils/github-cache.mjs` — GitHub API response cache (TTL 5m, per-key invalidate)
- `src/utils/sanitize.mjs` — HTML escaping utility (XSS prevention)
- `src/collectors/git-stats.mjs` — Git data collection (sync + async, incremental mode, repo validation)
- `src/collectors/commit-analyzer.mjs` — Commit message categorization (sync + async)
- `src/collectors/author-stats.mjs` — Per-author statistics (sync + async)
- `src/collectors/velocity-trends.mjs` — Sprint velocity trends (sync + async)
- `src/collectors/file-coupling.mjs` — File co-change detection (sync + async)
- `src/integrations/github-client.mjs` — GitHub REST API client (PAT, rate limit, retry)
- `src/integrations/github-pr.mjs` — PR stats collector (open/merged, avg merge time)
- `src/integrations/github-issues.mjs` — Issues collector (open/closed, labels, milestones)
- `src/integrations/github-ci.mjs` — CI/CD pipeline status (GitHub Actions)
- `src/integrations/github-branches.mjs` — Branch list + comparison (ahead/behind)
- `src/webhooks/github-webhook.mjs` — GitHub webhook handler (HMAC SHA-256)
- `src/export/report.mjs` — Static HTML report generator (shareable, refactored 5 helpers)
- `src/parsers/*.mjs` — 8 parsers (task-board, changelog, ai-context, known-issues, decisions, workflows, skills, qc-report) — dual mode: regex + AI

### Frontend (`public/`)

- `public/index.html` — Shell HTML (PWA: manifest link, SW register, Apple meta, skip-link)
- `public/manifest.json` — Web App Manifest (PWA, display:standalone, icons 192/512)
- `public/sw.js` — Service Worker (cache-first shell, network-first API, offline fallback)
- `public/offline.html` — Offline fallback page (pulse animation, auto-redirect khi online)
- `public/icons/` — App icons: 192/512 standard + maskable variants
- `public/css/dashboard.css` — Styles (focus ring, skeleton loader, error/empty states)
- `public/css/tokens.css` — Design tokens (CSS custom properties: colors, spacing, typography)
- `public/js/app.mjs` — Main app logic + orchestrator + settings + filters + role-based views
- `public/js/charts.mjs` — Chart.js rendering (with date range filter + period toggle: day/week/month/year)
- `public/js/insights.mjs` — Insights tab charts (commit categories, author, velocity, coupling)
- `public/js/github.mjs` — GitHub tab UI (PR stats, issues, CI status, branches)
- `public/js/realtime.mjs` — WebSocket client (auto-reconnect backoff)
- `public/js/notifications.mjs` — Desktop Notification API (git:commit, github:push)
- `public/js/export.mjs` — Export PNG (html2canvas) + PDF (jsPDF)
- `public/js/pwa.mjs` — PWAManager (SW register, BeforeInstallPrompt, install trigger)
- `public/js/team.mjs` — Team tab UI (contributors ranking, active days chart)
- `public/js/qc.mjs` — QC Report tab UI (test cases, release checklist, sign-off)
- `public/js/tabs.mjs` — Tab switching
- `public/js/sidebar.mjs` — Sidebar rendering
- `public/js/deep-links.mjs` — IDE deep links (VS Code, Cursor, WebStorm, Zed, Antigravity)
- `public/js/editor.mjs` — In-browser markdown editor (split view + conflict detection)
- `public/js/search.mjs` — Command palette (Cmd+K) + keyboard shortcuts + focus trap
- `public/js/sanitize.mjs` — Frontend HTML escaping utility (XSS prevention)
- `public/js/toast.mjs` — Toast notification UI component

### Scripts & Config

- `collect.mjs` — Standalone CLI collector, xuất `dashboard-data.json`
- `scripts/dev.sh` — Dev startup script (set NODE_ENV=development + node --watch)
- `scripts/generate-icons.mjs` — PWA icon generator (SVG → PNG 192/512)
- `config.json` — Non-sensitive config: `projects[]`, `ideScheme`, `viewMode`
- `.env` — Secrets (gitignored): `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_WEBHOOK_SECRET`
- `.env.example` — Template (committed) — copy thành `.env` và điền giá trị thật

### Tests (`tests/`)

- `tests/api.test.mjs` — API route tests (projects, data, config, cache)
- `tests/api-file.test.mjs` — File read/write API tests (conflict detection)
- `tests/api-team.test.mjs` — Team data API tests
- `tests/collectors/` — author-stats, commit-analyzer, file-coupling
- `tests/integrations/` — github-client, github-branches, github-ci, github-routes
- `tests/parsers/` — changelog, known-issues, task-board
- `tests/utils/` — ai-parser, cache, deep-links, export, gemini-client, git-watcher, report, websocket
- `tests/webhooks/` — github-webhook

### Documentation (`docs/`)

- `docs/USAGE.md` — Installation + config guide
- `docs/DEPLOYMENT.md` — PM2, Docker, Nginx deployment guide
- `docs/APP_DESCRIPTION.md` — Full features & roadmap
- `docs/DEV_ROADMAP.md` — Kế hoạch phát triển
- `docs/TASK_BOARD.md` — Tiến độ phase
- `docs/DECISIONS.md` — Architecture decisions
- `docs/KNOWN_ISSUES.md` — Bugs đã biết
- `docs/QC_REPORT.md` — Test cases, release checklist, sign-off
- `docs/PROJECT_CONTEXT.md` — File này

## API Endpoints

| Method | Path                   | Mô tả                                                               |
| ------ | ---------------------- | ------------------------------------------------------------------- |
| GET    | `/api/projects`        | Danh sách projects đã config                                        |
| POST   | `/api/projects`        | Thêm project (body: `{ path }`)                                     |
| DELETE | `/api/projects`        | Xóa project (body: `{ path }`)                                      |
| GET    | `/api/data/:index`     | Lấy full data (cached), `X-Cache` header                            |
| GET    | `/api/config`          | Settings hiện tại (API key masked, trả thêm `viewMode`)             |
| POST   | `/api/config`          | Lưu settings — ideScheme/viewMode → `config.json`, secrets → `.env` |
| DELETE | `/api/cache`           | Xóa toàn bộ cache                                                   |
| GET    | `/api/file`            | Đọc nội dung file (.md only, path validated)                        |
| PUT    | `/api/file`            | Ghi file + conflict detection (409)                                 |
| GET    | `/api/github/prs`      | PR stats (cache TTL 5m), cần githubToken + owner/repo               |
| GET    | `/api/github/issues`   | Issue stats (cache TTL 5m)                                          |
| GET    | `/api/github/ci`       | CI/CD pipeline status (GitHub Actions)                              |
| GET    | `/api/github/branches` | Branch list + comparison (ahead/behind)                             |
| GET    | `/api/github/compare`  | So sánh 2 branches (ahead/behind counts)                            |
| GET    | `/api/github/repos`    | List repos của authenticated user (cho Add Project modal)           |
| POST   | `/api/reports`         | Tạo shareable static HTML report, trả `{ id, url }`                 |
| POST   | `/api/webhooks/github` | GitHub webhook endpoint (HMAC SHA-256 verify)                       |

## Data Sources

| Source                 | Data                                    |
| ---------------------- | --------------------------------------- |
| `git log`              | Commits, frequency, velocity, hotspots  |
| `git ls-files + wc`    | Lines of code, file counts              |
| `docs/TASK_BOARD.md`   | Phase progress, streams                 |
| `docs/KNOWN_ISSUES.md` | Active issues, tech debt                |
| `docs/DECISIONS.md`    | Architecture decisions                  |
| `CHANGELOG.md`         | Version history                         |
| `.agent/workflows/`    | Workflow definitions                    |
| `.agent/skills/`       | AI skill catalog                        |
| `docs/QC_REPORT.md`    | Test cases, release checklist, sign-off |

## Current Status

- **Version**: 1.0.0
- **Phase**: Post-release — hotfixes & polish (parallel data loading, GitHub bug fixes, git watcher fix)
- **Unreleased changes**: Parallel `collectProject()` (~6s→~2s), QC Report tab/parser, Known Issues tab, XSS sanitization, Git watcher filter, GitHub config cache invalidation, Dev Mode toggle
- **Next milestone**: Post-release — GitLab integration (P1) hoặc monitor production usage

## Key Conventions

- **Commit format**: Conventional Commits (tiếng Việt)
- **Naming**: camelCase cho variables, kebab-case cho files
- **Modules**: ES Modules (`import/export`)
- **Config phân tầng**:
  - `config.json` — non-sensitive only: `projects[]`, `ideScheme`, `viewMode`. Committed lên git với empty values
  - `.env` — secrets: `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_WEBHOOK_SECRET`. Gitignored, KHÔNG bao giờ commit
  - Template: `.env.example` (được commit) — copy thành `.env` và điền giá trị thật
  - `server.mjs` dùng `dotenv` để load `.env` vào `process.env`, `loadConfig()` merge secrets từ env vào config object, cache in-memory
  - `saveConfig()` chỉ ghi `NON_SENSITIVE_KEYS` vào `config.json`; `saveEnvSecrets()` ghi secrets vào `.env`
- **Caching strategy**:
  - Production: DataCache TTL 60s + background refresh worker + SW cache-first
  - Dev mode (`NODE_ENV=development`): TTL=0, SW disabled, HTTP no-cache
  - GitHub API: separate cache (TTL 5m), per-key invalidate khi settings thay đổi

## Docs Reference

| Cần thông tin về        | Đọc file                                 |
| ----------------------- | ---------------------------------------- |
| Full features & roadmap | [APP_DESCRIPTION.md](APP_DESCRIPTION.md) |
| Kế hoạch phát triển     | [DEV_ROADMAP.md](DEV_ROADMAP.md)         |
| Tiến độ phase           | [TASK_BOARD.md](TASK_BOARD.md)           |
| Lịch sử thay đổi        | [CHANGELOG.md](../CHANGELOG.md)          |
| Bugs đã biết            | [KNOWN_ISSUES.md](KNOWN_ISSUES.md)       |
| Quyết định kiến trúc    | [DECISIONS.md](DECISIONS.md)             |
| QC Report               | [QC_REPORT.md](QC_REPORT.md)             |
| Hướng dẫn sử dụng       | [USAGE.md](USAGE.md)                     |
| Deployment guide        | [DEPLOYMENT.md](DEPLOYMENT.md)           |

## Context Size Guide

- Chỉ đọc file này: ~80 lines
- - APP_DESCRIPTION.md: ~+50 lines
- Ngưỡng cảnh báo: > 300 lines tổng → cân nhắc trim context
