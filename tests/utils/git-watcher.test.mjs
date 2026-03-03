/**
 * Unit Tests — Git Watcher
 * Dùng global mock cho fs để tránh vấn đề với vi.resetModules()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tạo mockWatcher object có thể track được calls
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn(),
};

// Mock fs ở module scope — trước tất cả imports
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    watch: vi.fn(() => mockWatcher),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

// Import sau khi đã setup mock
import { startGitWatcher } from '../../src/utils/git-watcher.mjs';
import { watch, existsSync } from 'fs';

describe('GitWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset default return values sau clearAllMocks
    existsSync.mockReturnValue(true);
    mockWatcher.on.mockReturnValue(mockWatcher);
    watch.mockReturnValue(mockWatcher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startGitWatcher()', () => {
    it('trả về stop function', () => {
      const broadcastFn = vi.fn();
      const stop = startGitWatcher(['/fake/repo'], broadcastFn);
      expect(typeof stop).toBe('function');
    });

    it('gọi fs.watch trên .git/refs của mỗi project', () => {
      const broadcastFn = vi.fn();
      startGitWatcher(['/fake/repo1', '/fake/repo2'], broadcastFn);

      expect(watch).toHaveBeenCalledTimes(2);
      expect(watch).toHaveBeenCalledWith(
        expect.stringContaining('.git/refs'),
        { recursive: true },
        expect.any(Function)
      );
    });

    it('bỏ qua project không có .git/refs', () => {
      existsSync.mockReturnValue(false);
      const broadcastFn = vi.fn();
      startGitWatcher(['/no-git/repo'], broadcastFn);
      expect(watch).not.toHaveBeenCalled();
    });

    it('debounce broadcast — chỉ gọi 1 lần trong 500ms', () => {
      const broadcastFn = vi.fn();
      startGitWatcher(['/fake/repo'], broadcastFn);

      // Lấy watch callback từ mock
      const watchCallback = watch.mock.calls[0][2];

      // Trigger nhiều lần liên tiếp
      watchCallback('change', 'heads/main');
      watchCallback('change', 'heads/main');
      watchCallback('change', 'heads/main');

      // Trước khi debounce fire
      expect(broadcastFn).not.toHaveBeenCalled();

      // Advance qua debounce (500ms)
      vi.advanceTimersByTime(500);

      // Chỉ gọi 1 lần
      expect(broadcastFn).toHaveBeenCalledTimes(1);
    });

    it('broadcast đúng event type và payload', () => {
      const broadcastFn = vi.fn();
      startGitWatcher(['/fake/repo'], broadcastFn);

      const watchCallback = watch.mock.calls[0][2];
      watchCallback('change', 'heads/main');
      vi.advanceTimersByTime(500);

      expect(broadcastFn).toHaveBeenCalledWith('git:commit', {
        repoPath: '/fake/repo',
        filename: 'heads/main',
        timestamp: expect.any(Number),
      });
    });

    it('stop() đóng tất cả watchers', () => {
      const broadcastFn = vi.fn();
      const stop = startGitWatcher(['/fake/repo'], broadcastFn);

      stop();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('stop() hủy debounce timer đang pending', () => {
      const broadcastFn = vi.fn();
      const stop = startGitWatcher(['/fake/repo'], broadcastFn);
      const watchCallback = watch.mock.calls[0][2];

      // Trigger change nhưng stop trước khi debounce fire
      watchCallback('change', 'heads/main');
      stop();

      vi.advanceTimersByTime(1000);

      // broadcast không được gọi vì timer đã bị cancel
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('bỏ qua event khi filename là null', () => {
      const broadcastFn = vi.fn();
      startGitWatcher(['/fake/repo'], broadcastFn);

      const watchCallback = watch.mock.calls[0][2];
      watchCallback('change', null); // filename = null

      vi.advanceTimersByTime(500);

      expect(broadcastFn).not.toHaveBeenCalled();
    });
  });
});
