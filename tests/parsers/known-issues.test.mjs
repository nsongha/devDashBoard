/**
 * Unit Tests — Known Issues Parser
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/file-helpers.mjs', () => ({
  findDocsFileContents: vi.fn(() => []),
  readFileSafe: vi.fn(() => ''),
}));

import { parseKnownIssues, parseKnownIssuesDetailed } from '../../src/parsers/known-issues.mjs';
import { findDocsFileContents } from '../../src/utils/file-helpers.mjs';

import { beforeEach } from 'vitest';
beforeEach(() => { vi.clearAllMocks(); });

/** Helper: mock single file */
function mockSingleFile(content) {
  findDocsFileContents.mockReturnValue([
    { path: '/fake/docs/KNOWN_ISSUES.md', content, source: 'docs/KNOWN_ISSUES.md' }
  ]);
}

describe('parseKnownIssues', () => {
  it('trả {0,0,0} khi không có file', () => {
    findDocsFileContents.mockReturnValue([]);
    const result = parseKnownIssues('/fake/path');
    expect(result).toEqual({ active: 0, resolved: 0, techDebt: 0 });
  });

  it('đếm active issues (I-) đúng', () => {
    mockSingleFile(
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
    mockSingleFile(
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
    mockSingleFile(
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

  it('merge counts từ nhiều files (subdirectories)', () => {
    findDocsFileContents.mockReturnValue([
      { path: '/fake/docs/KNOWN_ISSUES.md', content: '| I-1 | Bug A |\n| T-1 | Debt A |', source: 'docs/KNOWN_ISSUES.md' },
      { path: '/fake/docs/api/KNOWN_ISSUES.md', content: '| I-2 | Bug B |\n| R-1 | Fixed |', source: 'docs/api/KNOWN_ISSUES.md' },
    ]);
    const result = parseKnownIssues('/fake/path');
    expect(result).toEqual({ active: 2, resolved: 1, techDebt: 1 });
  });
});

describe('parseKnownIssuesDetailed', () => {
  it('trả {0,0,0, items:[]} khi không có file', () => {
    findDocsFileContents.mockReturnValue([]);
    const result = parseKnownIssuesDetailed('/fake/path');
    expect(result).toEqual({ active: 0, resolved: 0, techDebt: 0, items: [] });
  });

  it('parse heading format (### [KI-xxx]) với severity và module', () => {
    mockSingleFile(
      `## 🔴 Đang hoạt động (Active)

### [KI-001] WebSocket không reconnect

- **Mức độ**: Medium
- **Module**: \`public/js/realtime.mjs\`

### [KI-002] Export PNG bị cắt

- **Mức độ**: Low
- **Module**: \`public/js/export.mjs\`
`
    );
    const result = parseKnownIssuesDetailed('/fake/path');
    expect(result.active).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'KI-001',
      title: 'WebSocket không reconnect',
      severity: 'Medium',
      module: 'public/js/realtime.mjs',
      section: 'active',
      source: 'docs/KNOWN_ISSUES.md',
    });
    expect(result.items[1].id).toBe('KI-002');
    expect(result.items[1].severity).toBe('Low');
  });

  it('parse tech debt section (### [TD-xxx])', () => {
    mockSingleFile(
      `## 🔴 Active

### [KI-001] Bug

- **Mức độ**: Medium

## 🟡 Tech Debt

### [TD-001] App quá lớn

- **Mức độ**: Medium
- **Module**: \`public/js/app.mjs\`
`
    );
    const result = parseKnownIssuesDetailed('/fake/path');
    expect(result.active).toBe(1);
    expect(result.techDebt).toBe(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({
      id: 'TD-001',
      title: 'App quá lớn',
      severity: 'Medium',
      module: 'public/js/app.mjs',
      section: 'techDebt',
    });
  });

  it('parse resolved section (table format)', () => {
    mockSingleFile(
      `## ✅ Đã giải quyết gần đây

| ID      | Mô tả                        | Giải quyết trong |
| ------- | ----------------------------- | ---------------- |
| KI-F001 | Git watcher bug               | Phase 5          |
| KI-F002 | Test flaky                    | Phase 5          |
`
    );
    const result = parseKnownIssuesDetailed('/fake/path');
    expect(result.resolved).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('KI-F001');
    expect(result.items[0].section).toBe('resolved');
  });

  it('parse mixed sections trả counts chính xác', () => {
    mockSingleFile(
      `## 🔴 Đang hoạt động (Active)

### [KI-001] Bug A
- **Mức độ**: Critical

### [KI-002] Bug B
- **Mức độ**: Low

## 🟡 Tech Debt

### [TD-001] Debt A
- **Mức độ**: Medium

## ✅ Đã giải quyết gần đây

| ID      | Mô tả     | Resolved |
| ------- | --------- | -------- |
| KI-F001 | Fixed bug | Phase 4  |
`
    );
    const result = parseKnownIssuesDetailed('/fake/path');
    expect(result.active).toBe(2);
    expect(result.techDebt).toBe(1);
    expect(result.resolved).toBe(1);
    expect(result.items).toHaveLength(4);
  });

  it('merge items từ subdirectories với source tracking', () => {
    findDocsFileContents.mockReturnValue([
      {
        path: '/fake/docs/KNOWN_ISSUES.md',
        content: `## 🔴 Active\n\n### [KI-001] Bug chính\n- **Mức độ**: Critical`,
        source: 'docs/KNOWN_ISSUES.md',
      },
      {
        path: '/fake/docs/api/KNOWN_ISSUES.md',
        content: `## 🔴 Active\n\n### [KI-010] API bug\n- **Mức độ**: Medium`,
        source: 'docs/api/KNOWN_ISSUES.md',
      },
    ]);
    const result = parseKnownIssuesDetailed('/fake/path');
    expect(result.active).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].source).toBe('docs/KNOWN_ISSUES.md');
    expect(result.items[1].source).toBe('docs/api/KNOWN_ISSUES.md');
    expect(result.items[1].id).toBe('KI-010');
  });
});
