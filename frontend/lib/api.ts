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

// Update the getToken function to use the correct token
const getToken = () => {
  // Check if we're in a browser environment
  if (typeof window === "undefined") return null

  try {
    // First check if we're in an admin route
    if (isAdminRoute()) {
      const adminToken = localStorage.getItem("admin_token")
      if (adminToken) return adminToken
    }

    // Get the token from localStorage
    const token = localStorage.getItem("mizizzi_token")
    if (token) {
      return token
    }

    return null
  } catch (error) {
    // Handle any localStorage errors
    console.error("Error accessing localStorage:", error)
    return null
  }
}

// Update isAdminUser function to check for admin role more thoroughly
const isAdminUser = () => {
  if (typeof window === "undefined") return false

  try {
    // First check if admin token exists (fastest check)
    const adminToken = localStorage.getItem("admin_token")
    if (adminToken) {
      return true
    }

    // If no admin token, check user role
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        // Handle different role formats
        if (typeof user.role === "string") {
          return user.role.toLowerCase() === "admin"
        } else if (user.role && typeof user.role === "object" && "value" in user.role) {
          return user.role.value.toLowerCase() === "admin"
        }
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

// Update the refreshAuthToken function to match backend format
const refreshAuthToken = async () => {
  if (typeof window === "undefined") return null

  // Get the refresh token
  const refreshToken = localStorage.getItem("mizizzi_refresh_token")
  if (!refreshToken) {
    console.log("No refresh token available for refreshAuthToken")
    return null
  }

  try {
    console.log("Attempting to refresh token with refresh token:", refreshToken.substring(0, 5) + "...")

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

    // Make direct fetch request to refresh token
    const response = await fetch(`${apiUrl}/api/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      credentials: "include",
    })

    if (!response.ok) {
      console.error(`Token refresh failed with status: ${response.status}`)
      return null
    }

    const data = await response.json()
    console.log("Refresh token response received")

    if (data.access_token) {
      console.log("New access token received, storing in localStorage")
      localStorage.setItem("mizizzi_token", data.access_token)

      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
      }

      return data.access_token
    } else {
      console.error("No access token in refresh response")
    }
  } catch (error) {
    console.error("Token refresh error:", error)

    // Check if this is a network error
    if (error instanceof Error && error.message.includes("Network Error")) {
      console.error("Network error during token refresh. Check API connectivity.")
    }

    // Check if this is an expired refresh token
    if (error instanceof Error && error.message.includes("401")) {
      console.error("Refresh token is expired or invalid. User needs to log in again.")
      // Clear tokens to force a new login
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
    }
  }

  return null
}

// Create the axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// Add request timeout
api.defaults.timeout = 30000 // 30 seconds timeout

// Update the request interceptor to ensure the Authorization header is properly set
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    let token = null

    if (typeof window !== "undefined") {
      try {
        token = getToken()
      } catch (error) {
        console.error("Error accessing localStorage in request interceptor:", error)
      }
    }

    // If token exists, add to headers with proper Bearer format
    if (token) {
      // Make sure token has Bearer prefix
      if (!token.startsWith("Bearer ")) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        config.headers.Authorization = token
      }

      // Log the token format for debugging (only first few characters)
      if (token.length > 10) {
        console.log(`Adding Authorization header: Bearer ${token.substring(0, 10)}...`)
      } else {
        console.log(`Adding Authorization header: Bearer [token]`)
      }
    } else {
      console.warn(`No token available for request to ${config.url}`)
    }

    // Add CORS headers for all requests
    config.headers["X-Requested-With"] = "XMLHttpRequest"

    // For POST requests, ensure content type is set
    if (config.method === "post") {
      config.headers["Content-Type"] = "application/json"
    }

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
  // Ensure we don't have double slashes in the URL
  if (path.startsWith("/") && baseUrl.endsWith("/")) {
    return `${baseUrl}${path.substring(1)}`
  }
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

// Add a function to ensure CORS headers are properly set for all requests
api.interceptors.request.use(
  (config) => {
    // Set content type if not already set
    if (!config.headers["Content-Type"] && (config.method === "post" || config.method === "put")) {
      config.headers["Content-Type"] = "application/json"
    }

    // Add authorization if available
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Remove any problematic headers that might trigger preflight CORS issues
    delete config.headers["X-CSRF-TOKEN"]

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
const originalGet = api.get

// Add a function to help with CORS preflight requests
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

// Add this function to handle CORS preflight requests more effectively
export const setupCorsHeaders = (headers = {}) => {
  return {
    ...headers,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "X-Requested-With": "XMLHttpRequest",
  }
}

// Modify the api.get method to handle CORS for admin endpoints specifically
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

  // Special handling for admin endpoints
  if (url.includes("/api/admin/")) {
    try {
      // For admin endpoints, try a preflight request first
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const fullUrl = `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`

      console.log(`Making preflight request to admin endpoint: ${fullUrl}`)

      // Try preflight with fetch API first
      try {
        await fetch(fullUrl, {
          method: "OPTIONS",
          headers: setupCorsHeaders(),
          credentials: "include",
        })
      } catch (preflightError) {
        console.warn("Preflight request failed, continuing with main request:", preflightError)
      }

      // Get the admin token
      const adminToken = localStorage.getItem("admin_token")

      // Use fetch API for admin endpoints to bypass Axios interceptors
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: adminToken ? `Bearer ${adminToken}` : "",
          ...setupCorsHeaders(),
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Admin API request failed with status: ${response.status}`)
      }

      const data = await response.json()

      // Return in Axios response format
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: config || {},
      } as unknown as R
    } catch (error) {
      console.error(`Error fetching admin endpoint ${url}:`, error)
      throw error
    }
  }

  // Use the original get method with minimal configuration for non-admin endpoints
  return originalGet(url, {
    ...config,
    withCredentials: true, // Always include credentials
  })
}

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
export default api
