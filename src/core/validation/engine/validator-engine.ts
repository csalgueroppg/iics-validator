import { ValidationRules } from "./validation-rules"
import { RuleExecutor } from "./rule-executor"
import { ResultProcessor, ValidationResult } from "./validation-result"
import { ValidatorEngineConfig } from "./types"
import { PerformanceMonitor } from "@/shared/utils/performance"
import { ErrorHandler } from "@/shared/utils/error-handler"
import { FieldData } from "@/shared/types/validation"

/**
 * @class
 * @description Core validation engine for field naming standards
 *
 * Provides comprehensive validation for form fields against configurable rules.
 * Supports single field validation, batch processing, and dynamic rule
 * management.
 *
 * @version 1.0.0
 * @since 2025-09-29
 * @author Carlos Salguero (X522644)
 *
 * @example
 * ```typescript
 * const validator = new ValidatorEngine(perfMonitor, errorHandler);
 * const result = validator.validate(fieldElement);
 *
 * // Batch validation
 * const results = validator.validateBatch([field, field2]);
 *
 * // Dynamic rules
 * validator.addRule(customRule);
 * ```
 */
export class ValidatorEngine {
  private readonly rules: ValidationRules
  private readonly executor: RuleExecutor
  private readonly processor: ResultProcessor
  private readonly config: ValidatorEngineConfig

  constructor(
    private readonly perfMonitor: PerformanceMonitor,
    private readonly errorHandler: ErrorHandler,
    config: Partial<ValidatorEngineConfig> = {}
  ) {
    this.rules = new ValidationRules()
    this.executor = new RuleExecutor()
    this.processor = new ResultProcessor()
    this.config = {
      enableEmptyFieldOptimization: true,
      stopOnFirstError: false,
      maxErrorsPerField: 10,
      ...config,
    }
  }

  /**
   * Validates a single field against all configured rules
   */
  public validate(
    field: HTMLInputElement | HTMLTextAreaElement
  ): ValidationResult {
    const end = this.perfMonitor.start("field-validation")

    try {
      const value = field.value.trim()
      if (value.length === 0) {
        if (this.config.enableEmptyFieldOptimization) {
          return this.processor.createResult(false, ["Field cannot be empty"])
        }
      }

      const rulesToExecute = this.config.enableEmptyFieldOptimization
        ? this.rules.getExcluding(["not-empty"])
        : this.rules.getAll()

      const errors = this.executor.executeRules(value, rulesToExecute)
      return this.processor.createResult(errors.length === 0, errors)
    } catch (error) {
      this.errorHandler.handle(error as Error, "validation-check", false)
      return this.processor.createResult(false, ["Validation error occurred"])
    } finally {
      end()
    }
  }

  /**
   * Validates multiple fields in batch
   */
  public validateBatch(
    fields: (HTMLInputElement | HTMLTextAreaElement)[]
  ): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>()
    for (const field of fields) {
      const result = this.validate(field)
      results.set(field.id, result)
    }

    return results
  }

  /**
   * Rule management delegates to ValidationRules
   */
  public getRule(name: string) {
    return this.rules.get(name)
  }

  public getAllRules() {
    return this.rules.getAll()
  }

  public addRule(rule: Parameters<ValidationRules["add"]>[0]) {
    this.rules.add(rule)
  }

  public removeRule(name: string) {
    return this.rules.remove(name)
  }

  /**
   * Statistics and summary
   */
  public getSummary(fields: FieldData[]) {
    return this.processor.generateSummary(fields)
  }

  /**
   * Configuration management
   */
  public updateConfig(newConfig: Partial<ValidatorEngineConfig>): void {
    Object.assign(this.config, newConfig)
  }

  public getConfig(): ValidatorEngineConfig {
    return { ...this.config }
  }
}
