import { ValidationStats } from "@/shared/types/validation"
import { ErrorHandler } from "@/shared/utils/error-handler"
import logger from "@/shared/utils/logger"

const UI_STYLES = `
  /* Field Validation Highlights */
  .iics-valid {
    outline: 2px solid #4caf50 !important;
    outline-offset: 2px;
    transition: outline 0.2s ease;
  }

  .iics-invalid {
    outline: 2px solid #f44336 !important;
    outline-offset: 2px;
    transition: outline 0.2s ease;
  }

  /* Validation Button */
  .iics-validator-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: transform 0.2s, box-shadow 0.2s;
    font-family: system-ui, -apple-system, sans-serif;
    will-change: transform;
  }

  .iics-validator-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
  }

  .iics-validator-btn:active {
    transform: translateY(0);
  }

  /* Stats Panel */
  .iics-stats-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    width: 320px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    overflow: hidden;
    transition: transform 0.3s ease, opacity 0.3s ease;
    font-family: system-ui, -apple-system, sans-serif;
    will-change: transform, opacity;
  }

  .iics-stats-panel.hidden {
    transform: translateX(360px);
    opacity: 0;
    pointer-events: none;
  }

  .stats-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 16px;
  }

  .stats-close {
    background: transparent;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    line-height: 1;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .stats-close:hover {
    background: rgba(255,255,255,0.2);
  }

  .stats-content {
    padding: 20px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin-bottom: 10px;
    border-radius: 6px;
    background: #f8f9fa;
  }

  .stat-item.valid {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .stat-item.invalid {
    background: #ffebee;
    color: #c62828;
  }

  .stat-label {
    font-weight: 500;
    font-size: 14px;
  }

  .stat-value {
    font-weight: 700;
    font-size: 20px;
  }

  .stats-actions {
    padding: 0 20px 20px;
    display: flex;
    gap: 10px;
  }

  .stats-actions button {
    flex: 1;
    padding: 10px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-export {
    background: #667eea;
    color: white;
  }

  .btn-export:hover {
    background: #5568d3;
  }

  .btn-clear {
    background: #f0f0f0;
    color: #333;
  }

  .btn-clear:hover {
    background: #e0e0e0;
  }

  /* GPU acceleration */
  .iics-validator-btn, .iics-stats-panel {
    transform: translateZ(0);
  }
`

const STATS_INNTER_HTML = `
<div class="stats-header">
  <span>Validation Results</span>
  <button class="stats-close" aria-label="Close">×</button>
</div>
<div class="stats-content">
  <div class="stat-item">
    <span class="stat-label">Total Fields:</span>
    <span class="stat-value" id="iics-total-fields">0</span>
  </div>
  <div class="stat-item valid">
    <span class="stat-label">✓ Valid:</span>
    <span class="stat-value" id="iics-valid-fields">0</span>
  </div>
  <div class="stat-item invalid">
    <span class="stat-label">✗ Invalid:</span>
    <span class="stat-value" id="iics-invalid-fields">0</span>
  </div>
</div>
<div class="stats-actions">
  <button class="btn-export" id="iics-btn-export">Export</button>
  <button class="btn-clear" id="iics-btn-clear">Clear</button>
</div>
`

/**
 *
 */
export class UIManager {
  private validationButton: HTMLButtonElement | null = null
  private statsPanel: HTMLDivElement | null = null

  /**
   * Creates a new `UIManager` instance
   *
   * @param errorHandler - Error handling utility for managing UI errors
   * @param onValidate - Callback invoked when validation is triggered via UI
   * @param onExport - Callback when invoked when export functionality is requested
   * @param onClear - Callback invoked when field highlights should be cleared
   */
  constructor(
    private readonly errorHandler: ErrorHandler,
    private readonly onValidate: () => void,
    private readonly onExport: () => void,
    private readonly onClear: () => void
  ) {}

  /**
   * Initializes all UI components
   *
   * Sets up the complete user interface by:
   * 1. Injecting necessary CSS styles
   * 2. Creating the validation button
   * 3. Creating the statistics panel
   *
   * Should be called once during application startup.
   */
  public initialize(): void {
    this.injectStyles()
    this.createValidationButton()
    this.createStatsPanel()
  }

  /**
   * Updates visual highlighting for a field based on validation results
   *
   * Applies CSS classes and accessibility attributes to indicate validation state:
   * - Green outline for valid fields with success tooltip
   * - Red outline for invalid fields with error details in tooltip
   * - ARIA attributes for screen reader compatibility
   * - Smooth transitions for visual feedback
   *
   * @param field - The form field element to highlight
   * @param isValid - Whether the field passed validation
   * @param errors - Array of error messages for invalid fields
   *
   * @example
   * ```typescript
   * uiManager.updateFieldHighlight(field, true, []);
   * uiManager.updateFieldHighlight(field, false, ["Must start with capital letter"]);
   * ```
   */
  public updateFieldHighlight(
    field: HTMLInputElement | HTMLTextAreaElement,
    isValid: boolean,
    errors: string[]
  ): void {
    try {
      field.classList.remove("iics-valid", "iics-invalid")
      if (isValid) {
        field.classList.add("iics-valid")
        field.title = "Valid - Meets naming standards"
        field.setAttribute("aria-invalid", "false")
      } else {
        field.classList.add("iics-invalid")
        field.title =
          errors.length > 0 ? "Invalid:\n" + errors.join("\n -") : "Invalid"
        field.setAttribute("aria-invalid", "true")
      }
    } catch (error) {
      this.errorHandler.handle(error as Error, "highligh-update", false)
    }
  }

  /**
   * Removes visual highlighting from a field
   *
   * Clears all validator-specific classes and attributes, restoring the field
   * to its original visual state. Useful when resetting validation or when
   * fields are no longer being tracked.
   *
   * @param field - The form field element to clear highlighting from
   */
  public clearFieldHighlight(
    field: HTMLInputElement | HTMLTextAreaElement
  ): void {
    try {
      field.classList.remove("iics-valid", "iics-invalid")
      field.title = ""
      field.removeAttribute("aria-invalid")
    } catch (error) {
      this.errorHandler.handle(error as Error, "highlight-clear", false)
    }
  }

  /**
   * Updates the statistics panel with current validation results
   *
   * Refreshes the displayed numbers in the stats panel to reflect
   * the current state of field validation. Handles errors gracefully
   * if DOM elements are not found.
   *
   * @param stats - Validation statistics to display
   *
   * @example
   * ```typescript
   * uiManager.updateStatsPanel({
   *   totalFields: 15,
   *   validFields: 12,
   *   invalidFields: 3
   * });
   * ```
   */
  public updateStatsPanel(stats: ValidationStats): void {
    try {
      const totalEl = document.getElementById("iics-total-fields")
      const validEl = document.getElementById("iics-valid-fields")
      const invalidEl = document.getElementById("iics-invalid-fields")

      if (!totalEl || !validEl || !invalidEl) {
        logger.warn("Stats panel elements not found")
        return
      }

      totalEl.textContent = stats.totalFields.toString()
      validEl.textContent = stats.validFields.toString()
      invalidEl.textContent = stats.invalidFields.toString()
    } catch (error) {
      this.errorHandler.handle(error as Error, "stats-update", false)
    }
  }

  /**
   * Displays the statistics panel
   *
   * Animates the panel into view by removing the 'hidden' class.
   * Typically called after validation completes to show results.
   */
  public showStatsPanel(): void {
    this.statsPanel?.classList.remove("hidden")
  }

  /**
   * Hides the statistics panel
   *
   * Animates the panel out of view by adding the 'hidden' class.
   * Can be triggered by the close button or Escape key.
   */
  public hideStatsPanel(): void {
    this.statsPanel?.classList.add("hidden")
  }

  /**
   * Cleans up and removes all UI elements
   *
   * Removes all validator-specific DOM elements and styles from the document.
   * Should be called when the validator is being destroyed to prevent
   * memory leaks and ensure clean teardown.
   */
  public destroy(): void {
    this.validationButton?.remove()
    this.validationButton = null

    this.statsPanel?.remove()
    this.statsPanel = null

    document.getElementById("iics-validator-styles")?.remove()
    logger.info("UI elements removed")
  }

  // Helper methods
  /**
   * Injects CSS styles into the document head
   *
   * Provides comprehensive styling for:
   * - Field validation highlights (valid/invalid states)
   * - Floating validation button with hover effects
   * - Statistics panel with smooth animations
   * - Accessibility and responsive design
   *
   * Styles are only injected once to prevent duplicates.
   * @private
   */
  private injectStyles(): void {
    if (document.getElementById("iics-validator-styles")) {
      return
    }

    const style = document.createElement("style")
    style.id = "iics-validator-styles"
    style.textContent = UI_STYLES

    document.head.appendChild(style)
    logger.info("Styles injected to header")
  }

  /**
   * Creates the floating validation button
   *
   * Creates a fixed-position button in the bottom-right corner with:
   * - Gradient background and hover effects
   * - Keyboard shortcut information in tooltip
   * - Accessibility attributes (aria-label)
   * - Click handler that triggers validation
   *
   * @private
   */
  private createValidationButton(): void {
    this.validationButton = document.createElement("button")
    this.validationButton.className = "iics-validator-btn"
    this.validationButton.innerHTML = "Validate"
    this.validationButton.title = "Validate all fields (Ctrl+Shift+V)"
    this.validationButton.setAttribute("aria-label", "Validate all fields")
    this.validationButton.addEventListener("click", () => {
      try {
        this.onValidate()
      } catch (error) {
        this.errorHandler.handle(error as Error, "validation")
      }
    })

    document.body.appendChild(this.validationButton)
    logger.info("Validation button checked")
  }

  /**
   * Creates the statistics panel for validation results
   *
   * Creates a sliding panel in the top-right corner with:
   * - Real-time validation statistics
   * - Export and clear action buttons
   * - Smooth show/hide animations
   * - Accessibility attributes (role, aria-label)
   * - Event handlers for all interactive elements
   *
   * @private
   */
  private createStatsPanel(): void {
    this.statsPanel = document.createElement("div")
    this.statsPanel.className = "iics-stats-panel hidden"
    this.statsPanel.setAttribute("role", "dialog")
    this.statsPanel.setAttribute("aria-label", "Validation Results")
    this.statsPanel.innerHTML = STATS_INNTER_HTML

    document.body.appendChild(this.statsPanel)
    this.statsPanel
      .querySelector(".stats-close")
      ?.addEventListener("click", () => {
        this.hideStatsPanel()
      })

    this.statsPanel
      .querySelector("#iics-btn-export")
      ?.addEventListener("click", () => {
        try {
          this.onExport()
        } catch (error) {
          this.errorHandler.handle(error as Error, "export")
        }
      })

    this.statsPanel
      .querySelector("#iics-btn-clear")
      ?.addEventListener("click", () => {
        try {
          this.onClear()
        } catch (error) {
          this.errorHandler.handle(error as Error, "clear-highlights", false)
        }
      })

    logger.info("Stats panel created")
  }
}
