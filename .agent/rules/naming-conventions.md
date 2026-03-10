---
description: Quy tắc đặt tên cho files, functions, CSS, API
---

# Naming Conventions

## Files & Folders

| Loại        | Convention       | Ví dụ                   |
| ----------- | ---------------- | ----------------------- |
| JS module   | camelCase        | `gitCollector.mjs`      |
| Utility     | camelCase        | `formatDate.mjs`        |
| Parser      | camelCase        | `todoParser.mjs`        |
| CSS file    | kebab-case       | `dashboard-charts.css`  |
| Config file | kebab-case       | `config.json`           |
| Constants   | UPPER_SNAKE_CASE | `MAX_COMMIT_FETCH`      |
| Test file   | thêm `.test.mjs` | `gitCollector.test.mjs` |

## Functions & Variables

- Functions: camelCase verb → `fetchCommits()`, `parseMarkdown()`, `formatTimestamp()`
- Variables: camelCase noun → `commitCount`, `repoPath`, `isLoading`
- Boolean: prefix `is`, `has`, `should` → `isActive`, `hasError`, `shouldRefresh`
- Constants: UPPER_SNAKE_CASE → `DEFAULT_PORT`, `API_TIMEOUT`

## CSS Classes

- kebab-case: `stat-card`, `chart-container`, `nav-item`
- BEM nếu cần nesting: `stat-card__header`, `stat-card__body`
- KHÔNG viết tắt khó hiểu: ❌ `stCrd` → ✅ `stat-card`

## API Endpoints

- URL: kebab-case, descriptive → `/api/git-stats`, `/api/project-config`
- Luôn prefix `/api/` cho backend routes
- Query params: camelCase → `?repoPath=/path&since=7d`
