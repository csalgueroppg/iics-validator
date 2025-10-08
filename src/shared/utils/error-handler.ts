import { ToastManager } from "./toast"
import { ErrorLog } from "../types/types"
import logger from "./logger"

export class ErrorHandler {
  private readonly maxLogs = 50

  constructor(private toast: ToastManager) {}

  /**
   * Handle an error with logging and optional user notification
   */
  public handle(error: Error, context: string, showToUser = true): void {
    logger.error(`Error in ${context}:`, error)

    if (showToUser) {
      const userMessage = this.getUserFriendlyMessage(error, context)
      this.toast.show(userMessage, "error", 5000)
    }

    this.logError(error, context)
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: Error, context: string): string {
    const messages: Record<string, string> = {
      "field-scan":
        "Unable to detect fields. Please ensure Process Designer is fully loaded.",
      validation: "Validation failed. Please try again.",
      export: "Failed to export report. Please check your browser permissions.",
      storage: "Failed to save settings. Please check browser storage.",
      "container-detection":
        "Unable to detect IICS container. Page may still be loading.",
      initialization:
        "Extension failed to initialize. Please refresh the page.",
      "poll-cycle": "Background scanning encountered an error.",
      "message-handling": "Communication error occurred.",
      "keyboard-shortcut": "Keyboard shortcut failed to execute.",
    }

    return messages[context] || `An error occurred: ${error.message}`
  }

  /**
   * Log error to session storage for debugging
   */
  private logError(error: Error, context: string): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack,
      url: window.location.href,
    }

    try {
      const logs = this.getErrorLogs()
      logs.push(errorLog)

      // Keep only recent errors
      if (logs.length > this.maxLogs) {
        logs.splice(0, logs.length - this.maxLogs)
      }

      sessionStorage.setItem("iics-validator-errors", JSON.stringify(logs))
    } catch (e) {
      logger.error("Failed to log error to session storage", e as Error)
    }
  }

  /**
   * Get all error logs from session storage
   */
  public getErrorLogs(): ErrorLog[] {
    try {
      const logs = sessionStorage.getItem("iics-validator-errors")
      return logs ? JSON.parse(logs) : []
    } catch {
      return []
    }
  }

  /**
   * Clear all error logs
   */
  public clearErrorLogs(): void {
    try {
      sessionStorage.removeItem("iics-validator-errors")
    } catch (e) {
      logger.error("Failed to clear error logs", e as Error)
    }
  }

  /**
   * Export error logs as JSON string
   */
  public exportErrorLogs(): string {
    return JSON.stringify(this.getErrorLogs(), null, 2)
  }
}

