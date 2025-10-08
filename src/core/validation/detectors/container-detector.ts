import { FIELD_SELECTOR, SECTION_SELECTOR } from "@/shared/types/types"
import { ValidatorConfig } from "@/shared/types/validation"
import { Debouncer } from "@/shared/utils/debouncer"
import { ErrorHandler } from "@/shared/utils/error-handler"
import logger from "@/shared/utils/logger"
import { PerformanceMonitor } from "@/shared/utils/performance"

/**
 * @class ContainerDetector
 * @descrition Detects and manages active form containers within the application
 *
 * Monitors DOM changes to identify the currently active form container, detects
 * context changes (regular form vs process designer), and provides real-time
 * information about the current form state. Uses `MutationObserver` for
 * efficient DOM monitoring with performance optimizations.
 *
 * @version 1.0.0
 * @since 2025-09-29
 * @author Carlos Salguero (X522644)
 */
export class ContainerDetector {
  private activeContainer: HTMLElement | null = null
  private mutationObserver: MutationObserver | null = null
  private isProcessDesigner = false
  private lastScanTime: number = 0
  private minScanInterval: number = 500
  private retryCount: number = 0
  private readonly maxRetries: number = 3

  /**
   * Creates a new `ContainerDetector` instance
   *
   * @param config - Validator configuration settings
   * @param debouncer - Debouncer utility for throttling operations
   * @param perfMonitor - Performance monitoring utility
   * @param errorHandler - Error handling utility
   * @param onContainerChange - Callback invoked when the active container  changes
   * @param onContextChange - Callback invoked when form context changes (regular form vs process designer)
   */
  constructor(
    private readonly config: ValidatorConfig,
    private readonly debouncer: Debouncer,
    private readonly perfMonitor: PerformanceMonitor,
    private readonly errorHandler: ErrorHandler,
    private readonly onContainerChange: (container: HTMLElement | null) => void,
    private readonly onContextChange: (isProcessDesigner: boolean) => void
  ) {
    this.setupMutationObserver()
  }

  // Access methods
  /**
   * Gets the currently active container element
   *
   * @returns The active `HTMLElement` container or `null` if no container is
   * active
   */
  public getActiveContainer(): HTMLElement | null {
    return this.activeContainer
  }

  /**
   * Checks if the current context is a process designer
   *
   * @returns `true` if in process designer mode, `false` otherwise
   */
  public isInProcessDesigner(): boolean {
    return this.isProcessDesigner
  }

  /**
   * Counts the number of form fields in the active container
   *
   * @returns The number of detected form fields, or 0 if no active container
   */
  public getFieldCount(): number {
    if (!this.activeContainer) {
      return 0
    }

    try {
      const fields = this.activeContainer.querySelectorAll(FIELD_SELECTOR)
      return fields.length
    } catch (error) {
      this.errorHandler.handle(error as Error, "field-count", false)
      return 0
    }
  }

  /**
   * Determines if the active container is ready for validation
   *
   * @returns `true` if container is present and visible, `false` otherwise
   */
  public isContainerReady(): boolean {
    return (
      this.activeContainer !== null &&
      this.activeContainer.offsetHeight > 0 &&
      this.activeContainer.children.length > 0
    )
  }

  /**
   * Gets debug information about the current detector state
   *
   * @returns Object containing detector state information for debugging
   */
  public getDebugInfo(): {
    hasActiveContainer: boolean
    isProcessDesigner: boolean
    fieldCount: number
    containerReady: boolean
  } {
    return {
      hasActiveContainer: this.activeContainer !== null,
      isProcessDesigner: this.isProcessDesigner,
      fieldCount: this.getFieldCount(),
      containerReady: this.isContainerReady(),
    }
  }

  // Methods
  /**
   * Scans the DOM to find and update the active container
   *
   * Searches through container sections to find the first visible, non-empty
   * container. Uses performance monitoring and error handling throughout.
   */
  public updateActiveContainer(): void {
    const now = Date.now()
    if (now - this.lastScanTime < this.minScanInterval) {
      return
    }

    const end = this.perfMonitor.start("container-detection")
    try {
      const section = document.querySelector<HTMLElement>(SECTION_SELECTOR)
      if (!section) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++
          logger.warn(
            `Container not found, retry ${this.retryCount}/${this.maxRetries}`
          )

          setTimeout(() => this.updateActiveContainer(), 1000)
        }

        logger.debug("Section not found. Looking for: ", SECTION_SELECTOR)
        logger.debug(
          "Available sections:",
          document.querySelectorAll("section").length
        )

        this.setActiveContainer(null)
        return
      }

      const divs = section.querySelectorAll<HTMLElement>(":scope > div")
      const divArray = Array.from(divs)

      for (const div of divArray) {
        logger.debug(
          `Div check: children=${div.children.length}, height=${div.offsetHeight}`
        )

        if (div.children.length > 0 && div.offsetHeight > 0) {
          if (this.activeContainer !== div) {
            logger.info("Active container changed")
            this.setActiveContainer(div)
          }

          return
        }
      }

      this.retryCount = 0
      this.setActiveContainer(null)
    } catch (error) {
      this.errorHandler.handle(error as Error, "container-detection", false)
    } finally {
      end()
    }
  }

  /**
   * Forces an immediate container update, bypassing scan interval limits
   *
   * Usesful when external changes require immediate detection, such as after
   * programmatic DOM modifications.
   */
  public forceUpdate(): void {
    this.lastScanTime = 0
    this.updateActiveContainer()
  }

  /**
   * Clean up resources and stops all monitoring
   *
   * Disconnects the mutation observer, resets all state, and prepares the
   * instance for garbage collection. Should be calling when the detector is
   * no longer needed.
   */
  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }

    this.activeContainer = null
    this.isProcessDesigner = false
    this.lastScanTime = 0

    logger.info("Container detector destroyed")
  }

  // Helper methods
  /**
   * Sets up mutation observer to monitor DOM changes
   *
   * Observes the container section for structural changes and triggers
   * container detection when significant changes occur. Uses debouncing and
   * idle callback scheduling for performance optimization.
   */
  private setupMutationObserver(): void {
    const section = document.querySelector<HTMLElement>(SECTION_SELECTOR)
    if (!section) {
      setTimeout(() => this.setupMutationObserver(), 1000)
      return
    }

    let mutationQueue: MutationRecord[] = []
    let processingMutations: boolean = false

    this.mutationObserver = new MutationObserver((mutations) => {
      mutationQueue.push(...mutations)

      if (!processingMutations) {
        processingMutations = true

        this.requestIdleWork(() => {
          const significantChanges = mutationQueue.some(
            (mut) => mut.addedNodes.length > 3 || mut.removedNodes.length > 3
          )

          if (significantChanges) {
            this.debouncer.debounce(
              "mutation-scan",
              () => {
                this.updateActiveContainer()
              },
              300
            )
          }

          mutationQueue = []
          processingMutations = false
        })
      }
    })

    this.mutationObserver.observe(section, {
      childList: true,
      subtree: true,
      attributes: false,
    })

    logger.info("Mutation observer setup")
  }

  /**
   * Schedules work during browser idle periods
   *
   * @param callback - Function to execute during idle time
   */
  private requestIdleWork(callback: () => void): void {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(callback, { timeout: 2000 })
    } else {
      setTimeout(callback, 0)
    }
  }

  /**
   * Updates the active container and triggers change detection
   *
   * @param container - New active container element or null
   */
  private setActiveContainer(container: HTMLElement | null): void {
    const changed = this.activeContainer !== container
    this.activeContainer = container

    if (changed) {
      this.detectContext()
      this.onContainerChange(container)
    }
  }

  /**
   * Detects whether the current context is a process designer
   *
   * Determines context based on field count threshold and updates the
   * process designer state accordingly.
   */
  private detectContext(): void {
    if (!this.activeContainer) {
      this.setProcessDesignerState(false)
      return
    }

    try {
      const fields = this.activeContainer.querySelectorAll(FIELD_SELECTOR)
      const fieldCount = fields.length
      const isProcessDesigner = fieldCount >= this.config.minFieldsForProcess

      logger.debug(
        `Context detection: ${fieldCount} fields found, threshold: ${this.config.minFieldsForProcess}`
      )

      if (isProcessDesigner !== this.isProcessDesigner) {
        this.setProcessDesignerState(isProcessDesigner)

        if (isProcessDesigner) {
          logger.info(`Process designer detected (${fieldCount} fields)`)

          const fieldIds = Array.from(fields)
            .map((f) => f.id)
            .slice(0, 5)
          logger.debug(`First 5 fields: ${fieldIds.join(", ")}`)
        } else {
          logger.info("Process Designed closed")
        }
      }
    } catch (error) {
      this.errorHandler.handle(error as Error, "context-detection", false)
    }
  }

  /**
   * Updates the process designer state and notifies listeners
   *
   * @param state - New process designer state
   */
  private setProcessDesignerState(state: boolean): void {
    if (this.isProcessDesigner !== state) {
      this.isProcessDesigner = state
      this.onContextChange(state)
    }
  }
}

export default ContainerDetector
