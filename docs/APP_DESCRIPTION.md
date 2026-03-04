# Dev Dashboard — App Description

## Mô tả

AI-Assisted Development Dashboard — trực quan hóa project stats, phases, workflows từ git + docs.

Điểm chính tới bất kỳ git repo nào, dashboard tự động thu thập dữ liệu từ git history và markdown files để hiển thị:

- Commit statistics và trends
- Code velocity và language breakdown
- Phase progress và stream tracking
- Issues, tech debt, architecture decisions
- Workflows và AI skills catalog

## Features hiện có (v1.0.0)

### Core

- **Live Data** — Git stats + docs parsing, auto-refresh mỗi 30s
- **Multi-Project** — Dropdown switcher + Add/Remove projects
- **Zero Config** — Point tới bất kỳ git repo nào
- **Modular Codebase** — ES Modules, tách server/parsers/frontend riêng
- **Testing** — Vitest unit tests cho parsers + API endpoints (189 tests)
- **Linting** — ESLint + Prettier config
- **AI-Powered Parsing** — Optional Gemini AI parsing với regex fallback
- **In-Memory Cache** — TTL 60s, background refresh, `X-Cache` headers
- **Incremental Git** — Skip full re-collect khi không có commits mới
- **Deep Links to IDE** — Click file/commit mở thẳng VS Code, Cursor, WebStorm, Zed, Antigravity
- **In-Browser Editor** — Edit .md files trực tiếp, split view, conflict detection
- **Global Search** — Cmd+K command palette, fuzzy search across data
- **Keyboard Shortcuts** — Cmd+1..6 tabs, Cmd+R refresh, Cmd+S save
- **GitHub Integration** — Tab 🐙 GitHub: PR stats, issues, CI/CD pipeline status, branch comparison. Cần GitHub PAT
- **Real-Time Updates** — WebSocket auto-refresh dashboard khi detect git commit (fs.watch). Auto-reconnect backoff
- **Desktop Notifications** — Web Notification API: notify khi có git commit mới hoặc GitHub push/PR
- **Export PNG** — Chụp dashboard bằng html2canvas (client-side), Cmd+Shift+E
- **Export PDF** — A4 landscape PDF bằng jsPDF, Cmd+Shift+P
- **Shareable Report** — Tạo static HTML report không cần auth, copy link chia sẻ
- **GitHub Webhook** — Endpoint `/api/webhooks/github` nhận push/PR events (HMAC SHA-256 verify)
- **PWA / Installable** — Web App Manifest + Service Worker (offline support, Cache-first shell). Có thể cài như desktop app
- **Offline Support** — Service Worker cache shell assets, `/offline.html` fallback khi mất mạng
- **WCAG 2.1 AA** — Semantic HTML5 landmarks, ARIA roles, color contrast ≥ 4.5:1, focus ring visible, keyboard navigation
- **Team Overview** — Tab 👥 Team: contributors ranking, per-author commit stats, active days chart, role-based views (Developer / Team Lead)
- **Role-Based Views** — Developer (full features) vs Team Lead (summary stats only). Persist trong settings

### Charts (4)

- Commit frequency (daily/weekly/monthly/yearly toggle)
- Code velocity (lines added/removed per commit)
- Language breakdown (pie chart)
- Busiest day of week

### Sidebar

- Phase progress bar
- Stream breakdown (done/todo/progress/blocked)
- Health indicators (issues, tech debt)

### Tabs

- Commits — 15 commits gần nhất (filter by author/type)
- Versions — từ CHANGELOG.md
- Hotspot Files — files thay đổi nhiều nhất (30 ngày)
- 📊 Insights — commit categories, author breakdown, velocity trends, file coupling
- 👥 Team — contributors ranking, active days chart
- Workflows — từ `.agent/workflows/`
- Architecture Decisions — từ `docs/DECISIONS.md`

## Roadmap

- [ ] GitLab API integration (mirror of GitHub stream, P1)
- [ ] Multi-user shared deployment (team server)
- [ ] GitLab CI/CD status integration

---

> Xem thêm: [DEV_ROADMAP.md](DEV_ROADMAP.md) | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | [CHANGELOG.md](../CHANGELOG.md)
