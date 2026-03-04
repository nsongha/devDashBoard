# Decision Log

> Ghi lại các quyết định kiến trúc, kỹ thuật và thiết kế quan trọng trong dự án.
> Kết hợp 3 phong cách: **Decision Log** (gọn, tra cứu nhanh) + **Technical Decisions** (có lý do kỹ thuật) + **AI-assisted Tracking** (context cho AI).

## Convention

| Trường                 | Bắt buộc? | Mô tả                                                                                |
| ---------------------- | --------- | ------------------------------------------------------------------------------------ |
| **Tiêu đề**            | ✅        | `DEC-xxx: <mô tả ngắn>`                                                              |
| **Ngày**               | ✅        | Ngày quyết định                                                                      |
| **Loại**               | ✅        | `architecture` · `library` · `pattern` · `performance` · `security` · `ux` · `infra` |
| **Trạng thái**         | ✅        | `✅ Accepted` · `🔄 Superseded` · `❌ Rejected` · `💡 Proposed`                      |
| **Quyết định + Lý do** | ✅        | 1-3 câu: chọn gì và tại sao                                                          |
| **Bối cảnh**           | optional  | Vấn đề gì dẫn đến quyết định                                                         |
| **Alternatives**       | optional  | Các phương án khác đã xem xét                                                        |
| **Trade-off**          | optional  | Đánh đổi, rủi ro, hệ quả                                                             |
| **AI-assisted**        | optional  | Tag `🤖` nếu quyết định được đưa ra với AI                                           |

> **Quy tắc**: Mỗi entry tối đa **8-10 dòng**. Nếu cần phân tích sâu hơn → link tới file riêng trong `docs/`.

---

## Entries (mới nhất trước)

### DEC-012: Parallel data loading với Promise.all + async subprocess

- **Ngày**: 2024-03-04
- **Loại**: `performance` | 🤖
- **Trạng thái**: ✅ Accepted
- **Bối cảnh**: `collectProject()` chạy 5 git collectors tuần tự → ~6s load time
- **Quyết định**: Chuyển sang `Promise.all()` + `runAsync()` (exec non-blocking). Mỗi collector extract shared parse helpers để tránh duplicate giữa sync/async
- **Lý do kỹ thuật**: Giảm load từ ~6s → ~2s (~67% faster). Các collectors độc lập nhau → safe to parallelize
- **Trade-off**: Cần maintain cả sync lẫn async variant cho backward compat với CLI

---

### DEC-011: Xóa auto-refresh polling, giữ WebSocket-only

- **Ngày**: 2026-03-03
- **Loại**: `architecture` | 🤖
- **Trạng thái**: ✅ Accepted
- **Bối cảnh**: Polling 30s gây HTTP requests thừa, lag khi nhiều tab. Đã có WebSocket real-time từ Phase 5
- **Quyết định**: Xóa hoàn toàn `startAutoRefresh()`, `refreshInterval`, `countdown`. Thay label bằng "● Live" indicator
- **Lý do kỹ thuật**: WebSocket latency ~instant vs polling 30s. Giảm HTTP requests ~99%. Giữ nút manual refresh cho edge cases
- **Trade-off**: Nếu WebSocket disconnect → không có fallback tự động (chỉ có manual refresh)

---

### DEC-010: Tách secrets ra .env, config.json chỉ chứa non-sensitive

- **Ngày**: 2026-03-04
- **Loại**: `security` | 🤖
- **Trạng thái**: ✅ Accepted
- **Bối cảnh**: `config.json` chứa cả API keys → risk nếu vô tình commit
- **Quyết định**: Secrets (`GEMINI_API_KEY`, `GITHUB_TOKEN`, etc.) chuyển sang `.env` (dotenv). `config.json` chỉ lưu `NON_SENSITIVE_KEYS` (projects, ideScheme, viewMode)
- **Alternatives**: Encrypted config file, vault service → overkill cho internal tool
- **Trade-off**: Cần maintain 2 config sources. `.env.example` làm template cho người mới

---

### DEC-009: PWA với Service Worker cache strategies

- **Ngày**: 2026-03-04
- **Loại**: `architecture` | 🤖
- **Trạng thái**: ✅ Accepted
- **Quyết định**: 3 cache strategies — Cache-first cho static shell (HTML/CSS/JS), Network-first cho `/api/*` (JSON fallback offline), Navigation fallback → `offline.html`
- **Lý do kỹ thuật**: Static shell ít thay đổi → cache-first tối ưu latency. API data cần fresh → network-first. Offline page đơn giản (inline CSS, zero deps) để luôn available
- **Trade-off**: Dev mode phải tắt SW register để tránh cache files cũ

---

### DEC-008: Dev Mode tắt toàn bộ cache layers

- **Ngày**: 2026-03-04
- **Loại**: `infra` | 🤖
- **Trạng thái**: ✅ Accepted
- **Bối cảnh**: Phát triển feature bị khó debug do nhiều cache layers (SW, HTTP, DataCache, background worker)
- **Quyết định**: `NODE_ENV=development` → tắt tất cả: SW không register, HTTP `no-cache`, DataCache TTL=0, worker không chạy
- **Lý do kỹ thuật**: Một switch duy nhất thay vì phải nhớ tắt từng layer. `scripts/dev.sh` set env tự động

---

### DEC-007: WebSocket + fs.watch cho real-time updates

- **Ngày**: 2026-03-03
- **Loại**: `architecture` | 🤖
- **Trạng thái**: ✅ Accepted
- **Bối cảnh**: Cần dashboard cập nhật ngay khi có commit mới, không muốn polling
- **Quyết định**: `ws` package cho server-side WebSocket, `fs.watch` trên `.git/refs/` detect commits, debounce 500ms, broadcast event đến tất cả clients. Client auto-reconnect với exponential backoff (1s → 30s)
- **Alternatives**: SSE (Server-Sent Events) → đơn giản hơn nhưng unidirectional. Long polling → phức tạp hơn WebSocket
- **Trade-off**: Cần handle reconnection, heartbeat. `fs.watch` không reliable trên mọi OS (nhưng OK cho macOS/Linux)

---

### DEC-006: GitHub webhook với HMAC SHA-256 verification

- **Ngày**: 2026-03-03
- **Loại**: `security`
- **Trạng thái**: ✅ Accepted
- **Quyết định**: Verify webhook payload bằng `timingSafeEqual` HMAC SHA-256 trước khi xử lý. Broadcast event qua WebSocket, auto-invalidate GitHub cache
- **Lý do kỹ thuật**: `timingSafeEqual` chống timing attacks. Invalidate cache đảm bảo data fresh sau push

---

### DEC-005: In-memory cache với TTL thay vì Redis

- **Ngày**: 2026-03-03
- **Loại**: `architecture` | 🤖
- **Trạng thái**: ✅ Accepted
- **Bối cảnh**: Git CLI calls tốn ~2-6s mỗi request, cần caching
- **Quyết định**: `DataCache` class in-memory, TTL 60s, background worker refresh mỗi 2 phút. Incremental mode skip collect khi HEAD hash không đổi
- **Alternatives**: Redis → cần external service, overkill cho single-user tool. File-based → tốn I/O
- **Trade-off**: Mất cache khi restart server. Không share được giữa processes. OK cho internal tool

---

### DEC-004: AI parser dual-mode (AI → fallback regex)

- **Ngày**: 2026-03-03
- **Loại**: `pattern` | 🤖
- **Trạng thái**: ✅ Accepted
- **Quyết định**: Mỗi parser có 2 mode: async AI variant (Gemini) + regex gốc. `parseWithAI()` wrapper thử AI trước, fallback regex nếu fail. Thêm `_source` metadata
- **Lý do kỹ thuật**: AI cho kết quả tốt hơn với markdown phức tạp. Regex đảm bảo luôn hoạt động khi không có API key hoặc offline
- **Trade-off**: Maintain 2 implementations cho mỗi parser. AI latency ~1-3s/parser

---

### DEC-003: Vanilla JS + ES Modules thay vì framework

- **Ngày**: 2026-03-03
- **Loại**: `architecture`
- **Trạng thái**: ✅ Accepted
- **Quyết định**: Frontend dùng Vanilla HTML + ES Modules, không dùng React/Vue/Svelte
- **Lý do kỹ thuật**: Internal tool, 1-2 users, không cần component reusability phức tạp. Zero build step, zero node_modules cho frontend. Browser native ES Modules đủ cho modularization
- **Alternatives**: React → overkill, cần bundler. Lit/Web Components → hợp lý hơn nhưng thêm learning curve
- **Trade-off**: Khi app lớn hơn, inline HTML templates sẽ khó maintain. Template literals không có syntax highlighting

---

### DEC-002: Express + Node.js cho backend thay vì Fastify/Hono

- **Ngày**: 2026-03-03
- **Loại**: `library`
- **Trạng thái**: ✅ Accepted
- **Quyết định**: Dùng Express 4.21 — ecosystem lớn nhất, middleware phong phú, documentation tốt
- **Alternatives**: Fastify → performance tốt hơn nhưng ecosystem nhỏ hơn. Hono → lightweight nhưng còn mới
- **Trade-off**: Express không phải nhanh nhất, nhưng performance không phải bottleneck cho internal tool

---

### DEC-001: Monorepo single-repo structure

- **Ngày**: 2026-03-03
- **Loại**: `architecture`
- **Trạng thái**: ✅ Accepted
- **Quyết định**: Single repo, modular structure (`src/`, `public/`, `tests/`, `docs/`). Backend và frontend cùng repo
- **Lý do kỹ thuật**: Internal tool, single deployment unit. Shared utilities giữa server và CLI collector. Đơn giản hóa CI/CD
- **Trade-off**: Không tách được frontend deploy riêng (không cần cho local-first tool)
