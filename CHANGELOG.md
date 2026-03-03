# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

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
