/**
 * Unit Tests — AI Parser Wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock parse function
const mockParse = vi.fn();

// Mock gemini-client with class-style constructor
vi.mock('../../src/utils/gemini-client.mjs', () => ({
  GeminiClient: vi.fn(function (apiKey) {
    this.apiKey = apiKey;
    this.parse = mockParse;
  }),
}));

import { parseWithAI, _resetClient } from '../../src/utils/ai-parser.mjs';

describe('parseWithAI', () => {
  const regexParser = vi.fn();

  beforeEach(() => {
    regexParser.mockReset();
    mockParse.mockReset();
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
    mockParse.mockResolvedValue('{"data": "ai"}');

    const result = await parseWithAI('content', regexParser, 'prompt', { geminiApiKey: 'key' });

    expect(result).toEqual({ data: 'ai', _source: 'ai' });
    expect(regexParser).not.toHaveBeenCalled();
  });

  it('fallback regex khi AI trả null', async () => {
    mockParse.mockResolvedValue(null);
    regexParser.mockReturnValue({ data: 'fallback' });

    const result = await parseWithAI('content', regexParser, 'prompt', { geminiApiKey: 'key' });

    expect(result).toEqual({ data: 'fallback', _source: 'regex' });
    expect(regexParser).toHaveBeenCalled();
  });

  it('fallback regex khi AI throw error', async () => {
    mockParse.mockRejectedValue(new Error('API fail'));
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
