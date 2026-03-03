/**
 * Background Data Refresh Worker
 * Periodically refreshes cached project data in the background,
 * keeping the cache warm so API responses are always fast.
 */

const DEFAULT_INTERVAL_MS = 120_000; // 2 minutes

/** @type {ReturnType<typeof setInterval> | null} */
let refreshTimer = null;

/**
 * Start background refresh for all configured projects.
 * Runs collectFn for each project and updates the cache.
 * Does NOT block API responses — runs fire-and-forget.
 *
 * @param {() => string[]} getProjects - Function that returns current project paths
 * @param {(repoPath: string) => object} collectFn - Data collection function
 * @param {{ set: (key: string, value: any) => void }} cache - Cache instance
 * @param {number} [intervalMs=DEFAULT_INTERVAL_MS]
 */
export function startBackgroundRefresh(getProjects, collectFn, cache, intervalMs = DEFAULT_INTERVAL_MS) {
  // Clear any existing timer
  stopBackgroundRefresh();

  refreshTimer = setInterval(async () => {
    const projects = getProjects();
    for (const repoPath of projects) {
      try {
        const data = await collectFn(repoPath);
        cache.set(`project:${repoPath}`, data);
      } catch (err) {
        // Silently skip failed projects — don't crash the worker
        console.warn(`[worker] Failed to refresh ${repoPath}:`, err.message);
      }
    }
  }, intervalMs);

  // Don't prevent Node.js from exiting
  if (refreshTimer.unref) refreshTimer.unref();
}

/**
 * Stop the background refresh worker.
 */
export function stopBackgroundRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
