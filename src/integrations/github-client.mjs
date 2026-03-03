/**
 * GitHub API Client
 * Gọi GitHub REST API v3 qua fetch() với Personal Access Token (PAT).
 * Rate limit handling, timeout 15s, retry 2 lần với exponential backoff.
 */

const GITHUB_API_URL = 'https://api.github.com';
const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 15000;

export class GitHubClient {
  /**
   * @param {string} token - GitHub Personal Access Token (PAT)
   */
  constructor(token) {
    this.token = token;
  }

  /**
   * Gửi request tới GitHub REST API.
   * @param {string} endpoint - API path, ví dụ `/repos/owner/repo/pulls`
   * @param {object} [options] - Fetch options bổ sung
   * @returns {Promise<object|null>} Parsed JSON hoặc null nếu lỗi
   */
  async request(endpoint, options = {}) {
    if (!this.token) return null;

    const url = `${GITHUB_API_URL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this._fetchWithTimeout(url, {
          ...options,
          headers,
        });

        // Rate limit warning
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining !== null && parseInt(remaining) < 10) {
          const resetAt = response.headers.get('X-RateLimit-Reset');
          const resetTime = resetAt ? new Date(parseInt(resetAt) * 1000).toISOString() : 'unknown';
          console.warn(`[GitHubClient] Rate limit low: ${remaining} requests left. Resets at ${resetTime}`);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const status = response.status;
          const message = errorData?.message || 'Unknown error';

          // Non-retryable: auth errors, not found, forbidden
          if (status === 401 || status === 403 || status === 404 || status === 422) {
            console.warn(`[GitHubClient] API error ${status}: ${message}`);
            return null;
          }

          // Rate limit exceeded (403 with specific message or 429)
          if (status === 429 || (status === 403 && message.includes('rate limit'))) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_DELAY_MS * Math.pow(2, attempt);
            if (attempt < MAX_RETRIES) {
              console.warn(`[GitHubClient] Rate limited. Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
              await this._sleep(delay);
              continue;
            }
          }

          // Retryable server errors (5xx)
          if (status >= 500 && attempt < MAX_RETRIES) {
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
            console.warn(`[GitHubClient] Server error ${status}. Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
            await this._sleep(delay);
            continue;
          }

          console.warn(`[GitHubClient] Request failed (status ${status}): ${message}`);
          return null;
        }

        // 204 No Content
        if (response.status === 204) return {};

        return await response.json();
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[GitHubClient] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms:`, err.message);
          await this._sleep(delay);
          continue;
        }
        console.warn('[GitHubClient] All retries exhausted:', err.message);
        return null;
      }
    }

    return null;
  }

  /**
   * Validate repo tồn tại — dùng để test token và repo owner/name.
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<object|null>} Repo metadata hoặc null nếu lỗi
   */
  async getRepo(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`);
  }

  /**
   * Fetch với timeout sử dụng AbortController.
   */
  async _fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * @param {number} ms
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory: tạo GitHubClient từ config.
 * Trả null nếu config không có githubToken.
 * @param {object} config - Config object (từ config.json)
 * @returns {GitHubClient|null}
 */
export function createGitHubClient(config) {
  if (!config?.githubToken) return null;
  return new GitHubClient(config.githubToken);
}
