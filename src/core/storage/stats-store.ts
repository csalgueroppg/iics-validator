import { ValidationStats } from "@/shared/types/validation"
import { StorageManager } from "./storage-manager"
import logger from "@/shared/utils/logger"

/**
 * @interface
 * @description Extended stats with metadata for storage and session tracking
 *
 * Extends basic validation statistics with session information and timestamps
 * for tracking and analytics purposes.
 */
export interface StoredStats extends ValidationStats {
  /** Unique identifier for the current validation session */
  sessionId: string

  /** Timestamp when these stats were first created (ms since epoch) */
  createdAt: number

  /** Timestamp when these stats were last updated (ms since epoch) */
  updatedAt: number
}

/**
 * @class
 * @description Manages validation statistics persistence
 *
 * Handles stats storage, aggregation, and session management.
 * Provides methods for saving, loading, and clearing validation statistics
 * with session tracking for analytics.
 */
export class StatsStore {
  /** `StorageManager` instance for persistent statistics storage */
  private readonly storage: StorageManager

  /** Key used to store statistics in persistent storage */
  private readonly statsKey = "validation-stats"

  /** Unique indentifier for the current validation session */
  private currentSessionId: string

  /**
   * Creates a new `StatsStore` instance.
   *
   * @param storage - `StorageManager` instance for persistent storage operations
   */
  constructor(storage: StorageManager) {
    this.storage = storage
    this.currentSessionId = this.generateSessionId()
  }

  /**
   * Saves current statistics to persistent storage with session metadata
   *
   * @param stats - Validation statistics to save
   * @returns Promise that resolves when save is complete
   * @throws Error if save operation fails
   */
  async save(stats: ValidationStats): Promise<void> {
    try {
      const storedStats: StoredStats = {
        ...stats,
        sessionId: this.currentSessionId,
        createdAt: stats.lastValidated?.getTime() || Date.now(),
        updatedAt: Date.now(),
      }

      await this.storage.set(this.statsKey, storedStats)
      logger.debug("Statistics saved")
    } catch (error) {
      logger.error("Failed to save statistics:", error as Error)
      throw error
    }
  }

  /**
   * Loads saved statistics from persistent storage
   *
   * @returns Promise resolving to stored statistics or `null` if none exist
   * @throws Will not throw but returns `null` on error to avoid breaking the application
   */
  async load(): Promise<StoredStats | null> {
    try {
      const stats = await this.storage.get<StoredStats>(this.statsKey)
      return stats || null
    } catch (error) {
      logger.error("Failed to load statistics:", error as Error)
      return null
    }
  }

  /**
   * Clears all statistics from persistent storage and starts a new session
   *
   * @returns Promise that resolves when clear operation is complete
   * @throws Error if clear operation fails
   */
  async clear(): Promise<void> {
    try {
      await this.storage.remove(this.statsKey)
      this.currentSessionId = this.generateSessionId()
      logger.info("Statistics cleared")
    } catch (error) {
      logger.error("Failed to clear statistics:", error as Error)
      throw error
    }
  }

  /**
   * Gets historical statistics (placeholder for future analytics features)
   *
   * @param _limit - Maximum number of historical entries to return (currently unused)
   * @returns Promise resolving to array of historical stats (currently returns current stats only)
   */
  async getHistoricalStats(_limit: number = 10): Promise<StoredStats[]> {
    const current = await this.load()
    return current ? [current] : []
  }

  /**
   * Generates a unique session identifier for tracking validation sessions
   *
   * @returns Unique session ID string combining timestamp and random component
   * @private
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
