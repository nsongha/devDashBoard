# Phase 1 — Foundation & Code Quality (v0.2.0) Task Board

## Parallel Execution Strategy

- **Mục tiêu**: Tách monolithic codebase thành modules, thêm tests, cải thiện DX
- **Tổng tasks**: 14 tasks chia thành 3 streams
- **Approach**: Stream A và B song song được (ít file overlap), Stream C sau hoặc song song partial

## Context: Codebase Hiện Tại

### Tech Stack

| Layer    | Technology             | Hiện trạng                                |
| -------- | ---------------------- | ----------------------------------------- |
| Backend  | Node.js + Express 4.21 | ES Modules, `server.mjs` (367 lines)      |
| Frontend | Vanilla HTML           | `index.html` monolithic (886 lines, 30KB) |
| CLI      | Node.js                | `collect.mjs` (266 lines)                 |
| Charts   | Chart.js 4.4.1         | CDN link trong `index.html`               |
| Config   | JSON                   | `config.json` flat file                   |
| Deps     | express only           | Zero other production deps                |

### Files/Modules đã có

- `server.mjs` — Express server + ALL parsers + git collector (monolithic)
- `collect.mjs` — Standalone CLI collector (code gần trùng với server.mjs)
- `index.html` — Dashboard UI: inline CSS (~370 lines) + inline JS (~516 lines)
- `config.json` — Project paths config
- `package.json` — Chỉ có `express`, scripts: `start`, `dev`

### Code Duplication

> ⚠️ `server.mjs` và `collect.mjs` share gần giống nhau cho:
>
> - `run()`, `readFileSafe()` — utility functions
> - `collectGitStats()` — git data collection
> - `parseTaskBoard()`, `parseChangelog()`, `parseAIContext()`, `parseKnownIssues()`, `parseDecisions()`, `parseWorkflows()`, `parseSkills()` — 7 parsers
>
> **Chiến lược**: Tách thành shared modules → cả server lẫn CLI đều import từ `src/`

---

## Stream 🖥️ Server — Backend Restructure

**Owner**: Backend domain
**Scope**: `server.mjs`, `collect.mjs` → `src/`

| #   | Task                                                 | Status | Priority | Dependencies | Files affected                                                                                    |
| --- | ---------------------------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------------------------------------------------- |
| A1  | Tạo `src/utils/file-helpers.mjs` (run, readFileSafe) | ✅     | P0       | —            | `[NEW] src/utils/file-helpers.mjs`                                                                |
| A2  | Tạo `src/collectors/git-stats.mjs`                   | ✅     | P0       | A1           | `[NEW] src/collectors/git-stats.mjs`                                                              |
| A3  | Tạo 7 parsers modules                                | ✅     | P0       | A1           | `[NEW] src/parsers/{task-board,changelog,ai-context,known-issues,decisions,workflows,skills}.mjs` |
| A4  | Rewire `server.mjs` → import từ src/                 | ✅     | P0       | A1,A2,A3     | `[MODIFY] server.mjs` → `src/server.mjs`                                                          |
| A5  | Rewire `collect.mjs` → import từ src/                | ✅     | P1       | A1,A2,A3     | `[MODIFY] collect.mjs`                                                                            |

**Acceptance Criteria:**

- ✅ `node --check src/server.mjs` pass
- ✅ `node --check collect.mjs` pass
- ✅ Server chạy `npm run dev` bình thường, API `/api/data/0` trả data đúng
- ✅ CLI chạy `node collect.mjs .` xuất `dashboard-data.json` đúng
- ✅ Không still có code duplication giữa server và collector

---

## Stream 🎨 Frontend — Frontend Modularize

**Owner**: Frontend domain
**Scope**: `index.html` → `public/`

| #   | Task                                    | Status | Priority | Dependencies | Files affected                                          |
| --- | --------------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------- |
| B1  | Tách CSS → `public/css/dashboard.css`   | ✅     | P0       | —            | `[NEW] public/css/dashboard.css`, `[MODIFY] index.html` |
| B2  | Tách JS app logic → `public/js/app.mjs` | ✅     | P0       | —            | `[NEW] public/js/app.mjs`, `[MODIFY] index.html`        |
| B3  | Tách charts → `public/js/charts.mjs`    | ✅     | P0       | B2           | `[NEW] public/js/charts.mjs`                            |
| B4  | Tách tabs → `public/js/tabs.mjs`        | ✅     | P1       | B2           | `[NEW] public/js/tabs.mjs`                              |
| B5  | Tách sidebar → `public/js/sidebar.mjs`  | ✅     | P1       | B2           | `[NEW] public/js/sidebar.mjs`                           |

**Acceptance Criteria:**

- ✅ `index.html` chỉ còn shell HTML (< 80 lines)
- ✅ CSS và JS load qua `<link>` và `<script type="module">`
- ✅ Dashboard hiển thị đúng y như trước (no visual regression)
- ✅ Tất cả features hoạt động: tabs, charts, dropdown, modal, auto-refresh

---

## Stream ⚙️ Infra & DX — Testing, Linting, Error Handling

**Owner**: Infra/Config domain
**Scope**: `package.json`, config files, `src/`

| #   | Task                                     | Status | Priority | Dependencies | Files affected                                                          |
| --- | ---------------------------------------- | ------ | -------- | ------------ | ----------------------------------------------------------------------- |
| C1  | Setup `vitest` + config                  | 📋     | P0       | —            | `[MODIFY] package.json`, `[NEW] vitest.config.mjs`                      |
| C2  | Unit tests cho parsers (≥5 test cases)   | 📋     | P0       | A3, C1       | `[NEW] tests/parsers/*.test.mjs`                                        |
| C3  | Unit tests cho API endpoints (supertest) | 📋     | P1       | A4, C1       | `[NEW] tests/api.test.mjs`, `[MODIFY] package.json`                     |
| C4  | Setup ESLint + Prettier                  | 📋     | P1       | —            | `[NEW] eslint.config.mjs`, `[NEW] .prettierrc`, `[MODIFY] package.json` |

**Acceptance Criteria:**

- ✅ `npm test` chạy pass toàn bộ tests
- ✅ `npm run lint` chạy không errors
- ✅ Parser tests cover ≥ 5 test cases (input markdown → expected output)
- ✅ API tests verify GET /api/projects, GET /api/data/:index

---

## Cross-Stream Dependencies

### Dependency Map

| Task | Depends on | Type         | Impact                                      |
| ---- | ---------- | ------------ | ------------------------------------------- |
| A4   | A1, A2, A3 | in-stream    | Server chỉ rewire sau khi modules tách xong |
| A5   | A1, A2, A3 | in-stream    | CLI chỉ rewire sau khi modules tách xong    |
| B3   | B2         | in-stream    | Charts cần app.mjs setup xong trước         |
| B4   | B2         | in-stream    | Tabs cần app.mjs setup xong trước           |
| B5   | B2         | in-stream    | Sidebar cần app.mjs setup xong trước        |
| C2   | A3, C1     | cross-stream | Tests cần parsers modules + vitest ready    |
| C3   | A4, C1     | cross-stream | API tests cần server restructured + vitest  |

### Execution Order

```
Wave 1 (song song):
  Stream A: A1 → A2, A3 (song song) → A4, A5
  Stream B: B1 → B2 → B3, B4, B5 (song song)
  Stream C: C1, C4 (song song, không deps)

Wave 2 (sau Wave 1):
  Stream C: C2 (cần A3 + C1) → C3 (cần A4 + C1)
```

## Conflict Prevention Rules

### Shared files

| File           | Sửa bởi   | Thứ tự                                  |
| -------------- | --------- | --------------------------------------- |
| `package.json` | C (chính) | C thêm devDeps trước, A sửa scripts sau |
| `server.mjs`   | A (chính) | A sửa duy nhất, B không sửa             |
| `index.html`   | B (chính) | B sửa duy nhất, A không sửa             |

### Merge strategy

- Stream A và B **không overlap files** → merge free
- Stream C sửa `package.json` → A/B nên tránh sửa file này song song
- Static file serving: A cần update `app.use(express.static(...))` path nếu B đổi thư mục public

## Progress Summary

| Stream        | Total  | Done   | Remaining | %       |
| ------------- | ------ | ------ | --------- | ------- |
| 🖥️ Server     | 5      | 5      | 0         | 100%    |
| 🎨 Frontend   | 5      | 5      | 0         | 100%    |
| ⚙️ Infra & DX | 4      | 0      | 4         | 0%      |
| **Total**     | **14** | **10** | **4**     | **71%** |
