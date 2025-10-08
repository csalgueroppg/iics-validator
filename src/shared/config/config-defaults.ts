import { ValidatorConfig } from "../types/validation"

export const DEFAULT_CONFIG: ValidatorConfig = {
  pollInterval: 2000,
  debounceDelay: 300,
  autoValidate: true,
  enableKeyboardShortcut: true,
  minFieldsForProcess: 5,
  maxRetries: 3,
}
