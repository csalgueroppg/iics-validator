export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.INFO
  private prefix = "[IICS Validator]"

  public enableDebugMode(): void {
    this.setLevel(LogLevel.DEBUG)

    console.log(`${this.prefix} Debug mode enabled`)
    console.log(`${this.prefix} Current URL:`, window.location.href)
    console.log(`${this.prefix} Document ready state:`, document.readyState)
  }

  public setLevel(level: LogLevel): void {
    this.level = level
  }

  public debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`${this.prefix} ${message}`, ...args)
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`${this.prefix} ${message}`, ...args)
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`${this.prefix} ${message}`, ...args)
    }
  }

  public error(message: string, error?: Error, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${this.prefix} ${message}`, error, ...args)
    }
  }

  public group(label: string): void {
    console.group(`${this.prefix} ${label}`)
  }

  public groupEnd(): void {
    console.groupEnd()
  }

  public time(label: string): void {
    console.time(`${this.prefix} ${label}`)
  }

  public timeEnd(label: string): void {
    console.timeEnd(`${this.prefix} ${label}`)
  }
}

export const logger = new Logger()
export default logger
