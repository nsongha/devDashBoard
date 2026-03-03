/**
 * Unit Tests — Commit Analyzer
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/file-helpers.mjs', () => ({
  run: vi.fn(() => ''),
}));

import { analyzeCommits, categorizeMessage } from '../../src/collectors/commit-analyzer.mjs';
import { run } from '../../src/utils/file-helpers.mjs';

describe('categorizeMessage', () => {
  it('nhận diện feat: prefix', () => {
    expect(categorizeMessage('feat: add new feature')).toBe('feat');
    expect(categorizeMessage('feat(api): add endpoint')).toBe('feat');
  });

  it('nhận diện fix: prefix', () => {
    expect(categorizeMessage('fix: resolve bug')).toBe('fix');
    expect(categorizeMessage('hotfix: urgent patch')).toBe('fix');
  });

  it('nhận diện refactor: prefix', () => {
    expect(categorizeMessage('refactor: restructure modules')).toBe('refactor');
  });

  it('nhận diện docs: prefix', () => {
    expect(categorizeMessage('docs: update readme')).toBe('docs');
  });

  it('nhận diện chore: prefix', () => {
    expect(categorizeMessage('chore: update deps')).toBe('chore');
    expect(categorizeMessage('build: fix webpack')).toBe('chore');
    expect(categorizeMessage('ci: add workflow')).toBe('chore');
  });

  it('nhận diện test: prefix', () => {
    expect(categorizeMessage('test: add unit tests')).toBe('test');
  });

  it('trả "other" cho non-conventional commits', () => {
    expect(categorizeMessage('update something')).toBe('other');
    expect(categorizeMessage('random commit')).toBe('other');
    expect(categorizeMessage('WIP')).toBe('other');
  });

  it('case insensitive', () => {
    expect(categorizeMessage('FEAT: uppercase feature')).toBe('feat');
    expect(categorizeMessage('Fix: capitalized fix')).toBe('fix');
  });
});

describe('analyzeCommits', () => {
  it('trả empty categories khi repo trống', () => {
    run.mockReturnValue('');
    const result = analyzeCommits('/fake/path');
    expect(result.categories).toBeDefined();
    expect(result.byWeek).toEqual([]);
    expect(result.categories.feat).toBe(0);
  });

  it('phân loại commits đúng', () => {
    run.mockReturnValue(
      '2026-03-01 10:00:00 +0700|feat: add login\n' +
      '2026-03-01 11:00:00 +0700|fix: resolve crash\n' +
      '2026-03-01 12:00:00 +0700|fix: another bug\n' +
      '2026-03-02 10:00:00 +0700|docs: update readme\n' +
      '2026-03-02 11:00:00 +0700|random commit'
    );
    const result = analyzeCommits('/fake/path');
    expect(result.categories.feat).toBe(1);
    expect(result.categories.fix).toBe(2);
    expect(result.categories.docs).toBe(1);
    expect(result.categories.other).toBe(1);
  });

  it('tạo byWeek breakdown', () => {
    run.mockReturnValue(
      '2026-02-24 10:00:00 +0700|feat: week1\n' +
      '2026-03-03 10:00:00 +0700|fix: week2'
    );
    const result = analyzeCommits('/fake/path');
    expect(result.byWeek.length).toBeGreaterThanOrEqual(1);
    expect(result.byWeek[0]).toHaveProperty('week');
    expect(result.byWeek[0]).toHaveProperty('feat');
  });
});
