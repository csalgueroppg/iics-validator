export { ContainerDetector } from "./container-detector"

/**
 * @interface
 * @description Common detector interface for all detection components
 */
export interface Detector {
  initialize(): void
  destroy(): void
  isReady(): boolean
}

/**
 * @type
 * @description Detector configuration options
 */
export type DetectorConfig = {
  enabled: boolean
  scanInterval: number
  maxRetries: number
}
