import { PerformanceMonitor } from "@/shared/utils/performance"
import { FieldData } from "../engine"
import { ValidatorEngine } from "../engine"
import { FieldManager } from "./field-manager"
import { StatsManager } from "./stats-manager"
import { UIManager } from "./ui-manager"
import { ErrorHandler } from "@/shared/utils/error-handler"
import { ToastManager } from "@/shared/utils/toast"
import logger from "@/shared/utils/logger"

/**
 * @class ValidationOrchestrator
 * @description Orchestrates the validation process across al fields
 *
 * Coordinates between `FieldManager`, `ValidatorEngine`, `UIManager`, and
 * `StatesManager` to provide a seamless validation experience. Handles batch
 * processing, real-time updates, and validation lifecycle management with
 * performance optimizations and error handling.
 *
 * @example
 * ```typescript
 * const orchestrator = new ValidationOrchestrator(
 *   fieldManager,
 *   validatorEngine,
 *   uiManager,
 *   statsManager,
 *   perfMonitor,
 *   errorHandler,
 *   toast
 * );
 *
 * // Run full validation
 * orchestrator.runFullValidation();
 *
 * // Validate single field
 * orchestrator.validateSingleField(fieldElement);
 * ```
 */
export class ValidationOrchestrator {
  /**
   * Creates a new ValidationOrchestrator instance
   * @param fieldManager - Manages field registration and lifecycle
   * @param validatorEngine - Performs actual validation logic against rules
   * @param uiManager - Handles visual feedback and user interface
   * @param statsManager - Tracks validation statistics and reporting
   * @param perfMonitor - Monitors performance and timing
   * @param errorHandler - Handles errors throughout validation process
   * @param toast - Displays user notifications
   */
  constructor(
    private readonly fieldManager: FieldManager,
    private readonly validatorEngine: ValidatorEngine,
    private readonly uiManager: UIManager,
    private readonly statsManager: StatsManager,
    private readonly perfMonitor: PerformanceMonitor,
    private readonly errorHandler: ErrorHandler,
    private readonly toast: ToastManager
  ) {}

  /**
   * Runs full validation on all registered fields
   *
   * Performs comprehensive validation across all discovered fields with:
   * - Performance monitoring for timing analysis
   * - Batch processing to prevent UI blocking
   * - Statistical tracking and reporting
   * - Visual feedback updates
   * - Error handling and recovery
   *
   * Shows appropriate notifications when no fields are found or when
   * validation completes successfully.
   *
   * @example
   * ```typescript
   * // Trigger from UI button or keyboard shortcut
   * orchestrator.runFullValidation();
   * ```
   */
  public runFullValidation(): void {
    logger.info("Starting validation")

    const end = this.perfMonitor.start("full-validation")
    try {
      const fields = Array.from(this.fieldManager.getAllFields().values())
      if (fields.length === 0) {
        this.toast.show("No fields found to validate", "warning", 3000)
        return
      }

      this.statsManager.reset()
      this.statsManager.setTotal(fields.length)
      this.validateInBatches(fields)
    } catch (error) {
      this.errorHandler.handle(error as Error, "validation")
    } finally {
      end()
    }
  }

  /**
   * Validates a single field and updates all related systems
   *
   * Performs validation on an individual field and coordinates updates across:
   * - FieldManager: Updates field metadata and validation state
   * - StatsManager: Updates validation statistics (when not silent)
   * - UIManager: Updates visual highlighting and accessibility attributes
   *
   * Uses requestAnimationFrame for visual updates to ensure smooth rendering.
   *
   * @param field - The form field element to validate
   * @param silent - If true, suppresses statistical updates (for auto-validation)
   * @returns True if the field passed validation, false otherwise
   *
   * @example
   * ```typescript
   * // Manual validation with stats updates
   * const isValid = orchestrator.validateSingleField(field, false);
   *
   * // Auto-validation without affecting stats
   * orchestrator.validateSingleField(field, true);
   * ```
   */
  public validateSingleField(
    field: HTMLInputElement | HTMLTextAreaElement,
    silent: boolean = false
  ): boolean {
    try {
      const result = this.validatorEngine.validate(field)
      this.fieldManager.updateFieldData(field.id, {
        isValid: result.isValid,
        errors: result.errors,
        lastValidated: Date.now(),
      })

      if (!silent) {
        if (result.isValid) {
          this.statsManager.incrementValid()
        } else {
          this.statsManager.incrementInvalid()
        }
      }

      requestAnimationFrame(() => {
        this.uiManager.updateFieldHighlight(
          field,
          result.isValid,
          result.errors
        )
      })

      return result.isValid
    } catch (error) {
      this.errorHandler.handle(error as Error, "field-validation", false)
      return false
    }
  }

  /**
   * Automatically validates fields that need re-validation
   *
   * Checks for fields that haven't been validated recently (default: 2 seconds)
   * and performs silent validation. Useful for real-time validation as users
   * type or when field values change programmatically.
   *
   * This method is typically called during polling cycles and does not
   * affect validation statistics to avoid skewing manual validation results.
   *
   * @example
   * ```typescript
   * // Called during polling or on field changes
   * orchestrator.autoValidateFields();
   * ```
   */
  public autoValidateFields(): void {
    const fieldsNeedingValidatino =
      this.fieldManager.getFieldsNeedingValidation(2000)

    for (const fieldData of fieldsNeedingValidatino) {
      if (this.fieldManager.hasFieldChanged(fieldData.element.id)) {
        this.validateSingleField(fieldData.element, true)
        this.fieldManager.updateFieldData(fieldData.element.id, {
          lastValidated: Date.now(),
        })
      }
    }
  }

  /**
   * Clears all validation highlights and resets statistics
   *
   * Removes visual feedback from all fields and resets the validation state:
   * - Clears CSS classes and accessibility attributes from fields
   * - Resets all validation statistics to zero
   * - Updates statistics panel to reflect cleared state
   * - Hides statistics panel from view
   * - Shows confirmation toast notification
   *
   * Useful when users want to start fresh or when switching form contexts.
   *
   * @example
   * ```typescript
   * // Clear all visual feedback
   * orchestrator.clearHighlights();
   * ```
   */
  public clearHighlights(): void {
    try {
      for (const fieldData of this.fieldManager.getAllFields().values()) {
        this.uiManager.clearFieldHighlight(fieldData.element)
      }

      this.statsManager.reset()
      this.uiManager.updateStatsPanel(this.statsManager.getStats())
      this.uiManager.hideStatsPanel()
      this.toast.show("All highlights cleared", "info", 2000)
    } catch (error) {
      this.errorHandler.handle(error as Error, "clear-all-highlights")
    }
  }

  /**
   * Exports validation results as a CSV report
   *
   * Triggers the CSV export process through the StatsManager, which
   * generates a comprehensive report including:
   * - Field identifiers and current values
   * - Validation status (valid/invalid)
   * - Error messages for invalid fields
   * - Last validation timestamps
   *
   * The export process includes automatic download with timestamped filename.
   *
   * @example
   * ```typescript
   * // Export current validation results
   * orchestrator.exportReport();
   * ```
   */
  public exportReport(): void {
    this.statsManager.exportCSV(this.fieldManager.getAllFields())
  }

  /**
   * Gets current validation statistics
   *
   * Retrieves the latest validation metrics including field counts,
   * validation status, and timestamps. Useful for external components
   * that need to display or analyze validation results.
   *
   * @returns Current validation statistics
   *
   * @example
   * ```typescript
   * const stats = orchestrator.getStats();
   * updateDashboard(stats.validFields, stats.totalFields);
   * ```
   */
  public getStats() {
    return this.statsManager.getStats()
  }

  // Helper methods

  /**
   * Validates fields in batches for optimal performance
   *
   * Processes fields in configurable batch sizes (default: 20) using
   * requestAnimationFrame to prevent UI thread blocking. Maintains
   * smooth user interaction while processing large numbers of fields.
   *
   * @param fields - Array of FieldData objects to validate
   * @private
   */
  private validateInBatches(fields: FieldData[]): void {
    const batchSize: number = 20
    let currentBatch: number = 0

    const validateBatch = (): void => {
      const start = currentBatch * batchSize
      const end = Math.min(start + batchSize, fields.length)
      const updates: Array<{
        field: HTMLInputElement | HTMLTextAreaElement
        isValid: boolean
        errors: string[]
      }> = []

      for (let i = start; i < end; i++) {
        const fieldData = fields[i]
        if (fieldData) {
          const result = this.validatorEngine.validate(fieldData.element)
          this.fieldManager.updateFieldData(fieldData.element.id, {
            isValid: result.isValid,
            errors: result.errors,
            lastValidated: Date.now(),
          })

          if (!result.isValid) {
            this.statsManager.incrementValid()
          } else {
            this.statsManager.incrementInvalid()
          }

          updates.push({
            field: fieldData.element,
            isValid: result.isValid,
            errors: result.errors,
          })
        }
      }

      requestAnimationFrame(() => {
        for (const update of updates) {
          this.uiManager.updateFieldHighlight(
            update.field,
            update.isValid,
            update.errors
          )
        }
      })

      currentBatch++
      if (end < fields.length) {
        requestAnimationFrame(validateBatch)
      } else {
        this.onValidationComplete()
      }
    }

    validateBatch()
  }

  /**
   * Handles completion of validation process
   *
   * Performs finalization tasks after all fields have been validated:
   * - Updates last validation timestamp
   * - Refreshes statistics panel with current results
   * - Displays statistics panel to user
   * - Shows summary toast notification
   * - Logs completion information
   *
   * @private
   */
  private onValidationComplete(): void {
    this.statsManager.markValidated()

    const stats = this.statsManager.getStats()
    this.uiManager.updateStatsPanel(stats)
    this.uiManager.showStatsPanel()
    this.statsManager.showSummary()

    logger.info(
      `Validation complete: ${stats.validFields} valid, ${stats.invalidFields} invalid`
    )
  }
}
