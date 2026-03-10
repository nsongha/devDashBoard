---
description: Chạy sau khi hoàn thành mỗi task — verify, update docs, commit
---

// turbo-all

# Task Completion Workflow

## BẮT BUỘC thực hiện sau khi hoàn thành MỌI task có thay đổi code:

### 1. Syntax Check

```bash
node --check src/server.mjs && node --check collect.mjs
```

- Đảm bảo không có syntax errors

### 2. Verify Server

```bash
timeout 5 node src/server.mjs || true
```

- Đảm bảo server khởi động được bình thường

### 3. Restart Server (nếu đang chạy)

> **Skip nếu** task CHỈ thay đổi: `docs/`, `.agent/`, CSS, config

```bash
lsof -ti:4321 | xargs kill -9 2>/dev/null; sleep 1; npm run dev &
```

### 4. Documentation Update — Checklist từng file

> ⚠️ **Kiểm tra TỪNG file** trong danh sách dưới đây. KHÔNG dựa vào cảm giác "đã xong".

**Duyệt qua checklist sau và update NẾU có thay đổi liên quan:**

- [ ] `CHANGELOG.md` — luôn update khi có tính năng mới hoặc fix đáng kể
- [ ] `docs/APP_DESCRIPTION.md` — update khi:
  - Phase status thay đổi (planned → hoàn thành)
  - Có module/tính năng mới
  - Roadmap thay đổi
- [ ] `docs/PROJECT_CONTEXT.md` — update khi:
  - Phase status / version thay đổi
  - Module mới hoặc thay đổi lớn
  - Stack / architecture / convention thay đổi
- [ ] `docs/DECISIONS.md` — update khi có quyết định kiến trúc quan trọng
- [ ] `docs/KNOWN_ISSUES.md` — update khi phát hiện bug/tech debt mới, hoặc fix issue đã biết

**Nếu task chỉ là bug fix nhỏ / UI tweak → chỉ cần `CHANGELOG.md`, bỏ qua các file còn lại.**

### 5. Git Commit

```bash
git add -A
git status
```

Commit với Conventional Commits format (tiếng Việt):

```bash
git commit -m "<type>: <mô tả ngắn>"
```

- `feat:` — Tính năng mới
- `fix:` — Bug fix
- `docs:` — Chỉ thay đổi tài liệu
- `refactor:` — Refactor, không đổi behavior
- `chore:` — Build, config

### 5.5. Git Push

```bash
git push
```

### 5.6. Verify Docs — BẮT BUỘC sau khi commit docs

> ⛔ KHÔNG được skip bước này. Đây là gate check cuối cùng.

```bash
git diff HEAD~1 --name-only
```

**So sánh output với checklist bước 4:**

1. Nếu task có **tính năng mới / phase mới** → `CHANGELOG.md` + `APP_DESCRIPTION.md` **BẮT BUỘC** phải xuất hiện trong diff
2. Nếu thiếu file nào → DỪNG, update, `git commit --amend --no-edit`

### 6. Summary

- Báo cáo cho user:
  - Những gì đã làm
  - Build status
  - Files changed
  - Commit hash

## LƯU Ý QUAN TRỌNG

- KHÔNG chờ user yêu cầu mới commit — commit NGAY sau khi verify pass
- KHÔNG để changes uncommitted qua nhiều tasks
- Mỗi task = 1 commit (hoặc tối đa 2: code + docs)
- Luôn kiểm tra `git status` trước khi bắt đầu task mới
