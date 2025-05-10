import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from "axios"

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
  // Check if we're in a browser environment
  if (typeof window === "undefined") return null

  try {
    // First check for regular user token
    const userToken = localStorage.getItem("mizizzi_token")
    if (userToken) return userToken

    // Then check for admin token
    const adminToken = localStorage.getItem("admin_token")
    const expiryStr = localStorage.getItem("admin_token_expiry")

    if (!adminToken || !expiryStr) return null

    const expiry = new Date(expiryStr)

    // If token is expired, return null
    if (expiry < new Date()) {
      return null
    }

    return adminToken
  } catch (error) {
    // Handle any localStorage errors
    console.error("Error accessing localStorage:", error)
    return null
  }
}

// Determine if the current user is an admin based on the token source
const isAdminUser = () => {
  if (typeof window === "undefined") return false

  try {
    // Check if admin token exists
    const adminToken = localStorage.getItem("admin_token")
    if (adminToken) return true

    // Check if user token exists and user has admin role
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        return user.role === "admin"
      } catch (e) {
        console.error("Failed to parse user from localStorage", e)
      }
    }

    return false
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

// Determine if the current route is an admin route
const isAdminRoute = () => {
  if (typeof window === "undefined") return false
  return window.location.pathname.startsWith("/admin")
}

// Update the API configuration to properly handle authentication

// Update the refreshAuthToken function to match the backend implementation
const refreshAuthToken = async () => {
  if (typeof window === "undefined") return null

  // Check if we have a refresh token
  const refreshToken = localStorage.getItem("mizizzi_refresh_token")
  if (!refreshToken) return null

  try {
    // Create a custom instance for the refresh request to avoid interceptors
    const refreshInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
        // Removed X-CSRF-TOKEN header to avoid CORS issues
      },
      withCredentials: true,
    })

    const response = await refreshInstance.post("/api/refresh", {})

    if (response.data && response.data.access_token) {
      localStorage.setItem("mizizzi_token", response.data.access_token)
      if (response.data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
      }
      return response.data.access_token
    }
  } catch (error) {
    console.error("Token refresh error:", error)
    // Don't clear tokens here, let the auth context handle it
  }

  return null
}

// Find the axios instance creation and update it to:
const api = axios.create({
  baseURL: API_BASE_URL, // Use the API_BASE_URL constant instead of process.env directly
  timeout: 15000, // 15 second timeout
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// Add request timeout
api.defaults.timeout = 30000 // 30 seconds timeout

// Add request interceptor for logging
// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Safely get token from localStorage if available
    let token = null

    if (typeof window !== "undefined") {
      try {
        token = getToken()
      } catch (error) {
        console.error("Error accessing localStorage in request interceptor:", error)
      }
    }

    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add CORS headers for all requests
    config.headers["X-Requested-With"] = "XMLHttpRequest"

    // For POST requests, ensure content type is set
    if (config.method === "post") {
      config.headers["Content-Type"] = "application/json"
    }

    // Remove this line to avoid CSRF token CORS issues
    // config.headers["X-CSRF-TOKEN"] = localStorage.getItem("mizizzi_csrf_token") || "";

    // Replace this logging line completely
    const method = config.method?.toUpperCase() || "GET"
    const url = config.url || ""
    let logMessage = `API ${method} request to ${url}`

    // Only add params/data to log if they exist
    if (config.params && Object.keys(config.params).length > 0) {
      try {
        logMessage += ` with params: ${JSON.stringify(config.params)}`
      } catch (e) {
        logMessage += " with params: [Object]"
      }
    }

    if (config.data) {
      try {
        // Don't log sensitive data like passwords
        const safeData = { ...config.data }
        if (safeData.password) safeData.password = "***"
        logMessage += ` with data: ${JSON.stringify(safeData)}`
      } catch (e) {
        logMessage += " with data: [Object]"
      }
    }

    console.log(logMessage)
    return config
  },
  (error) => {
    console.error("API request error:", error)
    return Promise.reject(error)
  },
)

// Add response interceptor for logging
// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    const url = response.config.url || ""
    console.log(`API response from ${url}: ${response.status}`)

    // Fix for ProductImage position/sort_order issue
    if (
      response.data &&
      response.config.url?.includes("/api/admin/products/") &&
      !response.config.url?.includes("/list")
    ) {
      if (response.data.images) {
        response.data.images = response.data.images.map((img: any) => {
          if (img.sort_order !== undefined && img.position === undefined) {
            img.position = img.sort_order
          }
          return img
        })
      }
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig

    // Handle 401 Unauthorized errors with token refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Determine if we're in an admin route or a regular route
      const adminRoute = isAdminRoute()

      // For admin routes, handle admin authentication
      if (adminRoute) {
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
            // If the queued request fails, redirect to admin login
            if (typeof window !== "undefined") {
              window.location.href = "/admin/login?reason=session_expired"
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

            if (typeof window !== "undefined") {
              // Use a session flag to prevent redirect loops
              const redirectFlag = sessionStorage.getItem("auth_redirecting")

              if (!redirectFlag) {
                sessionStorage.setItem("auth_redirecting", "true")
                window.location.href = "/admin/login?reason=token_refresh_failed"

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

            const redirectFlag = sessionStorage.getItem("auth_redirecting")

            if (!redirectFlag) {
              sessionStorage.setItem("auth_redirecting", "true")
              window.location.href = "/admin/login?reason=refresh_error"

              setTimeout(() => {
                sessionStorage.removeItem("auth_redirecting")
              }, 3000)
            }
          }
        } finally {
          isRefreshing = false
        }
      } else {
        // For regular user routes, dispatch an auth error event
        // This will be handled by the auth context to refresh the token or redirect to user login
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("auth-error", {
              detail: {
                status: 401,
                message: "Authentication failed",
                originalRequest,
              },
            }),
          )
        }
      }
    }

    return Promise.reject(error)
  },
)

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
// Remove the addCorsHeaders function entirely as it's causing issues

// Add a function to ensure CORS headers are properly set for all requests
// Add this after the addCorsHeaders function:
api.interceptors.request.use((config) => {
  // Set content type if not already set
  if (!config.headers["Content-Type"] && (config.method === "post" || config.method === "put")) {
    config.headers["Content-Type"] = "application/json"
  }

  // Add authorization if available
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig

    // Handle 401 Unauthorized errors with token refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Determine if we're in an admin route or a regular route
      const adminRoute = isAdminRoute()

      // For admin routes, handle admin authentication
      if (adminRoute) {
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
            // If the queued request fails, redirect to admin login
            if (typeof window !== "undefined") {
              window.location.href = "/admin/login?reason=session_expired"
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

            if (typeof window !== "undefined") {
              // Use a session flag to prevent redirect loops
              const redirectFlag = sessionStorage.getItem("auth_redirecting")

              if (!redirectFlag) {
                sessionStorage.setItem("auth_redirecting", "true")
                window.location.href = "/admin/login?reason=token_refresh_failed"

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

            const redirectFlag = sessionStorage.getItem("auth_redirecting")

            if (!redirectFlag) {
              sessionStorage.setItem("auth_redirecting", "true")
              window.location.href = "/admin/login?reason=refresh_error"

              setTimeout(() => {
                sessionStorage.removeItem("auth_redirecting")
              }, 3000)
            }
          }
        } finally {
          isRefreshing = false
        }
      } else {
        // For regular user routes, dispatch an auth error event
        // This will be handled by the auth context to refresh the token or redirect to user login
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("auth-error", {
              detail: {
                status: 401,
                message: "Authentication failed",
                originalRequest,
              },
            }),
          )
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
    headers: { ...((config as any).headers || {}) },
  })
}

// Add a function to invalidate cache for specific endpoints
export const prefetchData = async (url: string, params = {}): Promise<boolean> => {
  try {
    await api.get(url, {
      params,
      headers: {},
    })
    return true
  } catch (error) {
    console.error(`Failed to prefetch ${url}:`, error)
    return false
  }
}

// Find the get method in your api object and modify it to include throttling
// This is a general approach - you'll need to adapt it to your actual api implementation
const originalGet = api.get

// Add a function to help with CORS preflight requests
// Update the handlePreflightRequest function to use the Fetch API without setting unsafe headers
// Replace the handlePreflightRequest function with this simpler version:
export const handlePreflightRequest = async (url: string): Promise<boolean> => {
  try {
    // Use fetch with minimal headers for preflight
    const response = await fetch(url, {
      method: "OPTIONS",
      credentials: "include",
    })
    return response.ok
  } catch (error) {
    console.error("Preflight request failed:", error)
    return false
  }
}

// Add this to the api.get method to handle CORS issues
// Update the api.get method to avoid setting unsafe headers
// Update the api.get method to be simpler and avoid setting problematic headers
api.get = async <T = any, R = AxiosResponse<T>>(url: string, config?: any): Promise<R> => {
  // For cart validation endpoint, handle special case
  if (url.includes("/api/cart/validate")) {
    const token = localStorage.getItem("mizizzi_token")
    if (!token) {
      console.log("No auth token for cart validation, returning default response")
      return {
        data: {
          is_valid: true,
          errors: [],
          warnings: [],
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: config || {},
      } as unknown as R
    }
  }

  // Use the original get method with minimal configuration
  return originalGet(url, {
    ...config,
    withCredentials: true, // Always include credentials
  })
}

// After the api.get override, add this new override for DELETE requests
// Add this right before "export default api"

// Override the delete method to properly handle CORS
const originalDelete = api.delete
api.delete = async <T = any, R = AxiosResponse<T>>(url: string, config?: any): Promise<R> => {
  // Ensure withCredentials is set
  const updatedConfig = {
    ...config,
    withCredentials: true,
  }

  console.log(`Making DELETE request to ${url}`)

  try {
    // If the URL is a wishlist endpoint, handle it specially
    if (url.includes("/api/wishlist")) {
      // First, try to make a preflight request
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const fullUrl = `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`

      try {
        // Simple preflight
        await fetch(fullUrl, {
          method: "OPTIONS",
          credentials: "include",
        })
      } catch (error) {
        console.warn("Preflight request for wishlist failed, continuing anyway:", error)
      }
    }

    return originalDelete(url, updatedConfig)
  } catch (error) {
    console.error(`DELETE request to ${url} failed:`, error)
    throw error
  }
}

// Make sure the API module is properly exported
// If there's an issue with importing the API in the order service, add this at the top of the file:

export default api
