---
description: Performance optimization guidelines cho Node.js server và vanilla frontend
---

# Performance Rules

## Frontend

### DOM Operations

- Batch DOM updates — tránh reflow/repaint lặp lại
- Dùng `DocumentFragment` khi insert nhiều elements
- Dùng event delegation thay vì attach listener cho từng element

### Data Fetching

- Dùng caching headers khi phù hợp
- Tránh fetch dư thừa — cache kết quả phía client khi data ít thay đổi
- `Promise.all()` cho parallel fetches

### Assets

- Lazy load images và heavy content
- Minify CSS/JS cho production
- Dùng CSS animations thay vì JS animations khi có thể

## Backend (Node.js/Express)

### File I/O

- Prefer async file operations (`fs/promises`) — KHÔNG dùng sync methods
- Stream cho file lớn thay vì đọc toàn bộ vào memory
- Dùng caching cho config và data ít thay đổi

### Git Operations

- Timeout cho mọi git child process (tránh hang)
- Batch git commands khi cần nhiều thông tin
- Cache git data với TTL hợp lý

### API Response

- Response chỉ chứa data cần thiết
- Pagination cho large datasets
- Compression (gzip) cho responses lớn

## Anti-patterns

- ❌ Sync file reads trong request handler
- ❌ Load toàn bộ data rồi filter
- ❌ Inline styles cho static values (dùng CSS class)
- ❌ Git commands không có timeout
- ❌ Blocking main thread với heavy computation
