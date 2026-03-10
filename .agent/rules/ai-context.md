---
description: Rule đọc Project Context trước khi bắt đầu task
globs: ['**/*']
alwaysApply: true
---

# Project Context First

- Khi bắt đầu task mới (implement feature, fix bug, refactor), LUÔN đọc `docs/PROJECT_CONTEXT.md` trước
- File này chứa tóm tắt project: stack, architecture, current phase, conventions
- Chỉ đọc thêm docs chi tiết (APP_DESCRIPTION, DECISIONS...) khi cần deep-dive
- File PROJECT_CONTEXT.md được auto-maintained bởi `/task-completion` workflow
