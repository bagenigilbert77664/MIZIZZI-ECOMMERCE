import axios, { type AxiosRequestConfig } from "axios"
import { authService } from "@/services/auth"
import { sanitizeForLogging } from "./logger" // Update the path to the correct relative path

// Add this near the top of the file, after imports
let isRefreshing = false
let failedQueue: { resolve: (token: string | null) => void; reject: (error: any) => void }[] = []

const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Important for cookies
  timeout: 10000, // 10 second timeout
})

// Add a function to help with API URL construction
export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime()
    config.params = {
      ...config.params,
      _t: timestamp,
    }

    // Add authorization header with JWT token
    const token = authService.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add CSRF token if available
    const csrfToken = authService.getCsrfToken()
    if (csrfToken) {
      config.headers["X-CSRF-TOKEN"] = csrfToken
    }

    // Log outgoing requests in development
    if (process.env.NODE_ENV === "development") {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data ? sanitizeForLogging(config.data) : undefined,
        params: config.params,
        headers: {
          ...config.headers,
          Authorization: config.headers.Authorization ? "Bearer ***" : undefined,
        },
      })
    }

    return config
  },
  (error) => {
    console.error("API Request Error:", error)
    return Promise.reject(error)
  },
)

// Add this to your axios interceptor setup
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data ? sanitizeForLogging(response.data) : undefined,
      })
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // If the error is not 401 or the request already tried to refresh, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // If the request is for the refresh token endpoint and it failed, clear auth
    if (originalRequest.url && originalRequest.url.includes("/api/auth/refresh")) {
      authService["clearAuthData"]() // Access private method using bracket notation
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers["Authorization"] = "Bearer " + token
          } else {
            originalRequest.headers = { Authorization: "Bearer " + token }
          }
          return api(originalRequest)
        })
        .catch((err) => {
          return Promise.reject(err)
        })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const token = await authService.refreshAccessToken()
      processQueue(null, token as string | null) // Explicitly cast token to the correct type
      if (originalRequest.headers) {
        originalRequest.headers["Authorization"] = "Bearer " + token
      } else {
        originalRequest.headers = { Authorization: "Bearer " + token }
      }
      isRefreshing = false
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      isRefreshing = false
      authService.clearAuthData()
      return Promise.reject(refreshError)
    }
  },
)

export default api
