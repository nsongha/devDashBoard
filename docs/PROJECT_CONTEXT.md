# Dev Dashboard — Project Context

> Đọc file này trước khi làm bất cứ việc gì. Cập nhật lần cuối: 2026-03-03 (Phase 1 done)

## Project Overview

- **Mô tả**: Dashboard trực quan hóa project stats (git, docs, workflows) từ bất kỳ git repo nào. Hỗ trợ AI-assisted development workflow.
- **Mô hình**: Internal tool / Developer tool
- **Đối tượng**: Solo dev hoặc small team dùng AI coding agent
- **Deployment**: Local (localhost:4321)

## Tech Stack

| Layer       | Technology                 | Version                   |
| ----------- | -------------------------- | ------------------------- |
| Backend     | Node.js + Express          | ES Modules, Express 4.21  |
| Frontend    | Vanilla HTML + ES Modules  | Modular JS + Chart.js CDN |
| Testing     | Vitest + Supertest         | vitest 3.x, supertest 7.x |
| Linting     | ESLint + Prettier          | ESLint 9.x (flat config)  |
| Data Source | Git CLI + Markdown parsing | —                         |
| Config      | JSON file (`config.json`)  | —                         |

## Architecture

- **Cấu trúc repo**: Single repo, modular (`src/`, `public/`, `tests/`)
- **API format**: REST — base URL `http://localhost:4321/api`
- **Data flow**: `Dashboard (public/) ←→ Express Server (src/) ←→ Git CLI + Markdown Files`

## Modules hiện có

- `src/server.mjs` — Express server: API routes + project data orchestration
- `src/utils/file-helpers.mjs` — Shared utilities (run, readFileSafe)
- `src/collectors/git-stats.mjs` — Git data collection
- `src/parsers/*.mjs` — 7 parsers (task-board, changelog, ai-context, known-issues, decisions, workflows, skills)
- `collect.mjs` — Standalone CLI collector, xuất `dashboard-data.json`
- `public/index.html` — Shell HTML (69 lines)
- `public/css/dashboard.css` — Styles
- `public/js/app.mjs` — Main app logic + orchestrator
- `public/js/charts.mjs` — Chart.js rendering
- `public/js/tabs.mjs` — Tab switching
- `public/js/sidebar.mjs` — Sidebar rendering

## API Endpoints

| Method | Path               | Mô tả                                |
| ------ | ------------------ | ------------------------------------ |
| GET    | `/api/projects`    | Danh sách projects đã config         |
| POST   | `/api/projects`    | Thêm project (body: `{ path }`)      |
| DELETE | `/api/projects`    | Xóa project (body: `{ path }`)       |
| GET    | `/api/data/:index` | Lấy full data của project theo index |

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

- **Version**: 0.2.0
- **Phase**: Phase 1 done — modular codebase, tests, linting
- **Next milestone**: Phase 2 — UI/UX Overhaul (dark/light mode, responsive, animations)

## Key Conventions

- **Commit format**: Conventional Commits (tiếng Việt)
- **Naming**: camelCase cho variables, kebab-case cho files
- **Modules**: ES Modules (`import/export`)

## Docs Reference

| Cần thông tin về        | Đọc file                  |
| ----------------------- | ------------------------- |
| Full features & roadmap | `docs/APP_DESCRIPTION.md` |
| Kế hoạch phát triển     | `docs/DEV_ROADMAP.md`     |
| Tiến độ phase           | `TASK_BOARD.md`           |
| Lịch sử thay đổi        | `CHANGELOG.md`            |
| Bugs đã biết            | `KNOWN_ISSUES.md`         |

## Context Size Guide

- Chỉ đọc file này: ~70 lines
- - APP_DESCRIPTION.md: ~+50 lines
- Ngưỡng cảnh báo: > 300 lines tổng → cân nhắc trim context
