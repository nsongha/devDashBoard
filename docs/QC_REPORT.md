# QC Report — Dev Dashboard

> Cập nhật: 2026-03-04
> Version: v2.2.0 · Branch: main

## Test Cases

### Parsers

- [x] TC-001: parseChangelog trả [] khi file không tồn tại
- [x] TC-002: parseChangelog parse single version entry
- [x] TC-003: parseChangelog parse multiple versions
- [x] TC-004: parseChangelog parse version without description
- [x] TC-005: parseKnownIssues trả {0,0,0} khi không có file
- [x] TC-006: parseKnownIssues đếm active issues (I-) đúng
- [x] TC-007: parseKnownIssues đếm tech debt (T-) đúng
- [x] TC-008: parseKnownIssues đếm mixed IDs chính xác
- [x] TC-009: parseKnownIssuesDetailed parse heading format với severity và module
- [x] TC-010: parseKnownIssuesDetailed parse tech debt section
- [x] TC-011: parseKnownIssuesDetailed parse resolved section (table format)
- [x] TC-012: parseKnownIssuesDetailed parse mixed sections trả counts chính xác
- [x] TC-013: parseTaskBoard trả null khi không tìm thấy file
- [x] TC-014: parseTaskBoard parse phase name chính xác
- [x] TC-015: parseTaskBoard đếm task statuses ✅ và 📋 đúng
- [x] TC-016: parseTaskBoard parse nhiều streams song song
- [x] TC-017: parseTaskBoard nhận diện blocked tasks ⏸️

### Collectors

- [x] TC-018: author-stats thống kê per-author commits đúng
- [x] TC-019: author-stats tính lines added/removed chính xác
- [x] TC-020: author-stats extract active days
- [x] TC-021: author-stats extract top files
- [x] TC-022: commit-analyzer phân loại Conventional Commits đúng (feat/fix/refactor/docs/chore)
- [x] TC-023: commit-analyzer thống kê theo tuần chính xác
- [x] TC-024: commit-analyzer xử lý commit message không chuẩn
- [x] TC-025: file-coupling phát hiện co-change pairs
- [x] TC-026: file-coupling áp dụng threshold ≥ 3
- [x] TC-027: file-coupling giới hạn top 20 pairs
- [x] TC-028: file-coupling trả [] khi git không available
- [x] TC-029: file-coupling trả [] khi chưa đủ commits

### API Endpoints

- [x] TC-030: GET /api/data/:index trả JSON hợp lệ
- [x] TC-031: GET /api/data/:index trả 404 khi index sai
- [x] TC-032: POST /api/config lưu settings đúng
- [x] TC-033: GET /api/config trả settings hiện tại
- [x] TC-034: GET /api/config mask API key
- [x] TC-035: GET /api/file đọc file nội bộ
- [x] TC-036: PUT /api/file ghi file thành công
- [x] TC-037: PUT /api/file trả 409 khi conflict
- [x] TC-038: PUT /api/file chặn path traversal
- [x] TC-039: PUT /api/file chặn extension không hợp lệ
- [x] TC-040: GET /api/file trả 400 cho file ngoài phạm vi
- [x] TC-041: PUT /api/file trả 400 cho request thiếu body
- [x] TC-042: PUT /api/file handle file mới (không tồn tại trước đó)

### Team API

- [x] TC-043: GET /api/team/:index trả authorStats
- [x] TC-044: GET /api/team/:index trả 404 khi index sai
- [x] TC-045: GET /api/team/:index handle project chưa có data
- [x] TC-046: GET /api/team/:index trả all-time rankings
- [x] TC-047: GET /api/team/:index trả active days per author
- [x] TC-048: GET /api/team/:index trả top files per author
- [x] TC-049: GET /api/team/:index cache data bằng dataCache

### GitHub Integration

- [x] TC-050: GitHubClient request GET thành công
- [x] TC-051: GitHubClient trả null khi API trả 404
- [x] TC-052: GitHubClient retry khi API trả 500
- [x] TC-053: GitHubClient trả null khi tất cả retries thất bại
- [x] TC-054: GitHubClient trả null khi không có apiKey
- [x] TC-055: GitHubClient xử lý response rỗng (no candidates)
- [x] TC-056: GitHubClient trả text response khi thành công
- [x] TC-057: GitHubClient rate limit warning
- [x] TC-058: GitHubClient timeout handling
- [x] TC-059: GitHubClient auth header đúng
- [x] TC-060: GitHub routes /api/github/prs trả data
- [x] TC-061: GitHub routes /api/github/issues trả data
- [x] TC-062: GitHub routes validate owner/repo params
- [x] TC-063: GitHub routes trả 500 khi thiếu token
- [x] TC-064: GitHub routes cache TTL 5 phút
- [x] TC-065: GitHub routes fallback từ config khi không có params
- [x] TC-066: GitHub branches comparison hoạt động
- [x] TC-067: GitHub branches trả diff stats
- [x] TC-068: GitHub branches handle branch không tồn tại
- [x] TC-069: GitHub branches handle merge base
- [x] TC-070: GitHub branches trả commit list
- [x] TC-071: GitHub branches handle API error
- [x] TC-072: GitHub branches handle empty diff

### Utilities

- [x] TC-073: DataCache set/get lưu trả đúng value
- [x] TC-074: DataCache trả null cho key không tồn tại
- [x] TC-075: DataCache TTL expiry hoạt động
- [x] TC-076: DataCache has() check fresh entries
- [x] TC-077: DataCache invalidate() xóa đúng key
- [x] TC-078: DataCache clear() xóa tất cả
- [x] TC-079: DataCache keys() trả fresh keys only
- [x] TC-080: DataCache size property đúng
- [x] TC-081: Deep links IDE_SCHEMES có 5 schemes
- [x] TC-082: Deep links makeFileLink vscode URL đúng
- [x] TC-083: Deep links makeFileLink cursor URL đúng
- [x] TC-084: Deep links makeFileLink webstorm URL đúng
- [x] TC-085: Deep links makeFileLink zed URL đúng
- [x] TC-086: Deep links makeFileLink antigravity URL đúng
- [x] TC-087: Deep links makeDiffLink vscode repo URL đúng
- [x] TC-088: Deep links makeDiffLink cursor repo URL đúng
- [x] TC-089: Deep links default scheme là vscode
- [x] TC-090: Deep links fallback unknown scheme về vscode
- [x] TC-091: Deep links makeFileLink without line number
- [x] TC-092: Deep links makeDiffLink webstorm navigate URL
- [x] TC-093: Deep links makeDiffLink zed repo URL
- [x] TC-094: Export buildFilename format đúng
- [x] TC-095: Export buildFilename sanitize special chars
- [x] TC-096: Export buildFilename fallback "dashboard"
- [x] TC-097: Export buildFilename date format YYYY-MM-DD
- [x] TC-098: Export buildPdfFilename .pdf extension
- [x] TC-099: Export isHtml2CanvasAvailable false khi no window
- [x] TC-100: Export isHtml2CanvasAvailable true khi available
- [x] TC-101: GeminiClient trả null khi không có apiKey
- [x] TC-102: GeminiClient trả text khi thành công
- [x] TC-103: GeminiClient trả null khi 400 (non-retryable)
- [x] TC-104: GeminiClient retry 500 rồi thành công
- [x] TC-105: GeminiClient trả null khi tất cả retries fail
- [x] TC-106: GeminiClient trả null khi response rỗng

### AI Parser

- [x] TC-107: parseWithAI dùng regex khi không có API key
- [x] TC-108: parseWithAI dùng regex khi config undefined
- [x] TC-109: parseWithAI dùng AI khi có key và thành công
- [x] TC-110: parseWithAI fallback regex khi AI trả null
- [x] TC-111: parseWithAI fallback regex khi AI throw error
- [x] TC-112: parseWithAI wrap array result với items + \_source
- [x] TC-113: parseWithAI trả null/undefined khi regex trả null

### Real-time & WebSocket

- [x] TC-114: WebSocket broadcast không throw khi không có clients
- [x] TC-115: WebSocket chỉ gửi khi client OPEN
- [x] TC-116: WebSocket getClientCount trả 0 khi khởi tạo
- [x] TC-117: WebSocket createWebSocketServer options đúng
- [x] TC-118: WebSocket đăng ký connection handler
- [x] TC-119: WebSocket closeWebSocketServer nhiều lần không throw
- [x] TC-120: WebSocket sau close getClientCount về 0
- [x] TC-121: WebSocket không throw khi tạo server
- [x] TC-122: GitWatcher trả về stop function
- [x] TC-123: GitWatcher gọi fs.watch trên .git/refs
- [x] TC-124: GitWatcher bỏ qua project không có .git/refs
- [x] TC-125: GitWatcher debounce broadcast 500ms
- [x] TC-126: GitWatcher broadcast đúng event type
- [x] TC-127: GitWatcher stop() đóng tất cả watchers
- [x] TC-128: GitWatcher stop() hủy debounce timer
- [x] TC-129: GitWatcher bỏ qua event khi filename null

### Export & Report

- [x] TC-130: buildReportId trả string
- [x] TC-131: buildReportId trả đúng 8 chars
- [x] TC-132: buildReportId chỉ hex characters
- [x] TC-133: buildReportId tạo unique IDs
- [x] TC-134: generateReportHtml trả non-empty string
- [x] TC-135: generateReportHtml starts with DOCTYPE
- [x] TC-136: generateReportHtml chứa project name
- [x] TC-137: generateReportHtml chứa version info
- [x] TC-138: generateReportHtml chứa total commits
- [x] TC-139: generateReportHtml chứa commit hashes
- [x] TC-140: generateReportHtml chứa changelog versions
- [x] TC-141: generateReportHtml chứa hotspot files
- [x] TC-142: generateReportHtml handle missing data
- [x] TC-143: generateReportHtml handle null data
- [x] TC-144: generateReportHtml chứa read-only badge
- [x] TC-145: generateReportHtml chứa generated timestamp

### Webhooks

- [x] TC-146: verifyWebhookSignature true khi hợp lệ
- [x] TC-147: verifyWebhookSignature false khi signature sai
- [x] TC-148: verifyWebhookSignature false khi thiếu prefix sha256=
- [x] TC-149: verifyWebhookSignature false khi không có secret
- [x] TC-150: verifyWebhookSignature false khi không có signature
- [x] TC-151: verifyWebhookSignature constant-time comparison
- [x] TC-152: parseWebhookEvent parse push event đúng
- [x] TC-153: parseWebhookEvent parse pull_request event đúng
- [x] TC-154: parseWebhookEvent parse ping event đúng
- [x] TC-155: parseWebhookEvent trả null khi eventType null
- [x] TC-156: parseWebhookEvent trả null khi payload null
- [x] TC-157: parseWebhookEvent parse unknown event type
- [x] TC-158: parseWebhookEvent handle push commits rỗng

### GitHub CI

- [x] TC-159: GitHub CI status check hoạt động
- [x] TC-160: GitHub CI handle no runs
- [x] TC-161: GitHub CI parse workflow runs
- [x] TC-162: GitHub CI handle API errors

### Manual Verification

- [x] TC-163: Dashboard load hiển thị đầy đủ sidebar
- [x] TC-164: Tab switching hoạt động đúng (Commits → Versions → Hotspots...)
- [x] TC-165: Dark/Light mode toggle
- [x] TC-166: Project dropdown switching
- [x] TC-167: Search command palette (Cmd+K) hoạt động
- [x] TC-168: Export PNG capture đúng dashboard
- [x] TC-169: Export PDF generate A4 landscape
- [x] TC-170: Settings modal mở/đóng/save
- [x] TC-171: Known Issues tab filter hoạt động (All/Active/Tech Debt/Resolved)
- [x] TC-172: Decisions tab hiển thị entries từ DECISIONS.md
- [x] TC-173: Workflows tab hiển thị danh sách workflows
- [x] TC-174: Team tab hiển thị contributor rankings
- [x] TC-175: In-browser editor mở/edit/save file markdown
- [x] TC-176: WebSocket real-time refresh khi có git commit mới
- [x] TC-177: Keyboard shortcuts Cmd+1..6 switch tabs
- [x] TC-178: QC tab hiển thị khi có QC_REPORT.md

## Release Checklist

- [x] Tất cả unit tests pass (194/194)
- [x] No critical KnownIssues (KI-) blocking release
- [x] Build server chạy không lỗi (node --check)
- [x] ESLint không có error mới
- [x] CHANGELOG.md cập nhật
- [x] Tất cả parsers hoạt động (regex mode)
- [x] WebSocket real-time hoạt động
- [x] Export PNG/PDF hoạt động
- [ ] GitHub integration test với real token
- [ ] Performance test: load time < 3s

## Sign-off

| Role      | Name         | Status      | Date       |
| --------- | ------------ | ----------- | ---------- |
| Developer | AI Assistant | ✅ Approved | 2026-03-04 |
| QC Lead   | —            | ⏳ Pending  | —          |
