/**
 * Unit Tests — GitHub API Client
 * Test GitHubClient class và createGitHubClient factory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubClient, createGitHubClient } from '../../src/integrations/github-client.mjs';

// Mock fetch toàn cục
const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key) => headers[key] ?? null,
    },
    json: async () => body,
  };
}

describe('GitHubClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGitHubClient()', () => {
    it('trả null khi không có githubToken', () => {
      expect(createGitHubClient({})).toBeNull();
      expect(createGitHubClient({ geminiApiKey: 'abc' })).toBeNull();
      expect(createGitHubClient(null)).toBeNull();
    });

    it('trả GitHubClient instance khi có githubToken', () => {
      const client = createGitHubClient({ githubToken: 'ghp_test123' });
      expect(client).toBeInstanceOf(GitHubClient);
      expect(client.token).toBe('ghp_test123');
    });
  });

  describe('client.request()', () => {
    it('gửi đúng headers Authorization và GitHub version', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ id: 1, name: 'test-repo' }));

      const client = new GitHubClient('ghp_test123');
      const result = await client.request('/repos/owner/repo');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.github.com/repos/owner/repo');
      expect(opts.headers.Authorization).toBe('Bearer ghp_test123');
      expect(opts.headers.Accept).toBe('application/vnd.github+json');
      expect(opts.headers['X-GitHub-Api-Version']).toBe('2022-11-28');
      expect(result).toEqual({ id: 1, name: 'test-repo' });
    });

    it('trả null khi không có token', async () => {
      const client = new GitHubClient(null);
      const result = await client.request('/repos/owner/repo');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('trả null khi API trả 404', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ message: 'Not Found' }, 404));
      const client = new GitHubClient('ghp_test');
      const result = await client.request('/repos/owner/nonexistent');
      expect(result).toBeNull();
    });

    it('trả null khi API trả 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ message: 'Bad credentials' }, 401));
      const client = new GitHubClient('ghp_invalid');
      const result = await client.request('/repos/owner/repo');
      expect(result).toBeNull();
    });

    it('log warning khi rate limit thấp (< 10)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce(makeResponse({ id: 1 }, 200, {
        'X-RateLimit-Remaining': '5',
        'X-RateLimit-Reset': '9999999999',
      }));

      const client = new GitHubClient('ghp_test');
      await client.request('/repos/owner/repo');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Rate limit low'));
      warnSpy.mockRestore();
    });

    it('không log rate limit warning khi remaining >= 10', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce(makeResponse({ id: 1 }, 200, {
        'X-RateLimit-Remaining': '50',
      }));

      const client = new GitHubClient('ghp_test');
      await client.request('/repos/owner/repo');

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('trả {} cho 204 No Content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => null },
        json: async () => { throw new Error('No content'); },
      });
      const client = new GitHubClient('ghp_test');
      const result = await client.request('/endpoint');
      expect(result).toEqual({});
    });
  });

  describe('client.getRepo()', () => {
    it('gọi đúng endpoint /repos/:owner/:repo', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse({ name: 'react', full_name: 'facebook/react' }));
      const client = new GitHubClient('ghp_test');
      const result = await client.getRepo('facebook', 'react');
      expect(mockFetch.mock.calls[0][0]).toBe('https://api.github.com/repos/facebook/react');
      expect(result.name).toBe('react');
    });
  });
});
