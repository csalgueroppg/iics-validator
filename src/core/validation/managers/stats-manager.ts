import { FieldData, ValidationStats } from "@/shared/types/validation"
import { DateFormatter } from "@/shared/utils/date-formatter"
import { ErrorHandler } from "@/shared/utils/error-handler"
import logger from "@/shared/utils/logger"
import { ToastManager } from "@/shared/utils/toast"

/**
 * Manages validation statistics and reporting
 *
 * Tracks validation metrics, generates reports, and provides summary
 * information about field validation results. Supports CSV export and
 * real-time statistics updates with user-friendly toast notifications.
 *
 * @example
 * ```typescript
 * const statsManager = new StatsManager(errorHandler, toast);
 *
 * statsManager.updateFromFields(fieldMap)
 * statsManager.showSummary()
 * statsManager.exportCSV(fieldMap)
 * ```
 */
export class StatsManager {
  private stats: ValidationStats = {
    totalFields: 0,
    validFields: 0,
    invalidFields: 0,
    lastValidated: null,
  }

  /**
   * Creates a new StatsManager instance
   * @param errorHandler - Error handling utility for managing statistical errors
   * @param toast - Toast notification utility for displaying summary information
   */
  constructor(
    private readonly errorHandler: ErrorHandler,
    private readonly toast: ToastManager
  ) {}

  /**
   * Resets all statistics to their initial state
   *
   * Clears all validation counts and timestamps. Useful when starting a new
   * validation session or when the form context changes.
   *
   * @example
   * ```typescript
   * statsManager.reset();
   * // stats now: { totalFields: 0, validFields: 0, invalidFields: 0, lastValidated: null }
   * ```
   */
  public reset(): void {
    this.stats = {
      totalFields: 0,
      validFields: 0,
      invalidFields: 0,
      lastValidated: null,
    }
  }

  /**
   * Updates statistics from a collection of field data
   *
   * Analyzes all fields in the provided map and recalculates statistics:
   * - Total field count
   * - Valid field count
   * - Invalid field count
   * - Last validation timestamp
   *
   * @param fields - Map of field IDs to FieldData objects to analyze
   *
   * @example
   * ```typescript
   * statsManager.updateFromFields(fieldManager.getAllFields());
   * ```
   */
  public updateFromFields(fields: Map<string, FieldData>): void {
    this.reset()
    this.stats.totalFields = fields.size

    for (const fieldData of fields.values()) {
      if (fieldData.isValid === true) {
        this.stats.validFields++
      } else if (fieldData.isValid === false) {
        this.stats.invalidFields++
      }
    }

    this.stats.lastValidated = new Date()
  }

  /**
   * Increments the valid field count by one
   *
   * Useful for real-time updates when fields are validated individually
   * rather than in batch.
   *
   * @example
   * ```typescript
   * // When a field passes validation
   * statsManager.incrementValid();
   * ```
   */
  public incrementValid(): void {
    this.stats.validFields++
  }

  /**
   * Increments the invalid field count by one
   *
   * Useful for real-time updates when fields are validated individually
   * and found to be invalid.
   *
   * @example
   * ```typescript
   * // When a field fails validation
   * statsManager.incrementInvalid();
   * ```
   */
  public incrementInvalid(): void {
    this.stats.invalidFields++
  }

  /**
   * Sets the total field count
   *
   * Manually updates the total field count when field discovery happens
   * separately from validation.
   *
   * @param count - The total number of fields to set
   *
   * @example
   * ```typescript
   * statsManager.setTotal(fieldManager.getFieldCount());
   * ```
   */
  public setTotal(count: number): void {
    this.stats.totalFields = count
  }

  /**
   * Marks the current time as the last validation timestamp
   *
   * Updates the lastValidated timestamp to indicate when validation
   * was last performed. Automatically called by updateFromFields.
   *
   * @example
   * ```typescript
   * statsManager.markValidated();
   * // stats.lastValidated is now current date/time
   * ```
   */
  public markValidated(): void {
    this.stats.lastValidated = new Date()
  }

  /**
   * Gets a copy of the current statistics
   *
   * Returns a shallow copy to prevent external modification of internal state.
   *
   * @returns Current validation statistics
   *
   * @example
   * ```typescript
   * const stats = statsManager.getStats();
   * console.log(`Valid: ${stats.validFields}/${stats.totalFields}`);
   * ```
   */
  public getStats(): ValidationStats {
    return { ...this.stats }
  }

  /**
   * Calculates the validation success percentage
   *
   * Computes the percentage of valid fields relative to total fields.
   * Returns 0 if there are no fields to avoid division by zero.
   *
   * @returns Percentage of valid fields (0-100)
   *
   * @example
   * ```typescript
   * const percentage = statsManager.getValidationPercentage();
   * console.log(`Success rate: ${percentage.toFixed(1)}%`);
   * ```
   */
  public getValidationPercentage(): number {
    if (this.stats.totalFields === 0) {
      return 0
    }

    return (this.stats.validFields / this.stats.totalFields) * 100
  }

  /**
   * Displays a summary of validation results as a toast notification
   *
   * Shows different message types based on validation outcomes:
   * - Success: All fields are valid
   * - Error: All fields are invalid
   * - Warning: Mixed results with valid and invalid fields
   * - Info: No fields found to validate
   *
   * Toast remains visible for 5 seconds to allow user reading.
   *
   * @example
   * ```typescript
   * // After validation completes
   * statsManager.showSummary();
   * ```
   */
  public showSummary(): void {
    const { totalFields, validFields, invalidFields } = this.stats

    let message: string
    let type: "success" | "warning" | "error"

    if (invalidFields === 0 && totalFields > 0) {
      message = `Perfect! All ${totalFields} fields are valid`
      type = "success"
    } else if (validFields === 0 && totalFields > 0) {
      message = `All ${totalFields} fields need attention`
      type = "error"
    } else if (totalFields > 0) {
      message = `Validated ${totalFields} fields: ${validFields} valid, ${invalidFields} invalid`
      type = "warning"
    } else {
      message = "No fields found to validate"
      type = "warning"
    }

    this.toast.show(message, type, 5000)
  }

  /**
   * Exports field validation data as a CSV file
   *
   * Generates a comprehensive CSV report with the following columns:
   * - Field ID: The unique identifier of the field
   * - Field Value: The current value of the field (quoted and escaped)
   * - Status: "Valid" or "Invalid"
   * - Errors: Semicolon-separated list of validation errors
   * - Last Validated: Timestamp of last validation
   *
   * Includes UTF-8 BOM for Excel compatibility and automatically triggers
   * download with a timestamped filename.
   *
   * @param fields - Map of field IDs to FieldData objects to export
   *
   * @example
   * ```typescript
   * statsManager.exportCSV(fieldManager.getAllFields());
   * // Downloads: iics-validation-2024-12-20-143045.csv
   * ```
   */
  public exportCSV(fields: Map<string, FieldData>): void {
    try {
      if (fields.size === 0) {
        this.toast.show("No fields to export", "warning", 3000)
        return
      }

      const BOM = "\uFEFF"
      const csvRows: string[] = []
      csvRows.push("Field ID,Field Value,Status,Errors,Last Validated")

      fields.forEach((fieldData, id) => {
        const value = fieldData.element.value.trim().replace(/"/g, '""')
        const status = fieldData.isValid ? "Valid" : "Invalid"
        const errors = fieldData.errors.join("; ").replace(/"/g, '""')
        const lastValidated = fieldData.lastValidated
          ? new Date(fieldData.lastValidated).toLocaleString()
          : "Never"

        csvRows.push(
          `"${id}","${value}","${status}","${errors}","${lastValidated}"`
        )
      })

      const csvContent = BOM + csvRows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      const timestamp = DateFormatter.toFileName()
      link.href = url

      const randomSuffix = Math.random().toString(36).substring(2, 6)
      link.download = `iics-validation-${timestamp}-${randomSuffix}.csv`
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(url), 100)

      this.toast.show("Report exported successfully", "success", 3000)
      logger.info("Report exported")
    } catch (error) {
      this.errorHandler.handle(error as Error, "export")
    }
  }

  /**
   * Returns statistics as a formatted string for debugging and display
   *
   * Provides a human-readable summary of all current statistics including
   * formatted dates and calculated percentages.
   *
   * @returns Formatted string representation of statistics
   *
   * @example
   * ```typescript
   * console.log(statsManager.toString());
   * // Output:
   * // Validation Statistics:
   * //   Total Fields: 15
   * //   Valid Fields: 12
   * //   Invalid Fields: 3
   * //   Validation Rate: 80.0%
   * //   Last Validated: 2024-12-20 14:30:45
   * ```
   */
  public toString(): string {
    const { totalFields, validFields, invalidFields, lastValidated } =
      this.stats
    const percentage = this.getValidationPercentage()

    return `
      Validation Statistics:
      Total Fields: ${totalFields}
      Valid Fields: ${validFields}
      Invalid Fields: ${invalidFields}
      Validation Rate: ${percentage.toFixed(1)}%
      Last Validated: ${
        lastValidated ? DateFormatter.toDisplay(lastValidated) : "Never"
      }
        `.trim()
  }
}
