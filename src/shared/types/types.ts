import { ValidationStats, ValidatorConfig } from "./validation"

/**
 * Performance metric tracking
 */
export interface PerformanceMetric {
  /** Average execution time in milliseconds */
  avg: number
  /** Number of samples collected */
  samples: number
  /** Minimum execution time */
  min?: number
  /** Maximum execution time */
  max?: number
}

/**
 * Error log entry for debugging
 */
export interface ErrorLog {
  /** ISO timestamp of error */
  timestamp: string
  /** Context where error occurred */
  context: string
  /** Error message */
  message: string
  /** Stack trace if available */
  stack?: string | undefined
  /** Page URL where error occurred */
  url: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Toast notification types
 */
export type ToastType = "success" | "error" | "warning" | "info"

/**
 * Toast notification options
 */
export interface ToastOptions {
  /** Message to display */
  message: string
  /** Type of toast */
  type: ToastType
  /** Duration in milliseconds (0 for persistent) */
  duration: number
  /** Optional action button */
  action?: {
    label: string
    callback: () => void
  }
}

/**
 * Message types for Chrome extension communication
 */
export type MessageAction =
  | "validate"
  | "getStats"
  | "updateConfig"
  | "clearHighlights"
  | "exportReport"
  | "getErrorLogs"
  | "clearErrorLogs"
  | "ping"

/**
 * Message structure for extension communication
 */
export interface ExtensionMessage {
  /** Action to perform */
  action: MessageAction
  /** Optional configuration data */
  config?: Partial<ValidatorConfig>
  /** Additional payload data */
  payload?: unknown
}

/**
 * Response structure from content script
 */
export interface ExtensionResponse {
  /** Whether the action succeeded */
  success: boolean
  /** Optional validation statistics */
  stats?: ValidationStats
  /** Optional performance metrics */
  performance?: Record<string, PerformanceMetric>
  /** Optional error logs */
  logs?: ErrorLog[]
  /** Error message if action failed */
  error?: string
}

/**
 * Main section selector for IICS container
 */
export const SECTION_SELECTOR = "body > section" as const

/**
 * Field selector pattern for IICS fields
 */
export const FIELD_SELECTOR =
  'input[id^="ae_sf_"], textarea[id^="ae_sf_"]' as const

/**
 * Fallback selector if primary fails
 */
export const FIELD_SELECTOR_FALLBACK = 'input[type="text"], textarea' as const

/**
 * Storage keys for Chrome storage
 */
export const STORAGE_KEYS = {
  CONFIG: "config",
  ERROR_LOGS: "iics-validator-errors",
} as const
