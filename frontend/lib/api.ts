import axios, { type InternalAxiosRequestConfig } from "axios"
import { authService } from "@/services/auth"
// Import the throttling utility
import { apiThrottle } from "./api-throttle"

// Add this at the top of the file if it doesn't exist
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Create a request queue to store requests that failed due to token expiration
let isRefreshing = false
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void }[] = []

// Process the failed queue
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

// Create a map to store request cancellation controllers
const cancelControllers = new Map<string, AbortController>()

// Helper function to get an abort controller for a specific endpoint
const getAbortController = (endpoint: string) => {
  // Cancel previous request to the same endpoint if it exists
  if (cancelControllers.has(endpoint)) {
    cancelControllers.get(endpoint)?.abort("Request superseded by newer request")
    cancelControllers.delete(endpoint)
  }

  // Create a new abort controller
  const controller = new AbortController()
  cancelControllers.set(endpoint, controller)
  return controller.signal
}

// Find the axios instance creation and update it to:
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Important for cookies/auth
})

// Add a function to help with API URL construction
export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

// If there's a function that constructs API paths, update it to:
export const getApiPath = (path: string) => {
  // Ensure path starts with /api/
  if (!path.startsWith("/api/")) {
    return `/api${path.startsWith("/") ? path : `/${path}`}`
  }
  return path
}

// Add a map to track in-flight requests
const pendingRequests = new Map<string, Promise<any>>()

// Helper function to generate a cache key for a request
const getRequestKey = (config: any) => {
  const url = config.url || ""
  const method = config.method || "get"
  const params = config.params ? JSON.stringify(config.params) : ""
  const data = config.data ? JSON.stringify(config.data) : ""
  return `${method}:${url}${params ? `?${params}` : ""}${data ? `:${data}` : ""}`
}

// Extend Axios request configuration to include skipDeduplication
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  skipDeduplication?: boolean // Add the missing property
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    // Get token from auth service
    const token = authService.getAccessToken()
    const csrfToken = authService.getCsrfToken()

    // Add Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add CSRF token if it exists
    if (csrfToken) {
      config.headers["X-CSRF-TOKEN"] = csrfToken
    }

    // Only deduplicate GET requests
    if (config.method?.toLowerCase() === "get" && !config.skipDeduplication) {
      const requestKey = getRequestKey(config)

      // If there's already an identical request in flight, wait for it
      if (pendingRequests.has(requestKey)) {
        try {
          return await pendingRequests.get(requestKey)
        } catch (error) {
          // If the pending request fails, we'll try again
          pendingRequests.delete(requestKey)
        }
      }
    }

    // Log request in development
    if (process.env.NODE_ENV === "development") {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
      if (config.data) {
        console.log("Request data:", config.data)
      }
    }

    // Add CORS headers for problematic endpoints
    if (
      config.url?.includes("/api/orders/stats") ||
      config.url?.includes("/api/orders/returned") ||
      config.url?.includes("/api/orders/canceled")
    ) {
      config.headers["Access-Control-Request-Method"] = config.method?.toUpperCase() || "GET"
      config.headers["Access-Control-Request-Headers"] = "Content-Type, Authorization"
    }

    return config
  },
  (error) => {
    console.error("API Request Error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === "development" && response.config.url !== "/api/auth/me") {
      console.log(`API Response (${response.status}):`, response.data)
    }

    // Remove the cancel token for this endpoint
    if (response.config.url) {
      cancelControllers.delete(response.config.url)

      // Remove from pending requests if it was a GET
      if (response.config.method?.toLowerCase() === "get") {
        const requestKey = getRequestKey(response.config)
        pendingRequests.delete(requestKey)
      }
    }

    return response
  },
  async (error) => {
    // Don't log canceled requests as errors
    if (axios.isCancel(error)) {
      console.log("Request canceled:", error.message)
      return Promise.reject(error)
    }

    // Handle CORS errors specifically
    if (
      error.message &&
      (error.message.includes("Network Error") ||
        error.message.includes("CORS") ||
        (error.response && error.response.status === 0))
    ) {
      console.warn("CORS or Network Error detected:", error.message)

      // For order endpoints that fail with CORS, we'll handle them in the service layer
      if (
        error.config &&
        (error.config.url?.includes("/api/orders/returned") ||
          error.config.url?.includes("/api/orders/canceled") ||
          error.config.url?.includes("/api/orders/stats"))
      ) {
        // Return empty array or default object for these endpoints to allow fallback in service layer
        if (error.config.url?.includes("/api/orders/stats")) {
          return Promise.resolve({
            data: {
              total: 0,
              pending: 0,
              processing: 0,
              shipped: 0,
              delivered: 0,
              cancelled: 0,
              returned: 0,
            },
          })
        }
        return Promise.resolve({ data: [] })
      }
    }

    // Log detailed error information
    if (error.response) {
      console.error(`API Error (${error.response.status}):`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config.url,
        method: error.config.method,
        requestData: error.config.data,
      })
    } else if (error.request) {
      console.error("API Error: No response received", {
        url: error.config?.url,
        timeout: error.config?.timeout,
        method: error.config?.method,
      })
    } else {
      console.error("API Error:", error.message)
    }

    // Handle 401 Unauthorized errors (token expired, etc.)
    if (error.response && error.response.status === 401) {
      // Clear auth data
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")

        // Redirect to login page if not already there
        if (window.location.pathname !== "/auth/login") {
          window.location.href = `/auth/login?redirect=${window.location.pathname}`
        }
      }
    }

    // Remove the cancel token for this endpoint
    if (error.config?.url) {
      cancelControllers.delete(error.config.url)
    }

    // If the error is not 401 or the request has already been retried, reject
    if (error.response?.status !== 401 || error.config?._retry) {
      return Promise.reject(error)
    }

    // Mark the request as retried
    if (error.config) {
      error.config._retry = true
    }

    // If the token is already being refreshed, add the request to the queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          if (token && error.config) {
            error.config.headers["Authorization"] = `Bearer ${token}`
            // Also update CSRF token if available
            const csrfToken = authService.getCsrfToken()
            if (csrfToken) {
              error.config.headers["X-CSRF-TOKEN"] = csrfToken
            }
          }
          return error.config ? api(error.config) : Promise.reject(error)
        })
        .catch((err) => {
          return Promise.reject(err)
        })
    }

    isRefreshing = true

    try {
      // Attempt to refresh the token
      console.log("Token expired, attempting to refresh...")
      const newToken = await authService.refreshAccessToken()

      // Update the Authorization header with the new token
      if (error.config) {
        error.config.headers["Authorization"] = `Bearer ${newToken}`

        // Also update CSRF token if available
        const csrfToken = authService.getCsrfToken()
        if (csrfToken) {
          error.config.headers["X-CSRF-TOKEN"] = csrfToken
        }
      }

      // Process the queue with the new token
      processQueue(null, newToken)
      console.log("Token refresh successful, retrying original request")

      return error.config ? api(error.config) : Promise.reject(error)
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError)

      // Process the queue with the error
      processQueue(refreshError, null)

      // Clear auth data but don't redirect immediately
      // This allows the application to handle the error gracefully
      authService.clearAuthData()

      // Dispatch an auth error event that components can listen for
      if (typeof window !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("auth-error", {
            detail: { status: 401, message: "Authentication failed" },
          }),
        )
      }

      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }

    // Also clean up the pending requests map
    if (error.config?.method?.toLowerCase() === "get") {
      const requestKey = getRequestKey(error.config)
      pendingRequests.delete(requestKey)
    }
  },
)

// Export a function to make a request with an abort signal
export const apiWithCancel = (endpoint: string, config = {}) => {
  return api({
    ...config,
    url: endpoint,
    signal: getAbortController(endpoint),
  })
}

// Add a function to invalidate cache for specific endpoints
export const prefetchData = async (url: string, params = {}): Promise<boolean> => {
  try {
    await api.get(url, { params })
    return true
  } catch (error) {
    console.error(`Failed to prefetch ${url}:`, error)
    return false
  }
}

// Find the get method in your api object and modify it to include throttling
// This is a general approach - you'll need to adapt it to your actual api implementation
const originalGet = api.get

api.get = async (url: string, config?: any) => {
  // Add throttling for specific endpoints that are causing issues
  if (url.includes("/api/addresses") || url.includes("/api/cart")) {
    const throttleKey = url.split("?")[0] // Use base URL as the throttle key

    if (apiThrottle.shouldThrottle(throttleKey)) {
      // Return cached data or a promise that resolves after a delay
      return new Promise((resolve) => {
        setTimeout(() => {
          // Try to get from cache or make a real request
          resolve(originalGet(url, config))
        }, 2000)
      })
    }
  }

  // Original get request logic
  return originalGet(url, config)
}

export default api

