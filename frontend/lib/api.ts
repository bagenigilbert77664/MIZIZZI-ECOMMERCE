import axios, { type InternalAxiosRequestConfig } from "axios"

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

const refreshAuthToken = async () => {
  if (typeof window === "undefined") return null

  // Check if we're in an admin route
  if (isAdminRoute()) {
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
    } catch (error) {
      console.error("Admin token refresh error:", error)
      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_token_expiry")
      localStorage.removeItem("admin_refresh_token")
    }
  } else {
    // Regular user token refresh
    const refreshToken = localStorage.getItem("mizizzi_refresh_token")
    if (!refreshToken) return null

    try {
      // Create a custom instance for the refresh request to avoid interceptors
      const refreshInstance = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })

      const csrfToken = localStorage.getItem("mizizzi_csrf_token")

      const response = await refreshInstance.post(
        "/api/auth/refresh",
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            "X-CSRF-TOKEN": csrfToken || "",
          },
        },
      )

      if (response.data && response.data.access_token) {
        localStorage.setItem("mizizzi_token", response.data.access_token)
        if (response.data.csrf_token) {
          localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
        }
        return response.data.access_token
      }
    } catch (error) {
      console.error("User token refresh error:", error)
      // Don't clear tokens here, let the auth context handle it
    }
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
    // Improved error logging
    if (error.response) {
      console.error(
        `API error ${error.response.status} from ${error.config?.url || "unknown URL"}:`,
        error.response.data || "No error data",
      )
    } else if (error.request) {
      console.error(
        `API request error (no response) for ${error.config?.url || "unknown URL"}:`,
        error.message || "Unknown error",
      )
    } else {
      console.error("API error:", error.message || error)
    }

    // Rest of the error handling code remains the same...
    // Handle request timeout
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error)
      return Promise.reject(new Error("Request timed out. Please try again."))
    }

    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error)
      return Promise.reject(new Error("Network error. Please check your connection."))
    }

    // Handle authentication errors
    if (error.response.status === 401) {
      console.error("Authentication error:", error.response.data)

      // Dispatch an auth error event for the auth context to handle
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("auth-error", {
            detail: {
              status: 401,
              message: error.response.data?.error || "Authentication failed",
              originalRequest: error.config,
            },
          }),
        )

        // Listen for token refresh events
        const tokenRefreshed = new Promise((resolve, reject) => {
          const handleTokenRefreshed = (event: CustomEvent) => {
            document.removeEventListener("token-refreshed", handleTokenRefreshed as EventListener)
            resolve(event.detail.token)
          }

          // Set a timeout to reject if token refresh takes too long
          const timeoutId = setTimeout(() => {
            document.removeEventListener("token-refreshed", handleTokenRefreshed as EventListener)
            reject(new Error("Token refresh timeout"))
          }, 5000)

          document.addEventListener("token-refreshed", handleTokenRefreshed as EventListener)
        })

        try {
          // Wait for token to be refreshed
          const newToken = await tokenRefreshed

          // Retry the original request with the new token
          error.config.headers.Authorization = `Bearer ${newToken}`
          return api(error.config)
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError)
          // Continue with rejection
        }
      }
    }

    if (error.response) {
      console.error("Error response data:", error.response.data)
      console.error("Error response status:", error.response.status)
    } else if (error.request) {
      console.error("No response received:", error.request)
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
export const addCorsHeaders = (config: CustomAxiosRequestConfig) => {
  // Don't manually set CORS headers - these should be handled by the server
  // The browser will automatically add the necessary CORS headers to the request
  // Setting them manually causes the "Refused to set unsafe header" errors
  return config
}

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

// Add a function to help with CORS preflight requests
// Update the handlePreflightRequest function to use the Fetch API without setting unsafe headers
export const handlePreflightRequest = async (url: string): Promise<boolean> => {
  try {
    // Send a simple OPTIONS request to the endpoint without manually setting CORS headers
    const response = await fetch(url, {
      method: "OPTIONS",
      mode: "cors",
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
api.get = async (url: string, config?: any) => {
  // For problematic endpoints, try a preflight request first
  if (url.includes("/api/cart") || url.includes("/api/addresses")) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const fullUrl = `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`

      // Try a preflight request first
      await handlePreflightRequest(fullUrl)

      // Add safe headers to the request
      const updatedConfig = {
        ...config,
        headers: {
          ...(config?.headers || {}),
          "X-Requested-With": "XMLHttpRequest",
          // Remove the unsafe CORS headers
        },
      }

      return originalGet(url, updatedConfig)
    } catch (error) {
      console.error(`CORS preflight failed for ${url}:`, error)
      // Continue with the original request as a fallback
    }
  }

  // Original get request logic
  return originalGet(url, config)
}

export default api
