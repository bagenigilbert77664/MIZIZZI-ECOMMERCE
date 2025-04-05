import axios, { type InternalAxiosRequestConfig } from "axios"
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

// Token management functions
const getToken = () => {
  if (typeof window === "undefined") return null

  const token = localStorage.getItem("admin_token")
  const expiryStr = localStorage.getItem("admin_token_expiry")

  if (!token || !expiryStr) return null

  const expiry = new Date(expiryStr)

  // If token is expired, return null
  if (expiry < new Date()) {
    return null
  }

  return token
}

const refreshAuthToken = async () => {
  if (typeof window === "undefined") return null

  const refreshToken = localStorage.getItem("admin_refresh_token")

  if (!refreshToken) return null

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })

    if (response.data && response.data.token) {
      const expiry = new Date()
      expiry.setSeconds(expiry.getSeconds() + (response.data.expiresIn || 3600))

      localStorage.setItem("admin_token", response.data.token)
      localStorage.setItem("admin_token_expiry", expiry.toISOString())

      if (response.data.refreshToken) {
        localStorage.setItem("admin_refresh_token", response.data.refreshToken)
      }

      return response.data.token
    }

    return null
  } catch (error) {
    console.error("Token refresh error:", error)
    // Clear tokens on refresh failure
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_token_expiry")
    localStorage.removeItem("admin_refresh_token")
    return null
  }
}

// Find the axios instance creation and update it to:
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
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
  _retry?: boolean // Add property to track retry attempts
}

// Helper function to add CORS headers for admin endpoints
export const addCorsHeaders = (config: CustomAxiosRequestConfig) => {
  // Add CORS headers for problematic endpoints
  if (config.url?.includes("/admin/") || config.url?.includes("/api/admin/")) {
    config.headers["Access-Control-Request-Method"] = config.method?.toUpperCase() || "GET"
    config.headers["Access-Control-Request-Headers"] = "Content-Type, Authorization"
  }
  return config
}

// Add request interceptor to handle authentication
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    const token = getToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig

    // Handle 401 Unauthorized errors with token refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        } catch (err) {
          // If the queued request fails, redirect to login
          if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
            window.location.href = "/admin/login"
          }
          return Promise.reject(err)
        }
      }

      // Mark as retrying to prevent infinite loops
      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh the token
        const newToken = await refreshAuthToken()

        if (newToken) {
          // Update the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          // Process any queued requests with the new token
          processQueue(null, newToken)

          // Retry the original request
          return api(originalRequest)
        } else {
          // If refresh fails, process queue with error and redirect
          processQueue(new Error("Token refresh failed"), null)

          if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
            // Use a session flag to prevent redirect loops
            const redirectFlag = sessionStorage.getItem("auth_redirecting")

            if (!redirectFlag) {
              sessionStorage.setItem("auth_redirecting", "true")
              window.location.href = "/admin/login"

              // Clear the flag after a short delay
              setTimeout(() => {
                sessionStorage.removeItem("auth_redirecting")
              }, 3000)
            }
          }
        }
      } catch (refreshError) {
        // Process queue with error
        processQueue(refreshError, null)

        // Clear tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("admin_token")
          localStorage.removeItem("admin_token_expiry")
          localStorage.removeItem("admin_refresh_token")

          if (!window.location.pathname.includes("/admin/login")) {
            const redirectFlag = sessionStorage.getItem("auth_redirecting")

            if (!redirectFlag) {
              sessionStorage.setItem("auth_redirecting", "true")
              window.location.href = "/admin/login"

              setTimeout(() => {
                sessionStorage.removeItem("auth_redirecting")
              }, 3000)
            }
          }
        }
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
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

