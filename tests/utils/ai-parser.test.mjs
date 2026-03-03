/**
 * Unit Tests — AI Parser Wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock gemini-client
vi.mock('../../src/utils/gemini-client.mjs', () => {
  const mockParse = vi.fn();
  return {
    GeminiClient: vi.fn(function (apiKey) {
      this.apiKey = apiKey;
      this.parse = mockParse;
    }),
    __mockParse: mockParse,
  };
});

import { parseWithAI, _resetClient } from '../../src/utils/ai-parser.mjs';
import { GeminiClient } from '../../src/utils/gemini-client.mjs';

describe('parseWithAI', () => {
  const regexParser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    _resetClient();
  });

  it('dùng regex khi không có API key', async () => {
    regexParser.mockReturnValue({ data: 'regex' });
    const result = await parseWithAI('content', regexParser, 'prompt', {});

    expect(regexParser).toHaveBeenCalledWith('content');
    expect(result).toEqual({ data: 'regex', _source: 'regex' });
  });

  it('dùng regex khi config undefined', async () => {
    regexParser.mockReturnValue({ data: 'regex' });
    const result = await parseWithAI('content', regexParser, 'prompt', undefined);

    expect(regexParser).toHaveBeenCalledWith('content');
    expect(result._source).toBe('regex');
  });

  it('dùng AI khi có API key và AI thành công', async () => {
    const mockParse = vi.fn().mockResolvedValue('{"data": "ai"}');
    GeminiClient.mockImplementation(() => ({ parse: mockParse }));
    _resetClient();

    const result = await parseWithAI('content', regexParser, 'prompt', { geminiApiKey: 'key' });

    expect(result).toEqual({ data: 'ai', _source: 'ai' });
    expect(regexParser).not.toHaveBeenCalled();
  });

  it('fallback regex khi AI trả null', async () => {
    const mockParse = vi.fn().mockResolvedValue(null);
    GeminiClient.mockImplementation(() => ({ parse: mockParse }));
    _resetClient();
    regexParser.mockReturnValue({ data: 'fallback' });

    const result = await parseWithAI('content', regexParser, 'prompt', { geminiApiKey: 'key' });

    expect(result).toEqual({ data: 'fallback', _source: 'regex' });
    expect(regexParser).toHaveBeenCalled();
  });

  it('fallback regex khi AI throw error', async () => {
    const mockParse = vi.fn().mockRejectedValue(new Error('API fail'));
    GeminiClient.mockImplementation(() => ({ parse: mockParse }));
    _resetClient();
    regexParser.mockReturnValue([1, 2, 3]);

    const result = await parseWithAI('content', regexParser, 'prompt', { geminiApiKey: 'key' });

    expect(result).toEqual({ items: [1, 2, 3], _source: 'regex' });
  });

  it('wrap array result với items + _source', async () => {
    regexParser.mockReturnValue(['a', 'b']);
    const result = await parseWithAI('content', regexParser, 'prompt', {});

    expect(result).toEqual({ items: ['a', 'b'], _source: 'regex' });
  });

  it('trả null/undefined khi regex trả null', async () => {
    regexParser.mockReturnValue(null);
    const result = await parseWithAI('content', regexParser, 'prompt', {});
    expect(result).toBeNull();
  });
});
