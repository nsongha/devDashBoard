/**
 * Unit Tests — DataCache
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataCache } from '../../src/utils/cache.mjs';

describe('DataCache', () => {
  let cache;

  beforeEach(() => {
    vi.useRealTimers();
    cache = new DataCache();
  });

  describe('set / get', () => {
    it('lưu và trả đúng value', () => {
      cache.set('key1', { data: 'hello' });
      expect(cache.get('key1')).toEqual({ data: 'hello' });
    });

    it('trả null cho key không tồn tại', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('ghi đè value khi set lại cùng key', () => {
      cache.set('key1', 'old');
      cache.set('key1', 'new');
      expect(cache.get('key1')).toBe('new');
    });
  });

  describe('TTL expiry', () => {
    it('trả null khi entry hết hạn', () => {
      vi.useFakeTimers();
      cache.set('temp', 'value', 1000); // 1s TTL
      expect(cache.get('temp')).toBe('value');

      vi.advanceTimersByTime(1001);
      expect(cache.get('temp')).toBeNull();
    });

    it('entry vẫn fresh trước khi hết hạn', () => {
      vi.useFakeTimers();
      cache.set('temp', 'value', 5000);

      vi.advanceTimersByTime(4999);
      expect(cache.get('temp')).toBe('value');
    });
  });

  describe('has', () => {
    it('trả true khi key tồn tại và còn fresh', () => {
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
    });

    it('trả false khi key không tồn tại', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('trả false khi key đã expired', () => {
      vi.useFakeTimers();
      cache.set('temp', 'value', 100);
      vi.advanceTimersByTime(101);
      expect(cache.has('temp')).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('xóa đúng key được chỉ định', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.invalidate('a');
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBe(2);
    });
  });

  describe('clear', () => {
    it('xóa tất cả entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.clear();
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
      expect(cache.get('c')).toBeNull();
    });
  });

  describe('keys', () => {
    it('trả danh sách keys còn fresh', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.keys().sort()).toEqual(['a', 'b']);
    });

    it('không bao gồm expired keys', () => {
      vi.useFakeTimers();
      cache.set('fresh', 1, 10000);
      cache.set('expired', 2, 100);
      vi.advanceTimersByTime(101);
      expect(cache.keys()).toEqual(['fresh']);
    });
  });

  describe('size', () => {
    it('trả số lượng entries còn fresh', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });
  });
});
