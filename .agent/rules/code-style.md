---
description: Quy tắc styling, kích thước file và tái sử dụng code
---

# Code Style

## Styling

- Không dùng TailwindCSS → Vanilla CSS
- Không inline styles trừ khi dynamic value bắt buộc
  - ✅ OK: `style.width = calculatedWidth + 'px'` — giá trị tính toán runtime
  - ❌ Không: `el.style.color = 'red'` — dùng CSS class thay thế

## Kích thước file

- File > 200 dòng → đề xuất tách nhỏ
- File > 300 dòng → **bắt buộc** tách

## Tái sử dụng

- UI hoặc Logic dùng lại ≥ 2 lần → tách thành module hoặc utility function riêng
- Không duplicate code — trích xuất thành shared module

## Module System

- Sử dụng ES Modules (`import`/`export`) — KHÔNG dùng CommonJS (`require`)
