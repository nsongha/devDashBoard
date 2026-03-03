/**
 * Unit Tests — Known Issues Parser
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/file-helpers.mjs', () => ({
  readFileSafe: vi.fn(() => ''),
}));

import { parseKnownIssues } from '../../src/parsers/known-issues.mjs';
import { readFileSafe } from '../../src/utils/file-helpers.mjs';

describe('parseKnownIssues', () => {
  it('trả {0,0,0} khi không có file', () => {
    readFileSafe.mockReturnValue('');
    const result = parseKnownIssues('/fake/path');
    expect(result).toEqual({ active: 0, resolved: 0, techDebt: 0 });
  });

  it('đếm active issues (I-) đúng', () => {
    readFileSafe.mockReturnValue(
      `# Known Issues

| ID | Issue |
| --- | --- |
| I-1 | Bug A |
| I-2 | Bug B |
| R-1 | Fixed C |
`
    );
    const result = parseKnownIssues('/fake/path');
    expect(result.active).toBe(2);
    expect(result.resolved).toBe(1);
    expect(result.techDebt).toBe(0);
  });

  it('đếm tech debt (T-) đúng', () => {
    readFileSafe.mockReturnValue(
      `# Known Issues

| ID | Issue |
| --- | --- |
| T-1 | Refactor needed |
| T-2 | Performance issue |
| I-1 | Active bug |
`
    );
    const result = parseKnownIssues('/fake/path');
    expect(result.techDebt).toBe(2);
    expect(result.active).toBe(1);
  });

  it('đếm mixed IDs chính xác', () => {
    readFileSafe.mockReturnValue(
      `| I-1 | Bug |
| I-2 | Bug |
| R-1 | Fixed |
| R-2 | Fixed |
| R-3 | Fixed |
| T-1 | Debt |
`
    );
    const result = parseKnownIssues('/fake/path');
    expect(result).toEqual({ active: 2, resolved: 3, techDebt: 1 });
  });
});
