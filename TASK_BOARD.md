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

---

## Stream 🎨 Design System — Tokens, Theming, Typography

**Owner**: CSS/Design domain
**Scope**: `public/css/`, `public/index.html`

| #   | Task                                                                | Status | Priority | Dependencies | Files affected                                          |
| --- | ------------------------------------------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------- |
| A1  | Tạo `public/css/tokens.css` — design tokens (colors, spacing, type) | ✅     | P0       | —            | `[NEW] public/css/tokens.css`                           |
| A2  | Dark/Light mode toggle — CSS `[data-theme]` + localStorage          | ✅     | P0       | A1           | `[MODIFY] public/css/tokens.css`, `[MODIFY] index.html` |
| A3  | Migrate `dashboard.css` → dùng tokens từ `tokens.css`               | ✅     | P0       | A1           | `[MODIFY] public/css/dashboard.css`                     |
| A4  | Google Fonts: Inter + JetBrains Mono cho code blocks                | ✅     | P1       | A1           | `[MODIFY] public/index.html`, `[MODIFY] tokens.css`     |

**Acceptance Criteria:**

- ✅ `tokens.css` chứa design tokens tổ chức gọn: `--color-*`, `--spacing-*`, `--font-*`, `--radius-*`
- ✅ Toggle dark/light mode hoạt động, persist qua localStorage
- ✅ `dashboard.css` reference tokens thay vì hardcoded values
- ✅ JetBrains Mono hiển thị cho code-like content (commit hash, file paths)

---

## Stream 📐 Layout — Grid, Sidebar, Cards

**Owner**: Layout/HTML domain
**Scope**: `public/css/dashboard.css`, `public/js/sidebar.mjs`, `public/index.html`

| #   | Task                                                     | Status | Priority | Dependencies | Files affected                                                        |
| --- | -------------------------------------------------------- | ------ | -------- | ------------ | --------------------------------------------------------------------- |
| B1  | CSS Grid layout cho dashboard (responsive 3 breakpoints) | ✅     | P0       | A1           | `[MODIFY] public/css/dashboard.css`                                   |
| B2  | Collapsible sidebar với toggle button + animation        | ✅     | P0       | B1           | `[MODIFY] public/css/dashboard.css`, `[MODIFY] public/js/sidebar.mjs` |
| B3  | Card-based UI cho stats panels (elevation, hover lift)   | ✅     | P0       | A1           | `[MODIFY] public/css/dashboard.css`                                   |
| B4  | Glassmorphism subtle effects cho cards + sidebar header  | ✅     | P2       | B3           | `[MODIFY] public/css/dashboard.css`                                   |

**Acceptance Criteria:**

- ✅ Dashboard responsive ở 3 breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- ✅ Sidebar collapse/expand mượt, toggle button visible, trạng thái persist localStorage
- ✅ Cards có border-radius, subtle shadow, hover lift effect
- ✅ Glassmorphism effect nhẹ: backdrop-filter blur, semi-transparent background

---

## Stream 📊 Charts — NPM Migration, Theming, Tooltips

**Owner**: Charts/JS domain
**Scope**: `public/js/charts.mjs`, `public/index.html`, `package.json`

| #   | Task                                                       | Status | Priority | Dependencies | Files affected                                                |
| --- | ---------------------------------------------------------- | ------ | -------- | ------------ | ------------------------------------------------------------- |
| C1  | Migrate Chart.js CDN → local vendor file                   | ✅     | P0       | —            | `[NEW] public/vendor/chart.umd.min.js`, `[MODIFY] index.html` |
| C2  | Chart theming theo dark/light mode (auto-detect từ tokens) | ✅     | P0       | A2, C1       | `[MODIFY] public/js/charts.mjs`                               |
| C3  | Enhanced tooltips chi tiết cho tất cả charts               | ✅     | P1       | C1           | `[MODIFY] public/js/charts.mjs`                               |
| C4  | Animated transitions khi switch project                    | ✅     | P1       | C1           | `[MODIFY] public/js/charts.mjs`                               |

**Acceptance Criteria:**

- ✅ Không còn CDN link, Chart.js serve từ `public/vendor/`
- ✅ Charts tự switch colors khi toggle dark/light mode
- ✅ Tooltips hiển thị thêm context (%, so sánh, line counts)
- ✅ Khi switch project, charts animate smooth (600ms easeOutQuart)

---

## Stream ✨ Micro-interactions — Transitions, Loading, Toasts

**Owner**: UX/Animation domain
**Scope**: `public/css/`, `public/js/`

| #   | Task                                                     | Status | Priority | Dependencies | Files affected                                                    |
| --- | -------------------------------------------------------- | ------ | -------- | ------------ | ----------------------------------------------------------------- |
| D1  | Smooth page transitions (fade-in khi load, tab switch)   | ✅     | P0       | A1           | `[MODIFY] public/css/dashboard.css`, `[MODIFY] tabs.mjs`          |
| D2  | Loading skeletons thay vì blank state / spinner          | ✅     | P0       | A1, B3       | `[MODIFY] public/css/dashboard.css`, `[MODIFY] public/js/app.mjs` |
| D3  | Toast notifications cho add/remove project               | ✅     | P1       | A1           | `[NEW] public/js/toast.mjs`, `[MODIFY] public/js/app.mjs`         |
| D4  | Hover effects nâng cao trên cards + tabs + sidebar items | ✅     | P2       | A1, B3       | `[MODIFY] public/css/dashboard.css`                               |

**Acceptance Criteria:**

- ✅ Page load có fade-in animation, tab switch có fadeInUp transition
- ✅ Skeleton UI hiển thị shimmer placeholder khi đang loading
- ✅ Toast notification slide-in từ góc phải khi thêm/xóa project — auto-dismiss sau 3s
- ✅ Hover effects: card lift + shadow, tab underline, sidebar item highlight

---

## Progress Summary

| Stream            | Total  | Done   | Remaining | %        |
| ----------------- | ------ | ------ | --------- | -------- |
| 🎨 Design System  | 4      | 4      | 0         | 100%     |
| 📐 Layout         | 4      | 4      | 0         | 100%     |
| 📊 Charts         | 4      | 4      | 0         | 100%     |
| ✨ Micro-interact | 4      | 4      | 0         | 100%     |
| **Total**         | **16** | **16** | **0**     | **100%** |
