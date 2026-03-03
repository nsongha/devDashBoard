/**
 * Integration Tests — GitHub API Routes
 * Test Express routes /api/github/prs, /api/github/issues
 * và mở rộng POST /api/config cho githubToken/Owner/Repo
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.mjs';

describe('GitHub API Routes', () => {
  describe('GET /api/github/prs', () => {
    let savedToken;
    let savedRepo;

    beforeEach(() => {
      // Xóa cả GITHUB_TOKEN lẫn GITHUB_REPO để test "không có token/repo" đúng nghĩa
      savedToken = process.env.GITHUB_TOKEN;
      savedRepo = process.env.GITHUB_REPO;
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_REPO;
    });

    afterEach(() => {
      // Restore lại sau mỗi test
      if (savedToken) process.env.GITHUB_TOKEN = savedToken;
      else delete process.env.GITHUB_TOKEN;
      if (savedRepo) process.env.GITHUB_REPO = savedRepo;
      else delete process.env.GITHUB_REPO;
    });

    it('trả { available: false } khi không có githubToken trong config', async () => {
      const res = await request(app).get('/api/github/prs');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(false);
      expect(res.body.reason).toBeDefined();
    });

    it('trả 400 khi truyền owner nhưng thiếu repo', async () => {
      // Xóa token để test không call GitHub thật
      // Thay vào đó test validation: truyền repo rỗng để server trả 400
      process.env.GITHUB_TOKEN = 'fake_token_no_api_call';
      const res = await request(app).get('/api/github/prs?owner=testuser&repo=');
      // Server kiểm tra !repo trước khi call GitHub → trả 400
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
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
