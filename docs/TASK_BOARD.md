# Phase 3 — Smart Data & AI-Powered Parsing Task Board

## Parallel Execution Strategy

Phase 3 nâng cấp data layer của Dev Dashboard: thay regex parsing bằng AI (optional), thêm caching + background refresh, và bổ sung data insights mới (commit categories, author stats, sprint velocity, file coupling).

**3 streams song song:**

| Stream         | Focus             | Tasks | Files affected                                    |
| -------------- | ----------------- | ----- | ------------------------------------------------- |
| 🤖 A: AI       | Gemini AI parsing | 4     | `src/parsers/`, `src/utils/`, `config.json`       |
| ⚡ B: Data     | Cache + perf      | 4     | `src/utils/`, `src/server.mjs`, `src/collectors/` |
| 📊 C: Insights | New analytics     | 5     | `src/collectors/`, `public/js/`, `src/server.mjs` |

**Timeline:** Stream A + B song song → Stream C sau (phụ thuộc B cho cache)

---

## Context: Codebase Hiện Tại

### Tech Stack

- **Backend:** Node.js + Express 4.21, ES Modules
- **Frontend:** Vanilla HTML + ES Modules + Chart.js CDN
- **Testing:** Vitest 4.x + Supertest 7.x
- **Data:** Git CLI (`execSync`) + regex-based markdown parsing
- **Config:** `config.json` flat file (chỉ chứa `projects[]`)

### Modules hiện có

| Module                         | Chức năng                             | Lines       |
| ------------------------------ | ------------------------------------- | ----------- |
| `src/server.mjs`               | Express routes + project orchestrator | 118         |
| `src/collectors/git-stats.mjs` | Git CLI → stats object                | 168         |
| `src/parsers/*.mjs` (7 files)  | Regex markdown parsing                | ~30-60 each |
| `src/utils/file-helpers.mjs`   | `run()`, `readFileSafe()`             | 35          |
| `public/js/app.mjs`            | Main app + UI render                  | 398         |
| `public/js/charts.mjs`         | Chart.js rendering (4 charts)         | 232         |
| `public/js/tabs.mjs`           | Tab switching                         | ~20         |
| `public/js/sidebar.mjs`        | Sidebar rendering                     | ~60         |

### API Endpoints

| Method | Path               | Handler                                         |
| ------ | ------------------ | ----------------------------------------------- |
| GET    | `/api/projects`    | Return config.projects                          |
| POST   | `/api/projects`    | Add project path                                |
| DELETE | `/api/projects`    | Remove project path                             |
| GET    | `/api/data/:index` | `collectProject()` → full data (sync, blocking) |

### Vấn đề hiện tại (Phase 3 giải quyết)

1. **Parsing fragile** — 7 parsers dùng regex, dễ vỡ khi format markdown thay đổi
2. **No caching** — mỗi request `/api/data/:idx` gọi `collectProject()` (spawn ~15 git processes)
3. **Blocking I/O** — `execSync` block main thread, request chậm ~2-5s
4. **Limited insights** — chỉ có raw git stats, không có commit categorization hay author analytics

---

## Stream 🤖 A — AI-Powered Parsing

**Owner**: Backend / Parsers
**Scope**: `src/parsers/`, `src/utils/`, `config.json`, `public/js/`

| #   | Task                         | Status | Priority | Dependencies | Files affected                                       |
| --- | ---------------------------- | ------ | -------- | ------------ | ---------------------------------------------------- |
| A1  | Gemini API client utility    | ✅     | P0       | -            | `src/utils/gemini-client.mjs` [NEW]                  |
| A2  | AI-enhanced parser wrapper   | ✅     | P0       | A1           | `src/utils/ai-parser.mjs` [NEW]                      |
| A3  | Migrate parsers to dual mode | ✅     | P0       | A2           | `src/parsers/*.mjs` (tất cả 7 files)                 |
| A4  | API key settings UI + API    | ✅     | P1       | A1           | `src/server.mjs`, `config.json`, `public/js/app.mjs` |

**Acceptance Criteria:**

- A1: `GeminiClient` class với `parse(prompt, content)`, retry logic, error handling. Trả fallback khi API unavailable.
- A2: Wrapper function nhận `(content, regexParser, aiPrompt)` → thử AI trước, fallback regex.
- A3: Mỗi parser export thêm `parseXxxAI()` variant. `collectProject()` tự chọn mode theo config.
- A4: `POST /api/config` endpoint lưu API key. Frontend có settings modal.

---

## Stream ⚡ B — Data Layer & Performance

**Owner**: Backend / Server
**Scope**: `src/utils/`, `src/server.mjs`, `src/collectors/`

| #   | Task                           | Status | Priority | Dependencies | Files affected                                 |
| --- | ------------------------------ | ------ | -------- | ------------ | ---------------------------------------------- |
| B1  | In-memory cache with TTL       | ✅     | P0       | -            | `src/utils/cache.mjs` [NEW]                    |
| B2  | Wire cache vào server          | ✅     | P0       | B1           | `src/server.mjs`                               |
| B3  | Background data refresh worker | ✅     | P1       | B2           | `src/utils/worker.mjs` [NEW], `src/server.mjs` |
| B4  | Incremental git collection     | ✅     | P1       | B1           | `src/collectors/git-stats.mjs`                 |

**Acceptance Criteria:**

- B1: `DataCache` class với `get(key)`, `set(key, value, ttlMs)`, `invalidate(key)`, `clear()`. Default TTL = 60s.
- B2: `/api/data/:idx` trả cache nếu fresh, collect mới nếu expired. Header `X-Cache: HIT|MISS`.
- B3: `setInterval` background refresh cho active projects. Không block API response.
- B4: Git collector track `lastCommitHash` → chỉ fetch commits mới, merge với data cũ.

---

## Stream 📊 C — Data Insights

**Owner**: Backend collectors + Frontend charts
**Scope**: `src/collectors/`, `public/js/`, `src/server.mjs`

| #   | Task                        | Status | Priority | Dependencies | Files affected                                                |
| --- | --------------------------- | ------ | -------- | ------------ | ------------------------------------------------------------- |
| C1  | Commit message categorizer  | ✅     | P0       | -            | `src/collectors/commit-analyzer.mjs` [NEW]                    |
| C2  | Author statistics collector | ✅     | P0       | -            | `src/collectors/author-stats.mjs` [NEW]                       |
| C3  | Sprint velocity trends      | ✅     | P1       | -            | `src/collectors/velocity-trends.mjs` [NEW]                    |
| C4  | File coupling detection     | ✅     | P1       | -            | `src/collectors/file-coupling.mjs` [NEW]                      |
| C5  | Insights tab UI + charts    | ✅     | P0       | C1,C2,C3,C4  | `public/js/app.mjs`, `public/js/charts.mjs`, `src/server.mjs` |

**Acceptance Criteria:**

- C1: Phân tích commit messages → categories (feat/fix/refactor/docs/chore/other). Trả `{categories: {feat: 12, fix: 8, ...}, byWeek: [...]}`.
- C2: Thống kê per-author: commit count, lines added/removed, active days, top files. Chỉ useful cho team repos.
- C3: So sánh velocity across time periods (tuần/tháng). Tính avg, trend direction (↑/↓/→).
- C4: Detect files thường thay đổi cùng nhau (co-change analysis 30 ngày). Threshold ≥ 3 co-changes.
- C5: Tab "📊 Insights" mới trên dashboard. Charts: commit categories (doughnut), author breakdown (bar), velocity trend (line), file coupling (network/table).

---

## Cross-Stream Dependencies

### Dependency Map

| Task | Depends on  | Type         | Notes                        |
| ---- | ----------- | ------------ | ---------------------------- |
| A2   | A1 ✅       | intra-stream | Wrapper cần Gemini client    |
| A3   | A2          | intra-stream | Parsers cần wrapper          |
| A4   | A1          | intra-stream | Settings cần client exist    |
| B2   | B1          | intra-stream | Server cần cache module      |
| B3   | B2          | intra-stream | Worker cần cache integration |
| C5   | C1,C2,C3,C4 | intra-stream | UI cần tất cả collectors     |

### Execution Order

- **Wave 1**: Stream A (A1→A2) ←→ Stream B (B1→B2) ←→ Stream C (C1,C2)
- **Wave 2**: Stream A (A3,A4) ←→ Stream B (B3,B4) ←→ Stream C (C3,C4)
- **Wave 3**: Stream C (C5 — integrate tất cả)

> Không có cross-stream dependency → 3 streams hoàn toàn độc lập.

---

## Conflict Prevention Rules

### Shared Files

| File                | Stream A | Stream B | Stream C | Giải quyết                                                                 |
| ------------------- | -------- | -------- | -------- | -------------------------------------------------------------------------- |
| `src/server.mjs`    | A4       | B2, B3   | C5       | B sửa trước (cache), A sửa sau (config endpoint), C sửa cuối (data fields) |
| `config.json`       | A4       | -        | -        | Chỉ Stream A sửa                                                           |
| `public/js/app.mjs` | A4       | -        | C5       | A sửa trước (settings modal), C sửa sau (insights tab)                     |

### Merge Strategy

- Mỗi stream tạo files MỚI chủ yếu → ít conflict
- `server.mjs`: thêm import + route, không sửa code cũ
- `app.mjs`: thêm section mới, không sửa render hiện tại

---

## Progress Summary

| Stream           | Total  | Done   | Remaining | %        |
| ---------------- | ------ | ------ | --------- | -------- |
| 🤖 A: AI Parsing | 4      | 4      | 0         | 100%     |
| ⚡ B: Data Layer | 4      | 4      | 0         | 100%     |
| 📊 C: Insights   | 5      | 5      | 0         | 100%     |
| **Total**        | **13** | **13** | **0**     | **100%** |
