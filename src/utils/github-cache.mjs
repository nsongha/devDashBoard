/**
 * GitHub Cache — Dev Dashboard
 * Thin wrapper over DataCache với TTL 5 phút, dành riêng cho GitHub API responses.
 * Tách khỏi server.mjs để tuân thủ Single Responsibility Principle.
 */

import { DataCache } from './cache.mjs';

const GITHUB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

/** Singleton cache instance cho GitHub API data */
const _githubCache = new DataCache();

/**
 * Lấy cached GitHub data theo key.
 * @param {string} key
 * @returns {any|null}  null nếu không có hoặc đã hết TTL
 */
export function getGithubCache(key) {
  return _githubCache.get(key);
}

/**
 * Lưu GitHub data vào cache với TTL 5 phút.
 * @param {string} key
 * @param {any} data
 */
export function setGithubCache(key, data) {
  _githubCache.set(key, data, GITHUB_CACHE_TTL_MS);
}

/**
 * Xoá một entry khỏi GitHub cache (dùng khi nhận webhook push/pr).
 * @param {string} key
 */
export function invalidateGithubCache(key) {
  _githubCache.invalidate(key);
}

/**
 * Xoá toàn bộ GitHub cache (dùng khi settings thay đổi token/owner/repo).
 */
export function clearAllGithubCache() {
  _githubCache.clear();
}
