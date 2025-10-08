import { ContainerDetector } from "../core/validation/detectors"
import { ValidatorEngine } from "../core/validation/engine"
import {
  FieldManager,
  StatsManager,
  UIManager,
} from "../core/validation/managers"
import { ValidationOrchestrator } from "../core/validation/managers/validation-orchestrator"
import { DEFAULT_CONFIG } from "../shared/config/config-defaults"
import { ExtensionMessage, ExtensionResponse } from "../shared/types/types"
import { ValidatorConfig } from "../shared/types/validation"
import { Debouncer } from "../shared/utils/debouncer"
import { ErrorHandler } from "../shared/utils/error-handler"
import logger, { LogLevel } from "../shared/utils/logger"
import { PerformanceMonitor } from "../shared/utils/performance"
import { ToastManager } from "../shared/utils/toast"

logger.setLevel(LogLevel.INFO)

/**
 * Tests whether the environment allows dynamic CSS style injection by
 * attempting to create and append a style element to the document head.
 *
 * This is primarily used to detect Content Security Policy (CSP) restrictions
 * that block inline styles or dynamic style cheet creation.
 *
 * @returns {boolean} `true` if styles can be injected, `false` if blocked by
 *                    CSP or other restrictions
 */
const canInjectStyles = (() => {
  try {
    const test = document.createElement("style")
    test.textContent = "/* test */"

    document.head.appendChild(test)
    document.head.removeChild(test)

    return true
  } catch {
    return false
  }
})()

if (!canInjectStyles) {
  console.warn(
    "[IICS Validator] Cannot inject styles due to CSP restrictions. " +
      "The extension will have limited functionality. " +
      "Some visual features and UI enhancements may not work properly."
  )
}

/**
 * @class IICSFieldValidator
 * @description Main orchestrator for the IICS Field Validator Chrome Extension
 *
 * Coordinates all sub-modules including field detection, validation, UI
 * management, and communication with the extension popup. Handles
 * initialization, configuration, management, and lifecycle of the entire
 * validation system.
 *
 * @example
 * ```typescript
 * // Access vis global window object
 * const stats = window.iicsValidator.getStats();
 * window.iicsValidator.triggerValidation();
 * ```
 *
 * @version 1.0.0
 * @since 2025-09-29
 * @author Carlos Salguero (X522644)
 */
class IICSFieldValidator {
  private config: ValidatorConfig
  private pollIntervalId: number | null = null
  private isDestroyed: boolean = false
  private readonly toast: ToastManager
  private readonly debouncer: Debouncer
  private readonly perfMonitor: PerformanceMonitor
  private readonly errorHandler: ErrorHandler
  private readonly fieldManager: FieldManager
  private readonly validatorEngine: ValidatorEngine
  private readonly uiManager: UIManager
  private readonly statsManager: StatsManager
  private readonly containerDetector: ContainerDetector
  private readonly orchestrator: ValidationOrchestrator
  private keyboardHandler?: (e: KeyboardEvent) => void
  private visibilityHandler?: () => void

  /**
   * Creates a new IICS Field Validator instance.
   *
   * Initializes all sub-modules in the correct dependency order and sets up
   * the complete validation pipeline. Automatically starts when the DOM is
   * ready.
   */
  constructor() {
    this.config = { ...DEFAULT_CONFIG }

    this.toast = new ToastManager()
    this.debouncer = new Debouncer()
    this.perfMonitor = new PerformanceMonitor()
    this.errorHandler = new ErrorHandler(this.toast)

    this.validatorEngine = new ValidatorEngine(
      this.perfMonitor,
      this.errorHandler
    )

    this.fieldManager = new FieldManager(
      this.config,
      this.debouncer,
      this.perfMonitor,
      this.errorHandler
    )

    this.statsManager = new StatsManager(this.errorHandler, this.toast)
    this.uiManager = new UIManager(
      this.errorHandler,
      () => this.orchestrator.runFullValidation(),
      () => this.orchestrator.exportReport(),
      () => this.orchestrator.clearHighlights()
    )

    this.orchestrator = new ValidationOrchestrator(
      this.fieldManager,
      this.validatorEngine,
      this.uiManager,
      this.statsManager,
      this.perfMonitor,
      this.errorHandler,
      this.toast
    )

    this.fieldManager.setupAutoValidation((field, silent) =>
      this.orchestrator.validateSingleField(field, silent)
    )

    this.containerDetector = new ContainerDetector(
      this.config,
      this.debouncer,
      this.perfMonitor,
      this.errorHandler,
      (container) => this.onContainerChange(container),
      (isProcessDesigner) => this.onContextChange(isProcessDesigner)
    )

    logger.info("IICS Field Validator initializing")
    this.init()
  }

  // Public API
  /**
   * Completely destroys the validator instance
   *
   * Stops all polling, cleans up all modules, and prepares for garbage
   * collection. Should be called when the validator is no longer needed,
   * typically on page unload.
   *
   * @example
   * ```typescript
   * window.iicsValidator.destroy();
   * ```
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return
    }

    logger.info("Destroying validator")
    try {
      this.isDestroyed = true

      this.stopPolling()
      if (this.keyboardHandler) {
        document.removeEventListener("keydown", this.keyboardHandler)
      }

      if (this.visibilityHandler) {
        document.removeEventListener("visibilitychange", this.visibilityHandler)
      }

      this.fieldManager.destroy()
      this.containerDetector.destroy()
      this.uiManager.destroy()
      this.toast.destroy()
      this.debouncer.cancelAll()

      logger.info("Validator destroyed")
    } catch (error) {
      this.errorHandler.handle(error as Error, "destroy", false)
    }
  }

  /**
   * Gets current validation statistics
   * @returns Validation statistics including field counts and error information
   *
   * @example
   * ```typescript
   * const stats = window.iicsValidator.getStats();
   * console.log(`Valid: ${stats.valid}, Invalid: ${stats.invalid}`);
   * ```
   */
  public getStats() {
    return this.orchestrator.getStats()
  }

  /**
   * Gets performance metrics for debugging and monitoring
   * @returns Performance statistics including timing information
   *
   * @example
   * ```typescript
   * const metrics = window.iicsValidator.getPerformanceMetrics();
   * console.log(`Average validation time: ${metrics.averageTime}ms`);
   * ```
   */
  public getPerformanceMetrics() {
    return this.perfMonitor.getStats()
  }

  /**
   * Manually triggers a full validation of all fields
   *
   * @example
   * ```typescript
   * window.iicsValidator.triggerValidation();
   * ```
   */
  public triggerValidation(): void {
    this.orchestrator.runFullValidation()
  }

  // Helper methods
  /**
   * Initializes the validator when the DOM is ready
   *
   * Waits for `DOMContentLoaded` if necessary, then starts the main
   * initialization process.
   * @private
   */
  private init(): void {
    try {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.start())
      } else {
        this.start()
      }
    } catch (error) {
      this.errorHandler.handle(error as Error, "initialization")
    }
  }

  /**
   * Main startup sequence for the validator
   *
   * Loads configuration, initializes UI, starts polling, and sets up event
   * listeners.
   * @private
   */
  private start(): void {
    const end = this.perfMonitor.start("initialization")

    try {
      logger.info("Page ready, starting validator")

      void this.loadConfig()
      this.uiManager.initialize()

      requestAnimationFrame(() => {
        this.startPolling()
      })

      if (this.config.enableKeyboardShortcut) {
        this.setupKeyboardShortcuts()
      }

      this.setupMessageListener()
      this.setupVisibilityHandler()

      this.toast.show("IICS Field Validator ready!", "success", 2000)
      logger.info("IICS Field Validator ready!")
    } catch (error) {
      this.errorHandler.handle(error as Error, "startup")
    } finally {
      end()
    }
  }

  /**
   * Loads configuration from Chrome storage
   *
   * Attempts to load saved configuration from chrome.storage.sync,
   * falls back to defaults if no saved configuration exists.
   * @private
   * @async
   */
  private async loadConfig(): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage) {
      try {
        const result = await chrome.storage.sync.get(["config"])
        if (result["config"]) {
          this.config = { ...this.config, ...result["config"] }
          logger.info("Config loaded:", this.config)
        }
      } catch (error) {
        this.errorHandler.handle(error as Error, "config-load", false)
      }
    }
  }

  /**
   * Handles container change events from ContainerDetector
   *
   * @param container - The new active container or null if no container is active
   * @private
   */
  private onContainerChange(container: HTMLElement | null): void {
    if (container) {
      setTimeout(() => {
        if (this.containerDetector.isInProcessDesigner()) {
          this.fieldManager.scanAndRegister(container)
        }
      }, 500)
    } else {
      this.fieldManager.cleanup()
    }
  }

  /**
   * Handles context change events (regular form vs process designer)
   *
   * @param isProcessDesigner - True if the context is process designer, false otherwise
   * @private
   */
  private onContextChange(isProcessDesigner: boolean): void {
    if (isProcessDesigner) {
      const container = this.containerDetector.getActiveContainer()
      if (container) {
        this.fieldManager.scanAndRegister(container)
      }
    } else {
      this.fieldManager.cleanup()
      this.statsManager.reset()
    }
  }

  /**
   * Starts the polling interval for container and field detection
   *
   * Periodically checks for container changes and performs automatic validation
   * if configured. Respects the pollInterval configuration setting.
   * @private
   */
  private startPolling(): void {
    if (this.pollIntervalId !== null || this.isDestroyed) {
      return
    }

    this.pollIntervalId = window.setInterval(() => {
      try {
        const end = this.perfMonitor.start("poll-cycle")
        this.containerDetector.updateActiveContainer()

        if (this.containerDetector.isInProcessDesigner()) {
          const container = this.containerDetector.getActiveContainer()
          if (container) {
            this.fieldManager.scanAndRegister(container)
          }

          if (this.config.autoValidate) {
            this.orchestrator.autoValidateFields()
          }
        }

        end()
      } catch (error) {
        this.errorHandler.handle(error as Error, "poll-cycle", false)
      }
    }, this.config.pollInterval)

    logger.info(`Polling started (interval: ${this.config.pollInterval}ms`)
  }

  /**
   * Stops the polling interval
   * @private
   */
  private stopPolling(): void {
    if (this.pollIntervalId !== null) {
      window.clearInterval(this.pollIntervalId)
      this.pollIntervalId = null

      logger.info("Polling stopped")
    }
  }

  /**
   * Sets up message listener for extension popup communication
   *
   * Listens for messages from the extension popup and delegates to
   * handleMessage.
   * @private
   */
  private setupMessageListener(): void {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.onMessage.addListener(
        (
          request: ExtensionMessage,
          _sender: chrome.runtime.MessageSender,
          sendResponse: (response: ExtensionResponse) => void
        ) => {
          try {
            this.handleMessage(request, sendResponse)
          } catch (error) {
            this.errorHandler.handle(error as Error, "message-handling", false)
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            })
          }

          return true
        }
      )
    }
  }

  /**
   * Handles incoming messages from the extension popup
   *
   * @param request - The message request from the popup
   * @param sendResponse - Callback function to send response back to popup
   * @private
   */
  private handleMessage(
    request: ExtensionMessage,
    sendResponse: (response: ExtensionResponse) => void
  ): void {
    switch (request.action) {
      case "validate":
        this.orchestrator.runFullValidation()
        sendResponse({ success: true, stats: this.orchestrator.getStats() })
        break

      case "getStats":
        sendResponse({
          success: true,
          stats: this.orchestrator.getStats(),
          performance: this.perfMonitor.getStats(),
        })
        break

      case "updateConfig":
        if (request.config) {
          this.updateConfig(request.config)
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: "No config provided" })
        }
        break

      case "clearHighlights":
        this.orchestrator.clearHighlights()
        sendResponse({ success: true })
        break

      case "exportReport":
        this.orchestrator.exportReport()
        sendResponse({ success: true })
        break

      case "getErrorLogs":
        sendResponse({
          success: true,
          logs: this.errorHandler.getErrorLogs(),
        })
        break

      case "clearErrorLogs":
        this.errorHandler.clearErrorLogs()
        sendResponse({ success: true })
        break

      case "ping":
        sendResponse({ success: true })
        break

      default:
        sendResponse({ success: false, error: "Unknown action" })
    }
  }

  /**
   * Updates the validator configuration
   *
   * Merges new configuration with existing config and persists to storage.
   * Automatically restarts polling if pollInterval changes.
   *
   * @param newConfig - Partial configuration object to merge
   * @private
   */
  private updateConfig(newConfig: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    if (newConfig.pollInterval !== undefined) {
      this.stopPolling()
      this.startPolling()
    }

    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.sync.set({ config: this.config }, () => {
        if (chrome.runtime.lastError) {
          this.errorHandler.handle(
            new Error(chrome.runtime.lastError.message),
            "storage",
            false
          )
        }
      })
    }
  }

  /**
   * Sets up global keyboard shortcuts
   *
   * - Ctrl+Shift+V: Trigger full validation
   * - Escape: Hide stats panel
   * @private
   */
  private setupKeyboardShortcuts(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      try {
        if (e.ctrlKey && e.shiftKey && e.key === "V") {
          e.preventDefault()
          this.orchestrator.runFullValidation()
        } else if (e.key === "Escape") {
          this.uiManager.hideStatsPanel()
        }
      } catch (error) {
        this.errorHandler.handle(error as Error, "keyboard-shortcut", false)
      }
    }

    document.addEventListener("keydown", this.keyboardHandler)
    logger.info("Keyboard shortcut enabled")
  }

  /**
   * Sets up visibility change handler to optimize performance
   *
   * Pauses polling when tab is hidden, resumes when tab becomes visible.
   * @private
   */
  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.stopPolling()
        logger.info("Polling paused (tab hidden)")
      } else {
        this.startPolling()
        logger.info("Polling resumed (tab visible)")
      }
    }

    document.addEventListener("visibilitychange", this.visibilityHandler)
  }
}

interface IICSValidatorWindow extends Window {
  iicsValidator?: IICSFieldValidator
  __iicsValidatorInitialized?: boolean
}

/**
 * Initializes the IICS Field Validator on Informatica Cloud domains
 *
 * Prevents multiple initializations and provides global access to the validator
 * instance via `window.iccsValidator`. Automatically destroys on page unload.
 */
if (window.location.hostname.includes("informaticacloud.com")) {
  const validatorWindow = window as IICSValidatorWindow
  if (!validatorWindow.__iicsValidatorInitialized) {
    const initValidator = () => {
      const validator = new IICSFieldValidator()

      validatorWindow.iicsValidator = validator
      validatorWindow.__iicsValidatorInitialized = true

      logger.info("IICS Field Validator loaded successfully")
      logger.info("Tip: Use Ctrl+Shift+V to validate fields")
      logger.info("Debug: window.iicsValidator.getPerformanceMetrics()")

      window.addEventListener("beforeunload", () => {
        validator.destroy()
      })
    }

    if (document.readyState === "complete") {
      setTimeout(initValidator, 1000)
    } else {
      window.addEventListener("load", () => {
        setTimeout(initValidator, 1000)
      })
    }
  } else {
    logger.warn("IICS Field Validator already initialized")
  }
}
