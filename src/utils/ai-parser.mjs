/**
 * AI Parser Wrapper
 * Wrapper function: thử AI trước, fallback regex khi AI unavailable.
 * Thêm _source field để debug nguồn data.
 */

import { GeminiClient } from './gemini-client.mjs';

/** @type {GeminiClient|null} */
let clientInstance = null;

/**
 * Lấy hoặc tạo mới GeminiClient singleton.
 * @param {string} apiKey
 * @returns {GeminiClient}
 */
function getClient(apiKey) {
  if (!clientInstance || clientInstance.apiKey !== apiKey) {
    clientInstance = new GeminiClient(apiKey);
  }
  return clientInstance;
}

/**
 * Parse content bằng AI trước, fallback regex nếu fail.
 *
 * @param {string} content - Raw file content cần parse
 * @param {Function} regexParser - Regex parser function (nhận content, trả parsed data)
 * @param {string} aiPrompt - Prompt cho Gemini mô tả output format mong muốn
 * @param {object} config - Config object chứa geminiApiKey
 * @returns {Promise<object>} Parsed data với _source indicator
 */
export async function parseWithAI(content, regexParser, aiPrompt, config) {
  // Không có API key → dùng regex ngay
  if (!config?.geminiApiKey) {
    const result = regexParser(content);
    return addSource(result, 'regex');
  }

  // Thử AI trước
  try {
    const client = getClient(config.geminiApiKey);
    const aiResponse = await client.parse(aiPrompt, content);

    if (aiResponse) {
      const parsed = JSON.parse(aiResponse);
      return addSource(parsed, 'ai');
    }
  } catch (err) {
    console.warn('[AI Parser] AI parsing failed, falling back to regex:', err.message);
  }

  // Fallback regex
  const result = regexParser(content);
  return addSource(result, 'regex');
}

/**
 * Thêm _source field vào result.
 * @param {*} result - Parsed data (object hoặc array)
 * @param {'ai'|'regex'} source
 * @returns {*}
 */
function addSource(result, source) {
  if (result === null || result === undefined) return result;

  if (Array.isArray(result)) {
    // Wrap array trong object để attach metadata
    return { items: result, _source: source };
  }

  if (typeof result === 'object') {
    return { ...result, _source: source };
  }

  return result;
}

/**
 * Reset client instance (dành cho testing).
 */
export function _resetClient() {
  clientInstance = null;
}
