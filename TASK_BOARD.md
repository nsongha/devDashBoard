# Phase 5 Task Board — Integrations & Multi-Source (v0.6.0)

## Parallel Execution Strategy

- **Mục tiêu**: GitHub/GitLab API integration, WebSocket real-time updates, export & sharing
- **Streams**: 3 streams song song (A: GitHub, B: Real-Time, C: Export)
- **Target version**: v0.6.0
- **Ước tính**: 3-4 sessions

## Decisions đã chốt ✅

| #   | Quyết định                 | Lựa chọn                         | Lý do                                                                                |
| --- | -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | GitHub Auth method         | **Personal Access Token (PAT)**  | Internal tool, zero OAuth infra — lưu trong `config.json` như `geminiApiKey`         |
| 2   | Git change detection       | **`fs.watch` trên `.git/refs/`** | Event-driven, zero CPU waste, detect push + pull, consistent với local-tool use case |
| 3   | Export PNG                 | **Client-side `html2canvas`**    | No server dep, toàn bộ trong browser                                                 |
| 4   | Desktop notifications (B5) | **Web Notification API**         | Vẫn làm, P2                                                                          |

## Context: Codebase Hiện Tại

- **Tech stack**: Node.js + Express 4.21, Vanilla HTML + ES Modules, Chart.js CDN, Vitest
- **Dependencies**: chỉ `express` (production), + eslint, prettier, vitest, supertest (dev)
- **Server**: `src/server.mjs` (338 lines) — 9 API routes, DataCache, background refresh worker
- **Frontend**: 9 modules trong `public/js/` — app, charts, insights, sidebar, tabs, deep-links, editor, search, toast
- **Collectors**: git-stats, commit-analyzer, author-stats, velocity-trends, file-coupling
- **Parsers**: 7 parsers (task-board, changelog, ai-context, known-issues, decisions, workflows, skills)
- **Tests**: 12 test files, 64 tests (Vitest + Supertest)
- **Config**: `config.json` — projects[], geminiApiKey, ideScheme

---

## Stream A — 🐙 GitHub/GitLab Integration

**Owner**: Server + Frontend
**Scope**: `src/integrations/`, `src/server.mjs`, `public/js/github.mjs`, `public/js/app.mjs`

| #   | Task                              | Status | Priority | Dependencies | Files affected                                                          |
| --- | --------------------------------- | ------ | -------- | ------------ | ----------------------------------------------------------------------- |
| A1  | GitHub API client module          | ✅     | P0       | -            | `src/integrations/github-client.mjs` [DONE]                             |
| A2  | PR stats collector                | ✅     | P0       | A1           | `src/integrations/github-pr.mjs` [DONE]                                 |
| A3  | GitHub Issues integration         | ✅     | P0       | A1           | `src/integrations/github-issues.mjs` [DONE]                             |
| A4  | CI/CD pipeline status             | ⏭️     | P1       | A1           | `src/integrations/github-ci.mjs` [SKIP]                                 |
| A5  | Branch comparison view            | ⏭️     | P1       | A1           | `src/integrations/github-branches.mjs` [SKIP]                           |
| A6  | GitHub tab UI + settings          | ✅     | P0       | A2, A3       | `public/js/github.mjs` [DONE], `public/js/app.mjs`, `public/index.html` |
| A7  | API routes for GitHub integration | ✅     | P0       | A1-A3        | `src/server.mjs` [DONE]                                                 |

**Acceptance Criteria:**

- A1: GitHub REST API client với auth (PAT), rate limit handling, error handling đầy đủ
- A2: Lấy open/merged PRs, review time trung bình, PR labels
- A3: Lấy open/closed issues, labels, milestones
- A4: Lấy workflow runs, status (pass/fail/pending)
- A5: So sánh 2 branches (ahead/behind, diff stats)
- A6: Tab mới "GitHub" hiển thị PR stats, issues, CI status. Settings để nhập GitHub token
- A7: API routes: `GET /api/github/prs`, `GET /api/github/issues`, `GET /api/github/ci`, `POST /api/config` (github token)

---

## Stream B — ⚡ Real-Time & WebSocket

**Owner**: Server + Frontend
**Scope**: `src/utils/websocket.mjs`, `src/webhooks/`, `src/server.mjs`, `public/js/realtime.mjs`

| #   | Task                             | Status | Priority | Dependencies | Files affected                                            |
| --- | -------------------------------- | ------ | -------- | ------------ | --------------------------------------------------------- |
| B1  | WebSocket server setup           | ✅     | P0       | -            | `src/utils/websocket.mjs` [NEW], `src/server.mjs`         |
| B2  | Real-time dashboard auto-refresh | ✅     | P0       | B1           | `public/js/realtime.mjs` [NEW], `public/js/app.mjs`       |
| B3  | Git push → auto detect & notify  | ✅     | P0       | B1           | `src/utils/git-watcher.mjs` [NEW], `src/server.mjs`       |
| B4  | GitHub webhook endpoint          | 📋     | P1       | B1, A1       | `src/webhooks/github-webhook.mjs` [NEW], `src/server.mjs` |
| B5  | Desktop notifications (Web API)  | 📋     | P2       | B1           | `public/js/realtime.mjs`                                  |

**Acceptance Criteria:**

- B1: WebSocket server tích hợp cùng Express server, auto-upgrade HTTP→WS, heartbeat/reconnect
- B2: Dashboard tự nhận WS events → refresh data mà không cần polling 30s
- B3: Dùng `fs.watch` hoặc git polling để detect new commits → push WS event
- B4: POST `/api/webhooks/github` nhận push/PR events → trigger data refresh + WS broadcast
- B5: Browser Notification API request permission + notify khi có new commit/PR

---

## Stream C — 📤 Export & Sharing

**Owner**: Server + Frontend
**Scope**: `src/export/`, `public/js/export.mjs`, `public/js/app.mjs`

| #   | Task                         | Status | Priority | Dependencies | Files affected                                    |
| --- | ---------------------------- | ------ | -------- | ------------ | ------------------------------------------------- |
| C1  | Export dashboard as PNG      | 📋     | P0       | -            | `public/js/export.mjs` [NEW], `public/js/app.mjs` |
| C2  | Export dashboard as PDF      | 📋     | P1       | C1           | `public/js/export.mjs`, `src/server.mjs`          |
| C3  | Shareable report (read-only) | 📋     | P1       | -            | `src/export/report.mjs` [NEW], `src/server.mjs`   |

**Acceptance Criteria:**

- C1: Nút "Export PNG" chụp dashboard bằng `html2canvas` → download file PNG
- C2: Nút "Export PDF" tạo PDF với layout đẹp (dùng jsPDF hoặc server-side)
- C3: API tạo static HTML report file → served at `/reports/:id`, link shareable

---

## Cross-Stream Dependencies

### Dependency Map

| Task | Depends on | Type         | Notes                           |
| ---- | ---------- | ------------ | ------------------------------- |
| A6   | A2, A3     | in-stream    | UI cần data từ collectors       |
| A7   | A1-A3      | in-stream    | Routes cần modules hoàn thành   |
| B4   | B1, A1     | cross-stream | Webhook dùng WS + GitHub client |
| B2   | B1         | in-stream    | Frontend cần WS server          |
| B3   | B1         | in-stream    | Watcher cần WS để broadcast     |
| C2   | C1         | in-stream    | PDF builds on PNG logic         |

### Execution Order

- **Parallel**: Stream A (A1 → A2+A3 → A4+A5 → A6+A7) ←→ Stream B (B1 → B2+B3 → B5) ←→ Stream C (C1 → C2, C3)
- **Sync point**: B4 chờ A1 + B1 xong mới làm

## Conflict Prevention Rules

- **`src/server.mjs`**: Stream A thêm routes trước (A7), rồi Stream B thêm webhook route (B4)
- **`public/js/app.mjs`**: Mỗi stream thêm import + init call riêng, không sửa existing code
- **`public/index.html`**: Stream A thêm GitHub tab, Stream B+C thêm buttons — sections khác nhau
- **`config.json`**: Stream A thêm `githubToken`, Stream B không cần config mới
- **`package.json`**: Stream B thêm `ws` dependency, Stream C thêm `html2canvas`/`jspdf` — cả 2 thêm deps riêng

## Progress Summary

| Stream        | Total  | Done  | Remaining | %       |
| ------------- | ------ | ----- | --------- | ------- |
| A — GitHub    | 7      | 0     | 7         | 0%      |
| B — Real-Time | 5      | 3     | 2         | 60%     |
| C — Export    | 3      | 0     | 3         | 0%      |
| **Total**     | **15** | **3** | **12**    | **20%** |
