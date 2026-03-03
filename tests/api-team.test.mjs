/**
 * Unit Tests — Team Config API (C2: Role-based views)
 * Test viewMode GET/POST endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { app } from '../src/server.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const CONFIG_PATH = join(ROOT_DIR, 'config.json');

describe('Config API — viewMode (C2)', () => {
  let originalConfig;

  beforeEach(() => {
    // Save original config
    if (existsSync(CONFIG_PATH)) {
      originalConfig = readFileSync(CONFIG_PATH, 'utf-8');
    }
  });

  afterEach(() => {
    // Restore original config
    if (originalConfig !== undefined) {
      writeFileSync(CONFIG_PATH, originalConfig);
    }
  });

  describe('GET /api/config', () => {
    it('trả về viewMode field', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('viewMode');
      // Default là 'developer' nếu chưa set
      const validModes = ['developer', 'team-lead'];
      expect(validModes).toContain(res.body.viewMode);
    });

    it('trả về viewMode mặc định là "developer"', async () => {
      // Đặt config không có viewMode
      const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      delete config.viewMode;
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.viewMode).toBe('developer');
    });
  });

  describe('POST /api/config — viewMode', () => {
    it('lưu viewMode "team-lead" thành công', async () => {
      const res = await request(app)
        .post('/api/config')
        .send({ viewMode: 'team-lead', ideScheme: 'vscode' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.viewMode).toBe('team-lead');
    });

    it('lưu viewMode "developer" thành công', async () => {
      const res = await request(app)
        .post('/api/config')
        .send({ viewMode: 'developer', ideScheme: 'vscode' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.viewMode).toBe('developer');
    });

    it('trả 400 khi viewMode không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/config')
        .send({ viewMode: 'admin', ideScheme: 'vscode' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/viewMode/i);
    });

    it('trả 400 khi viewMode là chuỗi rỗng', async () => {
      const res = await request(app)
        .post('/api/config')
        .send({ viewMode: '', ideScheme: 'vscode' });
      // Chuỗi rỗng không nằm trong valid list → phải trả 400
      expect(res.status).toBe(400);
    });

    it('GET sau khi POST viewMode phải trả đúng giá trị', async () => {
      await request(app)
        .post('/api/config')
        .send({ viewMode: 'team-lead', ideScheme: 'vscode' });

      const res = await request(app).get('/api/config');
      expect(res.body.viewMode).toBe('team-lead');
    });
  });
});
