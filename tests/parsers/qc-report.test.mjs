/**
 * Unit Tests — QC Report Parser
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/file-helpers.mjs', () => ({
  findDocsFileContents: vi.fn(() => []),
  readFileSafe: vi.fn(() => ''),
}));

import { parseQCReport } from '../../src/parsers/qc-report.mjs';
import { findDocsFileContents } from '../../src/utils/file-helpers.mjs';

import { beforeEach } from 'vitest';
beforeEach(() => { vi.clearAllMocks(); });

/** Helper: mock single file */
function mockSingleFile(content) {
  findDocsFileContents.mockReturnValue([
    { path: '/fake/docs/QC_REPORT.md', content, source: 'docs/QC_REPORT.md' }
  ]);
}

describe('parseQCReport', () => {
  it('trả null khi không có file', () => {
    findDocsFileContents.mockReturnValue([]);
    const result = parseQCReport('/fake/path');
    expect(result).toBeNull();
  });

  it('parse test cases (pass/fail/not_run/blocked)', () => {
    mockSingleFile(
      `## Test Cases

### Parsers

- [x] TC-001: Parser trả kết quả đúng
- [ ] TC-002: Parser xử lý file rỗng
- [!] TC-003: Parser crash khi format sai (KI-001)
- [~] TC-004: Parser bị block bởi dependency
`
    );
    const result = parseQCReport('/fake/path');
    expect(result.testCases.total).toBe(4);
    expect(result.testCases.passed).toBe(1);
    expect(result.testCases.failed).toBe(1);
    expect(result.testCases.notRun).toBe(1);
    expect(result.testCases.blocked).toBe(1);
    expect(result.testCases.items[2].bugRef).toBe('KI-001');
    expect(result.testCases.items[0].feature).toBe('Parsers');
  });

  it('parse release checklist', () => {
    mockSingleFile(
      `## Release Checklist

- [x] Unit tests pass
- [x] Build OK
- [ ] Performance test
`
    );
    const result = parseQCReport('/fake/path');
    expect(result.releaseChecklist.total).toBe(3);
    expect(result.releaseChecklist.done).toBe(2);
    expect(result.releaseChecklist.items[2].done).toBe(false);
  });

  it('parse sign-off table', () => {
    mockSingleFile(
      `## Sign-off

| Role      | Name         | Status      | Date       |
| --------- | ------------ | ----------- | ---------- |
| Developer | AI Assistant | ✅ Approved | 2026-03-04 |
| QC Lead   | —            | ⏳ Pending  | —          |
`
    );
    const result = parseQCReport('/fake/path');
    expect(result.signOff.items).toHaveLength(2);
    expect(result.signOff.approved).toBe(false); // Not all approved
    expect(result.signOff.items[0].role).toBe('Developer');
    expect(result.signOff.items[0].status).toBe('✅ Approved');
  });

  it('sign-off approved khi tất cả đều approved', () => {
    mockSingleFile(
      `## Sign-off

| Role      | Name | Status      | Date       |
| --------- | ---- | ----------- | ---------- |
| Developer | Dev  | ✅ Approved | 2026-03-04 |
| QC Lead   | QC   | ✅ Approved | 2026-03-04 |
`
    );
    const result = parseQCReport('/fake/path');
    expect(result.signOff.approved).toBe(true);
  });

  it('merge results từ nhiều files (subdirectories) với source tracking', () => {
    findDocsFileContents.mockReturnValue([
      {
        path: '/fake/docs/QC_REPORT.md',
        content: `## Test Cases\n\n### Core\n\n- [x] TC-001: Test A\n- [!] TC-002: Test B\n\n## Release Checklist\n\n- [x] Build OK`,
        source: 'docs/QC_REPORT.md',
      },
      {
        path: '/fake/docs/api/QC_REPORT.md',
        content: `## Test Cases\n\n### API\n\n- [x] TC-101: API test\n- [ ] TC-102: API pending\n\n## Release Checklist\n\n- [ ] API docs updated`,
        source: 'docs/api/QC_REPORT.md',
      },
    ]);
    const result = parseQCReport('/fake/path');
    // Merged test cases
    expect(result.testCases.total).toBe(4);
    expect(result.testCases.passed).toBe(2);
    expect(result.testCases.failed).toBe(1);
    expect(result.testCases.notRun).toBe(1);
    expect(result.testCases.items[0].source).toBe('docs/QC_REPORT.md');
    expect(result.testCases.items[2].source).toBe('docs/api/QC_REPORT.md');
    // Merged release checklist
    expect(result.releaseChecklist.total).toBe(2);
    expect(result.releaseChecklist.done).toBe(1);
  });
});
