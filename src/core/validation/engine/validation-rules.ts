import { ValidationRule } from "@/shared/types/validation"
import logger from "@/shared/utils/logger"

/**
 * @class ValidationRules
 * @description Manages validation rules registry with priority-based
 * ordering
 */
export class ValidationRules {
  private rules: ValidationRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  /**
   * Gets all rules in priority order
   */
  getAll(): ValidationRule[] {
    return [...this.rules]
  }

  /**
   * Gets a specific rule by name
   */
  get(name: string): ValidationRule | undefined {
    return this.rules.find((rule) => rule.name === name)
  }

  /**
   * Adds or updates a rule
   */
  add(rule: ValidationRule): void {
    const existingIndex = this.rules.findIndex((r) => r.name === rule.name)

    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule
      logger.info(`Updated validation rule: ${rule.name}`)
    } else {
      this.rules.push(rule)
      logger.info(`Added validation rule: ${rule.name}`)
    }

    this.sortByPriority()
  }

  /**
   * Removes a rule by name
   */
  remove(name: string): boolean {
    const index = this.rules.findIndex((rule) => rule.name === name)

    if (index >= 0) {
      this.rules.splice(index, 1)
      logger.info(`Removed validation rule: ${name}`)
      return true
    }

    return false
  }

  /**
   * Gets rules excluding specific names
   */
  getExcluding(excludedNames: string[]): ValidationRule[] {
    return this.rules.filter((rule) => !excludedNames.includes(rule.name))
  }

  private sortByPriority(): void {
    this.rules.sort((a, b) => {
      const priorityA = a.priority ?? Number.MAX_SAFE_INTEGER
      const priorityB = b.priority ?? Number.MAX_SAFE_INTEGER
      return priorityA - priorityB
    })
  }

  private initializeDefaultRules(): void {
    const defaultRules: ValidationRule[] = [
      {
        name: "not-empty",
        check: (value: string) => value.length > 0,
        message: "Field cannot be empty",
        priority: 1,
      },
      {
        name: "starts-with-capital",
        check: (value: string) => /^[A-Z]/.test(value),
        message: "Must start with capital letter",
        priority: 2,
      },
      {
        name: "no-spaces",
        check: (value: string) => !/\s/.test(value),
        message: "No spaces allowed",
        priority: 3,
      },
      {
        name: "alphanumeric-underscore",
        check: (value: string) => /^[A-Za-z0-9_]+$/.test(value),
        message: "Only letters, numbers, and underscore allowed",
        priority: 4,
      },
      {
        name: "min-length",
        check: (value: string) => value.length >= 3,
        message: "Must be at least 3 characters",
        priority: 5,
      },
      {
        name: "max-length",
        check: (value: string) => value.length <= 50,
        message: "Cannot exceed 50 characters",
        priority: 6,
      },
      {
        name: "no-trailing-underscore",
        check: (value: string) => !/_$/.test(value),
        message: "Cannot end with underscore",
        priority: 7,
      },
      {
        name: "no-consecutive-underscores",
        check: (value: string) => !/__/.test(value),
        message: "No consecutive underscores",
        priority: 8,
      },
      {
        name: "no-leading-number",
        check: (value: string) => !/^[0-9]/.test(value),
        message: "Cannot start with number",
        priority: 9,
      },
    ]

    this.rules = defaultRules
    this.sortByPriority()
  }
}
