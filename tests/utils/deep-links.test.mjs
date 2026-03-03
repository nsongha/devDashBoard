/**
 * Unit Tests — Deep Links Module
 * Tests makeFileLink() and makeDiffLink() for all 4 IDE schemes
 */

import { describe, it, expect } from 'vitest';
import { makeFileLink, makeDiffLink, setIdeScheme, getIdeScheme, IDE_SCHEMES } from '../../public/js/deep-links.mjs';

describe('Deep Links Module', () => {
  const PROJECT = '/Users/dev/my-project';

  describe('IDE_SCHEMES', () => {
    it('defines 4 IDE schemes', () => {
      expect(Object.keys(IDE_SCHEMES)).toEqual(['vscode', 'cursor', 'webstorm', 'zed']);
    });

    it('each scheme has name, fileUrl, diffUrl', () => {
      for (const [, scheme] of Object.entries(IDE_SCHEMES)) {
        expect(scheme).toHaveProperty('name');
        expect(scheme).toHaveProperty('fileUrl');
        expect(scheme).toHaveProperty('diffUrl');
        expect(typeof scheme.fileUrl).toBe('function');
        expect(typeof scheme.diffUrl).toBe('function');
      }
    });
  });

  describe('getIdeScheme / setIdeScheme', () => {
    it('defaults to vscode', () => {
      setIdeScheme(null);
      expect(getIdeScheme()).toBe('vscode');
    });

    it('returns set scheme', () => {
      setIdeScheme('cursor');
      expect(getIdeScheme()).toBe('cursor');
    });
  });

  describe('makeFileLink', () => {
    it('vscode: generates correct file URL', () => {
      setIdeScheme('vscode');
      const url = makeFileLink(PROJECT, 'src/app.mjs', 42);
      expect(url).toBe('vscode://file//Users/dev/my-project/src/app.mjs:42');
    });

    it('vscode: works without line number', () => {
      setIdeScheme('vscode');
      const url = makeFileLink(PROJECT, 'README.md');
      expect(url).toBe('vscode://file//Users/dev/my-project/README.md');
    });

    it('cursor: generates correct file URL', () => {
      setIdeScheme('cursor');
      const url = makeFileLink(PROJECT, 'src/app.mjs', 10);
      expect(url).toBe('cursor://file//Users/dev/my-project/src/app.mjs:10');
    });

    it('webstorm: generates correct file URL with encoded path', () => {
      setIdeScheme('webstorm');
      const url = makeFileLink(PROJECT, 'src/app.mjs', 5);
      expect(url).toContain('jetbrains://webstorm/navigate/reference');
      expect(url).toContain('line=5');
    });

    it('zed: generates correct file URL', () => {
      setIdeScheme('zed');
      const url = makeFileLink(PROJECT, 'src/app.mjs', 1);
      expect(url).toBe('zed://file//Users/dev/my-project/src/app.mjs:1');
    });

    it('falls back to vscode for unknown scheme', () => {
      setIdeScheme('unknown');
      const url = makeFileLink(PROJECT, 'test.js', 1);
      expect(url).toContain('vscode://file/');
    });
  });

  describe('makeDiffLink', () => {
    const HASH = 'a1b2c3d';

    it('vscode: generates repo URL', () => {
      setIdeScheme('vscode');
      const url = makeDiffLink(PROJECT, HASH);
      expect(url).toBe(`vscode://file/${PROJECT}`);
    });

    it('cursor: generates repo URL', () => {
      setIdeScheme('cursor');
      const url = makeDiffLink(PROJECT, HASH);
      expect(url).toBe(`cursor://file/${PROJECT}`);
    });

    it('webstorm: generates navigate URL', () => {
      setIdeScheme('webstorm');
      const url = makeDiffLink(PROJECT, HASH);
      expect(url).toContain('jetbrains://webstorm/navigate/reference');
    });

    it('zed: generates repo URL', () => {
      setIdeScheme('zed');
      const url = makeDiffLink(PROJECT, HASH);
      expect(url).toBe(`zed://file/${PROJECT}`);
    });
  });
});
