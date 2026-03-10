# Post-Release Task Board — Enhancement & Maintenance

> 🎯 Mục tiêu: Bug fixes, parser improvements, UX enhancements
> Version: v1.0.0 → v1.1.0

## Parallel Execution Strategy

Post-Release có các tasks chia 3 streams theo domain:

- **Stream A — Parser & Data**: Flexible parsers, roadmap parser, data improvements (Backend)
- **Stream B — UX Improvements**: Browse folder, sidebar enhancements, UI polish (Full-stack)
- **Stream C — DX & Infra**: Agent rules, workflows, dev tooling (Infra/Docs)

Streams hoàn toàn independent, chạy song song.

## Context: Codebase Hiện Tại

### Tech Stack

- **Backend**: Node.js + Express 4.21 + ES Modules — `src/server.mjs`
- **Frontend**: Vanilla HTML + ES Modules — 17 modular JS files (`public/js/`)
- **WebSocket**: `ws` package — `src/utils/websocket.mjs`
- **Testing**: Vitest 4.x + Supertest 7.x — 100+ tests
- **PWA**: Service Worker + Web App Manifest
- **Version hiện tại**: 1.0.0 (Phase 6 done)

### Foundation Available

- `src/parsers/*.mjs` — 9 parsers (task-board, changelog, ai-context, known-issues, decisions, workflows, skills, qc-report, roadmap)
- `src/collectors/*.mjs` — 5 collectors (git-stats, commit-analyzer, author-stats, velocity-trends, file-coupling)
- `src/integrations/*.mjs` — GitHub client, PRs, issues, CI, branches
- `public/js/*.mjs` — 17 frontend modules
- `public/sw.js` — Service Worker (cache-first, devdash-v3)

---

## Stream 🔧 A — Parser & Data

**Owner**: Backend
**Scope**: `src/parsers/`, `src/server.mjs`

| #   | Task                             | Status | Priority | Dependencies | Files affected                                        |
| --- | -------------------------------- | ------ | -------- | ------------ | ----------------------------------------------------- |
| A1  | Flexible workflows/skills parser | ✅     | P0       | —            | `src/parsers/workflows.mjs`, `src/parsers/skills.mjs` |
| A2  | Flexible changelog parser        | ✅     | P0       | —            | `src/parsers/changelog.mjs`                           |
| A3  | Flexible ai-context parser       | ✅     | P0       | —            | `src/parsers/ai-context.mjs`                          |
| A4  | Task board parser (no em dash)   | ✅     | P0       | —            | `src/parsers/task-board.mjs`                          |
| A5  | DEV_ROADMAP parser               | ✅     | P1       | —            | `src/parsers/roadmap.mjs` [NEW], `src/server.mjs`     |
| A6  | GitLab API integration           | ⏸️     | P2       | —            | `src/integrations/gitlab-*.mjs` [NEW]                 |

---

## Stream 🎨 B — UX Improvements

**Owner**: Full-stack
**Scope**: `public/`, `src/server.mjs`

| #   | Task                             | Status | Priority | Dependencies | Files affected                                             |
| --- | -------------------------------- | ------ | -------- | ------------ | ---------------------------------------------------------- |
| B1  | Native macOS folder picker       | ✅     | P0       | —            | `src/server.mjs`, `public/index.html`, `public/js/app.mjs` |
| B2  | Roadmap phases in sidebar        | ✅     | P0       | A5           | `public/js/sidebar.mjs`, `public/css/dashboard.css`        |
| B3  | QC Tab UX (collapsible, tabs)    | ✅     | P1       | —            | `public/js/qc.mjs`, `public/css/dashboard.css`             |
| B4  | Known Issues tab (filter/detail) | ✅     | P1       | —            | `public/js/app.mjs`                                        |

---

## Stream 🛠️ C — DX & Infra

**Owner**: Infra/Docs
**Scope**: `.agent/`, `docs/`, `public/sw.js`

| #   | Task                              | Status | Priority | Dependencies | Files affected                                                         |
| --- | --------------------------------- | ------ | -------- | ------------ | ---------------------------------------------------------------------- |
| C1  | Agent rules adapted from template | ✅     | P0       | —            | `.agent/rules/` (9 rule files) [NEW]                                   |
| C2  | Workflow upgrades                 | ✅     | P0       | —            | `.agent/workflows/` (code-review, debug, task-completion)              |
| C3  | Dev Mode toggle                   | ✅     | P0       | —            | `scripts/dev.sh`, `src/server.mjs`, `public/sw.js`                     |
| C4  | XSS sanitization                  | ✅     | P0       | —            | `src/utils/sanitize.mjs`, `public/js/sanitize.mjs` [NEW]               |
| C5  | Parallel data loading             | ✅     | P1       | —            | `src/server.mjs`, `src/collectors/*.mjs`, `src/utils/file-helpers.mjs` |
| C6  | Git watcher filter                | ✅     | P1       | —            | `src/utils/git-watcher.mjs`                                            |

---

## Cross-Stream Dependencies

### Dependency Map

| Task | Depends on | Type         | Notes                                       |
| ---- | ---------- | ------------ | ------------------------------------------- |
| B2   | A5         | cross-stream | Cần roadmap parser trước khi render sidebar |

### Execution Order

- **Stream A** và **Stream C** hoàn toàn independent, chạy song song
- **Stream B** phần lớn independent, trừ B2 cần A5 hoàn thành

## Progress Summary

| Stream  | Total  | Done   | Remaining | %       |
| ------- | ------ | ------ | --------- | ------- |
| 🔧 A    | 6      | 5      | 1         | 83%     |
| 🎨 B    | 4      | 4      | 0         | 100%    |
| 🛠️ C    | 6      | 6      | 0         | 100%    |
| **All** | **16** | **15** | **1**     | **94%** |
