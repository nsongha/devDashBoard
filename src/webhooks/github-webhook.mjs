/**
 * GitHub Webhook Handler (B4)
 * Xử lý GitHub webhook events (push, pull_request).
 * Validates signature (HMAC SHA-256), trigger data refresh + WS broadcast.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify GitHub webhook signature.
 * GitHub gửi `X-Hub-Signature-256: sha256=<hex>` header.
 *
 * @param {Buffer} rawBody - Raw request body
 * @param {string} signature - Signature từ header X-Hub-Signature-256
 * @param {string} secret - Webhook secret từ config
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  if (!signature.startsWith('sha256=')) return false;

  const expectedSig = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  // Constant-time comparison để tránh timing attacks
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Parse và validate GitHub webhook event.
 * @param {string} eventType - X-GitHub-Event header value
 * @param {object} payload - Parsed JSON body
 * @returns {{ type: string, data: object } | null}
 */
export function parseWebhookEvent(eventType, payload) {
  if (!eventType || !payload) return null;

  switch (eventType) {
    case 'push':
      return {
        type: 'push',
        data: {
          ref: payload.ref || '',
          branch: (payload.ref || '').replace('refs/heads/', ''),
          commits: (payload.commits || []).length,
          pusher: payload.pusher?.name || 'unknown',
          repoFullName: payload.repository?.full_name || '',
          headCommit: payload.head_commit?.message || '',
        },
      };

    case 'pull_request':
      return {
        type: 'pull_request',
        data: {
          action: payload.action || '',
          number: payload.number || 0,
          title: payload.pull_request?.title || '',
          state: payload.pull_request?.state || '',
          author: payload.pull_request?.user?.login || '',
          repoFullName: payload.repository?.full_name || '',
        },
      };

    case 'ping':
      return {
        type: 'ping',
        data: { zen: payload.zen || '', hookId: payload.hook_id },
      };

    default:
      return { type: eventType, data: payload };
  }
}
