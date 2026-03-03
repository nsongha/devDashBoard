# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [0.3.0] — 2026-03-03

> Phase 3 — Smart Data & AI-Powered Parsing (Stream B)

### Added

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
