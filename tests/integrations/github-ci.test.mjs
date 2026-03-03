/**
 * Unit Tests — GitHub CI Status Collector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectCIStatus } from '../../src/integrations/github-ci.mjs';

const mockClient = {
  request: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('collectCIStatus()', () => {
  it('trả null khi thiếu client hoặc owner/repo', async () => {
    expect(await collectCIStatus(null, 'owner', 'repo')).toBeNull();
    expect(await collectCIStatus(mockClient, '', 'repo')).toBeNull();
    expect(await collectCIStatus(mockClient, 'owner', '')).toBeNull();
  });

  it('trả null khi API trả null', async () => {
    mockClient.request.mockResolvedValue(null);
    expect(await collectCIStatus(mockClient, 'owner', 'repo')).toBeNull();
  });

  it('trả data với workflows.length=0 khi không có runs', async () => {
    mockClient.request.mockResolvedValue({ workflow_runs: [] });
    const result = await collectCIStatus(mockClient, 'owner', 'repo');
    expect(result).toBeTruthy();
    expect(result.total).toBe(0);
    expect(result.passing).toBe(0);
    expect(result.failing).toBe(0);
    expect(result.workflows).toHaveLength(0);
  });

  it('aggregate đúng workflow runs theo workflow_id', async () => {
    const fakeRuns = [
      {
        workflow_id: 1,
        name: 'CI',
        path: '.github/workflows/ci.yml',
        status: 'completed',
        conclusion: 'success',
        head_branch: 'main',
        head_sha: 'abc1234',
        display_title: 'feat: update',
        html_url: 'https://github.com/...',
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:05:00Z',
        run_started_at: '2026-01-01T10:00:00Z',
        run_number: 1,
      },
      {
        workflow_id: 1,
        name: 'CI',
        path: '.github/workflows/ci.yml',
        status: 'completed',
        conclusion: 'failure',
        head_branch: 'feature/x',
        head_sha: 'def5678',
        display_title: 'fix: bug',
        html_url: 'https://github.com/...',
        created_at: '2026-01-01T09:00:00Z',
        updated_at: '2026-01-01T09:03:00Z',
        run_started_at: '2026-01-01T09:00:00Z',
        run_number: 0,
      },
      {
        workflow_id: 2,
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
        status: 'in_progress',
        conclusion: null,
        head_branch: 'main',
        head_sha: 'ghi9012',
        display_title: 'chore: deploy',
        html_url: 'https://github.com/...',
        created_at: '2026-01-01T10:10:00Z',
        updated_at: '2026-01-01T10:15:00Z',
        run_started_at: '2026-01-01T10:10:00Z',
        run_number: 2,
      },
    ];

    mockClient.request.mockResolvedValue({ workflow_runs: fakeRuns });
    const result = await collectCIStatus(mockClient, 'owner', 'repo');

    expect(result.total).toBe(2); // 2 distinct workflows
    expect(result.passing).toBe(1); // CI (latest = success)
    expect(result.failing).toBe(0); // latest CI = success
    expect(result.running).toBe(1); // Deploy
  });

  it('normalize status đúng: in_progress/queued → "in_progress"', async () => {
    mockClient.request.mockResolvedValue({
      workflow_runs: [
        {
          workflow_id: 1,
          name: 'CI',
          status: 'queued',
          conclusion: null,
          head_branch: 'main',
          head_sha: 'abc',
          html_url: '',
          created_at: '2026-01-01T10:00:00Z',
          updated_at: '2026-01-01T10:00:00Z',
          run_started_at: null,
          run_number: 1,
        },
      ],
    });
    const result = await collectCIStatus(mockClient, 'owner', 'repo');
    expect(result.workflows[0].status).toBe('in_progress');
    expect(result.running).toBe(1);
  });

  it('tính durationSec đúng', async () => {
    mockClient.request.mockResolvedValue({
      workflow_runs: [
        {
          workflow_id: 1,
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          head_branch: 'main',
          head_sha: 'abc',
          html_url: '',
          created_at: '2026-01-01T10:00:00Z',
          updated_at: '2026-01-01T10:02:00Z',
          run_started_at: '2026-01-01T10:00:00Z',
          run_number: 1,
        },
      ],
    });
    const result = await collectCIStatus(mockClient, 'owner', 'repo');
    // 2 phút = 120 giây
    expect(result.workflows[0].durationSec).toBe(120);
  });
});
