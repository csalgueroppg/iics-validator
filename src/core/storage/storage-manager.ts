import logger from "@/shared/utils/logger"

/**
 * @interface
 * @description Storage adapter interface for different storage backends
 *
 * Defines consistent API for storage operations regardless of the underlying
 * storage mechanism (Chrome storage, localStorage, IndexedDB, etc.)
 */
export interface StorageAdapter {
  /** Retrieves a value from storage by key */
  get<T>(key: string): Promise<T | null>

  /** Stores a value in storage with the specified key */
  set<T>(key: string, value: T): Promise<void>

  /** Removes a key-value pair from storage */
  remove(key: string): Promise<void>

  /** Retrieves all stored key-value pairs */
  getAll(): Promise<Record<string, unknown>>

  /** Removes all stored data */
  clear(): Promise<void>
}

/**
 * @class
 * @description Main storage manager with Chrome storage sync integration
 *
 * Provides a unified interface for persistent storage with error handling,
 * logging, and type safety. Implements namespacing to prevent key collisions
 * and includes caching for improved performance.
 */
export class StorageManager implements StorageAdapter {
  /** Chrome storage sync API instance */
  private readonly storage: typeof chrome.storage.sync

  /** Namespace prefix to isolate this extension's data */
  private readonly namespace: string

  /** In-memory cache for frequently accessed data to reduce storage reads */
  private cache = new Map<string, unknown>()

  /**
   * Creates a new `StorageManager` instance
   *
   * @param namespace - Namespace prefix for storage keys (default: "iics-validator")
   */
  constructor(namespace: string = "iics-validator") {
    this.namespace = namespace
    this.storage = chrome.storage.sync
  }

  /**
   * Retrieves a value from storage by key
   *
   * @param key - The storage key to retrieve
   * @returns Promise resolving to the stored value or `null` if not found
   * @throws Error if storage read operation fails
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.cache.has(key)) {
        return this.cache.get(key) as T
      }

      const fullKey = this.getNamespacedKey(key)
      const result = await this.storage.get([fullKey])
      const value = result[fullKey] as T | undefined

      if (value !== undefined) {
        this.cache.set(key, value)
        return value
      }

      return null
    } catch (error) {
      logger.error(`Failed to get storage key: ${key}: `, error as Error)
      throw new Error(
        `Storage read error: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  /**
   * Stores a value in storage with the specified key
   *
   * @param key - The storage key to set
   * @param value - The value to store (must be JSON-serializable)
   * @returns Promise that resolves when the value is stored
   * @throws Error if storage write operation fails or quota is exceeded
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const fullKey = this.getNamespacedKey(key)
      const serialized = JSON.stringify({ [fullKey]: value })
      const sizeInBytes = new Blob([serialized]).size

      if (sizeInBytes > 8192) {
        logger.warn(`Storage item too large: ${sizeInBytes} bytes`)
      }

      await this.storage.set({ [fullKey]: value })
      this.cache.set(key, value)

      logger.debug(`Storage set: ${key}`, value)
    } catch (error) {
      if (error instanceof Error && error.message.includes("QUOTA")) {
        logger.error("Storage quota exceeded", error)
        throw new Error("Storage quota exceeded. Try clearing old data.")
      }

      logger.error(`Failed to set storage key "${key}":`, error as Error)
      throw new Error(
        `Storage write error: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  /**
   * Removes a key-value pair from storage
   *
   * @param key - The storage key to remove
   * @returns Promise that resolves when the key is removed
   * @throws Error if storage remove operation fails
   */
  async remove(key: string): Promise<void> {
    try {
      const fullKey = this.getNamespacedKey(key)
      await this.storage.remove(fullKey)

      this.cache.delete(key)
      logger.debug(`Storage removed: ${key}`)
    } catch (error) {
      logger.error(`Failed to remove storage key "${key}":`, error as Error)
      throw new Error(
        `Storage remove error: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  /**
   * Retrieves all stored key-value pairs for this namespace
   *
   * @returns Promise resolving to an object containing all namespaced data
   * @throws Error if storage read operation fails
   */
  async getAll(): Promise<Record<string, any>> {
    try {
      const result = await this.storage.get(null)
      const namespacePrefix = `${this.namespace}:`
      const namespacedData: Record<string, any> = {}

      for (const [key, value] of Object.entries(result)) {
        if (key.startsWith(namespacePrefix)) {
          const cleanKey = key.slice(namespacePrefix.length)
          namespacedData[cleanKey] = value
          this.cache.set(cleanKey, value)
        }
      }

      return namespacedData
    } catch (error) {
      logger.error("Failed to get all storage data:", error as Error)
      throw new Error(
        `Storage read all error: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  /**
   * Removes all stored data for this namespace
   *
   * @returns Promise that resolves when all namespaced data is cleared
   * @throws Error if storage clear operation fails
   */
  async clear(): Promise<void> {
    try {
      const allData = await this.getAll()
      const keysToRemove = Object.keys(allData).map((key) =>
        this.getNamespacedKey(key)
      )

      await this.storage.remove(keysToRemove)
      this.cache.clear()

      logger.info("Storage cleared")
    } catch (error) {
      logger.error("Failed to clear storage: ", error as Error)
      throw new Error(
        `Storage clear error: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  /**
   * Gets storage usage information for this namespace
   *
   * @returns Promise resolving to storage usage statistics
   * @throws Will not throw but returns basic info on error
   */
  async getUsage(): Promise<{ items: number; bytes?: number }> {
    try {
      const allData = await this.getAll()
      const items = Object.keys(allData).length
      const dataString = JSON.stringify(allData)
      const bytes = new Blob([dataString]).size

      return { items, bytes }
    } catch (error) {
      logger.error("Failed to get storage usage:", error as Error)
      return { items: 0 }
    }
  }

  /**
   * Converts a plain key to a namespaced key for storage
   *
   * @param key - The original key
   * @returns Namespaced key string
   * @private
   */
  private getNamespacedKey(key: string): string {
    return `${this.namespace}:${key}`
  }
}
