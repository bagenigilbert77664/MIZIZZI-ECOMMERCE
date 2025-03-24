/**
 * Utility for throttling API requests to prevent excessive calls
 */

interface ThrottleOptions {
  interval?: number // Minimum time between requests in ms
  maxRequests?: number // Maximum requests in the interval
}

class ApiThrottle {
  private requests: { [key: string]: number[] } = {}
  private defaultOptions: ThrottleOptions = {
    interval: 2000, // 2 seconds
    maxRequests: 1,
  }

  /**
   * Check if a request should be throttled
   * @param key Unique identifier for the request type
   * @param options Throttling options
   * @returns Boolean indicating if the request should be throttled
   */
  shouldThrottle(key: string, options?: ThrottleOptions): boolean {
    const opts = { ...this.defaultOptions, ...options }
    const now = Date.now()

    // Initialize request tracking for this key if it doesn't exist
    if (!this.requests[key]) {
      this.requests[key] = []
    }

    // Filter out old requests outside the interval
    this.requests[key] = this.requests[key].filter((timestamp) => now - timestamp < opts.interval!)

    // Check if we've exceeded the maximum requests in the interval
    if (this.requests[key].length >= opts.maxRequests!) {
      console.log(`[ApiThrottle] Throttling request for ${key}`)
      return true
    }

    // Add this request to the tracking
    this.requests[key].push(now)
    return false
  }

  /**
   * Clear throttling history for a specific key
   * @param key Unique identifier for the request type
   */
  clearThrottle(key: string): void {
    delete this.requests[key]
  }

  /**
   * Clear all throttling history
   */
  clearAll(): void {
    this.requests = {}
  }
}

// Export a singleton instance
export const apiThrottle = new ApiThrottle()
export default apiThrottle

