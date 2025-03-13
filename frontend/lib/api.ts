import axios, { type AxiosRequestConfig } from "axios"
import { authService } from "@/services/auth"

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
  // Add /api prefix if the path doesn't already have it and it's not an auth route
  if (!path.startsWith("/api/") && !path.startsWith("/auth/")) {
    return `${baseUrl}/api${path.startsWith("/") ? path : `/${path}`}`
  }
  return `${baseUrl}${path}`
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
        data: config.data,
        params: config.params,
        headers: config.headers,
      })
    }

    return config
  },
  (error) => {
    console.error("API Request Error:", error)
    return Promise.reject(error)
  },
)

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      })
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Log error responses in development
    if (process.env.NODE_ENV === "development") {
      console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    }

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token
        const newToken = await authService.refreshToken()

        // Update the Authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        } else {
          originalRequest.headers = { Authorization: `Bearer ${newToken}` }
        }

        console.log("Token refreshed successfully, retrying original request")

        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // If refresh fails, log out the user
        console.error("Token refresh failed:", refreshError)
        authService.logout()

        // Only redirect if we're in a browser environment
        if (typeof window !== "undefined") {
          // Use a small delay to allow the current operation to complete
          setTimeout(() => {
            window.location.href = "/auth/login?session=expired"
          }, 100)
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api

