/**
 * Centralized API Client Configuration
 *
 * This file provides a single source of truth for API configuration
 * and includes utilities for checking backend availability.
 */

export const API_CONFIG = {
  // Base URLs
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:5000",

  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 seconds
  HEALTH_CHECK_TIMEOUT: 5000, // 5 seconds

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second

  // Cache configuration
  CACHE_TTL: 60000, // 1 minute

  // Health check endpoints to try in order
  HEALTH_ENDPOINTS: ["/api/health", "/api/health-check", "/health", "/api/status"],

  // Feature flags
  ENABLE_WEBSOCKET: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== "false",
  ENABLE_OFFLINE_MODE: true,
  ENABLE_REQUEST_DEDUPLICATION: true,
} as const

/**
 * Check if backend server is available
 */
export async function checkBackendHealth(): Promise<{
  available: boolean
  endpoint?: string
  error?: string
}> {
  const { BASE_URL, HEALTH_ENDPOINTS, HEALTH_CHECK_TIMEOUT } = API_CONFIG

  for (const endpoint of HEALTH_ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "GET",
        signal: controller.signal,
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`[v0] ✅ Backend available at ${BASE_URL}${endpoint}`)
        return {
          available: true,
          endpoint: `${BASE_URL}${endpoint}`,
        }
      }
    } catch (error: any) {
      console.log(`[v0] Health check failed for ${endpoint}:`, error.message)
      continue
    }
  }

  return {
    available: false,
    error: `Backend server at ${BASE_URL} is not responding. Please ensure the backend is running.`,
  }
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(error: any): string {
  if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
    return `Cannot connect to backend server at ${API_CONFIG.BASE_URL}. Please ensure the backend is running on port 5000.`
  }

  if (error.message?.includes("CORS")) {
    return "CORS policy error. Please check backend CORS configuration."
  }

  if (error.response?.status === 404) {
    return "API endpoint not found. The backend may be missing this route."
  }

  if (error.response?.status === 500) {
    return "Backend server error. Please check backend logs."
  }

  if (error.response?.status === 401) {
    return "Authentication required. Please log in."
  }

  return error.message || "An unexpected error occurred."
}

/**
 * Log API configuration on startup
 */
export function logApiConfig() {
  console.log("[v0] API Configuration:")
  console.log(`  Base URL: ${API_CONFIG.BASE_URL}`)
  console.log(`  WebSocket URL: ${API_CONFIG.WEBSOCKET_URL}`)
  console.log(`  Request Timeout: ${API_CONFIG.REQUEST_TIMEOUT}ms`)
  console.log(`  WebSocket Enabled: ${API_CONFIG.ENABLE_WEBSOCKET}`)
  console.log(`  Offline Mode: ${API_CONFIG.ENABLE_OFFLINE_MODE}`)
}
