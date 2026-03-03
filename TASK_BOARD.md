# Phase 4 — Interactive Features Task Board

> 🎯 Mục tiêu: Deep links to IDE, in-browser editing, search & filter  
> Version target: v0.5.0

## Parallel Execution Strategy

Phase 4 có 13 tasks chia 3 streams theo domain:

- **Stream A — Deep Links**: IDE links + file opening (Backend + Frontend)
- **Stream B — In-Browser Editing**: Markdown editor + save API (Backend + Frontend)
- **Stream C — Search & Filter**: Global search + keyboard shortcuts (Frontend-heavy)

Các streams gần như **independent** — file overlap rất ít, chỉ cần sync ở `app.mjs` (expose global functions) và `index.html` (thêm containers).

## Context: Codebase Hiện Tại

### Tech Stack

- **Backend**: Express 4.21 + ES Modules — `src/server.mjs` (216 lines)
- **Frontend**: Vanilla HTML + ES Modules — `public/js/app.mjs` (475 lines), 6 JS modules
- **Testing**: Vitest 4.x + Supertest 7.x — 10 test files
- **Config**: `config.json` flat file

### Foundation Available

- `src/server.mjs` — API routes, collectProject orchestrator, cache
- `src/utils/file-helpers.mjs` — `readFileSafe`, `run` (exec git commands)
- `src/utils/cache.mjs` — DataCache with TTL
- `public/js/app.mjs` — Main app: renderMain(), settings, tabs, theme
- `public/js/tabs.mjs` — Tab switching logic
- `public/js/sidebar.mjs` — Sidebar rendering
- `public/js/toast.mjs` — Toast notifications
- `public/index.html` — Shell HTML (117 lines)
- `public/css/dashboard.css` — All styles
- `public/css/tokens.css` — Design tokens (CSS custom properties)

### API Endpoints Available

| Method | Path               | Mô tả                      |
| ------ | ------------------ | -------------------------- |
| GET    | `/api/projects`    | List projects              |
| POST   | `/api/projects`    | Add project                |
| DELETE | `/api/projects`    | Remove project             |
| GET    | `/api/data/:index` | Full project data (cached) |
| GET    | `/api/config`      | Settings (API key masked)  |
| POST   | `/api/config`      | Save settings              |
| DELETE | `/api/cache`       | Clear cache                |

---

## Stream 🔗 A — Deep Links to IDE

**Owner**: Backend + Frontend  
**Scope**: `src/server.mjs`, `public/js/app.mjs`, `public/css/dashboard.css`, `config.json`

| #   | Task                         | Status | Priority | Dependencies | Files affected                                             |
| --- | ---------------------------- | ------ | -------- | ------------ | ---------------------------------------------------------- |
| A1  | IDE scheme config setting    | ✅     | P0       | —            | `src/server.mjs`, `public/js/app.mjs`, `public/index.html` |
| A2  | Deep link helper module      | ✅     | P0       | A1           | `public/js/deep-links.mjs` [NEW]                           |
| A3  | Commit hash → IDE diff links | ✅     | P0       | A2           | `public/js/app.mjs`                                        |
| A4  | Hotspot files → open in IDE  | ✅     | P1       | A2           | `public/js/app.mjs`                                        |

**Acceptance Criteria:**

- A1: Settings modal có dropdown chọn IDE (VS Code, Cursor, WebStorm, Zed), giá trị lưu vào `config.json`, API `/api/config` trả về `ideScheme`
- A2: Module `deep-links.mjs` export hàm `makeFileLink(filePath, line)` và `makeDiffLink(hash)` dựa trên configured IDE scheme
- A3: Commit hash trong tab Commits có link click mở diff trong IDE
- A4: File name trong tab Hotspots có link click mở file trong IDE

---

## Stream 📝 B — In-Browser Markdown Editing

**Owner**: Backend + Frontend  
**Scope**: `src/server.mjs`, `public/js/editor.mjs` [NEW], `public/css/dashboard.css`

| #   | Task                      | Status | Priority | Dependencies | Files affected                                                                |
| --- | ------------------------- | ------ | -------- | ------------ | ----------------------------------------------------------------------------- |
| B1  | Read/Write file API       | 📋     | P0       | —            | `src/server.mjs`                                                              |
| B2  | Editor modal UI           | 📋     | P0       | B1           | `public/js/editor.mjs` [NEW], `public/index.html`, `public/css/dashboard.css` |
| B3  | Markdown preview          | 📋     | P1       | B2           | `public/js/editor.mjs`                                                        |
| B4  | External change detection | 📋     | P1       | B1           | `src/server.mjs`, `public/js/editor.mjs`                                      |

**Acceptance Criteria:**

- B1: API `GET /api/file?path=...` trả nội dung file, `PUT /api/file` lưu nội dung + trả `lastModified`. Chỉ cho phép edit files trong project path, `.md` extension only
- B2: Modal editor full-screen với textarea + save/cancel buttons, mở từ sidebar hoặc tab decisions/issues
- B3: Split view: editor bên trái, preview bên phải (rendered markdown → HTML)
- B4: Server trả `lastModified` timestamp, client check trước khi save → warn conflict nếu file changed externally

---

## Stream 🔍 C — Search & Filter

**Owner**: Frontend  
**Scope**: `public/js/search.mjs` [NEW], `public/js/app.mjs`, `public/index.html`, `public/css/dashboard.css`

| #   | Task                         | Status | Priority | Dependencies | Files affected                                                                |
| --- | ---------------------------- | ------ | -------- | ------------ | ----------------------------------------------------------------------------- |
| C1  | Search UI (Cmd+K palette)    | 📋     | P0       | —            | `public/js/search.mjs` [NEW], `public/index.html`, `public/css/dashboard.css` |
| C2  | Search across data           | 📋     | P0       | C1           | `public/js/search.mjs`                                                        |
| C3  | Date range filter cho charts | 📋     | P1       | —            | `public/js/app.mjs`, `public/js/charts.mjs`, `src/server.mjs`                 |
| C4  | Commit filter by author/type | 📋     | P1       | —            | `public/js/app.mjs`                                                           |
| C5  | Keyboard shortcuts (tabs)    | 📋     | P1       | —            | `public/js/search.mjs`                                                        |

**Acceptance Criteria:**

- C1: Cmd+K (Mac) / Ctrl+K opens command palette overlay, fuzzy search bar, kết quả list navigable bằng arrow keys, Enter select
- C2: Search across commits (hash, message), files (hotspot), versions, issues, decisions — kết quả grouped by category
- C3: Date picker filter trên chart cards, filter commits trong range → re-render charts
- C4: Dropdown filter trên tab Commits: filter by author, filter by type (feat/fix/refactor/docs)
- C5: Cmd+1..6 switch tabs, Cmd+R refresh, Esc close modals, `/` focuses search

---

## Cross-Stream Dependencies

### Dependency Map

| Task | Depends on | Type      | Notes                       |
| ---- | ---------- | --------- | --------------------------- |
| A2   | A1         | in-stream | Cần IDE scheme config trước |
| A3   | A2         | in-stream | Cần deep-links helper       |
| A4   | A2         | in-stream | Cần deep-links helper       |
| B2   | B1         | in-stream | Cần API trước khi build UI  |
| B3   | B2         | in-stream | Cần editor modal trước      |
| B4   | B1         | in-stream | Cần lastModified từ API     |
| C2   | C1         | in-stream | Cần search UI trước         |

### Execution Order

Các streams **hoàn toàn independent**, có thể chạy song song:

- Stream A: A1 → A2 → A3 + A4 (parallel)
- Stream B: B1 → B2 → B3, B4 (parallel sau B2)
- Stream C: C1 → C2, rồi C3 + C4 + C5 (independent)

## Conflict Prevention Rules

### Shared Files

| File                       | Stream A | Stream B | Stream C | Rule                                                                |
| -------------------------- | -------- | -------- | -------- | ------------------------------------------------------------------- |
| `src/server.mjs`           | A1       | B1, B4   | C3       | B1 adds routes first, A1 adds config, C3 adds query param           |
| `public/index.html`        | A1       | B2       | C1       | Each adds container/modal, non-overlapping regions                  |
| `public/js/app.mjs`        | A3, A4   | —        | C3, C4   | A modifies renderMain tabs, C adds filters — different tab sections |
| `public/css/dashboard.css` | —        | B2       | C1       | B adds editor styles, C adds search styles — no overlap             |

### Merge Strategy

- Mỗi stream tạo **new files** riêng → zero conflict
- Shared files: mỗi stream sửa **different sections** → merge tự nhiên
- Sync point: sau tất cả streams → verify toàn bộ, resolve nếu có conflict

## Progress Summary

| Stream  | Total  | Done  | Remaining | %       |
| ------- | ------ | ----- | --------- | ------- |
| 🔗 A    | 4      | 4     | 0         | 100%    |
| 📝 B    | 4      | 0     | 4         | 0%      |
| 🔍 C    | 5      | 0     | 5         | 0%      |
| **All** | **13** | **4** | **9**     | **31%** |
