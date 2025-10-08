/**
 * Core configuration for the IICS Field Validator
 */
export interface ValidatorConfig {
  /** Polling interval in milliseconds for field detection */
  pollInterval: number
  /** Minimum number of fields required to consider page as Process Designer */
  minFieldsForProcess: number
  /** Enable automatic validation as user types */
  autoValidate: boolean
  /** Enable keyboard shortcuts (Ctrl+Shift+V) */
  enableKeyboardShortcut: boolean
  /** Maximum retry attempts before stopping validation */
  maxRetries: number
  /** Debounce delay for validation events in milliseconds */
  debounceDelay: number
}

/**
 * Internal state management for the validator
 */
export interface ValidatorState {
  /** Currently active container element in IICS */
  activeContainer: HTMLElement | null
  /** Map of registered field IDs to their data */
  registeredFields: Map<string, FieldData>
  /** Whether we're currently in Process Designer view */
  isProcessDesigner: boolean
  /** Whether validation is enabled */
  validationEnabled: boolean
  /** Whether polling is active */
  isPolling: boolean
  /** Current retry count for error handling */
  retryCount: number
}

/**
 * Aggregated validation statistics
 */
export interface ValidationStats {
  /** Total number of fields detected */
  totalFields: number
  /** Number of fields passing validation */
  validFields: number
  /** Number of fields failing validation */
  invalidFields: number
  /** Timestamp of last validation run */
  lastValidated: Date | null
}

/**
 * Individual validation rule definition
 */
export interface ValidationRule {
  /** Unique name for the rule */
  name: string
  /** Validation function that returns true if valid */
  check: (value: string) => boolean
  /** Error message to display when rule fails */
  message: string
  /** Optional priority for rule ordering */
  priority?: number
}

/**
 * Data structure for individual field tracking
 */
export interface FieldData {
  /** The actual DOM element */
  element: HTMLInputElement | HTMLTextAreaElement
  /** Validation result (null if not yet validated) */
  isValid: boolean | null
  /** Array of validation error messages */
  errors: string[]
  /** Timestamp of last validation */
  lastValidated: number
}
