import { ValidationRule as SharedValidationRule } from "@/shared/types/validation"

/**
 * @interface
 * @description Extended validation rule with internal metadata
 */
export interface ValidationRule extends SharedValidationRule {
  enabled?: boolean
  lastModified?: number
}

/**
 * @interface
 * @description Engine configuration options
 */
export interface ValidatorEngineConfig {
  enableEmptyFieldOptimization?: boolean
  stopOnFirstError?: boolean
  maxErrorsPerField?: number
}

/**
 * @type
 * @description Validation context for rule execution
 */
export type ValidationContext = {
  fieldType?: string
  isRequired?: boolean
  customData?: Record<string, unknown>
}
