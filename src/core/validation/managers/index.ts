export { FieldManager } from "./field-manager"
export { StatsManager } from "./stats-manager"
export { UIManager } from "./ui-manager"
export { ValidationOrchestrator } from "./validation-orchestrator"

/**
 * @interface
 * @description Common manager interface for all management components
 */
export interface Manager {
  initialize(): Promise<void> | void
  destroy(): Promise<void> | void
  getState(): unknown
}

/**
 * @type
 * @description Manager initialization options
 */
export type ManagerConfig = {
  autoInitialize: boolean
  cleanupOnDestroy: boolean
}
