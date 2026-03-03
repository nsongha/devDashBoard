/**
 * Unit Tests — GitHub Webhook Handler
 */

import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature, parseWebhookEvent } from '../../src/webhooks/github-webhook.mjs';
import { createHmac } from 'crypto';

// Helper: tạo valid signature
function makeSignature(body, secret) {
  const payload = typeof body === 'string' ? Buffer.from(body) : body;
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

describe('GitHub Webhook', () => {
  describe('verifyWebhookSignature()', () => {
    const secret = 'mysecret';
    const body = Buffer.from('{"test": true}');

    it('trả true khi signature hợp lệ', () => {
      const sig = makeSignature(body, secret);
      expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    });

    it('trả false khi signature sai', () => {
      expect(verifyWebhookSignature(body, 'sha256=wrongsignature', secret)).toBe(false);
    });

    it('trả false khi signature không có prefix sha256=', () => {
      expect(verifyWebhookSignature(body, 'invalidsig', secret)).toBe(false);
    });

    it('trả false khi không có secret', () => {
      expect(verifyWebhookSignature(body, 'sha256=abc', '')).toBe(false);
    });

    it('trả false khi không có signature', () => {
      expect(verifyWebhookSignature(body, '', secret)).toBe(false);
    });

    it('constant-time comparison: không throw khi length khác nhau', () => {
      expect(() =>
        verifyWebhookSignature(body, 'sha256=short', secret)
      ).not.toThrow();
    });
  });

  describe('parseWebhookEvent()', () => {
    it('parse push event đúng', () => {
      const payload = {
        ref: 'refs/heads/main',
        commits: [{ message: 'feat: add feature' }, { message: 'fix: bug' }],
        pusher: { name: 'songha' },
        repository: { full_name: 'songha/dev-dashboard' },
        head_commit: { message: 'fix: bug' },
      };

      const result = parseWebhookEvent('push', payload);
      expect(result).toEqual({
        type: 'push',
        data: {
          ref: 'refs/heads/main',
          branch: 'main',
          commits: 2,
          pusher: 'songha',
          repoFullName: 'songha/dev-dashboard',
          headCommit: 'fix: bug',
        },
      });
    });

    it('parse pull_request event đúng', () => {
      const payload = {
        action: 'opened',
        number: 42,
        pull_request: {
          title: 'Add WebSocket support',
          state: 'open',
          user: { login: 'contributor' },
        },
        repository: { full_name: 'songha/dev-dashboard' },
      };

      const result = parseWebhookEvent('pull_request', payload);
      expect(result).toEqual({
        type: 'pull_request',
        data: {
          action: 'opened',
          number: 42,
          title: 'Add WebSocket support',
          state: 'open',
          author: 'contributor',
          repoFullName: 'songha/dev-dashboard',
        },
      });
    });

    it('parse ping event đúng', () => {
      const payload = { zen: 'Keep it simple.', hook_id: 123 };
      const result = parseWebhookEvent('ping', payload);
      expect(result).toEqual({
        type: 'ping',
        data: { zen: 'Keep it simple.', hookId: 123 },
      });
    });

    it('trả null khi eventType là null', () => {
      expect(parseWebhookEvent(null, {})).toBeNull();
    });

    it('trả null khi payload là null', () => {
      expect(parseWebhookEvent('push', null)).toBeNull();
    });

    it('parse unknown event type', () => {
      const payload = { some: 'data' };
      const result = parseWebhookEvent('issues', payload);
      expect(result).toEqual({ type: 'issues', data: payload });
    });

    it('handle push event với commits rỗng', () => {
      const payload = {
        ref: 'refs/heads/dev',
        commits: [],
        pusher: {},
        repository: {},
        head_commit: null,
      };
      const result = parseWebhookEvent('push', payload);
      expect(result.data.commits).toBe(0);
      expect(result.data.branch).toBe('dev');
    });
  });
});
