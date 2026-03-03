/**
 * GitHub PR Stats Collector
 * Lấy open/merged PRs, tính avg merge time, labels từ GitHub API.
 */

/**
 * Thu thập thống kê Pull Requests.
 * @param {import('./github-client.mjs').GitHubClient|null} client
 * @param {string} owner - GitHub username hoặc org
 * @param {string} repo - Repository name
 * @returns {Promise<object|null>} PR stats hoặc null nếu không có client/lỗi
 */
export async function collectPRStats(client, owner, repo) {
  if (!client || !owner || !repo) return null;

  try {
    // Lấy open PRs
    const [openPRs, closedPRs] = await Promise.all([
      client.request(`/repos/${owner}/${repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`),
      client.request(`/repos/${owner}/${repo}/pulls?state=closed&per_page=50&sort=updated&direction=desc`),
    ]);

    if (!openPRs && !closedPRs) return null;

    const openList = openPRs || [];
    const closedList = closedPRs || [];

    // Filter merged PRs trong 30 ngày gần nhất
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const mergedPRs = closedList.filter((pr) => {
      if (!pr.merged_at) return false;
      return new Date(pr.merged_at) > thirtyDaysAgo;
    });

    // Tính avg merge time (từ created_at đến merged_at)
    let avgMergeTimeHours = 0;
    if (mergedPRs.length > 0) {
      const totalHours = mergedPRs.reduce((sum, pr) => {
        const created = new Date(pr.created_at);
        const merged = new Date(pr.merged_at);
        return sum + (merged - created) / (1000 * 60 * 60);
      }, 0);
      avgMergeTimeHours = Math.round((totalHours / mergedPRs.length) * 10) / 10;
    }

    // Tổng hợp labels (top 5)
    const labelCounts = {};
    [...openList, ...mergedPRs].forEach((pr) => {
      (pr.labels || []).forEach((label) => {
        labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
      });
    });
    const topLabels = Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Recent PRs list (10 recent, combined open + merged)
    const recentPRs = [...openList.slice(0, 5), ...mergedPRs.slice(0, 5)]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 10)
      .map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? 'merged' : pr.state,
        author: pr.user?.login || 'unknown',
        url: pr.html_url,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at || null,
        updatedAt: pr.updated_at,
        labels: (pr.labels || []).map((l) => ({ name: l.name, color: l.color })),
      }));

    return {
      openCount: openList.length,
      mergedCount: mergedPRs.length,
      avgMergeTimeHours,
      topLabels,
      recentPRs,
      collectedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[collectPRStats] Error:', err.message);
    return null;
  }
}
