# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [0.5.0] — 2026-03-03

> Phase 4 — Interactive Features (Stream A: Deep Links, Stream B: In-Browser Editing, Stream C: Search & Filter)

### Added

- **Deep links module** (`public/js/deep-links.mjs`): `makeFileLink()` và `makeDiffLink()` tạo URL mở file/diff trong IDE. Hỗ trợ 4 IDE: VS Code, Cursor, WebStorm, Zed
- **IDE scheme config**: Settings modal có dropdown chọn IDE, giá trị lưu `config.json`, `GET/POST /api/config` trả/nhận `ideScheme`
- **Commit → IDE links**: Click commit hash trong tab Commits mở diff trong IDE (qua `vscode://file/` protocol)
- **Hotspot → IDE links**: Click file name trong tab Hotspots mở file trong IDE
- **CSS `.ide-link`**: Hover effect với arrow icon ↗ xuất hiện khi hover
- Unit tests cho deep-links module (14 test cases)
- **In-browser markdown editor** (`public/js/editor.mjs`): Full-screen editor modal với split view (textarea + markdown preview), toolbar với mode toggle (Editor/Split/Preview)
- **File read/write API**: `GET /api/file` đọc nội dung, `PUT /api/file` ghi + conflict detection (409). Security: chỉ `.md`, validate project path, chặn path traversal
- **Markdown preview**: Renderer hỗ trợ headings, bold/italic, code blocks, tables, lists, checkboxes, blockquotes, links, horizontal rules
- **Conflict detection**: Server track `lastModified` timestamp, client warn khi file bị sửa externally — 3 options: Overwrite, Reload, Cancel
- **Keyboard shortcuts**: `Cmd+S` save, `Esc` close editor, `Tab` indent trong textarea
- **Edit buttons**: Tab Decisions có nút "✏️ Edit File" mở editor cho `DECISIONS_LOG.md`
- Unit tests cho file API (9 test cases)
- **Global search command palette** (`public/js/search.mjs`): Cmd+K / Ctrl+K mở command palette kiểu VS Code, fuzzy search across commits, files, versions, decisions. Arrow key navigation, grouped results by category
- **Date range filter**: Filter bar trên charts section cho phép chọn khoảng ngày, re-render charts client-side
- **Commit filters**: Dropdown filter by author và commit type (feat/fix/refactor/docs/chore) trên tab Commits
- **Keyboard shortcuts mở rộng**: Cmd+1..6 switch tabs, Cmd+R refresh, `/` focus search, Esc close modals

## [0.3.0] — 2026-03-03

> Phase 3 — Smart Data & AI-Powered Parsing

### Added

- **Gemini API client** (`src/utils/gemini-client.mjs`): `GeminiClient` class dùng `fetch()` gọi REST API trực tiếp, retry logic (2 retries, exponential backoff), timeout 15s
- **AI parser wrapper** (`src/utils/ai-parser.mjs`): `parseWithAI()` — thử AI trước, fallback regex, thêm `_source` metadata
- **Dual-mode parsers**: 7 parsers (`task-board`, `changelog`, `ai-context`, `known-issues`, `decisions`, `workflows`, `skills`) đều có async AI variant + giữ nguyên regex gốc
- **AI Settings UI**: Settings modal (`⚙️`) trong header, `GET/POST /api/config` endpoints, mask API key cho security
- `collectProject()` async + `Promise.all` cho AI mode song song
- Unit tests cho `gemini-client` (6 cases) và `ai-parser` (7 cases)
- **In-memory cache with TTL** (`src/utils/cache.mjs`): `DataCache` class với get/set/has/invalidate/clear, default TTL 60s
- **Cache integration**: `/api/data/:index` trả cache HIT/MISS qua `X-Cache` header, `DELETE /api/cache` endpoint
- **Background data refresh** (`src/utils/worker.mjs`): `setInterval` worker refresh cache mỗi 2 phút
- **Incremental git collection**: `collectGitStatsIncremental()` — skip full re-collect khi HEAD hash không đổi
- **Commit message categorizer** (`src/collectors/commit-analyzer.mjs`): Phân loại commits theo Conventional Commits (feat/fix/refactor/docs/chore/test/style/perf/other), thống kê theo tuần
- **Author statistics** (`src/collectors/author-stats.mjs`): Per-author commit count, lines added/removed, active days, top 5 files
- **Sprint velocity trends** (`src/collectors/velocity-trends.mjs`): Commits/linesChanged per week, avg, trend direction (↑/↓/→)
- **File coupling detection** (`src/collectors/file-coupling.mjs`): Co-change analysis 30 ngày, threshold ≥ 3, top 20 pairs
- **📊 Insights tab** (`public/js/insights.mjs`): Tab mới trên dashboard với commit categories doughnut, author breakdown bar, velocity trend line chart, file coupling table
- Unit tests cho DataCache (13 test cases)
- Unit tests cho collectors (20 test cases): commit-analyzer, author-stats, file-coupling

## [0.2.0] — 2026-03-03

> Phase 1 — Foundation & Code Quality

### Changed

- **Backend restructure (Stream A)**: Tách monolithic `server.mjs` (367 lines) thành 10 shared modules trong `src/`
  - `src/utils/file-helpers.mjs` — Shared utilities (run, readFileSafe)
  - `src/collectors/git-stats.mjs` — Git data collection
  - `src/parsers/*.mjs` — 7 parser modules (task-board, changelog, ai-context, known-issues, decisions, workflows, skills)
  - `src/server.mjs` — Express server (105 lines, giảm 71%)
  - `collect.mjs` — CLI collector rewired (57 lines, giảm 79%)
- Loại bỏ hoàn toàn code duplication giữa server và CLI
- **Frontend modularize (Stream B)**: Tách monolithic `index.html` (886 lines) thành 6 files trong `public/`
  - `public/index.html` — Shell HTML (68 lines, giảm 92%)
  - `public/css/dashboard.css` — Extracted CSS (638 lines)
  - `public/js/app.mjs` — Main app logic + orchestrator
  - `public/js/charts.mjs` — Chart.js rendering
  - `public/js/tabs.mjs` — Tab switching
  - `public/js/sidebar.mjs` — Sidebar rendering
- **Infra & DX (Stream C)**: Testing foundation + linter/formatter
  - Vitest setup (`vitest.config.mjs`) — 18 tests pass
  - Parser unit tests (13 cases): task-board, changelog, known-issues
  - API endpoint tests (5 cases): supertest cho GET/POST routes
  - ESLint flat config + Prettier (`eslint.config.mjs`, `.prettierrc`)
  - Scripts: `npm test`, `npm run lint`, `npm run format`

## [0.1.0] — 2026-03-03

### Added

- Express server với live data API (`server.mjs`)
- Dashboard UI với Chart.js (`index.html`)
- Standalone CLI collector (`collect.mjs`)
- Multi-project support với dropdown switcher
- 4 charts: commit frequency, code velocity, language breakdown, busiest day
- Sidebar: phase progress, streams, health indicators
- Tabs: commits, versions, hotspots, workflows, architecture decisions
- Git stats: commits, LOC, file counts, hotspot files
- Docs parsing: TASK_BOARD, CHANGELOG, KNOWN_ISSUES, DECISIONS_LOG
- Workflow & skills discovery từ `.agent/` directory
