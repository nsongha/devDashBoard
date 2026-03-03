# Phase 6 Task Board — Desktop App & Polish (v1.0.0)

> 🎯 Mục tiêu: PWA packaging, team features, production polish
> Version target: v1.0.0

## Parallel Execution Strategy

Phase 6 có 14 tasks chia 3 streams theo domain:

- **Stream A — PWA & Offline**: Service Worker, installable, offline support, system tray popup (Backend/Infra)
- **Stream B — Performance & Accessibility**: Audit performance, WCAG 2.1 AA, loading UX (Frontend-heavy)
- **Stream C — Team Features & Documentation**: Multi-user views, team stats, docs site, release pipeline (Full-stack)

Streams A và B **hoàn toàn independent**. Stream C phụ thuộc vào một số thành phần của A và B hoàn thành.

## Context: Codebase Hiện Tại

### Tech Stack

- **Backend**: Node.js + Express 4.21 + ES Modules — `src/server.mjs`
- **Frontend**: Vanilla HTML + ES Modules — modular JS (`public/js/`)
- **WebSocket**: `ws` package — `src/utils/websocket.mjs`
- **Testing**: Vitest 4.x + Supertest 7.x — 64+ tests
- **Version hiện tại**: 0.6.0 (Phase 5 done)

### Foundation Available

- `public/index.html` — Shell HTML + <head> cho Web App Manifest
- `public/css/dashboard.css` — Full styles + design tokens
- `public/js/app.mjs` — Main orchestrator (settings, tabs, theme, filters)
- `public/js/realtime.mjs` — WebSocket client (auto-reconnect)
- `public/js/notifications.mjs` — Desktop Notification API
- `src/server.mjs` — Express routes, data orchestration, cache, WebSocket
- `src/utils/websocket.mjs` — WebSocket server broadcast
- `src/utils/cache.mjs` — DataCache với TTL
- `src/collectors/author-stats.mjs` — Per-author statistics (nền tảng cho team features)

### API Endpoints Available

| Method | Path                   | Mô tả                      |
| ------ | ---------------------- | -------------------------- |
| GET    | `/api/projects`        | List projects              |
| GET    | `/api/data/:index`     | Full project data (cached) |
| GET    | `/api/config`          | Settings                   |
| POST   | `/api/config`          | Save settings              |
| GET    | `/api/github/prs`      | PR stats                   |
| GET    | `/api/github/issues`   | Issue stats                |
| POST   | `/api/reports`         | Tạo shareable report       |
| POST   | `/api/webhooks/github` | GitHub webhook             |

---

## Stream 📱 A — PWA & Offline

**Owner**: Frontend + Infra
**Scope**: `public/` (manifest, service worker, icons), `src/server.mjs` (headers)

| #   | Task                           | Status | Priority | Dependencies | Files affected                                                  |
| --- | ------------------------------ | ------ | -------- | ------------ | --------------------------------------------------------------- |
| A1  | Web App Manifest               | ✅     | P0       | —            | `public/manifest.json` [NEW], `public/index.html`               |
| A2  | Service Worker (offline cache) | ✅     | P0       | A1           | `public/sw.js` [NEW]                                            |
| A3  | App icons + splash screens     | ✅     | P0       | A1           | `public/icons/` [NEW folder]                                    |
| A4  | Install prompt UI              | ✅     | P1       | A1, A2       | `public/js/pwa.mjs` [NEW], `public/index.html`, `dashboard.css` |
| A5  | Offline fallback page          | ✅     | P1       | A2           | `public/offline.html` [NEW], `public/sw.js`                     |

**Acceptance Criteria:**

- A1: `manifest.json` có đủ `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `icons`. `<link rel="manifest">` trong `index.html`. Lighthouse PWA score ≥ 80
- A2: Service Worker cache shell (HTML/CSS/JS), intercept fetch → serve cache khi offline. `Cache-Control` headers phù hợp
- A3: Icons png 192x192 và 512x512 (có maskable variant), favicon.ico updated
- A4: `BeforeInstallPromptEvent` được giữ lại, nút "Cài đặt App" xuất hiện trong settings khi available, khi click trigger install
- A5: Khi offline và request URL mới không có cache → route đến `offline.html` với thông báo thân thiện

---

## Stream ⚡ B — Performance & Accessibility

**Owner**: Frontend
**Scope**: `public/js/`, `public/css/dashboard.css`, `public/index.html`

| #   | Task                             | Status | Priority | Dependencies | Files affected                                                |
| --- | -------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------------- |
| B1  | Performance audit & optimization | 📋     | P0       | —            | `public/js/app.mjs`, `public/js/charts.mjs`, `src/server.mjs` |
| B2  | WCAG 2.1 AA — Semantic & ARIA    | 📋     | P0       | —            | `public/index.html`, `public/js/app.mjs`, `dashboard.css`     |
| B3  | WCAG 2.1 AA — Color contrast     | 📋     | P0       | —            | `public/css/tokens.css`, `public/css/dashboard.css`           |
| B4  | Keyboard navigation full audit   | 📋     | P1       | B2           | `public/js/app.mjs`, `public/js/search.mjs`, `editor.mjs`     |
| B5  | Loading UX improvements          | 📋     | P1       | —            | `public/js/app.mjs`, `public/css/dashboard.css`               |

**Acceptance Criteria:**

- B1: Lighthouse Performance score ≥ 85. Chart.js lazy render (chỉ render tab đang active). Server response time p95 < 200ms với cache warm
- B2: Tất cả interactive elements có `role`, `aria-label`, hoặc visible label. Headings hierarchy hợp lệ. `<main>`, `<nav>`, `<aside>` landmarks. Image alt text
- B3: Text trên background đạt ratio ≥ 4.5:1 (AA). Focus ring visible rõ ràng (≥ 3px, high contrast)
- B4: Tab order logic, arrow key navigation trong dropdown/palette, Escape đóng modal focus-trapped. Screen reader test (VoiceOver)
- B5: Skeleton loader cho charts khi đang load. Error state UI thân thiện (không chỉ console.error). Empty state cho tabs không có data

---

## Stream 👥 C — Team Features & Documentation

**Owner**: Full-stack
**Scope**: `src/`, `public/js/`, `docs/`

| #   | Task                      | Status | Priority | Dependencies | Files affected                                                                                       |
| --- | ------------------------- | ------ | -------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| C1  | Team overview tab         | 📋     | P0       | —            | `public/js/team.mjs` [NEW], `public/index.html`, `src/server.mjs`                                    |
| C2  | Role-based views (config) | 📋     | P0       | C1           | `src/server.mjs`, `public/js/app.mjs`, `config.json schema`                                          |
| C3  | GitLab API integration    | 📋     | P1       | —            | `src/integrations/gitlab-client.mjs` [NEW], `src/integrations/gitlab-mr.mjs` [NEW], `src/server.mjs` |
| C4  | Documentation site        | 📋     | P1       | —            | `docs/USAGE.md` [NEW], `docs/DEPLOYMENT.md` [NEW]                                                    |

**Acceptance Criteria:**

- C1: Tab mới "👥 Team" hiển thị: per-author commit counts, top contributors (30 days), commit heatmap per day-of-week per author. Data từ `author-stats.mjs` + git log
- C2: Settings có toggle "View Mode": `developer` (default, full features) vs `team-lead` (ẩn raw commits, show summary stats only). Mode lưu vào `config.json`, frontend đọc và adjust rendering
- C3: Tab 🦊 GitLab tương tự tab GitHub: MR stats (open/merged), issues, CI status. Cần GitLab token + project ID trong settings
- C4: `USAGE.md` — hướng dẫn cài đặt + config từ đầu. `DEPLOYMENT.md` — Docker, PM2, reverse proxy guide. Cả 2 file hiển thị trong dashboard tab Workflows

---

## Cross-Stream Dependencies

### Dependency Map

| Task | Depends on | Type      | Notes                                     |
| ---- | ---------- | --------- | ----------------------------------------- |
| A2   | A1         | in-stream | Cần manifest trước khi register SW        |
| A4   | A1, A2     | in-stream | Cần SW registered để BeforeInstallPrompt  |
| A5   | A2         | in-stream | Cần SW để intercept offline requests      |
| B4   | B2         | in-stream | ARIA trước, rồi mới test keyboard flow    |
| C2   | C1         | in-stream | Cần Team tab trước khi add role filtering |

### Execution Order

- **Stream A** và **Stream B** hoàn toàn independent, chạy song song ngay:
  - A1 → A2 → A3 (parallel) → A4, A5 (parallel)
  - B1 + B2 + B3 (parallel) → B4, B5 (parallel)
- **Stream C** độc lập, chạy song song:
  - C1 → C2, C3 (parallel)
  - C4 (hoàn toàn independent, chạy bất kỳ lúc nào)

## Conflict Prevention Rules

### Shared Files

| File                       | Stream A | Stream B | Stream C | Rule                                                                                       |
| -------------------------- | -------- | -------- | -------- | ------------------------------------------------------------------------------------------ |
| `public/index.html`        | A1, A4   | B2       | C1       | A1 thêm `<link manifest>` + `<script>`, B2 thêm ARIA attrs, C1 thêm tab. Regions khác nhau |
| `src/server.mjs`           | —        | —        | C1, C2   | C1 thêm route `/api/team`, C2 thêm role logic — sequential                                 |
| `public/js/app.mjs`        | —        | B2, B5   | C2       | B modifies render fns để thêm ARIA; C2 adds role check — different sections                |
| `public/css/dashboard.css` | A4       | B3, B5   | —        | A4 thêm install button styles, B3 fix color vars, B5 thêm skeleton — append only           |
| `public/css/tokens.css`    | —        | B3       | —        | B3 sở hữu hoàn toàn, không ai khác sửa                                                     |

### Merge Strategy

- Stream A: tạo files mới (`manifest.json`, `sw.js`, `icons/`, `pwa.mjs`, `offline.html`) — **zero conflict**
- Stream B: sửa existing files nhưng khác sections → merge tự nhiên
- Stream C: tạo file mới `team.mjs`, route mới trong `server.mjs`
- Sync point: sau tất cả streams → verify Lighthouse PWA score, accessibility audit, team tab

## Progress Summary

| Stream  | Total  | Done  | Remaining | %       |
| ------- | ------ | ----- | --------- | ------- |
| 📱 A    | 5      | 5     | 0         | 100%    |
| ⚡ B    | 5      | 0     | 5         | 0%      |
| 👥 C    | 4      | 0     | 4         | 0%      |
| **All** | **14** | **5** | **9**     | **36%** |
