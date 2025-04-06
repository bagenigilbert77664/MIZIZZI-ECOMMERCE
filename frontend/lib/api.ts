import axios, { type InternalAxiosRequestConfig } from "axios"
// Import the throttling utility
import { apiThrottle } from "./api-throttle"

// Add this at the top of the file if it doesn't exist
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Create a request queue to store requests that failed due to token expiration
const isRefreshing = false
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
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

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
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if on client side
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
        // Only redirect if not already on login page
        if (!window.location.pathname.includes("/admin/login")) {
          window.location.href = "/admin/login"
        }
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

