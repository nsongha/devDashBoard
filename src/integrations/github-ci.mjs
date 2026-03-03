/**
 * GitHub CI/CD Pipeline Status Collector
 * Lấy GitHub Actions workflow runs: pass/fail/pending status.
 */

/**
 * Thu thập trạng thái CI/CD pipeline từ GitHub Actions.
 * @param {import('./github-client.mjs').GitHubClient|null} client
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<object|null>}
 */
export async function collectCIStatus(client, owner, repo) {
  if (!client || !owner || !repo) return null;

  try {
    // Lấy workflow runs gần nhất (20 runs)
    const runsData = await client.request(
      `/repos/${owner}/${repo}/actions/runs?per_page=20&exclude_pull_requests=false`
    );
    if (!runsData) return null;

    const runs = runsData.workflow_runs || [];

    // Tổng hợp theo workflow (dedup bằng workflow_id)
    const workflowMap = {};
    runs.forEach((run) => {
      const key = run.workflow_id;
      if (!workflowMap[key]) {
        workflowMap[key] = {
          id: run.workflow_id,
          name: run.name,
          path: run.path,
          latestRun: null,
          runs: [],
        };
      }
      if (!workflowMap[key].latestRun || new Date(run.created_at) > new Date(workflowMap[key].latestRun.created_at)) {
        workflowMap[key].latestRun = run;
      }
      workflowMap[key].runs.push(run);
    });

    // Normalize status → simple enum: success / failure / in_progress / cancelled / skipped
    function normalizeStatus(run) {
      if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting') return 'in_progress';
      if (run.conclusion === 'success') return 'success';
      if (run.conclusion === 'failure') return 'failure';
      if (run.conclusion === 'cancelled') return 'cancelled';
      if (run.conclusion === 'skipped') return 'skipped';
      return run.status || 'unknown';
    }

    const workflows = Object.values(workflowMap).map((wf) => ({
      id: wf.id,
      name: wf.name,
      status: normalizeStatus(wf.latestRun),
      conclusion: wf.latestRun.conclusion,
      branch: wf.latestRun.head_branch,
      commitSha: wf.latestRun.head_sha?.slice(0, 7),
      commitMessage: wf.latestRun.display_title || wf.latestRun.head_commit?.message?.split('\n')[0] || '',
      runUrl: wf.latestRun.html_url,
      startedAt: wf.latestRun.created_at,
      updatedAt: wf.latestRun.updated_at,
      durationSec: wf.latestRun.run_started_at && wf.latestRun.updated_at
        ? Math.round((new Date(wf.latestRun.updated_at) - new Date(wf.latestRun.run_started_at)) / 1000)
        : null,
      recentRuns: wf.runs.slice(0, 5).map((r) => ({
        runNumber: r.run_number,
        status: normalizeStatus(r),
        conclusion: r.conclusion,
        branch: r.head_branch,
        startedAt: r.created_at,
        url: r.html_url,
      })),
    }));

    // Summary stats
    const total = workflows.length;
    const passing = workflows.filter((w) => w.status === 'success').length;
    const failing = workflows.filter((w) => w.status === 'failure').length;
    const running = workflows.filter((w) => w.status === 'in_progress').length;

    return {
      total,
      passing,
      failing,
      running,
      workflows,
      collectedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[collectCIStatus] Error:', err.message);
    return null;
  }
}
