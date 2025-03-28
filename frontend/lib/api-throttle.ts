// Simple utility to prevent too many requests to the same endpoint
class ApiThrottle {
  private throttleMap = new Map<string, number>()
  private throttleTime = 2000 // 2 seconds

  shouldThrottle(key: string): boolean {
    const now = Date.now()
    const lastCall = this.throttleMap.get(key) || 0

    if (now - lastCall < this.throttleTime) {
      return true
    }

    this.throttleMap.set(key, now)
    return false
  }

  clearThrottle(key: string): void {
    this.throttleMap.delete(key)
  }
}

export const apiThrottle = new ApiThrottle()