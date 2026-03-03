---
description: Chạy sau khi hoàn thành mỗi task — verify build, update docs, commit
---

// turbo-all

## Steps

1. Verify build/server chạy bình thường:

```bash
timeout 5 node src/server.mjs || true
```

2. Restart server nếu đang chạy và có thay đổi server files (`src/server.mjs`, `src/parsers/`, `src/collectors/`, `src/utils/`):

```bash
lsof -ti:4321 | xargs kill -9 2>/dev/null; sleep 1; npm run dev &
```

3. Kiểm tra lỗi syntax (nếu có thay đổi JS):

```bash
node --check src/server.mjs && node --check collect.mjs
```

4. Cập nhật docs nếu cần:
   - `CHANGELOG.md` — thêm entry vào `[Unreleased]`
   - `docs/APP_DESCRIPTION.md` — nếu thêm/xóa feature
   - `KNOWN_ISSUES.md` — nếu phát hiện bug mới hoặc resolve bug cũ

5. Git add và commit:

```bash
git add -A
git status
```

6. Commit với Conventional Commits format (tiếng Việt):

```bash
git commit -m "<type>: <mô tả ngắn>"
```

- `feat:` — Tính năng mới
- `fix:` — Bug fix
- `docs:` — Chỉ thay đổi tài liệu
- `refactor:` — Refactor, không đổi behavior
- `chore:` — Build, config
