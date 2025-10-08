export class DateFormatter {
  /**
   * Format date as relative time (e.g., "2 minutes ago")
   */
  public static toRelative(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 10) return "Just now"
    if (diffSecs < 60) return `${diffSecs} seconds ago`
    if (diffMins === 1) return "1 minute ago"
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours === 1) return "1 hour ago"
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString()
  }

  /**
   * Format date for file names (YYYY-MM-DD_HH-MM-SS)
   */
  public static toFileName(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")

    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_` +
      `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    )
  }

  /**
   * Format date as ISO string without milliseconds
   */
  public static toISO(date: Date): string {
    return date.toISOString().split(".")[0] + "Z"
  }

  /**
   * Format date for display (locale-aware)
   */
  public static toDisplay(date: Date): string {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  /**
   * Parse date safely
   */
  public static parse(dateString: string): Date | null {
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? null : date
    } catch {
      return null
    }
  }
}
