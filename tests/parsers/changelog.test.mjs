/**
 * Unit Tests — Changelog Parser
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/file-helpers.mjs', () => ({
  readFileSafe: vi.fn(() => ''),
}));

import { parseChangelog } from '../../src/parsers/changelog.mjs';
import { readFileSafe } from '../../src/utils/file-helpers.mjs';

describe('parseChangelog', () => {
  it('trả [] khi file không tồn tại', () => {
    readFileSafe.mockReturnValue('');
    const result = parseChangelog('/fake/path');
    expect(result).toEqual([]);
  });

  it('parse single version entry', () => {
    readFileSafe.mockReturnValue(
      `# Changelog

## [0.1.0] — 2026-03-01 — Initial release

- First version
`
    );
    const result = parseChangelog('/fake/path');
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('0.1.0');
    expect(result[0].date).toBe('2026-03-01');
    expect(result[0].description).toBe('Initial release');
  });

  it('parse multiple versions', () => {
    readFileSafe.mockReturnValue(
      `# Changelog

## [0.2.0] — 2026-03-03 — Code quality

- Added tests

## [0.1.0] — 2026-03-01 — Initial release

- First version
`
    );
    const result = parseChangelog('/fake/path');
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe('0.2.0');
    expect(result[1].version).toBe('0.1.0');
  });

  it('parse version without description', () => {
    readFileSafe.mockReturnValue(
      `# Changelog

## [1.0.0] — 2026-06-01

- Stable
`
    );
    const result = parseChangelog('/fake/path');
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('');
  });
});
