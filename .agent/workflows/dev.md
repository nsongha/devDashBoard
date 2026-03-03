---
description: Workflow phát triển feature mới cho Dev Dashboard
---

## Steps

### 1. Đọc context

- Đọc `docs/PROJECT_CONTEXT.md` trước tiên
- Đọc thêm `docs/APP_DESCRIPTION.md` nếu cần hiểu roadmap

### 2. Phân tích yêu cầu

- Feature này thay đổi server (API), frontend (UI), hay cả hai?
- Có ảnh hưởng tới data format không? (breaking change cho collect.mjs)
- Cần thêm dependency mới không?

### 3. Plan

- Xác định files cần sửa
- Nếu phức tạp (> 3 files): viết implementation plan trước
- Nếu đơn giản: implement trực tiếp

### 4. Implement

- **Server changes**: sửa `server.mjs`, thêm route/parser mới
- **UI changes**: sửa `index.html`, thêm section/chart mới
- **CLI changes**: sync logic vào `collect.mjs` nếu cần
- Giữ consistent với code style hiện tại (ES Modules, camelCase)

### 5. Test

- Chạy server: `npm run dev`
- Verify trên browser: `http://localhost:4321`
- Test với nhiều projects (nếu feature liên quan multi-project)

### 6. Hoàn tất

- Chạy `/task-completion`
