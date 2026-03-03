/**
 * Unit Tests — Gemini Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiClient } from '../../src/utils/gemini-client.mjs';

describe('GeminiClient', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('trả null khi không có apiKey', async () => {
    const client = new GeminiClient('');
    const result = await client.parse('test prompt', 'test content');
    expect(result).toBeNull();
  });

  it('trả text response khi API thành công', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{"key": "value"}' }] } }],
      }),
    });

    const client = new GeminiClient('test-key');
    const result = await client.parse('prompt', 'content');
    expect(result).toBe('{"key": "value"}');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('trả null khi API trả 400 (non-retryable)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: 'Bad request' } }),
    });

    const client = new GeminiClient('test-key');
    const result = await client.parse('prompt', 'content');
    expect(result).toBeNull();
    // Should NOT retry on 400
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retry khi API trả 500 rồi thành công', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: '"ok"' }] } }],
        }),
      });

    const client = new GeminiClient('test-key');
    // Speed up sleep for testing
    client._sleep = vi.fn().mockResolvedValue(undefined);
    const result = await client.parse('prompt', 'content');
    expect(result).toBe('"ok"');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('trả null khi tất cả retries thất bại', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const client = new GeminiClient('test-key');
    client._sleep = vi.fn().mockResolvedValue(undefined);
    const result = await client.parse('prompt', 'content');
    expect(result).toBeNull();
    // 1 initial + 2 retries = 3 calls
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('trả null khi response rỗng (no candidates)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    });

    const client = new GeminiClient('test-key');
    const result = await client.parse('prompt', 'content');
    expect(result).toBeNull();
  });
});
