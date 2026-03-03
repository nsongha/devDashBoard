#!/bin/bash
# scripts/dev.sh — Khởi động dev server an toàn, tự động giải phóng port trước khi start

PORT=${PORT:-4321}

# Kill bất kỳ process nào đang chiếm port
PIDS=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "⚠️  Port $PORT đang bị chiếm bởi PID(s): $PIDS — đang kill..."
  echo "$PIDS" | xargs kill -9
  sleep 0.5
  echo "✅ Đã giải phóng port $PORT"
fi

echo "🚀 Khởi động dev server trên port $PORT..."
node --watch src/server.mjs
