# Known Issues — Dev Dashboard

> Cập nhật lần cuối: 2026-03-03 (Phase 5 in progress)
> Xem lịch sử thay đổi: [CHANGELOG.md](../CHANGELOG.md) | Kế hoạch phát triển: [DEV_ROADMAP.md](DEV_ROADMAP.md)

---

## 🔴 Đang hoạt động (Active)

### [KI-001] WebSocket không reconnect khi server restart

- **Mức độ**: Medium
- **Module**: `public/js/realtime.mjs`
- **Mô tả**: Khi server Node.js restart (ví dụ: `npm run dev` reload), WebSocket client thực hiện exponential backoff nhưng đôi khi không reconnect hoàn toàn sau nhiều lần thất bại liên tiếp. User phải reload tay trang.
- **Workaround**: Reload trang (`Cmd+R`) sau khi server restart.
- **Liên quan**: Stream B Phase 5

---

### [KI-002] Export PNG cắt mất phần dưới dashboard

- **Mức độ**: Medium
- **Module**: `public/js/export.mjs`
- **Mô tả**: `html2canvas` chụp ảnh dựa trên viewport hiện tại. Nếu dashboard có scroll dài (nhiều commits, nhiều insights), phần nội dung ngoài viewport sẽ bị cắt trong file PNG output.
- **Workaround**: Scroll lên đầu trang trước khi dùng ⌘⇧E; hoặc thu nhỏ cửa sổ để giảm chiều cao trang.
- **Liên quan**: Stream C Phase 5 — Task C1

---

### [KI-003] GitHub rate limit không hiển thị rõ ràng cho user

- **Mức độ**: Low
- **Module**: `src/integrations/github-client.mjs`
- **Mô tả**: Khi API remaining < 10, server log warning nhưng UI không thông báo. User thấy dữ liệu cũ từ cache (TTL 5 phút) mà không biết lý do.
- **Workaround**: Check `console.log` ở server terminal, hoặc đợi 5 phút để cache expire.
- **Liên quan**: Stream A Phase 5

---

### [KI-004] AI parser (Gemini) timeout không retry đúng cách trong môi trường chậm

- **Mức độ**: Low
- **Module**: `src/utils/gemini-client.mjs`, `src/utils/ai-parser.mjs`
- **Mô tả**: Retry logic hiện tại dùng exponential backoff 2 lần với timeout 15s. Trong mạng chậm, cả 3 attempts (1 initial + 2 retries) có thể timeout → fallback sang regex parser. Kết quả cuối vẫn đúng nhưng latency tăng ~45s trước khi fallback.
- **Workaround**: Nếu không dùng AI parsing, tắt Gemini API key trong Settings để skip hoàn toàn.
- **Liên quan**: Phase 3 — Gemini integration

---

### [KI-005] Markdown preview trong editor không hỗ trợ syntax highlighting cho code blocks

- **Mức độ**: Low
- **Module**: `public/js/editor.mjs`
- **Mô tả**: Preview renderer custom (không dùng library) chỉ wrap code blocks trong `<pre><code>` nhưng không apply syntax highlighting. Code blocks hiển thị dạng plain text.
- **Workaround**: Không có; chỉ ảnh hưởng preview, nội dung file không bị thay đổi.
- **Liên quan**: Stream B Phase 4 — Task B3

---

## 🟡 Tech Debt

### [TD-001] `public/js/app.mjs` đang phình to

- **Mức độ**: Medium
- **Module**: `public/js/app.mjs`
- **Mô tả**: File hiện tại đang tích lũy nhiều responsibilities: orchestration, settings modal, filter logic, tab switching delegation. Cần tách thêm thành `settings.mjs`, `filters.mjs` trong Phase 6.
- **Kế hoạch fix**: Phase 6 — Production Polish

---

### [TD-002] Regex parsers fragile với format không chuẩn

- **Mức độ**: Medium
- **Module**: `src/parsers/*.mjs`
- **Mô tả**: 7 parsers dùng regex để parse markdown. Nếu format file thay đổi (ví dụ: thêm emoji trong heading, đổi level heading), parser sẽ trả về dữ liệu rỗng thay vì error rõ ràng. AI mode (`Gemini`) là giải pháp tốt hơn nhưng phụ thuộc API key.
- **Kế hoạch fix**: Long-term — Phase 6 hoặc khi có vấn đề thực tế.

---

### [TD-003] In-memory cache không persist qua server restart

- **Mức độ**: Low
- **Module**: `src/utils/cache.mjs`
- **Mô tả**: `DataCache` là in-memory thuần, mất toàn bộ data khi server restart. First request sau restart luôn là cache MISS và phải collect lại từ Git CLI (có thể mất 2-5s cho repo lớn).
- **Kế hoạch fix**: Không ưu tiên — đây là internal dev tool, restart ít gặp.

---

### [TD-004] Tests cho `github.mjs` frontend module chưa có

- **Mức độ**: Low
- **Module**: `public/js/github.mjs`
- **Mô tả**: Module `github.mjs` (UI rendering cho GitHub tab) chưa có unit tests. Logic render phức tạp (labels, milestones, relative time) có thể có edge cases chưa được bắt.
- **Kế hoạch fix**: Phase 5 stream còn lại.

---

## ✅ Đã giải quyết gần đây

| ID      | Mô tả                                                                      | Giải quyết trong                      |
| ------- | -------------------------------------------------------------------------- | ------------------------------------- |
| KI-F001 | Git watcher không detect commit trên Windows (fs.watch behavior khác)      | Phase 5 — Known, scope Linux/Mac only |
| KI-F002 | Test `git-watcher.test.mjs` flaky do race condition trong CI               | Phase 5 — Fixed với proper cleanup    |
| KI-F003 | Dashboard stuck ở skeleton loading sau Phase 3 (worker.mjs race condition) | Phase 3 → Phase 4                     |
| KI-F004 | Code velocity chart hiển thị theo tuần không phản ánh commit thực tế       | Phase 5 — Fixed per-commit mode       |
| KI-F005 | `TASK_BOARD.md` ở root bị parse sai do parser ưu tiên sai file             | Phase 4 — Fixed parser priority       |

---

## 📋 Hướng dẫn báo cáo issue mới

Khi phát hiện bug mới, thêm entry theo format sau vào section **Đang hoạt động**:

```markdown
### [KI-XXX] Tiêu đề ngắn gọn

- **Mức độ**: Critical / Medium / Low
- **Module**: `path/to/module.mjs`
- **Mô tả**: Mô tả chi tiết: điều kiện xảy ra, behavior hiện tại vs expected.
- **Workaround**: Cách xử lý tạm thời nếu có.
- **Liên quan**: Phase / Stream / Task ID (nếu có)
```

> Xem thêm: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — [TASK_BOARD.md](TASK_BOARD.md)
