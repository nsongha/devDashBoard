/**
 * Unit Tests — File Coupling Detection
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/file-helpers.mjs', () => ({
  run: vi.fn(() => ''),
}));

import { detectFileCoupling } from '../../src/collectors/file-coupling.mjs';
import { run } from '../../src/utils/file-helpers.mjs';

describe('detectFileCoupling', () => {
  it('trả empty pairs khi repo trống', () => {
    run.mockReturnValue('');
    const result = detectFileCoupling('/fake/path');
    expect(result.pairs).toEqual([]);
    expect(result.threshold).toBe(3);
  });

  it('detect file pairs có ≥ 3 co-changes', () => {
    // 3 commits, mỗi commit đều thay đổi file-a.js + file-b.js
    run.mockReturnValue(
      'COMMIT_SEP\nfile-a.js\nfile-b.js\n' +
      'COMMIT_SEP\nfile-a.js\nfile-b.js\n' +
      'COMMIT_SEP\nfile-a.js\nfile-b.js\n'
    );
    const result = detectFileCoupling('/fake/path');
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].count).toBe(3);
    expect(result.pairs[0]).toHaveProperty('fileA');
    expect(result.pairs[0]).toHaveProperty('fileB');
  });

  it('loại bỏ pairs dưới threshold', () => {
    // Chỉ 2 co-changes — dưới threshold 3
    run.mockReturnValue(
      'COMMIT_SEP\nfoo.js\nbar.js\n' +
      'COMMIT_SEP\nfoo.js\nbar.js\n'
    );
    const result = detectFileCoupling('/fake/path');
    expect(result.pairs).toHaveLength(0);
  });

  it('skip commits có > 20 files', () => {
    // 1 commit có 25 files
    const manyFiles = Array.from({ length: 25 }, (_, i) => `file-${i}.js`).join('\n');
    run.mockReturnValue(`COMMIT_SEP\n${manyFiles}\n`);
    const result = detectFileCoupling('/fake/path');
    expect(result.pairs).toEqual([]);
  });

  it('sắp xếp pairs theo count giảm dần', () => {
    run.mockReturnValue(
      'COMMIT_SEP\na.js\nb.js\n' +
      'COMMIT_SEP\na.js\nb.js\n' +
      'COMMIT_SEP\na.js\nb.js\n' +
      'COMMIT_SEP\nc.js\nd.js\n' +
      'COMMIT_SEP\nc.js\nd.js\n' +
      'COMMIT_SEP\nc.js\nd.js\n' +
      'COMMIT_SEP\nc.js\nd.js\n'
    );
    const result = detectFileCoupling('/fake/path');
    expect(result.pairs.length).toBe(2);
    expect(result.pairs[0].count).toBeGreaterThanOrEqual(result.pairs[1].count);
  });
});
