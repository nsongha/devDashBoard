# Dev Dashboard — Project Context

> Đọc file này trước khi làm bất cứ việc gì. Cập nhật lần cuối: 2026-03-04 (Phase 5 done)

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
| Linting     | ESLint + Prettier          | ESLint 10.x (flat config)                               |
| Data Source | Git CLI + Markdown parsing | Regex + optional Gemini AI                              |
| Caching     | In-memory (DataCache)      | TTL 60s + background refresh                            |
| Config      | `config.json` + `.env`     | Non-sensitive / Secrets tách nhau                       |
| Secrets     | `.env` (dotenv)            | GEMINI_API_KEY, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO |

## Architecture

- **Cấu trúc repo**: Single repo, modular (`src/`, `public/`, `tests/`)
- **API format**: REST — base URL `http://localhost:4321/api`
- **Data flow**: `Dashboard (public/) ←→ Express Server (src/) ←→ Git CLI + Markdown Files`

## Modules hiện có

- `src/server.mjs` — Express server: API routes + project data orchestration + cache
- `src/utils/file-helpers.mjs` — Shared utilities (run, readFileSafe)
- `src/utils/cache.mjs` — In-memory DataCache with TTL
- `src/utils/worker.mjs` — Background data refresh worker
- `src/utils/gemini-client.mjs` — Gemini REST API client (fetch-based)
- `src/utils/ai-parser.mjs` — AI parser wrapper (try AI → fallback regex)
- `src/collectors/git-stats.mjs` — Git data collection (+ incremental mode)
- `src/collectors/commit-analyzer.mjs` — Commit message categorization
- `src/collectors/author-stats.mjs` — Per-author statistics
- `src/collectors/velocity-trends.mjs` — Sprint velocity trends
- `src/collectors/file-coupling.mjs` — File co-change detection
- `src/integrations/github-client.mjs` — GitHub REST API client (PAT, rate limit, retry)
- `src/integrations/github-pr.mjs` — PR stats collector (open/merged, avg merge time)
- `src/integrations/github-issues.mjs` — Issues collector (open/closed, labels, milestones)
- `src/integrations/github-ci.mjs` — CI/CD pipeline status (GitHub Actions)
- `src/integrations/github-branches.mjs` — Branch list + comparison (ahead/behind)
- `src/utils/websocket.mjs` — WebSocket server (heartbeat, broadcast)
- `src/utils/git-watcher.mjs` — fs.watch .git/refs/ → broadcast git:commit event
- `src/webhooks/github-webhook.mjs` — GitHub webhook handler (HMAC SHA-256)
- `src/export/report.mjs` — Static HTML report generator (shareable)
- `src/parsers/*.mjs` — 7 parsers (task-board, changelog, ai-context, known-issues, decisions, workflows, skills) — dual mode: regex + AI
- `collect.mjs` — Standalone CLI collector, xuất `dashboard-data.json`
- `public/index.html` — Shell HTML
- `public/css/dashboard.css` — Styles
- `public/js/app.mjs` — Main app logic + orchestrator + settings + filters
- `public/js/charts.mjs` — Chart.js rendering (with date range filter)
- `public/js/insights.mjs` — Insights tab charts (commit categories, author, velocity, coupling)
- `public/js/github.mjs` — GitHub tab UI (PR stats, issues, CI status)
- `public/js/realtime.mjs` — WebSocket client (auto-reconnect backoff)
- `public/js/notifications.mjs` — Desktop Notification API (git:commit, github:push)
- `public/js/export.mjs` — Export PNG (html2canvas) + PDF (jsPDF)
- `public/js/tabs.mjs` — Tab switching
- `public/js/sidebar.mjs` — Sidebar rendering
- `public/js/deep-links.mjs` — IDE deep links (VS Code, Cursor, WebStorm, Zed)
- `public/js/editor.mjs` — In-browser markdown editor (split view + conflict detection)
- `public/js/search.mjs` — Command palette (Cmd+K) + keyboard shortcuts

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
| POST   | `/api/reports`         | Tạo shareable static HTML report, trả `{ id, url }`                 |
| POST   | `/api/webhooks/github` | GitHub webhook endpoint (HMAC SHA-256 verify)                       |

## Data Sources

| Source                  | Data                                   |
| ----------------------- | -------------------------------------- |
| `git log`               | Commits, frequency, velocity, hotspots |
| `git ls-files + wc`     | Lines of code, file counts             |
| `docs/TASK_BOARD.md`    | Phase progress, streams                |
| `docs/KNOWN_ISSUES.md`  | Active issues, tech debt               |
| `docs/DECISIONS_LOG.md` | Architecture decisions                 |
| `CHANGELOG.md`          | Version history                        |
| `.agent/workflows/`     | Workflow definitions                   |
| `.agent/skills/`        | AI skill catalog                       |

## Current Status

- **Version**: 0.6.0
- **Phase**: Phase 5 done — Integrations & Multi-Source (GitHub API, WebSocket, real-time, export)
- **Next milestone**: Phase 6 — Desktop App & Polish (PWA, team features, production polish)

## Key Conventions

- **Commit format**: Conventional Commits (tiếng Việt)
- **Naming**: camelCase cho variables, kebab-case cho files
- **Modules**: ES Modules (`import/export`)
- **Config phân tầng**:
  - `config.json` — non-sensitive only: `projects[]`, `ideScheme`, `viewMode`. Committed lên git với empty values
  - `.env` — secrets: `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_WEBHOOK_SECRET`. Gitignored, KHÔNG bao giờ commit
  - Template: `.env.example` (được commit) — copy thành `.env` và điền giá trị thật
  - `server.mjs` dùng `dotenv` để load `.env` vào `process.env`, `loadConfig()` merge secrets từ env vào config object
  - `saveConfig()` chỉ ghi `NON_SENSITIVE_KEYS` vào `config.json`; `saveEnvSecrets()` ghi secrets vào `.env`

## Docs Reference

| Cần thông tin về        | Đọc file                                 |
| ----------------------- | ---------------------------------------- |
| Full features & roadmap | [APP_DESCRIPTION.md](APP_DESCRIPTION.md) |
| Kế hoạch phát triển     | [DEV_ROADMAP.md](DEV_ROADMAP.md)         |
| Tiến độ phase           | [TASK_BOARD.md](TASK_BOARD.md)           |
| Lịch sử thay đổi        | [CHANGELOG.md](../CHANGELOG.md)          |
| Bugs đã biết            | [KNOWN_ISSUES.md](KNOWN_ISSUES.md)       |

## Context Size Guide

- Chỉ đọc file này: ~70 lines
- - APP_DESCRIPTION.md: ~+50 lines
- Ngưỡng cảnh báo: > 300 lines tổng → cân nhắc trim context
