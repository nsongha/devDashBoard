/**
 * GitHub Issues Collector
 * Lấy open/closed issues, labels, milestones từ GitHub API.
 * Lưu ý: GitHub API /issues trả cả PRs — cần filter dựa vào field `pull_request`.
 */

/**
 * Thu thập thống kê Issues.
 * @param {import('./github-client.mjs').GitHubClient|null} client
 * @param {string} owner - GitHub username hoặc org
 * @param {string} repo - Repository name
 * @returns {Promise<object|null>} Issue stats hoặc null nếu không có client/lỗi
 */
export async function collectIssueStats(client, owner, repo) {
  if (!client || !owner || !repo) return null;

  try {
    const [openItems, closedItems] = await Promise.all([
      client.request(`/repos/${owner}/${repo}/issues?state=open&per_page=100&sort=updated&direction=desc`),
      client.request(`/repos/${owner}/${repo}/issues?state=closed&per_page=50&sort=updated&direction=desc`),
    ]);

    if (!openItems && !closedItems) return null;

    // Filter bỏ PRs — GitHub API lẫn PR vào issues (check `pull_request` field)
    const openIssues = (openItems || []).filter((item) => !item.pull_request);

    // Closed issues trong 30 ngày gần nhất (cũng bỏ PRs)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const closedIssues = (closedItems || []).filter((item) => {
      if (item.pull_request) return false;
      return new Date(item.closed_at) > thirtyDaysAgo;
    });

    // Tổng hợp labels (top 5)
    const labelCounts = {};
    [...openIssues, ...closedIssues].forEach((issue) => {
      (issue.labels || []).forEach((label) => {
        labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
      });
    });
    const topLabels = Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Milestones từ open issues
    const milestoneMap = {};
    openIssues.forEach((issue) => {
      if (issue.milestone) {
        const ms = issue.milestone;
        if (!milestoneMap[ms.number]) {
          milestoneMap[ms.number] = {
            title: ms.title,
            openIssues: ms.open_issues,
            closedIssues: ms.closed_issues,
            dueOn: ms.due_on,
            url: ms.html_url,
          };
        }
      }
    });
    const milestones = Object.values(milestoneMap).slice(0, 5);

    // Recent issues list (10 recent open)
    const recentIssues = openIssues.slice(0, 10).map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      author: issue.user?.login || 'unknown',
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      labels: (issue.labels || []).map((l) => ({ name: l.name, color: l.color })),
      milestone: issue.milestone?.title || null,
      comments: issue.comments,
    }));

    return {
      openCount: openIssues.length,
      closedCount: closedIssues.length,
      topLabels,
      milestones,
      recentIssues,
      collectedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[collectIssueStats] Error:', err.message);
    return null;
  }
}
