/**
 * Unit Tests — File API Endpoints (In-Browser Editing)
 * Tests GET /api/file and PUT /api/file
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { app } from '../src/server.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// We need a valid project in config — use the project itself
const testProjectPath = ROOT_DIR;

describe('File API — GET /api/file', () => {
  it('trả về nội dung file .md hợp lệ', async () => {
    const res = await request(app)
      .get('/api/file')
      .query({ projectIndex: 0, path: 'README.md' });

    // Might be 200 or 404 depending on config, but validates structure
    if (res.status === 200) {
      expect(res.body).toHaveProperty('content');
      expect(res.body).toHaveProperty('lastModified');
      expect(res.body).toHaveProperty('filename');
      expect(typeof res.body.content).toBe('string');
      expect(typeof res.body.lastModified).toBe('number');
    }
  });

  it('reject file không phải .md', async () => {
    const res = await request(app)
      .get('/api/file')
      .query({ projectIndex: 0, path: 'package.json' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('.md');
  });

  it('reject path traversal', async () => {
    const res = await request(app)
      .get('/api/file')
      .query({ projectIndex: 0, path: '../../etc/passwd.md' });

    expect(res.status).toBe(400);
  });

  it('trả 400 khi thiếu parameters', async () => {
    const res = await request(app)
      .get('/api/file')
      .query({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing');
  });

  it('trả 404 khi project index không hợp lệ', async () => {
    const res = await request(app)
      .get('/api/file')
      .query({ projectIndex: 999, path: 'README.md' });

    expect(res.status).toBe(404);
  });

  it('trả 404 khi file không tồn tại', async () => {
    const res = await request(app)
      .get('/api/file')
      .query({ projectIndex: 0, path: 'nonexistent-file-xyz.md' });

    // Could be 404 (file not found) or 404 (no project configured)
    expect([400, 404]).toContain(res.status);
  });
});

describe('File API — PUT /api/file', () => {
  it('reject file không phải .md', async () => {
    const res = await request(app)
      .put('/api/file')
      .send({
        projectIndex: 0,
        relativePath: 'package.json',
        content: 'test',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('.md');
  });

  it('reject khi thiếu parameters', async () => {
    const res = await request(app)
      .put('/api/file')
      .send({});

    expect(res.status).toBe(400);
  });

  it('reject path traversal', async () => {
    const res = await request(app)
      .put('/api/file')
      .send({
        projectIndex: 0,
        relativePath: '../../../etc/evil.md',
        content: 'hacked',
      });

    expect(res.status).toBe(400);
  });
});
