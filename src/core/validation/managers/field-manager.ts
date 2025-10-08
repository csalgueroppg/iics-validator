import { FieldData, ValidatorConfig } from "@/shared/types/validation"
import { FIELD_SELECTOR, FIELD_SELECTOR_FALLBACK } from "@/shared/types/types"
import { Debouncer } from "@/shared/utils/debouncer"
import { ErrorHandler } from "@/shared/utils/error-handler"
import logger from "@/shared/utils/logger"
import { PerformanceMonitor } from "@/shared/utils/performance"

/**
 * @class FieldManager
 * @description Manages field registration, tracking, and lifecycle
 *
 * Handles the discovery, registration, and cleanup of form fields within
 * containers. Provides field validation scheduling, visibility monitoring via
 * `IntersectionObserver`, and efficient field lifecycle management with
 * automatic cleanup.
 *
 * @version 1.0.0
 * @since 2025-09-29
 * @author Carlos Salguero (X522644)
 */
export class FieldManager {
  private readonly registeredFields: Map<string, FieldData> = new Map()
  private intersectionObserver: IntersectionObserver | null = null
  private lastValues: Map<string, string> = new Map()

  /**
   * Creates a new `FieldManager` instance
   *
   * @param config - Validator configuration settings
   * @param debouncer - Debouncer utility for throttling validation events
   * @param perfMonitor - Performance monitoring utility
   * @param errorHandler - Error handling utility
   * @param onFieldValidate - Callback invoked when a field needs validation
   */
  constructor(
    private readonly config: ValidatorConfig,
    private readonly debouncer: Debouncer,
    private readonly perfMonitor: PerformanceMonitor,
    private readonly errorHandler: ErrorHandler
  ) {
    this.setupIntersectionObserver()
  }

  // Access methods
  public setupAutoValidation(
    validateCallback: (
      field: HTMLInputElement | HTMLTextAreaElement,
      silent: boolean
    ) => void
  ): void {
    ;(this as any).validateCallback = validateCallback
  }

  /**
   * Retrieves field data for a specific field ID
   *
   * @param fieldId - The unique identifier of the field
   * @returns `FieldData` if found, `undefined` otherwise
   */
  public getField(fieldId: string): FieldData | undefined {
    return this.registeredFields.get(fieldId)
  }

  /**
   * Gets all registered fields
   *
   * @returns Map of all currently registered fields with their data
   */
  public getAllFields(): Map<string, FieldData> {
    return this.registeredFields
  }

  /**
   * Gets the count of currently registered fields
   *
   * @returns Number of registered fields
   */
  public getFieldCount(): number {
    return this.registeredFields.size
  }

  /**
   * Updates field metadata for a specific field
   *
   * @param fieldId - The unique identifier of the field to update
   * @param updates - Partial field data to merge with existing data (element cannot be modified)
   */
  public updateFieldData(
    fieldId: string,
    updates: Partial<Omit<FieldData, "element">>
  ): void {
    const fieldData = this.registeredFields.get(fieldId)
    if (fieldData) {
      Object.assign(fieldData, updates)
    }
  }

  /**
   * Checks if a field is currently registered
   *
   * @param fieldId - The unique identifier of the field to check
   * @returns `true` if the field is registered, `false` otherwise
   */
  public hasField(fieldId: string): boolean {
    return this.registeredFields.has(fieldId)
  }

  public hasFieldChanged(fieldId: string): boolean {
    const fieldData = this.registeredFields.get(fieldId)
    if (!fieldData) return false

    const currentValue = fieldData.element.value
    const lastValue = this.lastValues.get(fieldId) || ""

    if (currentValue !== lastValue) {
      this.lastValues.set(fieldId, currentValue)
      return true
    }

    return false
  }

  // Public methods
  /**
   * Scans a container for fields and registers any new ones
   *
   * Compares currently registered fields with fields found in the container,
   * registering new fields and removing fields that no longer exist in the DOM.
   *
   * @param contianer - The HTML element to scan for form fields
   */
  public scanAndRegister(contianer: HTMLElement): void {
    const end = this.perfMonitor.start("field-scan")
    try {
      let fields = contianer.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
      >(FIELD_SELECTOR)

      if (fields.length === 0) {
        logger.warn("No fields found with primary selector, trying fallback")
        fields = contianer.querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement
        >(FIELD_SELECTOR_FALLBACK)
      }

      logger.debug(`Found ${fields.length} fields in container`)

      const currentFieldIds = new Set<string>()
      fields.forEach((field) => {
        currentFieldIds.add(field.id)

        if (!this.registeredFields.has(field.id)) {
          this.registerField(field)
          this.lastValues.set(field.id, field.value)

          if (this.intersectionObserver && field.offsetParent === null) {
            this.intersectionObserver.observe(field)
          }
        }
      })

      const fieldsToRemove: string[] = []
      for (const id of this.registeredFields.keys()) {
        if (!currentFieldIds.has(id)) {
          fieldsToRemove.push(id)
        }
      }

      fieldsToRemove.forEach((id) => this.unregisterField(id))
      if (fields.length > 0) {
        logger.info(
          `Scanned ${fields.length} fields (${fieldsToRemove.length} removed) `
        )
      }
    } catch (error) {
      this.errorHandler.handle(error as Error, "field-scan", false)
    } finally {
      end()
    }
  }

  /**
   * Gets fields that require validation based on their last validation time
   *
   * @param maxAge - Maximum age in milliseconds since last validation
   * @returns Array of `FieldData` objects that need validation
   */
  public getFieldsNeedingValidation(maxAge: number): FieldData[] {
    const now = Date.now()
    const fields: FieldData[] = []

    for (const fieldData of this.registeredFields.values()) {
      if (
        fieldData.element.value.trim() &&
        now - fieldData.lastValidated > maxAge
      ) {
        fields.push(fieldData)
      }
    }

    return fields
  }

  /**
   * Cleans up all registered fields
   *
   * Unregisters all fields, removing event listeners and cleaning up
   * resources. Useful when switching containers or preparing for destruction.
   */
  public cleanup(): void {
    if (this.registeredFields.size === 0) {
      return
    }

    logger.info("Cleaning up fields")
    try {
      const fieldsToRemove = Array.from(this.registeredFields.keys())
      fieldsToRemove.forEach((fieldId) => this.unregisterField(fieldId))
    } catch (error) {
      this.errorHandler.handle(error as Error, "cleanup", false)
    }
  }

  /**
   * Completely destroys the `FieldManager` instance
   *
   * Cleans up all fields, disconnects the `IntersectionObserver`, and prepares
   * the instance of garbage collection.
   */
  public destroy(): void {
    this.cleanup()
    this.intersectionObserver?.disconnect()
    this.intersectionObserver = null
  }

  // Helper methods
  /**
   * Sets up `IntersectionObserver` to monitor field visibility
   *
   * Observes fields for visibility changes and logs when fields become
   * visible. This helps with performance by tracking which fields are
   * actually in view.
   */
  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length > 0) {
          logger.debug(`${visibleEntries.length} fields became visible`)
        }
      },
      {
        root: null,
        threshold: 0.1,
      }
    )

    logger.info("Intersection observer setup")
  }

  /**
   * Registers a field and sets up validation event listeners.
   *
   * @param field - The form field element to register
   */
  private registerField(field: HTMLInputElement | HTMLTextAreaElement): void {
    try {
      const fieldData: FieldData = {
        element: field,
        isValid: null,
        errors: [],
        lastValidated: 0,
      }

      this.registeredFields.set(field.id, fieldData)
      if (this.config.autoValidate) {
        const validateHandler = (): void => {
          this.debouncer.debounce(
            `validate-${field.id}`,
            () => {
              const callback = (this as any).validateCallback
              if (callback) callback(field, true)
            },
            this.config.debounceDelay
          )
        }

        field.addEventListener("input", validateHandler, { passive: true })
        field.addEventListener("blur", validateHandler, { passive: true })
        ;(field as any)._iicsValidateHandler = validateHandler
      }

      logger.debug(`Registered field: ${field.id}`)
    } catch (error) {
      this.errorHandler.handle(error as Error, "field-registration", false)
    }
  }

  /**
   * Unregisters a field and cleans up its resources
   *
   * @param fieldId - The unique identifier of the field to unregister
   */
  private unregisterField(fieldId: string): void {
    try {
      const fieldData = this.registeredFields.get(fieldId)
      if (!fieldData) {
        return
      }

      const handler = (fieldData.element as any)._iicsValidateHandler
      if (handler) {
        fieldData.element.removeEventListener("input", handler)
        fieldData.element.removeEventListener("blur", handler)

        delete (fieldData.element as any)._iicsValidateHandler
      }

      this.debouncer.cancel(`validate-${fieldId}`)
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(fieldData.element)
      }

      this.registeredFields.delete(fieldId)
      logger.debug(`Unregistered field: ${fieldId}`)
    } catch (error) {
      this.errorHandler.handle(error as Error, "field-unregistration", false)
    }
  }
}
