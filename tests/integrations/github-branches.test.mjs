/**
 * Unit Tests — Branch Comparison Collector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listBranches, compareBranches } from '../../src/integrations/github-branches.mjs';

const mockClient = {
  request: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listBranches()', () => {
  it('trả null khi thiếu client hoặc owner/repo', async () => {
    expect(await listBranches(null, 'owner', 'repo')).toBeNull();
    expect(await listBranches(mockClient, '', 'repo')).toBeNull();
    expect(await listBranches(mockClient, 'owner', '')).toBeNull();
  });

  it('trả null khi API trả null', async () => {
    mockClient.request.mockResolvedValue(null);
    expect(await listBranches(mockClient, 'owner', 'repo')).toBeNull();
  });

  it('trả mảng tên branches, main/master sorted first', async () => {
    mockClient.request.mockResolvedValue([
      { name: 'feature/x' },
      { name: 'master' },
      { name: 'develop' },
      { name: 'main' },
      { name: 'alpha' },
    ]);
    const branches = await listBranches(mockClient, 'owner', 'repo');
    expect(branches[0]).toBe('main');
    expect(branches[1]).toBe('master');
    expect(branches[2]).toBe('develop');
    expect(branches).toContain('feature/x');
    expect(branches).toContain('alpha');
  });
});

describe('compareBranches()', () => {
  it('trả null khi thiếu params', async () => {
    expect(await compareBranches(null, 'o', 'r', 'main', 'feat')).toBeNull();
    expect(await compareBranches(mockClient, '', 'r', 'main', 'feat')).toBeNull();
    expect(await compareBranches(mockClient, 'o', 'r', '', 'feat')).toBeNull();
    expect(await compareBranches(mockClient, 'o', 'r', 'main', '')).toBeNull();
  });

  it('trả identical object khi base === head', async () => {
    const result = await compareBranches(mockClient, 'o', 'r', 'main', 'main');
    expect(result.status).toBe('identical');
    expect(result.aheadBy).toBe(0);
    expect(result.behindBy).toBe(0);
    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it('trả null khi API trả null', async () => {
    mockClient.request.mockResolvedValue(null);
    expect(await compareBranches(mockClient, 'o', 'r', 'main', 'feat')).toBeNull();
  });

  it('parse đúng ahead_by, behind_by, commits, files', async () => {
    mockClient.request.mockResolvedValue({
      status: 'ahead',
      ahead_by: 3,
      behind_by: 0,
      total_commits: 3,
      html_url: 'https://github.com/compare',
      commits: [
        { sha: 'abc1234', commit: { message: 'feat: x', author: { name: 'Alice', date: '2026-01-01T00:00:00Z' } }, html_url: 'url1' },
        { sha: 'def5678', commit: { message: 'fix: y', author: { name: 'Bob', date: '2026-01-01T01:00:00Z' } }, html_url: 'url2' },
      ],
      files: [
        { filename: 'src/index.js', status: 'modified', additions: 10, deletions: 3, changes: 13 },
      ],
    });

    const result = await compareBranches(mockClient, 'owner', 'repo', 'main', 'feature/x');
    expect(result.aheadBy).toBe(3);
    expect(result.behindBy).toBe(0);
    expect(result.status).toBe('ahead');
    expect(result.commits).toHaveLength(2);
    expect(result.commits[0].sha).toBe('abc1234');
    expect(result.files).toHaveLength(1);
    expect(result.totalAdditions).toBe(10);
    expect(result.totalDeletions).toBe(3);
  });
});
