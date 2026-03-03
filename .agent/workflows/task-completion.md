---
description: Chạy sau khi hoàn thành mỗi task — verify build, update docs, commit
---

// turbo-all

## Steps

1. Verify build/server chạy bình thường:

```bash
timeout 5 node src/server.mjs || true
```

2. Kiểm tra lỗi syntax (nếu có thay đổi JS):

```bash
node --check src/server.mjs && node --check collect.mjs
```

3. Cập nhật docs nếu cần:
   - `CHANGELOG.md` — thêm entry vào `[Unreleased]`
   - `docs/APP_DESCRIPTION.md` — nếu thêm/xóa feature
   - `KNOWN_ISSUES.md` — nếu phát hiện bug mới hoặc resolve bug cũ

4. Git add và commit:

```bash
git add -A
git status
```

5. Commit với Conventional Commits format (tiếng Việt):

```bash
git commit -m "<type>: <mô tả ngắn>"
```

- `feat:` — Tính năng mới
- `fix:` — Bug fix
- `docs:` — Chỉ thay đổi tài liệu
- `refactor:` — Refactor, không đổi behavior
- `chore:` — Build, config
