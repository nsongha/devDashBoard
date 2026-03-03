/**
 * GitHub Branch Comparison Collector
 * Lấy danh sách branches và so sánh 2 branches (ahead/behind/diff stats).
 */

/**
 * Lấy danh sách branches của repo.
 * @param {import('./github-client.mjs').GitHubClient|null} client
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<string[]|null>} Mảng tên branches, sorted
 */
export async function listBranches(client, owner, repo) {
  if (!client || !owner || !repo) return null;
  try {
    const data = await client.request(
      `/repos/${owner}/${repo}/branches?per_page=100&protected=false`
    );
    if (!data) return null;
    return data.map((b) => b.name).sort((a, b) => {
      // Sort: main/master first, then alphabetical
      const priority = ['main', 'master', 'develop', 'dev'];
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  } catch (err) {
    console.error('[listBranches] Error:', err.message);
    return null;
  }
}

/**
 * So sánh 2 branches: base...head.
 * @param {import('./github-client.mjs').GitHubClient|null} client
 * @param {string} owner
 * @param {string} repo
 * @param {string} base - Branch cơ sở (e.g. 'main')
 * @param {string} head - Branch cần so sánh (e.g. 'feature/xyz')
 * @returns {Promise<object|null>}
 */
export async function compareBranches(client, owner, repo, base, head) {
  if (!client || !owner || !repo || !base || !head) return null;
  if (base === head) {
    return {
      base,
      head,
      status: 'identical',
      aheadBy: 0,
      behindBy: 0,
      commits: [],
      files: [],
      totalAdditions: 0,
      totalDeletions: 0,
    };
  }

  try {
    // GitHub compare API: base...head
    const data = await client.request(`/repos/${owner}/${repo}/compare/${base}...${head}`);
    if (!data) return null;

    const commits = (data.commits || []).slice(0, 20).map((c) => ({
      sha: c.sha?.slice(0, 7),
      fullSha: c.sha,
      message: c.commit?.message?.split('\n')[0] || '',
      author: c.commit?.author?.name || c.author?.login || 'unknown',
      date: c.commit?.author?.date,
      url: c.html_url,
    }));

    const files = (data.files || []).slice(0, 50).map((f) => ({
      filename: f.filename,
      status: f.status, // added, modified, removed, renamed
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
    }));

    return {
      base,
      head,
      status: data.status, // ahead, behind, diverged, identical
      aheadBy: data.ahead_by || 0,
      behindBy: data.behind_by || 0,
      totalCommits: data.total_commits || 0,
      commits,
      files,
      totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
      totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
      diffUrl: data.html_url,
      collectedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[compareBranches] Error:', err.message);
    return null;
  }
}
