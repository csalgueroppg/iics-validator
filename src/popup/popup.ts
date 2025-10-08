import { DateFormatter } from "@/shared/utils/date-formatter"
import logger from "@/shared/utils/logger"
import type {
  ValidationStats,
  ValidatorConfig,
} from "@/shared/types/validation"

/**
 * @class PopupController
 * @description Controls the extension popup UI and handles user interactions
 *
 * Manages popup initialization, configuration loading/storing, statistics
 * display, and communication with the content script on the current tab.
 *
 * @version 3.0.0
 * @since 2025-09-24
 * @author Carlos Salguero (X522644)
 */
class PopupController {
  /** ID of the currently active tab for communication with content script */
  private currentTabId: number | null = null

  /**
   * Creates a new `PopupController` instance and initializes the popup
   */
  constructor() {
    this.init()
  }

  /**
   * Initializes the popup when the DOM is ready.
   * @private
   */
  private init(): void {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup())
    } else {
      this.setup()
    }
  }

  /**
   * Sets up the popup UI and loads initial data
   * @private
   */
  private setup(): void {
    logger.info("Popup initializing...")

    this.getCurrentTab()
    this.loadConfig()
    this.setupEventListeners()
    this.loadStats()
  }

  /**
   * Gets the currently active tab to communicate with its content script
   * @private
   */
  private getCurrentTab(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        this.currentTabId = tabs[0].id
        this.checkIfIICSPage(tabs[0].url)
      }
    })
  }

  /**
   * Checks if the current page is an IICS page and updates UI accordingly
   *
   * @param url - The URL of the current tab
   * @private
   */
  private checkIfIICSPage(url?: string): void {
    const isIICS = url?.includes("informaticacloud.com")
    const statusEl = document.getElementById("page-status")

    if (statusEl) {
      if (isIICS) {
        statusEl.textContent = "✓ IICS Page Detected"
        statusEl.className = "status-badge active"
      } else {
        statusEl.textContent = "⚠ Not on IICS"
        statusEl.className = "status-badge inactive"
      }
    }

    this.toggleButtons(isIICS || false)
  }

  /**
   * Enables or disables action buttons based on whether we're on an IICS page
   *
   * @param enabled - Whether buttons should be enabled
   * @private
   */
  private toggleButtons(enabled: boolean): void {
    const buttons = ["btn-validate", "btn-clear", "btn-export"]
    buttons.forEach((id) => {
      const btn = document.getElementById(id) as HTMLButtonElement
      if (btn) btn.disabled = !enabled
    })
  }

  /**
   * Sets up event listeners for all interactive UI elements
   * @private
   */
  private setupEventListeners(): void {
    document.getElementById("btn-validate")?.addEventListener("click", () => {
      this.sendMessage({ action: "validate" })
    })

    document.getElementById("btn-clear")?.addEventListener("click", () => {
      this.sendMessage({ action: "clearHighlights" })
    })

    document.getElementById("btn-export")?.addEventListener("click", () => {
      this.sendMessage({ action: "exportReport" })
    })

    document.getElementById("btn-refresh")?.addEventListener("click", () => {
      this.loadStats()
    })

    document
      .getElementById("toggle-auto-validate")
      ?.addEventListener("change", (e) => {
        const checked = (e.target as HTMLInputElement).checked
        this.updateConfig("autoValidate", checked)
      })

    document
      .getElementById("poll-interval")
      ?.addEventListener("change", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value)
        if (value >= 1000 && value <= 10000) {
          this.updateConfig("pollInterval", value)
        }
      })

    document
      .getElementById("toggle-keyboard")
      ?.addEventListener("change", (e) => {
        const checked = (e.target as HTMLInputElement).checked
        this.updateConfig("enableKeyboardShortcut", checked)
      })
  }

  /**
   * Loads configuration from storage and updates the UI
   * @private
   */
  private loadConfig(): void {
    chrome.storage.sync.get(["config"], (result) => {
      const config = result["config"] as Partial<ValidatorConfig> | undefined
      if (config) {
        this.updateConfigUI(config)
      }
    })
  }

  /**
   * Updates the configuration UI elements with current values
   *
   * @param config - Configuration object with current settings
   * @private
   */
  private updateConfigUI(config: Partial<ValidatorConfig>): void {
    const autoValidate = document.getElementById(
      "toggle-auto-validate"
    ) as HTMLInputElement
    if (autoValidate && config.autoValidate !== undefined) {
      autoValidate.checked = config.autoValidate
    }

    const pollInterval = document.getElementById(
      "poll-interval"
    ) as HTMLInputElement
    if (pollInterval && config.pollInterval) {
      pollInterval.value = config.pollInterval.toString()
    }

    const keyboard = document.getElementById(
      "toggle-keyboard"
    ) as HTMLInputElement
    if (keyboard && config.enableKeyboardShortcut !== undefined) {
      keyboard.checked = config.enableKeyboardShortcut
    }
  }

  /**
   * Updates a configuration value and persists it to storage
   *
   * @param key - Configuration key to update
   * @param value - New value for the configuration key
   * @private
   */
  private updateConfig(key: string, value: any): void {
    chrome.storage.sync.get(["config"], (result) => {
      const config = (result["config"] as Record<string, any>) || {}
      config[key] = value

      chrome.storage.sync.set({ config }, () => {
        logger.info(`Config updated: ${key} = ${value}`)
        this.sendMessage({ action: "updateConfig", config: { [key]: value } })
        this.showMessage("Settings saved", "success")
      })
    })
  }

  /**
   * Loads validation statistics from the content script
   * @private
   */
  private loadStats(): void {
    this.sendMessage({ action: "getStats" }, (response) => {
      if (response?.stats) {
        this.updateStatsUI(response.stats)
      }
    })
  }

  /**
   * Updates the statistics display in the popup UI
   *
   * @param stats - Validation statistics to display
   * @private
   */
  private updateStatsUI(stats: ValidationStats): void {
    const totalEl = document.getElementById("stat-total")
    const validEl = document.getElementById("stat-valid")
    const invalidEl = document.getElementById("stat-invalid")
    const lastValidatedEl = document.getElementById("last-validated")

    if (totalEl) totalEl.textContent = stats.totalFields.toString()
    if (validEl) validEl.textContent = stats.validFields.toString()
    if (invalidEl) invalidEl.textContent = stats.invalidFields.toString()

    if (lastValidatedEl && stats.lastValidated) {
      const date = new Date(stats.lastValidated)
      lastValidatedEl.textContent = DateFormatter.toRelative(date)
    }

    this.updateProgressBar(stats)
  }

  /**
   * Updates the validation progress bar with current statistics
   *
   * @param stats - Validation statistics for progress calculation
   * @private
   */
  private updateProgressBar(stats: ValidationStats): void {
    const progressBar = document.getElementById(
      "validation-progress"
    ) as HTMLDivElement

    if (!progressBar || stats.totalFields === 0) {
      if (progressBar) progressBar.style.width = "0%"
      return
    }

    const percentage = (stats.validFields / stats.totalFields) * 100
    progressBar.style.width = `${percentage}%`

    if (percentage === 100) {
      progressBar.style.background = "#4caf50"
    } else if (percentage >= 50) {
      progressBar.style.background = "#ff9800"
    } else {
      progressBar.style.background = "#f44336"
    }
  }

  /**
   * Sends a message to the content script in the current tab
   *
   * @param message - Message object to send
   * @param callback - Optional callback to handle response
   * @private
   */
  private sendMessage(message: any, callback?: (response: any) => void): void {
    if (!this.currentTabId) {
      logger.error("No current tab ID")
      return
    }

    let responded: boolean = false
    const timeout = setTimeout(() => {
      if (!responded) {
        this.showMessage("Extension not responding. Try refreshing the page")
      }
    }, 5000)

    chrome.tabs.sendMessage(this.currentTabId, message, (response) => {
      responded = true
      clearTimeout(timeout)

      if (chrome.runtime.lastError) {
        const error = new Error(
          chrome.runtime.lastError.message || "Unknown error"
        )

        logger.error("Message error:", error)
        this.showMessage("Extension not active on this page", "error")
      } else if (callback) {
        callback(response)
      }
    })
  }

  /**
   * Shows a temporary message to the user in the popup
   *
   * @param text - Message text to display
   * @param type - Type of message (affects styling)
   * @private
   */
  private showMessage(
    text: string,
    type: "success" | "error" | "info" = "info"
  ): void {
    const messageEl = document.getElementById("popup-message")
    if (!messageEl) return

    messageEl.textContent = text
    messageEl.className = `popup-message ${type}`
    messageEl.style.display = "block"

    setTimeout(() => {
      messageEl.style.display = "none"
    }, 3000)
  }
}

new PopupController()
