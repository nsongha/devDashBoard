# Dev Dashboard — App Description

## Mô tả

AI-Assisted Development Dashboard — trực quan hóa project stats, phases, workflows từ git + docs.

Điểm chính tới bất kỳ git repo nào, dashboard tự động thu thập dữ liệu từ git history và markdown files để hiển thị:

- Commit statistics và trends
- Code velocity và language breakdown
- Phase progress và stream tracking
- Issues, tech debt, architecture decisions
- Workflows và AI skills catalog

## Features hiện có (v0.5.0)

### Core

- **Live Data** — Git stats + docs parsing, auto-refresh mỗi 30s
- **Multi-Project** — Dropdown switcher + Add/Remove projects
- **Zero Config** — Point tới bất kỳ git repo nào
- **Modular Codebase** — ES Modules, tách server/parsers/frontend riêng
- **Testing** — Vitest unit tests cho parsers + API endpoints (64 tests)
- **Linting** — ESLint + Prettier config
- **AI-Powered Parsing** — Optional Gemini AI parsing với regex fallback
- **In-Memory Cache** — TTL 60s, background refresh, `X-Cache` headers
- **Incremental Git** — Skip full re-collect khi không có commits mới
- **Deep Links to IDE** — Click file/commit mở thẳng VS Code, Cursor, WebStorm, Zed
- **In-Browser Editor** — Edit .md files trực tiếp, split view, conflict detection
- **Global Search** — Cmd+K command palette, fuzzy search across data
- **Keyboard Shortcuts** — Cmd+1..6 tabs, Cmd+R refresh, Cmd+S save

### Charts (4)

- Commit frequency (weekly, 12 tuần)
- Code velocity (lines added/removed)
- Language breakdown (pie chart)
- Busiest day of week

### Sidebar

- Phase progress bar
- Stream breakdown (done/todo/progress/blocked)
- Health indicators (issues, tech debt)

### Tabs

- Commits — 15 commits gần nhất
- Versions — từ CHANGELOG.md
- Hotspot Files — files thay đổi nhiều nhất (30 ngày)
- 📊 Insights — commit categories, author breakdown, velocity trends, file coupling
- Workflows — từ `.agent/workflows/`
- Architecture Decisions — từ `docs/DECISIONS_LOG.md`

## Roadmap

- [ ] GitHub/GitLab API integration
- [ ] WebSocket real-time updates
- [ ] Desktop app (PWA)
- [ ] Team shared deployment
