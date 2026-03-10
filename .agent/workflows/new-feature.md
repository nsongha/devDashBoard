---
description: Quy trình phát triển tính năng mới từ analyze đến deploy
---

# New Feature Development

## 1. Phân tích yêu cầu

- Đọc kỹ requirement / user story
- Xác định scope: modules nào bị ảnh hưởng?
- Feature này thay đổi server (API), frontend (UI), hay cả hai?
- Có ảnh hưởng tới data format không? (breaking change cho `collect.mjs`)
- Hỏi lại nếu yêu cầu chưa rõ → KHÔNG tự suy diễn

## 2. Planning

- Liệt kê files cần tạo/sửa
- Nếu phức tạp (> 3 files): viết implementation plan trước
- Nếu đơn giản: implement trực tiếp
- Xác định thứ tự: shared utils → server/collectors → frontend UI

## 3. Server changes (nếu cần)

// turbo

- Thêm/sửa routes trong `src/server.mjs`
- Tạo parser mới trong `src/parsers/`
- Tạo collector mới trong `src/collectors/`
- Thêm utility functions trong `src/utils/`

## 4. Frontend changes (nếu cần)

- Thêm section/chart mới trong `src/public/index.html`
- Thêm CSS styles
- Connect với API endpoints mới
- Thêm loading, error, empty states

## 5. CLI changes (nếu cần)

- Sync logic vào `collect.mjs` nếu collector mới
- Giữ consistent với code style hiện tại (ES Modules, camelCase)

## 6. Verification

// turbo

- Syntax check: `node --check src/server.mjs && node --check collect.mjs`
  // turbo
- Chạy server: `npm run dev`
- Verify trên browser: `http://localhost:4321`
- Test với nhiều projects (nếu feature liên quan multi-project)

## 7. Commit & Docs

- Chạy workflow `/task-completion`
- Commit message: `feat: <mô tả tiếng Việt>`
- Update `APP_DESCRIPTION.md` nếu feature đáng kể
- Update `CHANGELOG.md`
