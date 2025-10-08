export class Debouncer {
  private timers: Map<string, number> = new Map()

  /**
   * Debounce a callback function
   * @param key Unique identifier for this debounce operation
   * @param callback Function to execute after delay
   * @param delay Delay in milliseconds
   */
  public debounce(key: string, callback: () => void, delay: number): void {
    const existingTimer = this.timers.get(key)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    const timer = window.setTimeout(() => {
      callback()
      this.timers.delete(key)
    }, delay)

    this.timers.set(key, timer)
  }

  /**
   * Cancel a specific debounced operation
   */
  public cancel(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      window.clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  /**
   * Cancel all pending debounced operations
   */
  public cancelAll(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer))
    this.timers.clear()
  }

  /**
   * Check if a debounce operation is pending
   */
  public isPending(key: string): boolean {
    return this.timers.has(key)
  }

  /**
   * Get count of pending operations
   */
  public getPendingCount(): number {
    return this.timers.size
  }
}
