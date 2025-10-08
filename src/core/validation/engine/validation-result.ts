import { FieldData } from "@/shared/types/validation"

/**
 * @interface
 * @description Standardized validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  fieldId?: string
  timestamp?: number
}

/**
 * @class
 * @description Processes and analyzes validation results
 */
export class ResultProcessor {
  /**
   * Creates a validation result object
   */
  createResult(isValid: boolean, errors: string[] = []): ValidationResult {
    return {
      isValid,
      errors,
      timestamp: Date.now(),
    }
  }

  /**
   * Generates summary statistics from field data
   */
  generateSummary(fields: FieldData[]): {
    total: number
    valid: number
    invalid: number
    errorsByType: Record<string, number>
  } {
    const summary = {
      total: fields.length,
      valid: 0,
      invalid: 0,
      errorsByType: {} as Record<string, number>,
    }

    for (const fieldData of fields) {
      if (fieldData.isValid === true) {
        summary.valid++
      } else if (fieldData.isValid === false) {
        summary.invalid++

        for (const error of fieldData.errors) {
          summary.errorsByType[error] = (summary.errorsByType[error] || 0) + 1
        }
      }
    }

    return summary
  }

  /**
   * Merges multiple validation results
   */
  mergeResults(results: ValidationResult[]): {
    allValid: boolean
    totalErrors: number
    errorDistribution: Record<string, number>
  } {
    const merged = {
      allValid: true,
      totalErrors: 0,
      errorDistribution: {} as Record<string, number>,
    }

    for (const result of results) {
      if (!result.isValid) {
        merged.allValid = false
        merged.totalErrors += result.errors.length

        for (const error of result.errors) {
          merged.errorDistribution[error] =
            (merged.errorDistribution[error] || 0) + 1
        }
      }
    }

    return merged
  }
}
