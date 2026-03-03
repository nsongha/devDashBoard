# Dev Dashboard — Kế Hoạch Phát Triển

> Trạng thái: **v0.5.0 — Phase 4 Done** → Mục tiêu: **v1.0.0 — Production-Ready Developer Tool**

## Tổng quan hiện trạng

| Khía cạnh  | Hiện tại                                                     |
| ---------- | ------------------------------------------------------------ |
| Backend    | `server.mjs` monolithic (367 lines) — Express + Git CLI      |
| Frontend   | `index.html` monolithic (30KB) — Vanilla HTML + Chart.js CDN |
| Data       | Git CLI sync + regex-based markdown parsing                  |
| Config     | `config.json` flat file                                      |
| Dependency | Chỉ `express` — zero other deps                              |

### Đánh giá

- ✅ **Ưu điểm**: Zero config, hoạt động tốt, nhẹ, nhanh
- ⚠️ **Hạn chế**: Monolithic files khó maintain, regex parsing fragile, không có tests, không có error boundaries, UI chưa responsive

---

## Phase 1 — Foundation & Code Quality (v0.2.0)

> 🎯 Mục tiêu: Tách code, thêm tests, cải thiện DX
> ⏱️ Ước tính: 2-3 sessions

### 1.1 Restructure codebase

- [ ] Tách `server.mjs` → modules riêng:
  - `src/server.mjs` — Express app setup + routes
  - `src/collectors/git-stats.mjs` — Git data collection
  - `src/parsers/task-board.mjs` — TASK_BOARD parser
  - `src/parsers/changelog.mjs` — CHANGELOG parser
  - `src/parsers/issues.mjs` — KNOWN_ISSUES parser
  - `src/parsers/decisions.mjs` — DECISIONS_LOG parser
  - `src/parsers/workflows.mjs` — Workflows/Skills discovery
  - `src/utils/file-helpers.mjs` — readFileSafe, run, etc.
- [ ] Tách `index.html` → modular frontend:
  - `public/index.html` — Shell HTML
  - `public/css/dashboard.css` — Extracted styles
  - `public/js/app.mjs` — Main app logic
  - `public/js/charts.mjs` — Chart rendering
  - `public/js/tabs.mjs` — Tab content
  - `public/js/sidebar.mjs` — Sidebar rendering

### 1.2 Testing foundation

- [ ] Thêm `vitest` cho unit tests
- [ ] Test parsers (input markdown → expected output)
- [ ] Test API endpoints (supertest)

### 1.3 Developer experience

- [ ] ESLint + Prettier config
- [ ] `npm run lint`, `npm run test`
- [ ] Cải thiện error handling (try-catch boundaries, user-friendly errors)

### Deliverable

- Cùng features, code sạch hơn, có test coverage cơ bản

---

## Phase 2 — UI/UX Overhaul (v0.3.0)

> 🎯 Mục tiêu: Dashboard đẹp, responsive, dark mode
> ⏱️ Ước tính: 3-4 sessions

### 2.1 Design system

- [ ] CSS custom properties (design tokens cho colors, spacing, typography)
- [ ] Dark mode / Light mode toggle (system preference + manual)
- [ ] Typography: Google Fonts (Inter / JetBrains Mono cho code)

### 2.2 Layout hiện đại

- [ ] CSS Grid layout cho dashboard (responsive breakpoints)
- [ ] Collapsible sidebar
- [ ] Card-based UI cho stats panels
- [ ] Glassmorphism subtle effects cho cards

### 2.3 Charts upgrade

- [ ] Migrate Chart.js → `chart.js` npm package (không CDN)
- [ ] Theming charts theo dark/light mode
- [ ] Thêm tooltips chi tiết
- [ ] Animated transitions khi switch project

### 2.4 Micro-interactions

- [ ] Smooth page transitions
- [ ] Loading skeletons thay vì blank state
- [ ] Toast notifications cho add/remove project
- [ ] Hover effects trên cards + tabs

### Deliverable

- UI premium, responsive, dark mode, smooth animations

---

## Phase 3 — Smart Data & AI-Powered Parsing (v0.4.0)

> 🎯 Mục tiêu: Thay regex bằng AI parsing, data caching
> ⏱️ Ước tính: 2-3 sessions

### 3.1 Intelligent docs parsing

- [ ] Gemini API integration cho markdown parsing
- [ ] Structured extraction: phases, streams, issues từ bất kỳ format
- [ ] Fallback to regex khi AI unavailable
- [ ] Config: API key setting trong dashboard

### 3.2 Data layer improvements

- [ ] In-memory cache với TTL (tránh re-collect mỗi request)
- [ ] Incremental git data collection (chỉ fetch commits mới)
- [ ] Background worker cho data refresh (không block API response)

### 3.3 Thêm data insights

- [ ] Commit message analysis (categories: feat/fix/refactor/docs)
- [ ] Author statistics (cho team projects)
- [ ] Sprint velocity trends (so sánh across sprints)
- [ ] File coupling detection (files thường thay đổi cùng nhau)

### Deliverable

- AI-powered parsing, faster data loading, richer insights

---

## Phase 4 — Interactive Features (v0.5.0)

> 🎯 Mục tiêu: Deep links, in-browser editing, search
> ⏱️ Ước tính: 3-4 sessions

### 4.1 Deep links to IDE

- [ ] `vscode://file/{path}:{line}` links cho commits, hotspots
- [ ] Configurable IDE scheme (VS Code, Cursor, WebStorm, Zed)
- [ ] One-click open file from hotspot list
- [ ] One-click open commit diff

### 4.2 In-browser markdown editing

- [ ] Edit TASK_BOARD.md trực tiếp trong dashboard
- [ ] Edit KNOWN_ISSUES.md, DECISIONS_LOG.md
- [ ] Markdown preview + save API
- [ ] Conflict detection (file changed externally)

### 4.3 Search & filter

- [ ] Global search across commits, files, issues
- [ ] Date range filter cho charts
- [ ] Filter commits by author/type
- [ ] Keyboard shortcuts (Cmd+K search, Cmd+1/2/3 tabs)

### Deliverable

- IDE integration, edit docs in-browser, powerful search

---

## Phase 5 — Integrations & Multi-Source (v0.6.0)

> 🎯 Mục tiêu: GitHub/GitLab API, webhooks, notifications
> ⏱️ Ước tính: 3-4 sessions

### 5.1 GitHub/GitLab integration

- [ ] Pull request stats (open/merged/review time)
- [ ] Issue tracker integration
- [ ] CI/CD pipeline status
- [ ] Branch comparison view

### 5.2 Webhooks & real-time

- [ ] WebSocket cho real-time updates (git push → auto refresh)
- [ ] Webhook endpoint nhận GitHub events
- [ ] Desktop notification khi có PR/issue mới

### 5.3 Export & sharing

- [ ] Export dashboard as PNG/PDF
- [ ] Shareable report links (read-only)
- [ ] Email digest (weekly summary)

### Deliverable

- External integrations, real-time updates, sharing

---

## Phase 6 — Desktop App & Polish (v1.0.0)

> 🎯 Mục tiêu: Electron wrapper, system tray, production polish
> ⏱️ Ước tính: 3-4 sessions

### 6.1 Electron packaging

- [ ] Electron wrapper cho cross-platform desktop app
- [ ] System tray icon + quick stats popup
- [ ] Auto-start option
- [ ] Auto-update mechanism

### 6.2 Team features

- [ ] Multi-user dashboard (shared deployment)
- [ ] Role-based views (developer vs team lead)
- [ ] Team-wide statistics aggregation

### 6.3 Production polish

- [ ] Performance audit + optimization
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Documentation site
- [ ] Release pipeline (GitHub Releases + installers)

### Deliverable

- Desktop app, team features, production-ready v1.0.0

---

## Tổng kết Roadmap

```
v0.1.0 ──→ v0.2.0 ──→ v0.3.0 ──→ v0.4.0 ──→ v0.5.0 ──→ v0.6.0 ──→ v1.0.0
 NOW     Phase 1    Phase 2    Phase 3    Phase 4    Phase 5    Phase 6
Working  Code       UI/UX      AI Data    Interactive Integrate  Desktop
Proto    Quality    Overhaul   DONE ✅     DONE ✅     Features   & Polish
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
