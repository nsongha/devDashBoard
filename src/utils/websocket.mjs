/**
 * WebSocket Server Module
 * Tích hợp ws.Server với Express HTTP server.
 * Cung cấp broadcast(), heartbeat và auto-cleanup disconnected clients.
 */

import { WebSocketServer, WebSocket } from 'ws';

const HEARTBEAT_INTERVAL_MS = 30_000; // ping mỗi 30s

/** @type {Set<WebSocket>} */
const clients = new Set();

/** @type {WebSocketServer | null} */
let wss = null;

/** @type {ReturnType<typeof setInterval> | null} */
let heartbeatTimer = null;

/**
 * Tạo WebSocket server gắn vào HTTP server đã có.
 * @param {import('http').Server} httpServer
 * @returns {WebSocketServer}
 */
export function createWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    clients.add(ws);

    const clientIp = req.socket.remoteAddress;
    console.log(`[WS] Client connected (${clients.size} total) — ${clientIp}`);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      // Client có thể gửi ping thủ công
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (${clients.size} remaining)`);
    });

    ws.on('error', (err) => {
      console.warn('[WS] Client error:', err.message);
      clients.delete(ws);
    });

    // Gửi welcome event để client biết kết nối thành công
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });

  // Bắt đầu heartbeat để cleanup zombie connections
  startHeartbeat();

  console.log('[WS] WebSocket server initialized');
  return wss;
}

/**
 * Broadcast một event tới tất cả clients đang kết nối.
 * @param {string} type - Loại event (ví dụ: 'git:commit', 'data:refresh')
 * @param {object} [payload={}] - Dữ liệu kèm theo
 */
export function broadcast(type, payload = {}) {
  if (clients.size === 0) return;

  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  let sent = 0;

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`[WS] Broadcast "${type}" → ${sent} client(s)`);
  }
}

/**
 * Trả về số lượng clients đang kết nối.
 * @returns {number}
 */
export function getClientCount() {
  return clients.size;
}

/**
 * Dừng WebSocket server và cleanup.
 */
export function closeWebSocketServer() {
  stopHeartbeat();
  for (const ws of clients) {
    ws.terminate();
  }
  clients.clear();
  if (wss) {
    wss.close();
    wss = null;
  }
}

// ─── Internal ─────────────────────────────────────────────────

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) {
        // Client không respond pong — terminate
        console.warn('[WS] Terminating zombie client (no pong)');
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  if (heartbeatTimer.unref) heartbeatTimer.unref();
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
