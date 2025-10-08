import { DEFAULT_CONFIG } from "@/shared/config/config-defaults"
import { ValidatorConfig } from "@/shared/types/validation"
import logger from "@/shared/utils/logger"
import { StorageManager } from "./storage-manager"

/**
 * @class
 * @description Manages extension configuration persistence
 *
 * Handles configuration loading, saving, validation, and migration.
 * Ensures configuration integrity and provides fallback to defaults when
 * needed.
 */
export class ConfigStore {
  /** `StorageManager` instance for persistent configuration storage */
  private readonly storage: StorageManager

  /** Key used to store configuration in persistent storage */
  private readonly configKey = "config"

  /** In-memory cache of the current configuration for fast access */
  private currentConfig: ValidatorConfig

  /**
   * Creates a new `ConfigStore` instance
   *
   * @param storage - `StorageManager` instance for persistent storage operations
   */
  constructor(storage: StorageManager) {
    this.storage = storage
    this.currentConfig = { ...DEFAULT_CONFIG }
  }

  /**
   * Loads configuration from storage and merges with defaults
   *
   * @returns Promise resolving to the loaded configuration
   * @throws Will not throw but will fall back to defaults on error
   */
  async load(): Promise<ValidatorConfig> {
    try {
      const savedConfig = await this.storage.get<Partial<ValidatorConfig>>(
        this.configKey
      )

      if (savedConfig) {
        this.currentConfig = this.mergeConfigs(DEFAULT_CONFIG, savedConfig)
        logger.info("Configuration loaded from storage")
      } else {
        this.currentConfig = { ...DEFAULT_CONFIG }
        logger.info("Using default configuration")
      }

      return this.currentConfig
    } catch (error) {
      logger.error(
        "Failed to load configuration, using defaults:",
        error as Error
      )

      this.currentConfig = { ...DEFAULT_CONFIG }
      return this.currentConfig
    }
  }

  /**
   * Saves configuration to storage after validation
   *
   * @param config - Partial configuration object to save
   * @returns Promise that resolves when save is complete
   * @throws Error if configuration validation fails or save operation fails
   */
  async save(config: Partial<ValidatorConfig>): Promise<void> {
    try {
      this.currentConfig = this.mergeConfigs(this.currentConfig, config)
      this.validateConfig(this.currentConfig)

      await this.storage.set(this.configKey, this.currentConfig)
      logger.info("Configuration saved successfully")
    } catch (error) {
      logger.error("Failed to save configuration:", error as Error)
      throw error
    }
  }

  /**
   * Gets a copy of the current in-memory configuration
   *
   * @returns Current configuration object (cloned to prevent mutation)
   */
  getConfig(): ValidatorConfig {
    return { ...this.currentConfig }
  }

  /**
   * Resets configuration to default values and persists the change
   *
   * @returns Promise resolving to the default configuration
   */
  async reset(): Promise<ValidatorConfig> {
    this.currentConfig = { ...DEFAULT_CONFIG }
    await this.storage.set(this.configKey, this.currentConfig)

    logger.info("Configuration reset to defaults")
    return this.currentConfig
  }

  /**
   * Updates specific configuration properties and saves
   *
   * @param updates - Partial configuration object with properties to update
   * @returns Promise resolving to the updated configuration
   */
  async update(updates: Partial<ValidatorConfig>): Promise<ValidatorConfig> {
    await this.save(updates)
    return this.currentConfig
  }

  /**
   * Merges base configuration with updates, with updates taking precedence
   *
   * @param base - Base configuration object
   * @param updates - Partial configuration with updates
   * @returns Merged configuration object
   * @private
   */
  private mergeConfigs(
    base: ValidatorConfig,
    updates: Partial<ValidatorConfig>
  ): ValidatorConfig {
    return {
      ...base,
      ...updates,
    }
  }

  /**
   * Validates configuration values and throws error if invalid
   *
   * @param config - Configuration object to validate
   * @throws Error with descriptive message if validation fails
   * @private
   */
  private validateConfig(config: ValidatorConfig): void {
    const errors: string[] = []

    if (config.pollInterval < 100) {
      errors.push("pollInterval must be at least 100ms")
    }

    if (config.debounceDelay < 0) {
      errors.push("debounceDelay cannot be negative")
    }

    if (config.minFieldsForProcess < 1) {
      errors.push("minFieldsForProcess must be at least 1")
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(", ")}`)
    }
  }
}
