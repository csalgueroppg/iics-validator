/**
 * @class
 * @description Simple in-memory cache with TTL support
 *
 * Improves performance by reducing storage reads for frequently accessed data.
 * Automatically handles expiration of cached items and provides cleanup
 * utilities.
 *
 * @vesrion 1.0.0
 * @since 2025-10-07
 * @author Carlos Salguero (X522644)
 */
export class CacheManager {
  /** Internal cache storage using Map for O(1) access times */
  private cache = new Map<string, { value: any; expires: number }>()

  /** Default TTL (Time To Live) in milliseconds for cache entries */
  private defaultTTL: number

  /**
   * Creates a new `CacheManager` instance
   *
   * @param defaultTTL - Default time to live in milliseconds for cache entries (default: 5 minutes)
   */
  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL
  }

  /**
   * Sets a value in cache with optional TTL
   *
   * @param key - Unique identifier for the cache entry
   * @param value - Data to be cached (any type)
   * @param ttl - Time to live in milliseconds (defaults to instance defaultTTL)
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    const expires = Date.now() + ttl
    this.cache.set(key, { value, expires })
  }

  /**
   * Retrieves a value from cache if it exists and hasn't expired
   *
   * @param key - Unique identifier for the cache entry
   * @returns The cached value if found and not expired, `null` otherwise
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value as T
  }

  /**
   * Removes a specific key from the cache
   *
   * @param key - Unique identifier for the cache entry to remove
   * @returns `true` if the key was found and deleted, `false` otherwise
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Completely clears all entries from the catch
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Removes all expired entries from the cache
   *
   * @returns Number of expired entries that were cleaned up
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Returns basic statistics about the current cache state
   *
   * @returns Object containing cache size and hits information
   */
  getStats(): { size: number; hits: number } {
    return {
      size: this.cache.size,
      hits: this.cache.size,
    }
  }
}
