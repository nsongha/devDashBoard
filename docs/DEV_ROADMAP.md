# Dev Dashboard — Kế Hoạch Phát Triển

> Trạng thái: **v1.0.0 — Post-Release** · Mục tiêu tiếp theo: Enhancement & Maintenance

## Tổng quan hiện trạng

| Khía cạnh | Hiện tại                                                |
| --------- | ------------------------------------------------------- |
| Backend   | `server.mjs` modular Express + 9 parsers + 5 collectors |
| Frontend  | Vanilla HTML + ES Modules — 17 modular JS files         |
| Data      | Git CLI + dual-mode parsing (regex + Gemini AI)         |
| Realtime  | WebSocket (git watcher + GitHub webhooks)               |
| Config    | `config.json` (non-sensitive) + `.env` (secrets)        |
| Testing   | Vitest + Supertest — 100+ test cases                    |
| PWA       | Service Worker, manifest, offline fallback, installable |

---

## Phase 1 — Foundation & Code Quality (v0.2.0) ✅

> 🎯 Mục tiêu: Tách code, thêm tests, cải thiện DX
> ✅ Hoàn thành: v0.2.0 — 2026-03-03

### 1.1 Restructure codebase

- [x] Tách `server.mjs` → modules riêng:
  - `src/server.mjs` — Express app setup + routes
  - `src/collectors/git-stats.mjs` — Git data collection
  - `src/parsers/task-board.mjs` — TASK_BOARD parser
  - `src/parsers/changelog.mjs` — CHANGELOG parser
  - `src/parsers/known-issues.mjs` — KNOWN_ISSUES parser
  - `src/parsers/decisions.mjs` — DECISIONS parser
  - `src/parsers/workflows.mjs` — Workflows/Skills discovery
  - `src/utils/file-helpers.mjs` — readFileSafe, run, etc.
- [x] Tách `index.html` → modular frontend:
  - `public/index.html` — Shell HTML
  - `public/css/dashboard.css` — Extracted styles
  - `public/js/app.mjs` — Main app logic
  - `public/js/charts.mjs` — Chart rendering
  - `public/js/tabs.mjs` — Tab content
  - `public/js/sidebar.mjs` — Sidebar rendering

### 1.2 Testing foundation

- [x] Thêm `vitest` cho unit tests
- [x] Test parsers (input markdown → expected output) — 13 cases
- [x] Test API endpoints (supertest) — 5 cases

### 1.3 Developer experience

- [x] ESLint + Prettier config (flat config)
- [x] `npm run lint`, `npm run test`
- [x] Cải thiện error handling (try-catch boundaries, user-friendly errors)

### Deliverable

- ✅ Cùng features, code sạch hơn, có test coverage cơ bản

---

## Phase 2 — UI/UX Overhaul (v0.3.0) ✅

> 🎯 Mục tiêu: Dashboard đẹp, responsive, dark mode
> ✅ Hoàn thành: Integrated across v0.2.0–v1.0.0

### 2.1 Design system

- [x] CSS custom properties (design tokens cho colors, spacing, typography) — `tokens.css`
- [x] Dark mode / Light mode toggle (system preference + manual)
- [x] Typography: Google Fonts (Inter / JetBrains Mono cho code)

### 2.2 Layout hiện đại

- [x] CSS Grid layout cho dashboard (responsive breakpoints)
- [x] Collapsible sidebar
- [x] Card-based UI cho stats panels
- [x] Glassmorphism subtle effects cho cards

### 2.3 Charts upgrade

- [x] Chart.js rendering với theming
- [x] Theming charts theo dark/light mode
- [x] Thêm tooltips chi tiết
- [x] Animated transitions khi switch project

### 2.4 Micro-interactions

- [x] Smooth page transitions
- [x] Loading skeletons thay vì blank state
- [x] Toast notifications cho add/remove project
- [x] Hover effects trên cards + tabs

### Deliverable

- ✅ UI premium, responsive, dark mode, smooth animations

---

## Phase 3 — Smart Data & AI-Powered Parsing (v0.3.0) ✅

> 🎯 Mục tiêu: Thay regex bằng AI parsing, data caching
> ✅ Hoàn thành: v0.3.0 — 2026-03-03

### 3.1 Intelligent docs parsing

- [x] Gemini API integration cho markdown parsing — `gemini-client.mjs`
- [x] Structured extraction: phases, streams, issues từ bất kỳ format
- [x] Fallback to regex khi AI unavailable — `ai-parser.mjs`
- [x] Config: API key setting trong dashboard — Settings modal

### 3.2 Data layer improvements

- [x] In-memory cache với TTL — `cache.mjs` (60s prod / 0s dev)
- [x] Incremental git data collection (skip khi HEAD hash không đổi)
- [x] Background worker cho data refresh — `worker.mjs` (2 phút)

### 3.3 Thêm data insights

- [x] Commit message analysis (categories: feat/fix/refactor/docs) — `commit-analyzer.mjs`
- [x] Author statistics (cho team projects) — `author-stats.mjs`
- [x] Sprint velocity trends (so sánh across weeks) — `velocity-trends.mjs`
- [x] File coupling detection (files thường thay đổi cùng nhau) — `file-coupling.mjs`

### Deliverable

- ✅ AI-powered parsing, faster data loading, richer insights

---

## Phase 4 — Interactive Features (v0.5.0) ✅

> 🎯 Mục tiêu: Deep links, in-browser editing, search
> ✅ Hoàn thành: v0.5.0 — 2026-03-03

### 4.1 Deep links to IDE

- [x] `vscode://file/{path}:{line}` links cho commits, hotspots — `deep-links.mjs`
- [x] Configurable IDE scheme (VS Code, Cursor, WebStorm, Zed + Antigravity)
- [x] One-click open file from hotspot list
- [x] One-click open commit diff

### 4.2 In-browser markdown editing

- [x] Edit TASK_BOARD.md trực tiếp trong dashboard — `editor.mjs`
- [x] Edit KNOWN_ISSUES.md, DECISIONS_LOG.md
- [x] Markdown preview + save API — split view + toolbar
- [x] Conflict detection (file changed externally) — 409 + dialog

### 4.3 Search & filter

- [x] Global search across commits, files, versions — `search.mjs` (Cmd+K)
- [x] Date range filter cho charts
- [x] Filter commits by author/type
- [x] Keyboard shortcuts (Cmd+K search, Cmd+1/2/3 tabs, Cmd+R refresh)

### Deliverable

- ✅ IDE integration, edit docs in-browser, powerful search

---

## Phase 5 — Integrations & Multi-Source (v0.6.0) ✅

> 🎯 Mục tiêu: GitHub/GitLab API, webhooks, notifications
> ✅ Hoàn thành: v0.6.0 — 2026-03-04

### 5.1 GitHub integration

- [x] Pull request stats (open/merged/review time) — `github-pr.mjs`
- [x] Issue tracker integration — `github-issues.mjs`
- [x] CI/CD pipeline status — `github-ci.mjs`
- [x] Branch comparison view — `github-branches.mjs`

### 5.2 Webhooks & real-time

- [x] WebSocket cho real-time updates (git push → auto refresh) — `websocket.mjs` + `realtime.mjs`
- [x] Webhook endpoint nhận GitHub events — `github-webhook.mjs` (HMAC SHA-256)
- [x] Desktop notification khi có commit/PR mới — `notifications.mjs`

### 5.3 Export & sharing

- [x] Export dashboard as PNG/PDF — `export.mjs` (html2canvas + jsPDF)
- [x] Shareable report links (read-only) — `report.mjs` (static HTML)
- [ ] Email digest (weekly summary) — deferred

### Deliverable

- ✅ External integrations, real-time updates, sharing

---

## Phase 6 — PWA & Polish (v1.0.0) ✅

> 🎯 Mục tiêu: ~~Electron wrapper~~ → PWA, team features, production polish
> ✅ Hoàn thành: v1.0.0 — 2026-03-04
> 📝 Quyết định: PWA thay Electron — nhẹ hơn, cross-platform, zero extra deps

### 6.1 PWA (thay Electron)

- [x] Service Worker (cache-first shell, network-first API, offline fallback) — `sw.js`
- [x] Web App Manifest (standalone display, icons) — `manifest.json`
- [x] Install prompt + PWAManager — `pwa.mjs`
- [x] Offline fallback page — `offline.html`

### 6.2 Team features

- [x] Team Overview tab (contributors ranking, active days) — `team.mjs`
- [x] Role-based views (developer vs team lead) — `app.mjs` viewMode
- [ ] Team-wide statistics aggregation — partial (per-author only)

### 6.3 Production polish

- [x] Performance audit + optimization (lazy insights, parallel loading, preconnect)
- [x] Accessibility (WCAG 2.1 AA — landmarks, ARIA roles, focus ring, contrast)
- [x] Documentation site (USAGE.md, DEPLOYMENT.md)
- [ ] Release pipeline (GitHub Releases + installers) — N/A (PWA)

### Deliverable

- ✅ PWA app, team features, production-ready v1.0.0

---

## Post-Release — Enhancement & Maintenance

> 🎯 Trạng thái hiện tại

### Done

- [x] Dev Mode toggle (NODE_ENV=development → tắt tất cả cache, SW disabled)
- [x] QC Report tab + parser (178 test cases, release checklist)
- [x] Known Issues tab (filter by category/severity)
- [x] XSS sanitization (escapeHtml utility)
- [x] Parallel data loading (6s → 2s)
- [x] Git watcher filter (.lock files, remotes/)
- [x] GitHub config cache invalidation
- [x] Flexible parsers (support .agents/, docs/CHANGELOG, flexible version)
- [x] Task board parser (no em dash separator support)
- [x] Roadmap phases in sidebar (DEV_ROADMAP.md parser + UI)
- [x] Native macOS folder picker (osascript)

### Planned

- [ ] GitLab integration
- [ ] Monitor production usage
- [ ] Auto-update DEV_ROADMAP checkboxes from code changes

---

## Tổng kết Roadmap

```
v0.1.0 ──→ v0.2.0 ──→ v0.3.0 ──→ v0.5.0 ──→ v0.6.0 ──→ v1.0.0
Working   Phase 1    Phase 2+3   Phase 4    Phase 5    Phase 6
Proto     Code       UI + AI     Interactive Integrate  PWA &
 ✅      Quality ✅  Data ✅     DONE ✅     DONE ✅    Polish ✅
```

## Nguyên tắc phát triển

1. **Mỗi phase phải giữ app hoạt động** — không break existing features
2. **Phase 1 là bắt buộc trước** — nền tảng code quality cho mọi phase sau
3. **Phase 2-4 có thể song song một phần** — nhưng khuyến khích tuần tự
4. **Phase 5-6 là nice-to-have** — có thể bỏ nếu scope thay đổi
5. **Mỗi phase kết thúc bằng version bump** + CHANGELOG update

## Quyết định đã chốt ✅

1. **Giữ Vanilla HTML + ES Modules** — Nhẹ, zero build step, phù hợp internal dev tool. Modularize bằng ES Modules là đủ.
2. **AI parsing là optional** — Phase 3 sẽ improve regex parser trước, Gemini API là enhancement thêm nếu cần.
3. **PWA thay Electron** — Nhẹ hơn, không thêm dependency nặng, cross-platform qua browser.
4. **Phase 1 (Code Quality) trước** — Nền tảng bắt buộc cho mọi phase sau.
