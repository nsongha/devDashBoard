---
description: Quy trình debug systematic khi gặp lỗi
---

## Steps

### 1. Thu thập thông tin

- Đọc error message đầy đủ
- Xác định file + line number gây lỗi
- Kiểm tra git log xem commit nào gây ra (nếu regression):

```bash
git log --oneline -10
```

### 2. Reproduce

- Chạy lại server và trigger lỗi:

```bash
npm run dev
```

- Ghi lại exact steps để reproduce

### 3. Isolate

- Thu hẹp phạm vi: server.mjs hay index.html hay collect.mjs?
- Thêm `console.log` tạm tại các điểm nghi ngờ
- Kiểm tra data flow: API response → frontend rendering

### 4. Fix

- Sửa đúng root cause, không patch symptoms
- Chỉ sửa trong phạm vi bug — không refactor kèm

### 5. Verify

- Confirm bug đã fix
- Kiểm tra không gây regression ở chỗ khác
- Chạy `/task-completion`
