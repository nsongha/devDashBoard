# 🏗️ Dev Dashboard

AI-Assisted Development Dashboard — Visualize project stats, phases, workflows from git + docs.

![Dark theme dashboard with sidebar and charts](screenshot.png)

## Quick Start

```bash
npm install
npm start
# → http://localhost:4321
```

## Features

- **Live Data** — Git stats + docs parsing, auto-refresh mỗi 30s
- **Multi-Project** — Dropdown switcher + Add/Remove projects
- **4 Charts** — Commit frequency, code velocity, language breakdown, busiest day
- **Sidebar** — Phase progress, streams, health indicators (issues, tech debt)
- **Tabs** — Commits, versions, hotspot files, workflows, architecture decisions
- **Zero Config** — Point tới bất kỳ git repo nào, có `.agent/` + `docs/` thì càng tốt

## How It Works

```
Dashboard (HTML) ←→ Express Server ←→ Git CLI + Markdown Files
    port 4321           collect.mjs
                        server.mjs
```

### Data Sources

| Source                 | Data                                            |
| ---------------------- | ----------------------------------------------- |
| `git log`              | Commits, authors, frequency, velocity, hotspots |
| `git ls-files + wc`    | Lines of code, file counts                      |
| `docs/TASK_BOARD.md`   | Phase progress, streams                         |
| `docs/KNOWN_ISSUES.md` | Active issues, tech debt                        |
| `docs/DECISIONS.md`    | Architecture decisions                          |
| `CHANGELOG.md`         | Version history                                 |
| `.agent/workflows/`    | Workflow definitions                            |
| `.agent/skills/`       | AI skill catalog                                |

### Project Structure

```
DevDashboard/
├── server.mjs      # Express server + live data API
├── index.html       # Dashboard UI (Chart.js)
├── collect.mjs      # Standalone data collector (CLI)
├── config.json      # Saved project paths
└── package.json
```

## Adding Projects

1. Click dropdown ở header → **➕ Add Project**
2. Nhập absolute path tới git repo
3. Hoặc edit `config.json` trực tiếp:

```json
{
  "projects": ["/path/to/project-a", "/path/to/project-b"]
}
```

## Standalone CLI Collector

```bash
node collect.mjs /path/to/repo1 /path/to/repo2
# → outputs dashboard-data.json
```

## Roadmap

- [ ] AI-powered docs parsing (Gemini API) — no more fragile regex
- [ ] Deep links to IDE (vscode://file/...)
- [ ] Edit .md files in-browser
- [ ] GitHub/GitLab API integration
- [ ] Electron app for desktop
- [ ] Team shared deployment

## License

MIT
