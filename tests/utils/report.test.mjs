/**
 * Unit Tests — Report Generator Module (C3)
 * Tests pure logic: buildReportId(), generateReportHtml()
 */

import { describe, it, expect } from 'vitest';
import { buildReportId, generateReportHtml } from '../../src/export/report.mjs';

// ─── Sample minimal project data ─────────────────────────────

const SAMPLE_DATA = {
  name: 'My Test Project',
  path: '/Users/dev/my-test-project',
  description: 'A test project for unit testing',
  version: 'v1.2.3',
  currentPhase: 'Phase 5',
  git: {
    totalCommits: 142,
    totalLines: 8500,
    totalFiles: 64,
    projectAgeDays: 90,
    recentCommits: [
      { hash: 'abc1234', message: 'feat: add export', author: 'Alice', ago: '2 days ago' },
      { hash: 'def5678', message: 'fix: bug fix', author: 'Bob', ago: '3 days ago' },
    ],
    hotspotFiles: [
      { file: 'src/server.mjs', count: 18 },
      { file: 'public/js/app.mjs', count: 12 },
    ],
  },
  changelog: [
    { version: 'v1.2.3', date: '2026-03-01', description: 'Latest release' },
    { version: 'v1.0.0', date: '2026-01-01', description: 'Initial release' },
  ],
};

// ─── buildReportId() ─────────────────────────────────────────

describe('buildReportId()', () => {
  it('returns a string', () => {
    expect(typeof buildReportId()).toBe('string');
  });

  it('returns exactly 8 characters', () => {
    expect(buildReportId()).toHaveLength(8);
  });

  it('returns only hex characters', () => {
    const id = buildReportId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('generates unique IDs on repeated calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => buildReportId()));
    // With 20 random 8-char hex IDs, all should be unique
    expect(ids.size).toBe(20);
  });
});

// ─── generateReportHtml() ────────────────────────────────────

describe('generateReportHtml()', () => {
  const FIXED_DATE = '2026-03-03T15:00:00.000Z';

  it('returns a non-empty string', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
  });

  it('starts with <!DOCTYPE html>', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it('contains the project name', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('My Test Project');
  });

  it('contains version info', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('v1.2.3');
  });

  it('contains total commits stat', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('142');
  });

  it('contains recent commit hashes', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('abc1234');
    expect(html).toContain('def5678');
  });

  it('contains changelog versions', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('v1.2.3');
    expect(html).toContain('v1.0.0');
  });

  it('contains hotspot files', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('src/server.mjs');
  });

  it('handles missing/empty data gracefully', () => {
    const html = generateReportHtml({}, { generatedAt: FIXED_DATE });
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('Dev Dashboard');
  });

  it('handles null/undefined data without throwing', () => {
    expect(() => generateReportHtml(null, { generatedAt: FIXED_DATE })).not.toThrow();
  });

  it('contains the read-only badge', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('Read-only Report');
  });

  it('contains generated timestamp', () => {
    const html = generateReportHtml(SAMPLE_DATA, { generatedAt: FIXED_DATE });
    expect(html).toContain('2026-03-03');
  });
});
