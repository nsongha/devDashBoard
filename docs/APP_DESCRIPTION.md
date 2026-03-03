# Dev Dashboard — App Description

## Mô tả

AI-Assisted Development Dashboard — trực quan hóa project stats, phases, workflows từ git + docs.

Điểm chính tới bất kỳ git repo nào, dashboard tự động thu thập dữ liệu từ git history và markdown files để hiển thị:

- Commit statistics và trends
- Code velocity và language breakdown
- Phase progress và stream tracking
- Issues, tech debt, architecture decisions
- Workflows và AI skills catalog

## Features hiện có (v0.2.0)

### Core

- **Live Data** — Git stats + docs parsing, auto-refresh mỗi 30s
- **Multi-Project** — Dropdown switcher + Add/Remove projects
- **Zero Config** — Point tới bất kỳ git repo nào
- **Modular Codebase** — ES Modules, tách server/parsers/frontend riêng
- **Testing** — Vitest unit tests cho parsers + API endpoints
- **Linting** — ESLint + Prettier config

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

- [ ] AI-powered docs parsing (Gemini API) — no more fragile regex
- [ ] Deep links to IDE (`vscode://file/...`)
- [ ] Edit .md files in-browser
- [ ] GitHub/GitLab API integration
- [ ] Electron app for desktop
- [ ] Team shared deployment
