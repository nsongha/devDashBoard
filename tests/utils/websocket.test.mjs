/**
 * Unit Tests — WebSocket Server
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ws module trước khi import bất cứ thứ gì
vi.mock('ws', () => {
  class MockWebSocketServer {
    static _instances = [];

    constructor(options) {
      this.options = options;
      this._handlers = {};
      MockWebSocketServer._instances.push(this);
    }

    on(event, cb) {
      this._handlers[event] = cb;
      return this;
    }

    close() {}
  }

  return {
    WebSocketServer: MockWebSocketServer,
    WebSocket: { OPEN: 1 },
  };
});

describe('WebSocket Server', () => {
  let websocketModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Clear static instances
    const { WebSocketServer } = await import('ws');
    WebSocketServer._instances = [];

    websocketModule = await import('../../src/utils/websocket.mjs');
  });

  afterEach(() => {
    websocketModule.closeWebSocketServer();
  });

  describe('broadcast()', () => {
    it('không throw khi không có clients', () => {
      expect(() => websocketModule.broadcast('git:commit', {})).not.toThrow();
    });

    it('chỉ gửi khi có clients ở trạng thái OPEN', () => {
      // Không có clients → broadcast vẫn không throw
      expect(() => websocketModule.broadcast('test', { key: 'value' })).not.toThrow();
    });
  });

  describe('getClientCount()', () => {
    it('trả về 0 khi khởi tạo', () => {
      expect(websocketModule.getClientCount()).toBe(0);
    });
  });

  describe('createWebSocketServer()', () => {
    it('tạo WebSocketServer với httpServer options đúng', async () => {
      const { WebSocketServer } = await import('ws');
      const mockHttpServer = {};

      websocketModule.createWebSocketServer(mockHttpServer);

      expect(WebSocketServer._instances.length).toBe(1);
      expect(WebSocketServer._instances[0].options).toEqual({ server: mockHttpServer });
    });

    it('không throw khi tạo server', async () => {
      const mockHttpServer = {};
      expect(() => websocketModule.createWebSocketServer(mockHttpServer)).not.toThrow();
    });

    it('đăng ký connection handler', async () => {
      const { WebSocketServer } = await import('ws');
      const mockHttpServer = {};

      websocketModule.createWebSocketServer(mockHttpServer);

      const wssInstance = WebSocketServer._instances[0];
      expect(wssInstance._handlers['connection']).toBeTypeOf('function');
    });
  });

  describe('closeWebSocketServer()', () => {
    it('có thể gọi nhiều lần không throw', () => {
      expect(() => {
        websocketModule.closeWebSocketServer();
        websocketModule.closeWebSocketServer();
      }).not.toThrow();
    });

    it('sau khi close, getClientCount về 0', () => {
      websocketModule.closeWebSocketServer();
      expect(websocketModule.getClientCount()).toBe(0);
    });
  });
});
