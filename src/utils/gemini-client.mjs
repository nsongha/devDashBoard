/**
 * Gemini API Client
 * Gọi Gemini REST API trực tiếp qua fetch(), không dùng SDK.
 * Có retry logic + error handling. Trả null khi API unavailable → caller fallback.
 */

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 15000;

export class GeminiClient {
  /**
   * @param {string} apiKey - Gemini API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Gửi prompt + content tới Gemini, trả về parsed text response.
   * @param {string} prompt - System/instruction prompt
   * @param {string} content - Nội dung cần parse
   * @returns {Promise<string|null>} Response text hoặc null nếu fail
   */
  async parse(prompt, content) {
    if (!this.apiKey) return null;

    const body = {
      contents: [
        {
          parts: [{ text: `${prompt}\n\n---\n\n${content}` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this._fetchWithTimeout(body);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const status = response.status;

          // Non-retryable errors
          if (status === 400 || status === 403) {
            console.warn(`[GeminiClient] API error ${status}:`, errorData.error?.message || 'Unknown');
            return null;
          }

          // Retryable errors (429 rate limit, 5xx server errors)
          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
            console.warn(`[GeminiClient] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (status ${status})`);
            await this._sleep(delay);
            continue;
          }

          console.warn(`[GeminiClient] All retries exhausted (status ${status})`);
          return null;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          console.warn('[GeminiClient] Empty response from API');
          return null;
        }

        return text;
      } catch (err) {
        // Network errors, timeouts
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[GeminiClient] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms:`, err.message);
          await this._sleep(delay);
          continue;
        }

        console.warn('[GeminiClient] All retries exhausted:', err.message);
        return null;
      }
    }

    return null;
  }

  /**
   * Fetch với timeout sử dụng AbortController.
   * @param {object} body - Request body
   * @returns {Promise<Response>}
   */
  async _fetchWithTimeout(body) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
