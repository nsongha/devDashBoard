/**
 * Unit Tests — API Endpoints
 * Sử dụng supertest để test Express routes
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.mjs';

describe('API Endpoints', () => {
  describe('GET /api/projects', () => {
    it('trả về danh sách projects', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projects');
      expect(Array.isArray(res.body.projects)).toBe(true);
    });
  });

  describe('GET /api/data/:index', () => {
    it('trả 404 khi index không hợp lệ', async () => {
      const res = await request(app).get('/api/data/999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('trả 404 khi index âm', async () => {
      const res = await request(app).get('/api/data/-1');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/projects', () => {
    it('trả 400 khi path không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ path: '/nonexistent/fake/path/xyz' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid path');
    });

    it('trả 400 khi không gửi path', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
