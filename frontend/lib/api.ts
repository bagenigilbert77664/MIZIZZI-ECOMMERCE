import axios from "axios"
import { authService } from "@/services/auth"

// Track if we're currently refreshing the token to prevent multiple refresh attempts
let isRefreshingToken = false
const refreshPromise: Promise<string> | null = null

// Queue of requests to retry after token refresh
const failedRequestsQueue: Array<{
  onSuccess: (token: string) => void
  onFailure: (err: any) => void
}> = []

// Process all queued requests with the new token
const processQueue = (error: any, token: string | null = null) => {
  failedRequestsQueue.forEach((request) => {
    if (error) {
      request.onFailure(error)
    } else if (token) {
      request.onSuccess(token)
    }
  })

  // Clear the queue
  failedRequestsQueue.length = 0
}

// Create a base API instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies if used
  timeout: 10000, // 10 second timeout
})

// Add a function to help with API URL construction
export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from auth service or localStorage
    const token = localStorage.getItem("token") || authService.getAccessToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
  async (error: any) => {
    const originalRequest = error.config

    // If the error is a 401 Unauthorized and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // If we're already refreshing the token, wait for that to complete
        if (isRefreshingToken) {
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`
                resolve(api(originalRequest))
              },
              onFailure: (err) => {
                reject(err)
              },
            })
          })
        }

        // Start refreshing the token
        isRefreshingToken = true

        // Try to refresh the token
        const newToken = await authService.refreshAccessToken()

        // Update the authorization header with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        // Process any queued requests
        processQueue(null, newToken)

        // Reset the refreshing flag
        isRefreshingToken = false

        // Retry the original request with the new token
        return api(originalRequest)
      } catch (refreshError) {
        // Process any queued requests with the error
        processQueue(refreshError)

        // Reset the refreshing flag
        isRefreshingToken = false

        // If refresh fails, redirect to login
        if (typeof window !== "undefined") {
          // Clear token
          localStorage.removeItem("token")

          // Redirect to login page if not already there
          if (!window.location.pathname.includes("/auth/login")) {
            window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
          }
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api

