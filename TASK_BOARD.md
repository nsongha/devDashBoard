# Phase 2 — UI/UX Overhaul (v0.3.0) Task Board

## Parallel Execution Strategy

- **Mục tiêu**: Dashboard đẹp, responsive, dark/light mode, smooth animations
- **Tổng tasks**: 16 tasks chia thành 4 streams
- **Approach**: Stream A (Design System) làm trước → B, C, D song song sau

## Context: Codebase Hiện Tại

### Tech Stack (sau Phase 1)

| Layer    | Technology                | Hiện trạng                                 |
| -------- | ------------------------- | ------------------------------------------ |
| Backend  | Node.js + Express 4.21    | Modular: `src/server.mjs` + `src/parsers/` |
| Frontend | Vanilla HTML + ES Modules | `public/index.html` (69 lines shell)       |
| CSS      | Vanilla CSS               | `public/css/dashboard.css` (639 lines)     |
| JS       | ES Modules                | `public/js/{app,charts,tabs,sidebar}.mjs`  |
| Charts   | Chart.js 4.4.1            | CDN link trong `index.html`                |
| Config   | JSON                      | `config.json` flat file                    |

### Existing CSS Architecture

- `dashboard.css` đã có CSS custom properties (`--bg`, `--surface`, `--accent`, etc.)
- Dark theme only (hardcoded colors)
- Basic responsive: `@media (max-width: 900px)`
- Flat layout, no glassmorphism, no transitions ngoài hover effects nhỏ

### Files/Modules Chính

- `public/index.html` — Shell HTML (69 lines)
- `public/css/dashboard.css` — All styles (639 lines)
- `public/js/app.mjs` — Main app logic, render functions (289 lines)
- `public/js/charts.mjs` — Chart.js rendering, 4 charts (135 lines)
- `public/js/sidebar.mjs` — Sidebar rendering (88 lines)
- `public/js/tabs.mjs` — Tab switching logic (17 lines)
- `src/server.mjs` — Express server, serves `public/` as static

---

## Stream 🎨 Design System — Tokens, Theming, Typography

**Owner**: CSS/Design domain
**Scope**: `public/css/`, `public/index.html`

| #   | Task                                                                | Status | Priority | Dependencies | Files affected                                          |
| --- | ------------------------------------------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------- |
| A1  | Tạo `public/css/tokens.css` — design tokens (colors, spacing, type) | 📋     | P0       | —            | `[NEW] public/css/tokens.css`                           |
| A2  | Dark/Light mode toggle — CSS `[data-theme]` + localStorage          | 📋     | P0       | A1           | `[MODIFY] public/css/tokens.css`, `[MODIFY] index.html` |
| A3  | Migrate `dashboard.css` → dùng tokens từ `tokens.css`               | 📋     | P0       | A1           | `[MODIFY] public/css/dashboard.css`                     |
| A4  | Google Fonts: Inter + JetBrains Mono cho code blocks                | 📋     | P1       | A1           | `[MODIFY] public/index.html`, `[MODIFY] tokens.css`     |

**Acceptance Criteria:**

- `tokens.css` chứa design tokens tổ chức gọn: `--color-*`, `--spacing-*`, `--font-*`, `--radius-*`
- Toggle dark/light mode hoạt động, persist qua localStorage
- `dashboard.css` reference tokens thay vì hardcoded values
- JetBrains Mono hiển thị cho code-like content (commit hash, file paths)

---

## Stream 📐 Layout — Grid, Sidebar, Cards

**Owner**: Layout/HTML domain
**Scope**: `public/css/dashboard.css`, `public/js/sidebar.mjs`, `public/index.html`

| #   | Task                                                     | Status | Priority | Dependencies | Files affected                                                        |
| --- | -------------------------------------------------------- | ------ | -------- | ------------ | --------------------------------------------------------------------- |
| B1  | CSS Grid layout cho dashboard (responsive 3 breakpoints) | 📋     | P0       | A1           | `[MODIFY] public/css/dashboard.css`                                   |
| B2  | Collapsible sidebar với toggle button + animation        | 📋     | P0       | B1           | `[MODIFY] public/css/dashboard.css`, `[MODIFY] public/js/sidebar.mjs` |
| B3  | Card-based UI cho stats panels (elevation, hover lift)   | 📋     | P0       | A1           | `[MODIFY] public/css/dashboard.css`                                   |
| B4  | Glassmorphism subtle effects cho cards + sidebar header  | 📋     | P2       | B3           | `[MODIFY] public/css/dashboard.css`                                   |

**Acceptance Criteria:**

- Dashboard responsive ở 3 breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- Sidebar collapse/expand mượt, toggle button visible, trạng thái persist localStorage
- Cards có border-radius, subtle shadow, hover lift effect
- Glassmorphism effect nhẹ: backdrop-filter blur, semi-transparent background

---

## Stream 📊 Charts — NPM Migration, Theming, Tooltips

**Owner**: Charts/JS domain
**Scope**: `public/js/charts.mjs`, `public/index.html`, `package.json`

| #   | Task                                                       | Status | Priority | Dependencies | Files affected                                                                  |
| --- | ---------------------------------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------------------------------- |
| C1  | Migrate Chart.js CDN → npm package + ES import             | 📋     | P0       | —            | `[MODIFY] package.json`, `[MODIFY] public/js/charts.mjs`, `[MODIFY] index.html` |
| C2  | Chart theming theo dark/light mode (auto-detect từ tokens) | 📋     | P0       | A2, C1       | `[MODIFY] public/js/charts.mjs`                                                 |
| C3  | Enhanced tooltips chi tiết cho tất cả charts               | 📋     | P1       | C1           | `[MODIFY] public/js/charts.mjs`                                                 |
| C4  | Animated transitions khi switch project                    | 📋     | P1       | C1           | `[MODIFY] public/js/charts.mjs`                                                 |

**Acceptance Criteria:**

- Không còn CDN link, Chart.js import từ `node_modules` hoặc bundled
- Charts tự switch colors khi toggle dark/light mode
- Tooltips hiển thị thêm context (%, so sánh tuần trước, etc.)
- Khi switch project, charts animate smooth thay vì flash

---

## Stream ✨ Micro-interactions — Transitions, Loading, Toasts

**Owner**: UX/Animation domain
**Scope**: `public/css/`, `public/js/`

| #   | Task                                                     | Status | Priority | Dependencies | Files affected                                                |
| --- | -------------------------------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------------- |
| D1  | Smooth page transitions (fade-in khi load, tab switch)   | 📋     | P0       | A1           | `[MODIFY] public/css/dashboard.css`, `[MODIFY] tabs.mjs`      |
| D2  | Loading skeletons thay vì blank state / spinner          | 📋     | P0       | A1, B3       | `[NEW] public/css/skeleton.css`, `[MODIFY] public/js/app.mjs` |
| D3  | Toast notifications cho add/remove project               | 📋     | P1       | A1           | `[NEW] public/js/toast.mjs`, `[MODIFY] public/js/app.mjs`     |
| D4  | Hover effects nâng cao trên cards + tabs + sidebar items | 📋     | P2       | A1, B3       | `[MODIFY] public/css/dashboard.css`                           |

**Acceptance Criteria:**

- Page load có fade-in animation, tab switch có slide transition
- Skeleton UI hiển thị placeholder cards/blocks khi đang loading (thay vì spinner đơn giản)
- Toast notification slide-in từ góc phải khi thêm/xóa project — auto-dismiss sau 3s
- Hover effects: card lift, tab underline animation, sidebar item highlight

---

## Cross-Stream Dependencies

### Dependency Map

| Task | Depends on | Type         | Impact                                         |
| ---- | ---------- | ------------ | ---------------------------------------------- |
| A3   | A1         | in-stream    | Migration cần tokens sẵn sàng                  |
| A2   | A1         | in-stream    | Theme toggle cần tokens structure              |
| B1   | A1         | cross-stream | Grid layout dùng spacing tokens                |
| B2   | B1         | in-stream    | Collapsible sidebar cần grid layout xong       |
| B3   | A1         | cross-stream | Cards cần color tokens                         |
| B4   | B3         | in-stream    | Glassmorphism cần card structure               |
| C2   | A2, C1     | cross-stream | Chart theming cần theme toggle + npm migration |
| C3   | C1         | in-stream    | Tooltips cần npm Chart.js                      |
| C4   | C1         | in-stream    | Animations cần npm Chart.js                    |
| D1   | A1         | cross-stream | Transitions dùng timing tokens                 |
| D2   | A1, B3     | cross-stream | Skeletons cần tokens + card layout             |
| D3   | A1         | cross-stream | Toasts dùng color tokens                       |
| D4   | A1, B3     | cross-stream | Hover effects cần tokens + card structure      |

### Execution Order

```
Wave 1 (trước tiên):
  Stream A: A1 → A2, A3, A4 (A2/A3/A4 song song sau A1)

Wave 2 (khi A1 xong → song song):
  Stream B: B1 → B2 → B3 → B4
  Stream C: C1 → C2 (cần A2), C3, C4
  Stream D: D1, D3 → D2, D4 (cần B3)

Wave 3 (polish — sau Wave 2):
  Verify cross-stream integration
```

## Conflict Prevention Rules

### Shared files

| File                       | Sửa bởi                                 | Thứ tự                               |
| -------------------------- | --------------------------------------- | ------------------------------------ |
| `public/css/dashboard.css` | A (tokens), B (layout), D (animations)  | A sửa trước (migrate tokens) → B → D |
| `public/index.html`        | A (fonts, theme toggle), C (remove CDN) | A sửa trước → C sau                  |
| `public/js/app.mjs`        | D (toast, skeleton)                     | D sửa duy nhất                       |
| `package.json`             | C (chart.js dep)                        | C sửa duy nhất                       |

### Merge strategy

- Stream A phải xong A1 trước khi B, C (partial), D bắt đầu
- `dashboard.css` xung đột nhiều nhất → A sửa trước, B append layout, D append animations
- Stream C và D ít overlap → merge free

## Progress Summary

| Stream            | Total  | Done  | Remaining | %      |
| ----------------- | ------ | ----- | --------- | ------ |
| 🎨 Design System  | 4      | 0     | 4         | 0%     |
| 📐 Layout         | 4      | 0     | 4         | 0%     |
| 📊 Charts         | 4      | 0     | 4         | 0%     |
| ✨ Micro-interact | 4      | 0     | 4         | 0%     |
| **Total**         | **16** | **0** | **16**    | **0%** |
