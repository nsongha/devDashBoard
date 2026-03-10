---
description: Checklist review code tự động trước khi commit
---

# /code-review — Automated Code Review

> Dùng khi: hoàn thành 1 phase, trước khi release, hoặc khi muốn kiểm tra chất lượng code.

## 1. Xác định scope review

// turbo

```bash
git diff --name-only HEAD~1
```

- Liệt kê files đã thay đổi
- Xác định modules bị ảnh hưởng
- Nếu > 20 files → chia theo module, review từng nhóm

## 2. Đọc context

- Đọc `docs/PROJECT_CONTEXT.md` → hiểu project conventions
- Đọc `docs/KNOWN_ISSUES.md` → tránh report lại issue đã biết
- Đọc `docs/DECISIONS.md` → hiểu tại sao code viết theo cách hiện tại

## 3. Review theo checklist

Duyệt theo thứ tự ưu tiên (dừng ngay nếu có P0):

### P0 — Security (block release)

- [ ] Không hardcode secrets/credentials
- [ ] Path traversal protection cho file operations
- [ ] Input validation trên mọi API endpoints
- [ ] HTML output được sanitize (escapeHtml) — tránh XSS
- [ ] Không expose internal file paths ra response

### P1 — Functionality & Correctness

- [ ] Code giải quyết đúng vấn đề đặt ra
- [ ] Edge cases: null, empty array, boundary values
- [ ] Error handling đầy đủ (try/catch, fallback values)
- [ ] Git commands có timeout (tránh hang)
- [ ] Functions không quá dài (< 50 lines)

### P2 — Code Quality & Performance

- [ ] Single Responsibility — mỗi function/file 1 việc
- [ ] Naming rõ ràng, consistent (camelCase)
- [ ] Không có `console.log` debug còn sót
- [ ] ES Modules syntax (`import`/`export`)
- [ ] Không duplicate logic đã có
- [ ] Response size hợp lý

### P3 — Documentation

- [ ] Commit message theo Conventional Commits (tiếng Việt)
- [ ] CHANGELOG.md cập nhật nếu có feature/fix mới
- [ ] README.md cập nhật nếu thay đổi cách dùng

## 4. Output Report

Tạo report theo format:

```markdown
## Code Review Report — [Phase/Feature]

**Scope**: N files, M modules
**Date**: YYYY-MM-DD

### 🔴 P0 — Critical (block release)

- [file:line] Mô tả issue + đề xuất fix

### 🟠 P1 — Important

- [file:line] Mô tả issue + đề xuất fix

### 🟡 P2 — Improvement

- [file:line] Mô tả issue

### 🟢 P3 — Nitpick

- [file:line] Mô tả

### Summary

- P0: X issues (PHẢI fix trước release)
- P1: X issues (nên fix)
- P2: X issues (fix khi rảnh)
- P3: X issues (optional)
```

## 5. Action

- **Có P0** → DỪNG, fix NGAY, chạy `/task-completion`
- **Chỉ P1** → Tạo task fix, có thể release nếu urgent
- **Chỉ P2/P3** → Ghi vào `docs/KNOWN_ISSUES.md` mục Tech Debt, release bình thường

## LƯU Ý

- KHÔNG review style/formatting — đó là việc của linter
- KHÔNG review code ngoài scope (chỉ xem diff)
- Focus vào **behavior correctness** và **security**, không phải personal preference
