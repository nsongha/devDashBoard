---
description: Xử lý lỗi, guard clauses, error/loading states
---

# Error Handling

## Guard Clauses & Early Return

- Dùng guard clauses + early return — tránh nested if sâu
- Handle edge cases ngay đầu function
- Ưu tiên "fail fast" — điều kiện không hợp lệ → return/throw ngay

```javascript
// ✅ Tốt: guard clause
function processData(data) {
  if (!data) return null;
  if (!data.items?.length) return { error: 'No items' };

  // Happy path logic here...
}

// ❌ Tránh: nested if
function processData(data) {
  if (data) {
    if (data.items?.length) {
      // Logic bị đẩy sâu vào...
    }
  }
}
```

## UI Error States

- Không để lộ error message kỹ thuật ra UI (stack trace, internal paths, etc.)
- Hiển thị thông báo thân thiện cho user, log chi tiết ở server console

## API Calls

- Luôn có error handling cho mọi API call (try/catch hoặc .catch())
- Xử lý cả network error lẫn business error
- Frontend nên hiển thị fallback UI khi API fail
