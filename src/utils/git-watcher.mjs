/**
 * Git Watcher Module
 * Dùng fs.watch trên .git/refs/ để detect new commits (push/pull/merge).
 * Event-driven, zero CPU waste. Debounce 500ms để tránh duplicate events.
 */

import { watch, existsSync } from 'fs';
import { join } from 'path';

const DEBOUNCE_MS = 500;

/**
 * Start watching .git/refs/ cho danh sách project paths.
 * Khi detect thay đổi, gọi broadcastFn với event git:commit.
 *
 * @param {string[]} projectPaths - Mảng absolute path đến git repos
 * @param {(type: string, payload: object) => void} broadcastFn - Hàm broadcast WS event
 * @returns {() => void} stopFn — gọi để dừng tất cả watchers
 */
export function startGitWatcher(projectPaths, broadcastFn) {
  const watchers = [];
  const debounceTimers = new Map();

  for (const repoPath of projectPaths) {
    const refsPath = join(repoPath, '.git', 'refs');

    if (!existsSync(refsPath)) {
      console.warn(`[GitWatcher] .git/refs not found, skipping: ${repoPath}`);
      continue;
    }

    try {
      const watcher = watch(refsPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Debounce: hủy timer cũ nếu có, đặt timer mới
        const key = repoPath;
        if (debounceTimers.has(key)) {
          clearTimeout(debounceTimers.get(key));
        }

        const timer = setTimeout(() => {
          debounceTimers.delete(key);
          console.log(`[GitWatcher] Detected git change in: ${repoPath} (file: ${filename})`);
          broadcastFn('git:commit', {
            repoPath,
            filename,
            timestamp: Date.now(),
          });
        }, DEBOUNCE_MS);

        debounceTimers.set(key, timer);
      });

      watcher.on('error', (err) => {
        console.warn(`[GitWatcher] Watch error on ${repoPath}:`, err.message);
      });

      watchers.push(watcher);
      console.log(`[GitWatcher] Watching: ${refsPath}`);
    } catch (err) {
      console.warn(`[GitWatcher] Failed to watch ${refsPath}:`, err.message);
    }
  }

  /**
   * Dừng tất cả watchers và cleanup debounce timers.
   */
  function stop() {
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
    debounceTimers.clear();

    for (const watcher of watchers) {
      watcher.close();
    }
    watchers.length = 0;
    console.log('[GitWatcher] All watchers stopped');
  }

  return stop;
}
