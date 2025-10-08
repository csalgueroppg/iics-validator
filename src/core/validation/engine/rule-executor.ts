import { ValidationRule } from "@/shared/types/validation"

/**
 * @class
 * @description Executes validation rules with optimized error handling
 */
export class RuleExecutor {
  /**
   * Executes all rules against a field value
   */
  executeRules(value: string, rules: ValidationRule[]): string[] {
    const errors: string[] = []

    for (const rule of rules) {
      if (!rule.check(value)) {
        errors.push(rule.message)
      }
    }

    return errors
  }

  /**
   * Executes rules excluding specific ones (for empty field optimization)
   */
  executeRulesExcluding(
    value: string,
    rules: ValidationRule[],
    excludedNames: string[]
  ): string[] {
    const filteredRules = rules.filter(
      (rule) => !excludedNames.includes(rule.name)
    )

    return this.executeRules(value, filteredRules)
  }

  /**
   * Validates a single rule
   */
  validateRule(value: string, rule: ValidationRule): boolean {
    return rule.check(value)
  }
}
