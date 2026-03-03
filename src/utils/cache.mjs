/**
 * DataCache — In-memory cache with TTL support
 * Provides fast data retrieval for project stats, avoiding
 * redundant git process spawns on every API request.
 */

const DEFAULT_TTL_MS = 60_000; // 60 seconds

export class DataCache {
  /** @type {Map<string, { value: any, expiresAt: number }>} */
  #store = new Map();

  /**
   * Get a cached value by key. Returns null if not found or expired.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.#store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.#store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set a value in the cache with optional TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlMs=DEFAULT_TTL_MS]
   */
  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    this.#store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Check if a key exists and is not expired.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Remove a single key from the cache.
   * @param {string} key
   */
  invalidate(key) {
    this.#store.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear() {
    this.#store.clear();
  }

  /**
   * Get all current (non-expired) keys.
   * @returns {string[]}
   */
  keys() {
    // Trigger expiry check for each key
    const result = [];
    for (const key of this.#store.keys()) {
      if (this.has(key)) result.push(key);
    }
    return result;
  }

  /**
   * Get the number of non-expired entries.
   * @returns {number}
   */
  get size() {
    return this.keys().length;
  }
}

/** Singleton cache instance for project data */
export const dataCache = new DataCache();
