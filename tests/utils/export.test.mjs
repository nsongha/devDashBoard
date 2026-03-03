/**
 * Unit Tests — Export Module (C1)
 * Tests pure logic only (no DOM/html2canvas required)
 */

import { describe, it, expect, afterEach } from 'vitest';
import { buildFilename, isHtml2CanvasAvailable } from '../../public/js/export.mjs';

describe('Export Module — C1 PNG', () => {

  describe('buildFilename()', () => {
    const FIXED_DATE = new Date('2026-03-03T15:00:00.000Z');

    it('generates correct filename with project name', () => {
      const fn = buildFilename('DevDashboard', FIXED_DATE);
      expect(fn).toBe('dashboard-devdashboard-2026-03-03.png');
    });

    it('sanitizes special characters in project name', () => {
      const fn = buildFilename('My Project / v2!', FIXED_DATE);
      expect(fn).toMatch(/^dashboard-my-project---v2--2026-03-03\.png$/);
    });

    it('replaces slashes and spaces with hyphens', () => {
      const fn = buildFilename('/Users/dev/my-repo', FIXED_DATE);
      expect(fn).toContain('dashboard-');
      expect(fn).toContain('.png');
      expect(fn).not.toContain('/');
    });

    it('uses "dashboard" as fallback when no project name provided', () => {
      const fn = buildFilename('', FIXED_DATE);
      expect(fn).toBe('dashboard-dashboard-2026-03-03.png');
    });

    it('uses "dashboard" as fallback for null/undefined', () => {
      const fn = buildFilename(null, FIXED_DATE);
      expect(fn).toBe('dashboard-dashboard-2026-03-03.png');
    });

    it('includes a date string in YYYY-MM-DD format', () => {
      const fn = buildFilename('proj', FIXED_DATE);
      expect(fn).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('defaults to today when no date is provided', () => {
      const fn = buildFilename('proj');
      const today = new Date().toISOString().slice(0, 10);
      expect(fn).toContain(today);
    });
  });

  describe('isHtml2CanvasAvailable()', () => {
    afterEach(() => {
      delete globalThis.window;
    });

    it('returns false when window is undefined', () => {
      // In Node/Vitest environment, window may not exist
      const orig = globalThis.window;
      delete globalThis.window;
      expect(isHtml2CanvasAvailable()).toBe(false);
      if (orig !== undefined) globalThis.window = orig;
    });

    it('returns false when html2canvas is not a function on window', () => {
      globalThis.window = {};
      expect(isHtml2CanvasAvailable()).toBe(false);
    });

    it('returns true when html2canvas is available', () => {
      globalThis.window = { html2canvas: () => {} };
      expect(isHtml2CanvasAvailable()).toBe(true);
    });
  });

});
