/**
 * Real-Time WebSocket Client Module
 * Kết nối WS đến server, handle auto-reconnect với exponential backoff.
 * Nhận events từ server và gọi callback tương ứng.
 */

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

let ws = null;
let reconnectDelay = MIN_RECONNECT_MS;
let reconnectTimer = null;
let eventCallback = null;
let isIntentionallyClosed = false;

/**
 * Khởi tạo WebSocket real-time connection.
 * @param {(event: string, payload?: object) => void} onEvent - Callback khi nhận event
 */
export function initRealtime(onEvent) {
  eventCallback = onEvent;
  isIntentionallyClosed = false;
  connect();
}

/**
 * Đóng kết nối và dừng auto-reconnect.
 */
export function closeRealtime() {
  isIntentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

// ─── Internal ──────────────────────────────────────────────────

function connect() {
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws = null;
  }

  // Dùng same host:port như trang hiện tại
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${location.host}`;

  console.log(`[Realtime] Connecting to ${url}`);

  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.warn('[Realtime] WebSocket creation failed:', err.message);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('[Realtime] Connected ✓');
    reconnectDelay = MIN_RECONNECT_MS; // Reset backoff khi kết nối thành công
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleEvent(data);
    } catch {
      console.warn('[Realtime] Invalid JSON from server:', event.data);
    }
  };

  ws.onerror = () => {
    // onerror luôn được followed bởi onclose, xử lý ở onclose
  };

  ws.onclose = (event) => {
    ws = null;
    if (isIntentionallyClosed) return;
    console.log(`[Realtime] Disconnected (code: ${event.code}). Reconnecting in ${reconnectDelay}ms...`);
    scheduleReconnect();
  };
}

function handleEvent(data) {
  const { type, payload } = data;

  if (type === 'connected') {
    console.log('[Realtime] Server acknowledged connection');
    return;
  }

  if (type === 'pong') {
    return;
  }

  if (type === 'git:commit') {
    console.log('[Realtime] Received git:commit event', payload);
    eventCallback?.('refresh', payload);
    return;
  }

  if (type === 'data:refresh') {
    console.log('[Realtime] Received data:refresh event', payload);
    eventCallback?.('refresh', payload);
    return;
  }

  // B4: GitHub webhook events
  if (type === 'github:push') {
    console.log('[Realtime] GitHub push detected', payload);
    eventCallback?.('github:push', payload);
    return;
  }

  if (type === 'github:pr') {
    console.log('[Realtime] GitHub PR event', payload);
    eventCallback?.('github:pr', payload);
    return;
  }

  if (type === 'github:event') {
    console.log(`[Realtime] GitHub event: ${payload?.type}`, payload?.data);
    return;
  }

  console.log(`[Realtime] Unknown event: ${type}`, payload);
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!isIntentionallyClosed) {
      connect();
      // Exponential backoff: double delay, capped at MAX
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
    }
  }, reconnectDelay);
}
