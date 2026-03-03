/**
 * Unit Tests — Author Stats Collector
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/file-helpers.mjs', () => ({
  run: vi.fn(() => ''),
}));

import { collectAuthorStats } from '../../src/collectors/author-stats.mjs';
import { run } from '../../src/utils/file-helpers.mjs';

describe('collectAuthorStats', () => {
  it('trả [] khi repo trống', () => {
    run.mockReturnValue('');
    const result = collectAuthorStats('/fake/path');
    expect(result).toEqual([]);
  });

  it('parse shortlog đúng', () => {
    run.mockReturnValueOnce('   15\tAlice\n    8\tBob') // shortlog
       .mockReturnValueOnce('')  // numstat
       .mockReturnValueOnce(''); // days
    const result = collectAuthorStats('/fake/path');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
    expect(result[0].commits).toBe(15);
    expect(result[1].name).toBe('Bob');
    expect(result[1].commits).toBe(8);
  });

  it('sắp xếp theo commit count giảm dần', () => {
    run.mockReturnValueOnce('    5\tCharlie\n   20\tDiana')
       .mockReturnValueOnce('')
       .mockReturnValueOnce('');
    const result = collectAuthorStats('/fake/path');
    expect(result[0].name).toBe('Diana');
    expect(result[1].name).toBe('Charlie');
  });

  it('tính active days từ git log', () => {
    run.mockReturnValueOnce('   10\tEve')
       .mockReturnValueOnce('') // numstat
       .mockReturnValueOnce('Eve|2026-03-01 10:00:00\nEve|2026-03-01 11:00:00\nEve|2026-03-02 10:00:00');
    const result = collectAuthorStats('/fake/path');
    expect(result[0].activeDays).toBe(2); // 2 unique days
  });
});
