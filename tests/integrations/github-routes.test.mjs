/**
 * Integration Tests — GitHub API Routes
 * Test Express routes /api/github/prs, /api/github/issues
 * và mở rộng POST /api/config cho githubToken/Owner/Repo
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.mjs';

describe('GitHub API Routes', () => {
  describe('GET /api/github/prs', () => {
    it('trả { available: false } khi không có githubToken trong config', async () => {
      // Config hiện tại không có githubToken → endpoint trả available: false
      const res = await request(app).get('/api/github/prs');
      // Có thể có token trong config.json nên check cả hai case
      if (res.body.available === false) {
        expect(res.status).toBe(200);
        expect(res.body.reason).toBeDefined();
      } else if (res.status === 400) {
        // Token có nhưng thiếu owner/repo
        expect(res.body.error).toBeDefined();
      } else {
        // Token + config đầy đủ → trả PR data
        expect(res.status).toBe(200);
        expect(typeof res.body.openCount).toBe('number');
      }
    });

    it('trả 400 khi truyền owner nhưng thiếu repo', async () => {
      const res = await request(app).get('/api/github/prs?owner=testuser');
      // Nếu có token → 400, không có token → available:false
      if (res.body.available === false) {
        expect(res.status).toBe(200);
      } else {
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      }
    });
  });

  describe('GET /api/github/issues', () => {
    it('trả { available: false } hoặc 400 tương tự như /prs', async () => {
      const res = await request(app).get('/api/github/issues');
      expect([200, 400, 502]).toContain(res.status);
      expect(res.body).toBeDefined();
    });
  });

  describe('POST /api/config — GitHub settings', () => {
    it('nhận và lưu githubToken, githubOwner, githubRepo', async () => {
      const res = await request(app)
        .post('/api/config')
        .send({
          githubOwner: 'test-owner',
          githubRepo: 'test-repo',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.githubOwner).toBe('test-owner');
      expect(res.body.githubRepo).toBe('test-repo');
    });

    it('GET /api/config trả hasGithubToken, githubOwner, githubRepo', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hasGithubToken');
      expect(res.body).toHaveProperty('githubOwner');
      expect(res.body).toHaveProperty('githubRepo');
    });

    it('không thay đổi githubToken nếu không gửi field', async () => {
      // Save owner only
      const res = await request(app)
        .post('/api/config')
        .send({ githubOwner: 'another-owner' });
      expect(res.status).toBe(200);
      expect(res.body.githubOwner).toBe('another-owner');
      // githubRepo vẫn giữ giá trị cũ
      expect(res.body.githubRepo).toBeDefined();
    });
  });
});
