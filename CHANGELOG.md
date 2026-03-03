# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

### Changed

- **`generateReportHtml()` refactor** (`src/export/report.mjs`): Tách hàm 199-line thành 5 helper functions — `buildReportStyles()`, `buildStatsSection()`, `buildCommitsSection()`, `buildChangelogSection()`, `buildHotspotsSection()`. Hàm chính còn ~40 lines
- **GitHub cache extraction** (`src/utils/github-cache.mjs`): Tách custom `Map`-based cache ra module riêng dùng singleton `DataCache` (TTL 5 phút). Tuân thủ SRP — `server.mjs` import `getGithubCache`, `setGithubCache`, `invalidateGithubCache`
- **`loadConfig()` lint fix** (`src/server.mjs`): Bỏ redundant initial `let fileConfig = {}` — khai báo không init, cả `try` và `catch` đều assign lại
- **`.env.example`**: Đổi `GITHUB_OWNER=nsongha` (hardcode thật) → `GITHUB_OWNER=your_github_username`

## [1.0.0] — 2026-03-04

> Phase 6 — Desktop App & Polish (PWA, Accessibility, Team Features)

### Added

- **Commit Frequency View Toggle**: Thêm các nút day/week/month/year vào `commitChart` trên màn hình Dashboard (`public/js/app.mjs` và `public/js/charts.mjs`). Grouping data tính toán ở frontend để hiển thị frequency theo 4 khoảng thời gian khác nhau.
- **Add Project Modal Redesign**: Chuyển modal "Add Project" thành dạng 2 tabs (Local Folder và GitHub Repo) để cải thiện UX
- **Local Folder Picker**: Nút "Browse Folder..." mở window file picker (webkitdirectory). Chặn lỗi bảo mật đường dẫn tuyệt đối của trình duyệt bằng prompt fallback
- **GitHub Repo Picker**: Dropdown tự động fetch và hiển thị repos của user qua `GET /api/github/repos` (cached 5 phút)
- **Settings Sync**: Tab GitHub repo trong modal liên kết trực tiếp với configuration (`githubOwner`, `githubRepo`) để hiển thị PRs/Issues
- **Web App Manifest** (`public/manifest.json`): `name`, `short_name`, `display: standalone`, `theme_color: #7c6cf0`, `background_color: #0a0a10`, icons 192/512 (standard + maskable), `categories`, `shortcuts`. `<link rel="manifest">` trong `index.html`
- **Service Worker** (`public/sw.js`): Cache name `devdash-v1`. 3 strategies: Cache-first cho static shell assets (HTML/CSS/JS/vendor), Network-first cho `/api/*` (JSON fallback khi offline), Navigation → `offline.html` fallback. Precache 21 shell assets trên install. Cleanup caches cũ khi activate
- **PWA Icons** (`public/icons/`): 4 files SVG-based — `icon-192.png`, `icon-192-maskable.png`, `icon-512.png`, `icon-512-maskable.png`. Design: dark gradient + purple monogram "DD" + glow effects + green status dot
- **PWA Manager** (`public/js/pwa.mjs`): `PWAManager` class — register SW, capture `BeforeInstallPromptEvent`, `triggerInstall()` gọi native install dialog, track `appinstalled` event, check `display-mode: standalone`
- **Install button**: Nút "📲 Cài đặt Dev Dashboard" trong Settings modal, ẩn mặc định, hiện khi `beforeinstallprompt` triggered
- **Offline fallback page** (`public/offline.html`): Standalone page (inline CSS, zero dependencies), pulse animation, status indicator theo dõi `navigator.onLine`, auto-redirect khi có mạng
- **PWA meta tags** trong `index.html`: `<meta name="apple-mobile-web-app-capable">`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`, `theme-color`
- **Team Overview tab** (`public/js/team.mjs`): Tab mới "👥 Team" — xếp hạng contributors (all-time), bảng per-author commits/lines/active days/top files, active days bar chart (last 90 days). Avatar circle với màu từ hash tên. Lazy render khi click tab. Data source: `DATA.authorStats` từ `author-stats.mjs`
- **Role-based views** (C2): Settings toggle "👁️ View Mode" (`developer` / `team-lead`). Team Lead mode ẩn Commits và Hotspots tabs, mặc định show Versions tab. Mode persist vào `localStorage` và `config.json`. `applyViewMode()` re-render ngay khi thay đổi
- **Documentation** (`docs/USAGE.md`, `docs/DEPLOYMENT.md`): `USAGE.md` — hướng dẫn cài đặt, features overview, keyboard shortcuts, config schema. `DEPLOYMENT.md` — PM2, Docker (Dockerfile + compose), Nginx reverse proxy (WebSocket support), SSL Let's Encrypt, security considerations
- **View Mode** (`config.viewMode`): Trường mới `viewMode` trong `config.json` — `"developer"` (mặc định, full features) vs `"team-lead"` (ẩn raw commits, hiện summary stats). Đọc/lưu qua `GET/POST /api/config`. `src/server.mjs` xử lý validation và persistence
- **B1 — Static asset caching** (`src/server.mjs`): `express.static` nay dùng `setHeaders` callback — CSS/JS/fonts cache `max-age=3600`, HTML files `no-cache, no-store, must-revalidate`
- **B1 — Lazy Insights charts** (`public/js/app.mjs`): `renderInsightsCharts()` không gọi ngay khi load trang nữa — chỉ gọi lần đầu click tab Insights. Flag `_insightsRendered` reset mỗi khi switch project
- **B1 — Preconnect hints** (`public/index.html`): `<link rel="preconnect">` cho `fonts.googleapis.com` và `fonts.gstatic.com` để preconnect trước khi CSS parse
- **B1 — Scripts moved to end of body**: Chart.js, html2canvas, jsPDF và `app.mjs` chuyển xuống cuối `<body>` để không block HTML render
- **B2 — HTML5 semantic landmarks**: `<header role="banner">`, `<nav aria-label="...">`, `<main>` thay cho các `<div>` tương ứng. `role="toolbar"` trên header-right
- **B2 — ARIA tab roles**: `role="tablist"` trên tab container, `role="tab"` + `aria-selected` + `aria-controls` trên mỗi tab button, `role="tabpanel"` + `aria-labelledby` trên mỗi tab content
- **B2 — Modal ARIA**: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` trên tất cả overlay modals (Add Project, Settings, Editor, Conflict Dialog, Search)
- **B2 — Button aria-labels**: Tất cả icon-only buttons và toolbar buttons có `aria-label` tường minh
- **B2 — aria-live regions**: Toast container (`aria-live="polite"`), auto-refresh timer (`aria-live="polite"`), AI status (`aria-live="polite"`)
- **B3 — Color contrast fix** (`public/css/tokens.css`): Dark theme: `--color-text-dim` từ `#7878a0` → `#9898c0` (~5.1:1 ratio), `--color-text-muted` từ `#50506a` → `#7272a0` (~4.6:1). Light theme: `--color-text-dim` từ `#636366` → `#505055` (~5.5:1), `--color-text-muted` từ `#8e8e93` → `#606065` (~5.2:1). Error colors thêm cho mỗi theme
- **B3 — Focus ring** (`public/css/dashboard.css`): `:focus-visible` global rule với `outline: 3px solid var(--color-accent); outline-offset: 2px`. `:focus:not(:focus-visible)` reset về `outline: none` để không show ring khi click
- **B4 — Sidebar aria-expanded**: `toggleSidebar()` cập nhật `aria-expanded` attribute trên button khi state thay đổi
- **B5 — Error state UI** (`public/js/app.mjs`, `public/css/dashboard.css`): `loadProject()` wrap trong try/catch — khi fetch thất bại hiển thị `.error-state` với icon ❌, message, và nút "🔄 Thử lại" wrap `refreshData()`. Thay vì skeleton đứng yên vô thời hạn

### Changed

- **Secrets tách ra `.env`**: `geminiApiKey`, `githubToken`, `githubOwner`, `githubRepo`, `webhookSecret` **không còn lưu trong `config.json`** nữa. Mọi secrets giờ đọc từ `process.env` (load bởi `dotenv` từ `.env`). `saveConfig()` chỉ lưu `NON_SENSITIVE_KEYS`. `saveEnvSecrets()` ghi secrets vào `.env` khi user cập nhật qua Settings UI
- **`config.json` gitignored**: File này không còn chứa sensitive data nhưng vẫn gitignored để tránh commit projects list (đường dẫn local). `.env.example` (template không có giá trị thật) được commit thay thế
- **`resolveEditablePath()`**: Security checks (file extension + path traversal detection) được chuyển lên **trước** project index check — đảm bảo trả `400` cho request sai format dù project chưa được cấu hình

## [0.6.0] — 2026-03-04

> Phase 5 — Integrations & Multi-Source (Stream A: GitHub, Stream B: Real-Time, Stream C: Export)

### Added

- **GitHub API client** (`src/integrations/github-client.mjs`): `GitHubClient` class fetch-based với PAT auth, `Authorization: Bearer`, rate limit warning (< 10 requests), retry 2 lần + exponential backoff, timeout 15s. Factory `createGitHubClient(config)` trả `null` nếu không có token
- **PR stats collector** (`src/integrations/github-pr.mjs`): `collectPRStats()` — lấy open PRs, merged PRs (30d), tính avg merge time (giờ), top 5 labels, 10 recent PRs. Filter bằng `30 * 24h` window
- **Issues stats collector** (`src/integrations/github-issues.mjs`): `collectIssueStats()` — lấy open issues, closed (30d), filter bỏ PRs lẫn vào (check `pull_request` field), top labels, milestones, 10 recent issues
- **GitHub API routes**: `GET /api/github/prs`, `GET /api/github/issues` — cả hai dùng in-memory cache riêng TTL 5 phút. Hỗ trợ `?owner=&repo=` query params hoặc fallback từ config
- **Config API mở rộng**: `POST /api/config` nhận thêm `githubToken`, `githubOwner`, `githubRepo`. `GET /api/config` trả `hasGithubToken`, `githubOwner`, `githubRepo`
- **GitHub tab UI** (`public/js/github.mjs`): `renderGitHubTab()` render stats grid (6 cards), PR list + Issues list side-by-side, labels badges, milestones section, relative time display, empty states khi chưa cấu hình
- **GitHub tab button**: Tab "🐙 GitHub" trong main tabs, lazy-load khi click (`showGitHubTab()`)
- **Settings modal**: Thêm 3 fields: GitHub Token (password), GitHub Owner, GitHub Repo
- **GitHub tab CSS**: `.gh-tab`, `.gh-stats-grid`, `.gh-columns`, `.gh-item`, `.gh-label`, `.gh-milestone`, `.gh-empty` styles
- **ESLint globals**: Thêm `fetch`, `AbortController`, `Headers`, `Response` (Node 18+ built-in Web APIs)
- Unit tests: `github-client.test.mjs` (10 tests), `github-routes.test.mjs` (6 tests)
- **WebSocket server** (`src/utils/websocket.mjs`): `createWebSocketServer()` tích hợp `ws.Server` vào Express HTTP server, heartbeat ping/pong mỗi 30s, `broadcast(type, payload)` gửi event đến tất cả clients, `getClientCount()`
- **Git watcher** (`src/utils/git-watcher.mjs`): `startGitWatcher()` dùng `fs.watch` trên `.git/refs/` của mỗi project, debounce 500ms, broadcast `git:commit` event khi detect new commit. Event-driven, zero CPU waste
- **Real-time client** (`public/js/realtime.mjs`): `initRealtime()` connect WebSocket, auto-reconnect với exponential backoff (1s → 30s), nhận `git:commit` event → trigger dashboard refresh
- **HTTP server upgrade**: `server.mjs` chuyển từ `app.listen()` sang `http.createServer(app)` để WebSocket có thể upgrade HTTP connections
- **Auto-refresh on commit**: Dashboard tự refresh data khi phát hiện commit mới vào project đang xem — không cần polling 30s
- Unit tests: `websocket.test.mjs` (8 tests), `git-watcher.test.mjs` (8 tests)
- Dependency: `ws` v8 (production)
- **Export PNG** (`public/js/export.mjs`): Nút 📸 trong header chụp dashboard bằng `html2canvas` (CDN, client-side). `buildFilename()` tạo tên file `dashboard-<project>-<date>.png`, retina scale 2x, keyboard shortcut ⌘⇧E. 10 unit tests
- **Export PDF** (`public/js/export.mjs`): Nút 📄 Export PDF — html2canvas capture + jsPDF (CDN) tạo A4 landscape PDF. `buildPdfFilename()`. Keyboard shortcut ⌘⇧P. 9 unit tests
- **Shareable Report** (`src/export/report.mjs`): Nút 🔗 Share Report — `POST /api/reports` generate static HTML tự-contained, lưu `public/reports/<8char-id>.html`, served tĩnh. Client copy link vào clipboard. `buildReportId()` (8-char random hex). 16 unit tests
- **GitHub webhook endpoint** (`src/webhooks/github-webhook.mjs`): `POST /api/webhooks/github` nhận `push` và `pull_request` events từ GitHub. Verify HMAC SHA-256 signature (`X-Hub-Signature-256`) với `timingSafeEqual`. Broadcast `github:push` / `github:pr` event qua WebSocket → tất cả clients nhận. Auto-invalidate GitHub cache khi push được nhận. `ping` event được acknowledge. Unit tests: 13 test cases (signature + event parsing)
- **Desktop notifications** (`public/js/notifications.mjs`): `initNotifications()` check permission, `requestNotificationPermission()` request từ user, `notifyOnEvent()` hiển thị notification khi nhận `git:commit`, `github:push`, `github:pr` event. Auto-close sau 5s

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
