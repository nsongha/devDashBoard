---
description: Bảo mật cơ bản, secrets management, input validation
---

# Security

## Secrets & Credentials

- Không hardcode secrets, API keys, credentials vào source code
- Sử dụng environment variables hoặc config files ngoài gitignore
- File chứa secrets phải nằm trong `.gitignore`

## Input Validation

- Validate và sanitize mọi input từ user hoặc external source
- Path traversal protection cho mọi file operations (đặc biệt quan trọng cho DevDashboard)
- Sanitize HTML output để tránh XSS (dùng `escapeHtml` utility)

## Proactive Alerts

- Nhắc nhở khi phát hiện potential security issue — dù không được hỏi
- Ví dụ: path traversal risk, XSS vulnerability, exposed file system paths
