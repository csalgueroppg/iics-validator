import { PerformanceMetric } from "../types/types"
import logger from "./logger"

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private readonly maxSamples = 10
  private readonly slowThreshold = 100 // ms

  /**
   * Start timing an operation
   * Returns a function to end timing
   */
  public start(operation: string): () => void {
    const startTime = performance.now()

    return () => {
      const duration = performance.now() - startTime
      this.record(operation, duration)

      if (duration > this.slowThreshold) {
        logger.warn(
          `Slow operation: ${operation} took ${duration.toFixed(2)}ms`
        )
      }
    }
  }

  /**
   * Record a measurement
   */
  private record(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }

    const samples = this.metrics.get(operation)!
    samples.push(duration)

    if (samples.length > this.maxSamples) {
      samples.shift()
    }
  }

  /**
   * Get average duration for an operation
   */
  public getAverage(operation: string): number {
    const samples = this.metrics.get(operation)
    if (!samples || samples.length === 0) return 0

    const sum = samples.reduce((a, b) => a + b, 0)
    return sum / samples.length
  }

  /**
   * Get all statistics
   */
  public getStats(): Record<string, PerformanceMetric> {
    const stats: Record<string, PerformanceMetric> = {}

    this.metrics.forEach((samples, operation) => {
      stats[operation] = {
        avg: this.getAverage(operation),
        samples: samples.length,
      }
    })

    return stats
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.metrics.clear()
  }

  /**
   * Get metrics summary as string
   */
  public getSummary(): string {
    const stats = this.getStats()
    const lines: string[] = ["Performance Summary:"]

    Object.entries(stats).forEach(([op, metric]) => {
      lines.push(
        `  ${op}: ${metric.avg.toFixed(2)}ms avg (${metric.samples} samples)`
      )
    })

    return lines.join("\n")
  }
}
