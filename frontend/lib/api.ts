import axios from "axios"
import { authService } from "@/services/auth"

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

// Create a base API instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies if used
  timeout: 15000, // 15 second timeout
})

// Add a function to help with API URL construction
export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
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

    // Log request in development
    if (process.env.NODE_ENV === "development") {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
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
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // If the error is not 401 or the request has already been retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Mark the request as retried
    originalRequest._retry = true

    // If the token is already being refreshed, add the request to the queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          if (token) {
            originalRequest.headers["Authorization"] = `Bearer ${token}`
            // Also update CSRF token if available
            const csrfToken = authService.getCsrfToken()
            if (csrfToken) {
              originalRequest.headers["X-CSRF-TOKEN"] = csrfToken
            }
          }
          return api(originalRequest)
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
      originalRequest.headers["Authorization"] = `Bearer ${newToken}`

      // Also update CSRF token if available
      const csrfToken = authService.getCsrfToken()
      if (csrfToken) {
        originalRequest.headers["X-CSRF-TOKEN"] = csrfToken
      }

      // Process the queue with the new token
      processQueue(null, newToken)
      console.log("Token refresh successful, retrying original request")

      return api(originalRequest)
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
  },
)

export default api

