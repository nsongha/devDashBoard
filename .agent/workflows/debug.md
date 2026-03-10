---
description: Quy trình debug systematic khi gặp lỗi
---

# Debug Workflow

> Tham khảo chi tiết skill `@systematic-debugging` trước khi bắt đầu.

## 1. Reproduce

- Xác nhận bug: reproduce được bằng steps cụ thể
- Ghi lại: URL, input, expected vs actual behavior
- Screenshot / error log nếu có

## 2. Root Cause Investigation

// turbo

- Đọc error logs, stack traces
- Kiểm tra recent changes: `git log -5 --oneline`
- Trace execution path từ input → output
- Xác định scope: server.mjs? frontend? collector? parser?

### Server debug

// turbo

- Console errors / stack traces
- Kiểm tra API response: `curl http://localhost:4321/api/<endpoint>`
- Kiểm tra git child process commands (timeout, error handling)
- File I/O errors (permissions, paths)

### Frontend debug

// turbo

- Browser DevTools → Console errors
- Network tab → API responses
- DOM inspection → element rendering
- CSS issues → computed styles

## 3. Hypothesis

- Đặt giả thuyết: "Lỗi vì [X] xảy ra khi [Y]"
- Verify giả thuyết bằng evidence (`console.log` tạm, breakpoints)
- Thu hẹp phạm vi: isolate đúng file/function gây lỗi

## 4. Fix

- Fix ĐÚNG root cause, KHÔNG fix symptom
- Phạm vi fix tối thiểu — KHÔNG refactor thêm
- Dọn sạch `console.log` debug tạm

## 5. Verify

// turbo

- Bug không còn reproduce
  // turbo
- `node --check src/server.mjs && node --check collect.mjs` — syntax check pass
- Server khởi động bình thường
- Kiểm tra side effects trên modules liên quan

## 6. Commit

- Chạy workflow `/task-completion`
- Commit message: `fix: <mô tả lỗi đã sửa tiếng Việt>`
