# Dev Dashboard — User Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Git** installed and accessible in PATH
- One or more local Git repositories to monitor

## Installation

```bash
# 1. Clone repository
git clone https://github.com/your-org/dev-dashboard.git
cd dev-dashboard

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Dashboard will be available at **http://localhost:4321**

## Adding Your First Project

1. Open the dashboard in your browser
2. Click the project dropdown in the header (shows "Loading...")
3. Click **➕ Add Project**
4. Enter the **absolute path** to your local Git repository (e.g. `/Users/you/projects/my-app`)
5. Click **Add** — dashboard loads your project data immediately

> 💡 You can add multiple projects and switch between them using the dropdown.

## Configuration (Settings ⚙️)

Click the **⚙️** button in the top-right to access Settings.

### Gemini AI Parser

| Field          | Description                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini API Key | From [Google AI Studio](https://aistudio.google.com/). When set, uses AI to parse markdown files more accurately. Without key, uses regex parser (default). |

### Deep Links — IDE Integration

Choose your preferred IDE. Clicking on commit hashes or file names will open them directly in:

| Value         | IDE                  |
| ------------- | -------------------- |
| `vscode`      | Visual Studio Code   |
| `cursor`      | Cursor               |
| `webstorm`    | WebStorm / JetBrains |
| `zed`         | Zed                  |
| `antigravity` | Antigravity          |

### GitHub Integration

Connect your GitHub repository for PR/Issue tracking and CI status:

| Field        | Description                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| GitHub Token | Personal Access Token (PAT) with `repo` scope. Create at [github.com/settings/tokens](https://github.com/settings/tokens) |
| GitHub Owner | Username or organization name                                                                                             |
| Repository   | Repository name (without owner prefix)                                                                                    |

### View Mode

| Mode        | Description                                                                       |
| ----------- | --------------------------------------------------------------------------------- |
| `Developer` | Full features — commits, hotspots, raw data                                       |
| `Team Lead` | Summary view — hides raw commit details, shows high-level stats and team overview |

## Features Overview

### Tabs

| Tab          | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| 🔀 Commits   | Recent commits with filters by author and type (feat/fix/docs…) |
| 🏷️ Versions  | Changelog history parsed from `CHANGELOG.md`                    |
| 🔥 Hotspots  | Most frequently changed files (30 days)                         |
| 📊 Insights  | Commit analysis, author stats, sprint velocity, file coupling   |
| 👥 Team      | Team contributors ranking, active days chart                    |
| ⚡ Workflows | List of agent workflows (`.agent/workflows/`)                   |
| 🧭 Decisions | Architecture Decision Records from `docs/DECISIONS_LOG.md`      |
| 🐙 GitHub    | PR stats, issue stats, CI status (requires GitHub token)        |

### Charts

| Chart            | Description                               |
| ---------------- | ----------------------------------------- |
| Commit Frequency | Commits per week — last 12 weeks          |
| Code by Type     | Lines of code breakdown by file extension |
| Code Velocity    | Lines added/removed per commit            |
| Busiest Day      | Commits grouped by day of week            |

### Search (⌘K / Ctrl+K)

Global search across:

- Commits (hash, message, author)
- Files (tracked in hotspots)
- Versions (changelog entries)

### Date Range Filter

Use the date pickers above the charts to filter data by date range. Click **✕ Reset** to clear.

### Commit Filters

Filter the commits table by:

- **Author** — per-author dropdown
- **Type** — conventional commits prefix (feat, fix, refactor, docs, chore)

### Export

| Button          | Action                                   |
| --------------- | ---------------------------------------- |
| 📸 Export PNG   | Screenshot of current dashboard view     |
| 📄 Export PDF   | PDF export                               |
| 🔗 Share Report | Generates a static shareable HTML report |

### Keyboard Shortcuts

| Shortcut        | Action             |
| --------------- | ------------------ |
| `⌘K` / `Ctrl+K` | Open search        |
| `⌘⇧E`           | Export PNG         |
| `⌘⇧P`           | Export PDF         |
| `Escape`        | Close search/modal |

## Real-Time Updates

The dashboard connects via WebSocket for real-time updates:

- Auto-refreshes when new commits are detected
- GitHub webhook integration for push/PR events
- Manual refresh via **↻ Refresh Now** button
- Auto-refresh every **30 seconds** (shown in countdown timer)

## In-Browser Editing

Click **✏️ Edit File** on any markdown document (Decisions, Workflows) to open the built-in editor with:

- Split view (editor + preview)
- ⌘S to save
- Conflict detection if file was changed externally

## config.json Schema

The configuration is stored in `config.json` at the project root:

```json
{
  "projects": ["/absolute/path/to/repo"],
  "geminiApiKey": "...",
  "ideScheme": "vscode",
  "githubToken": "ghp_...",
  "githubOwner": "your-org",
  "githubRepo": "your-repo",
  "viewMode": "developer"
}
```

> ⚠️ Never commit `config.json` to version control — it contains sensitive tokens. It is already in `.gitignore`.
