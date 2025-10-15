import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from "axios"

// Add this at the top of the file if it doesn't exist
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

// Add request deduplication for product requests to prevent excessive API calls
// Add this near the top of the file with other helper functions
const productRequestCache = new Map<string, { data: any; timestamp: number }>()
const PRODUCT_CACHE_TTL = 60000 // 1 minute cache TTL

let isRefreshing = false
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void }[] = []
let refreshAttempts = 0
const MAX_REFRESH_ATTEMPTS = 2 // Reduced from 3 to 2
let lastRefreshTime = 0
const MIN_REFRESH_INTERVAL = 30000 // Increased from 5 seconds to 30 seconds
let refreshBackoffMultiplier = 1
const MAX_BACKOFF_DELAY = 300000 // 5 minutes max backoff

const activeRefreshRequests = new Set<string>()

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

// Add request deduplication system
const pendingApiRequests = new Map<string, Promise<any>>()

// Helper function to create a unique key for requests
const createRequestKey = (url: string, params?: any, method = "GET") => {
  const paramString = params ? JSON.stringify(params) : ""
  return `${method}:${url}:${paramString}`
}

// Request deduplication wrapper
const deduplicateRequest = async (key: string, requestFn: () => Promise<any>): Promise<any> => {
  // If there's already a pending request for this key, return it
  if (pendingApiRequests.has(key)) {
    console.log(`Reusing pending request for: ${key}`)
    return pendingApiRequests.get(key)
  }

  // Create new request and store it
  const requestPromise = requestFn()
    .then((response) => {
      // Clean up after successful request
      pendingApiRequests.delete(key)
      return response
    })
    .catch((error) => {
      // Clean up and reject on error
      pendingApiRequests.delete(key)
      throw error
    })

  pendingApiRequests.set(key, requestPromise)
  return requestPromise
}

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

// Update the getToken function to use the correct token with better error handling
const getToken = () => {
  // Check if we're in a browser environment
  if (typeof window === "undefined") return null

  try {
    // For admin routes, prioritize admin token but validate it exists and is not empty
    if (isAdminRoute()) {
      const adminToken = localStorage.getItem("admin_token")
      if (adminToken && adminToken !== "null" && adminToken !== "undefined" && adminToken.trim() !== "") {
        console.log("Using admin token for admin route")
        return adminToken.trim()
      }
    }

    // Get the regular token as fallback
    const token = localStorage.getItem("mizizzi_token")
    if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
      console.log("Using regular token")
      return token.trim()
    }

    // If no valid tokens found, return null
    return null
  } catch (error) {
    // Handle any localStorage errors gracefully
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
    if (adminToken && adminToken !== "null" && adminToken !== "undefined") {
      return true
    }

    // If no admin token, check user role
    const userStr = localStorage.getItem("user")
    if (userStr && userStr !== "null" && userStr !== "undefined") {
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

// Add function to decode and validate JWT token
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error("Error decoding JWT:", error)
    return null
  }
}

// Add function to validate token and user role
// Update the validateAdminToken function to be more robust
function validateAdminToken(token: string): boolean {
  try {
    const decoded = decodeJWT(token)
    if (!decoded) {
      console.error("❌ Invalid token format")
      return false
    }

    // Check if token is expired (with 30 second buffer)
    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now - 30) {
      console.error("❌ Token is expired")
      return false
    }

    // Check user role in token - be more flexible with role checking
    const userRole = decoded.role || decoded.user_role || decoded.user?.role
    const isAdmin =
      userRole === "admin" ||
      userRole === "ADMIN" ||
      (typeof userRole === "object" && userRole.value === "admin") ||
      (typeof userRole === "object" && userRole.name === "admin")

    if (!isAdmin) {
      console.error("❌ User does not have admin role in token:", userRole)
      return false
    }

    console.log("✅ Token validation passed for admin user")
    return true
  } catch (error) {
    console.error("❌ Token validation error:", error)
    return false
  }
}

// Update the refreshAuthToken function to match backend format
const refreshAuthToken = async () => {
  if (typeof window === "undefined") return null

  const now = Date.now()

  const backoffDelay = Math.min(MIN_REFRESH_INTERVAL * refreshBackoffMultiplier, MAX_BACKOFF_DELAY)

  if (now - lastRefreshTime < backoffDelay) {
    console.log(`Token refresh rate limited - waiting ${Math.ceil((backoffDelay - (now - lastRefreshTime)) / 1000)}s`)
    return null
  }

  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    console.log("Circuit breaker activated - max refresh attempts reached")

    if (now - lastRefreshTime > MAX_BACKOFF_DELAY) {
      console.log("Resetting circuit breaker after long delay")
      refreshAttempts = 0
      refreshBackoffMultiplier = 1
    } else {
      return null
    }
  }

  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    console.log("Token refresh already in progress...")
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    })
  }

  const refreshRequestKey = "POST:/api/refresh"
  if (activeRefreshRequests.has(refreshRequestKey)) {
    console.log("Refresh request already active, preventing loop")
    return null
  }

  // Get the refresh token - prioritize admin refresh token if we're in admin context
  let refreshToken = null

  if (isAdminRoute() || isAdminUser()) {
    refreshToken = localStorage.getItem("admin_refresh_token")
    if (refreshToken && refreshToken !== "null" && refreshToken !== "undefined") {
      console.log("Using admin refresh token")
    }
  }

  if (!refreshToken || refreshToken === "null" || refreshToken === "undefined") {
    refreshToken = localStorage.getItem("mizizzi_refresh_token")
    if (refreshToken && refreshToken !== "null" && refreshToken !== "undefined") {
      console.log("Using regular refresh token")
    }
  }

  if (!refreshToken || refreshToken === "null" || refreshToken === "undefined") {
    console.log("No refresh token available for refreshAuthToken")
    processQueue(new Error("No refresh token available"), null)
    return null
  }

  isRefreshing = true
  refreshAttempts++
  lastRefreshTime = now
  activeRefreshRequests.add(refreshRequestKey)

  try {
    console.log(`🔄 Attempting to refresh authentication token... (attempt ${refreshAttempts}/${MAX_REFRESH_ATTEMPTS})`)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    // Make direct fetch request to refresh token
    const response = await fetch(`${apiUrl}/api/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      credentials: "include",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Token refresh failed with status: ${response.status}`)

      refreshBackoffMultiplier = Math.min(refreshBackoffMultiplier * 2, 8)

      // If refresh token is invalid, clear all tokens
      if (response.status === 401 || response.status === 403) {
        console.log("Refresh token is expired or invalid. Clearing auth state.")
        const keysToRemove = [
          "mizizzi_token",
          "mizizzi_refresh_token",
          "mizizzi_csrf_token",
          "admin_token",
          "admin_refresh_token",
          "admin_user",
          "user",
        ]
        keysToRemove.forEach((key) => localStorage.removeItem(key))

        // Redirect to login if on admin route
        if (isAdminRoute()) {
          window.location.href = "/admin/login?reason=session_expired"
        }
      }

      processQueue(new Error(`Token refresh failed: ${response.status}`), null)
      return null
    }

    const data = await response.json()
    console.log("✅ Token refresh successful")

    if (data.access_token) {
      console.log("New token received, storing without immediate validation")

      // Store tokens for both systems
      localStorage.setItem("mizizzi_token", data.access_token)

      if (isAdminRoute() || isAdminUser()) {
        localStorage.setItem("admin_token", data.access_token)
        console.log("✅ Admin token updated")
      }

      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)

        if (isAdminRoute() || isAdminUser()) {
          localStorage.setItem("admin_refresh_token", data.refresh_token)
        }
      }

      // Update user data if provided
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user))
        if (isAdminRoute() || isAdminUser()) {
          localStorage.setItem("admin_user", JSON.stringify(data.user))
        }
      }

      refreshAttempts = 0
      refreshBackoffMultiplier = 1

      // Process successful queue
      processQueue(null, data.access_token)
      return data.access_token
    } else {
      console.error("No access token in refresh response")
      refreshBackoffMultiplier = Math.min(refreshBackoffMultiplier * 2, 8)
      processQueue(new Error("No access token received"), null)
      return null
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.warn("Token refresh request timed out")
    } else {
      console.error("Token refresh error:", error)
    }

    refreshBackoffMultiplier = Math.min(refreshBackoffMultiplier * 2, 8)

    // Clear tokens on error to prevent infinite retry loops
    if (error.message?.includes("401") || error.message?.includes("403")) {
      console.log("Clearing tokens due to authentication error")
      const keysToRemove = [
        "mizizzi_token",
        "mizizzi_refresh_token",
        "mizizzi_csrf_token",
        "admin_token",
        "admin_refresh_token",
        "admin_user",
        "user",
      ]
      keysToRemove.forEach((key) => localStorage.removeItem(key))

      // Redirect to login if on admin route
      if (isAdminRoute()) {
        window.location.href = "/admin/login?reason=token_refresh_failed"
      }
    }

    processQueue(error, null)
    return null
  } finally {
    isRefreshing = false
    activeRefreshRequests.delete(refreshRequestKey)
  }
}

// Extend Axios request configuration to include skipDeduplication
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  skipDeduplication?: boolean // Add the missing property
  _retry?: boolean // Add property to track retry attempts
  _retryCount?: number // Track number of retries
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
  (config: InternalAxiosRequestConfig) => {
    if (config.url?.includes("/api/refresh")) {
      console.log("[v0] Skipping token validation for refresh request")
      return config
    }

    // Get token from localStorage
    let token = null

    if (typeof window !== "undefined") {
      try {
        token = localStorage.getItem("mizizzi_token")

        // If no regular token, try admin token for admin routes
        if (!token && config.url?.includes("/api/admin/")) {
          token = localStorage.getItem("admin_token")
        }
      } catch (error) {
        console.error("Error accessing localStorage in request interceptor:", error)
      }
    }

    // If token exists, add to headers with proper Bearer format
    if (token && token !== "null" && token !== "undefined") {
      if (config.url?.includes("/api/admin/")) {
        if (!validateAdminToken(token)) {
          console.warn("❌ Invalid admin token detected, but not clearing to prevent loops")
          // Don't clear tokens here - let the response interceptor handle it
        }
      }

      // Make sure token has Bearer prefix
      if (!token.startsWith("Bearer ")) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        config.headers.Authorization = token
      }

      // Log the token format for debugging (only first few characters)
      console.log(`[v0] Adding Authorization header for ${config.url}: Bearer ${token.substring(0, 10)}...`)
    } else {
      console.log(`[v0] No token available for request to ${config.url}`)
    }

    delete config.headers["X-Requested-With"]
    delete config.headers["X-CSRF-Token"]
    delete config.headers["X-CSRF-TOKEN"]

    if (config.method === "post" || config.method === "put" || config.method === "patch") {
      config.headers["Content-Type"] = "application/json"
    }

    // Only add params/data to log if they exist
    let logMessage = `[v0] API ${config.method?.toUpperCase() || "GET"} request to ${config.url || ""}`

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

// Add response interceptor for logging and error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const url = response.config.url || ""
    console.log(`[v0] ✅ API response from ${url}: ${response.status}`)

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

    if (originalRequest?.url?.includes("/api/refresh")) {
      console.log("[v0] Refresh request failed, not attempting another refresh to prevent loops")
      return Promise.reject(error)
    }

    if (error.message === "Network Error" || error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
      console.warn(`[v0] ❌ Network error for ${originalRequest?.url || "unknown"}: Backend server may not be running`)

      let errorMessage = "Backend server is not available. Please ensure the backend server is running."

      // Check if this is a localhost connection issue
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      if (apiUrl.includes("localhost")) {
        errorMessage = `Backend server at ${apiUrl} is not responding. Please start the backend server.`
      }

      // For non-critical endpoints, provide graceful fallbacks
      if (originalRequest?.url?.includes("/api/wishlist")) {
        console.log("[v0] Wishlist request failed due to network error, providing empty fallback")
        return Promise.resolve({
          data: { items: [], message: "Wishlist temporarily unavailable" },
          status: 200,
          statusText: "OK (Fallback)",
          headers: {},
          config: originalRequest,
        })
      }

      if (originalRequest?.url?.includes("/api/cart")) {
        console.log("[v0] Cart request failed due to network error, providing empty fallback")
        return Promise.resolve({
          data: { items: [], total: 0, message: "Cart temporarily unavailable" },
          status: 200,
          statusText: "OK (Fallback)",
          headers: {},
          config: originalRequest,
        })
      }

      if (originalRequest?.url?.includes("/api/products")) {
        console.log("[v0] Products request failed due to network error, providing empty fallback")
        return Promise.resolve({
          data: { products: [], message: "Products temporarily unavailable" },
          status: 200,
          statusText: "OK (Fallback)",
          headers: {},
          config: originalRequest,
        })
      }

      // Dispatch network error event for better user feedback
      if (typeof document !== "undefined") {
        const now = Date.now()
        const NETWORK_ERROR_COOLDOWN = 5000 // 5 seconds between network error events
        const MAX_NETWORK_ERRORS = 5 // Max network errors before circuit breaker

        // Check if we're in cooldown period
        if (now - lastNetworkErrorTime < NETWORK_ERROR_COOLDOWN) {
          console.log("[v0] API: Network error suppressed due to cooldown")
          return Promise.reject(error)
        }

        // Check if we've exceeded max network errors
        if (networkErrorCount >= MAX_NETWORK_ERRORS) {
          console.log("[v0] API: Network error suppressed due to circuit breaker")
          return Promise.reject(error)
        }

        networkErrorCount++
        lastNetworkErrorTime = now

        console.log("[v0] API: Dispatching network error event", { count: networkErrorCount })

        document.dispatchEvent(
          new CustomEvent("network-error", {
            detail: {
              message: errorMessage,
              originalRequest,
              isNetworkError: true,
              canRetry: true,
              errorCount: networkErrorCount,
            },
          }),
        )
      }

      const networkError = new Error(errorMessage)
      networkError.name = "NetworkError"
      return Promise.reject(networkError)
    }

    if (error.message?.includes("CORS") || error.message?.includes("Access-Control")) {
      console.warn(`[v0] ❌ CORS error for ${originalRequest?.url || "unknown"}:`, error.message)

      // Dispatch CORS error event
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("cors-error", {
            detail: {
              message: "CORS policy blocked this request. Please check server CORS configuration.",
              originalRequest,
              isCorsError: true,
            },
          }),
        )
      }

      const corsError = new Error("CORS policy blocked this request. Please check server CORS configuration.")
      corsError.name = "CORSError"
      return Promise.reject(corsError)
    }

    if (error.response && error.response.status === 500) {
      console.error(
        `❌ Internal Server Error (500) for ${originalRequest?.url || "unknown"}:`,
        error.response.data || error.message,
      )

      // Provide specific error messages based on endpoint
      let userMessage = "A server error occurred. Please try again later."

      if (originalRequest?.url?.includes("/api/products")) {
        userMessage = "Unable to load products. The server is experiencing issues. Please try refreshing the page."
      } else if (originalRequest?.url?.includes("/api/cart")) {
        userMessage = "Cart service is temporarily unavailable. Please try again in a moment."
      } else if (originalRequest?.url?.includes("/api/wishlist")) {
        userMessage = "Wishlist service is temporarily unavailable. Please try again in a moment."
      } else if (originalRequest?.url?.includes("/api/admin")) {
        userMessage = "Admin service is temporarily unavailable. Please try again in a moment."
      }

      // Dispatch a custom event for global error handling
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("api-error", {
            detail: {
              status: 500,
              message: userMessage,
              originalRequest,
              error: error.response.data || error.message,
              canRetry: true,
            },
          }),
        )
      }
    }

    // Handle 401 Unauthorized errors with token refresh
    if (error.response && error.response.status === 401 && !originalRequest?._retry) {
      console.warn(`[v0] 🔐 Authentication failed for ${originalRequest?.url || "unknown"}`)

      // Initialize retry count
      if (originalRequest) {
        originalRequest._retryCount = originalRequest._retryCount || 0

        if (originalRequest._retryCount >= 1 || refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
          console.error("❌ Max retries reached or circuit breaker active")

          // Clear tokens and redirect for admin routes
          if (isAdminRoute()) {
            const keysToRemove = [
              "admin_token",
              "admin_refresh_token",
              "admin_user",
              "mizizzi_token",
              "mizizzi_refresh_token",
              "user",
            ]
            keysToRemove.forEach((key) => {
              try {
                localStorage.removeItem(key)
              } catch (e) {
                console.error("Error removing localStorage key:", key, e)
              }
            })

            if (typeof window !== "undefined") {
              window.location.href = "/admin/login?reason=max_retries_exceeded"
            }
          }

          return Promise.reject(error)
        }

        // For product requests, they should work without auth - log but don't retry
        if (originalRequest.url?.includes("/api/products")) {
          console.log("[v0] Product request failed with 401, but products should work without auth")
          return Promise.reject(error)
        }

        // For non-critical endpoints like wishlist, handle gracefully without showing errors
        if (originalRequest.url?.includes("/api/wishlist")) {
          console.log("[v0] Wishlist request failed with 401, providing empty fallback")
          return Promise.resolve({
            data: { items: [], message: "Please log in to view your wishlist" },
            status: 200,
            statusText: "OK (Auth Required)",
            headers: {},
            config: originalRequest,
          })
        }

        // For cart operations, handle gracefully without showing errors
        if (originalRequest.url?.includes("/api/cart/")) {
          console.log("[v0] Cart operation failed with 401, providing fallback")

          // Dispatch auth error event for cart operations
          if (typeof document !== "undefined") {
            document.dispatchEvent(
              new CustomEvent("auth-error", {
                detail: {
                  status: 401,
                  message: "Please log in to access your cart",
                  originalRequest,
                  isCartOperation: true,
                },
              }),
            )
          }

          return Promise.resolve({
            data: { items: [], total: 0, message: "Please log in to access your cart" },
            status: 200,
            statusText: "OK (Auth Required)",
            headers: {},
            config: originalRequest,
          })
        }

        // Determine if we're in an admin route
        const adminRoute = isAdminRoute()

        if (adminRoute) {
          // Check if we're already on the login page to prevent redirect loops
          if (typeof window !== "undefined" && window.location.pathname.includes("/admin/login")) {
            return Promise.reject(error)
          }

          // Mark as retrying to prevent infinite loops
          originalRequest._retry = true
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

          try {
            // Attempt to refresh the token
            console.log(`🔄 Starting token refresh for admin route (attempt ${originalRequest._retryCount})...`)
            const newToken = await refreshAuthToken()

            if (newToken) {
              console.log("✅ Token refreshed, retrying original request")

              // Update the original request with the new token
              originalRequest.headers = originalRequest.headers || {}
              originalRequest.headers.Authorization = `Bearer ${newToken}`

              // Retry the original request
              return api(originalRequest)
            } else {
              console.error("❌ Token refresh failed")

              // For admin dashboard requests, allow graceful fallback to mock data
              if (
                originalRequest.url?.includes("/api/admin/dashboard") ||
                originalRequest.url?.includes("/api/admin/stats")
              ) {
                console.log("🎭 Admin dashboard/stats request failed, allowing graceful fallback")
                return Promise.reject(error)
              }

              // Clear tokens and redirect to login
              const keysToRemove = [
                "admin_token",
                "admin_refresh_token",
                "admin_user",
                "mizizzi_token",
                "mizizzi_refresh_token",
                "user",
              ]
              keysToRemove.forEach((key) => {
                try {
                  localStorage.removeItem(key)
                } catch (e) {
                  console.error("Error removing localStorage key:", key, e)
                }
              })

              if (typeof window !== "undefined") {
                window.location.href = "/admin/login?reason=token_refresh_failed"
              }
            }
          } catch (refreshError) {
            console.error("❌ Token refresh threw an error:", refreshError)

            // For admin dashboard requests, allow graceful fallback to mock data
            if (
              originalRequest.url?.includes("/api/admin/dashboard") ||
              originalRequest.url?.includes("/api/admin/stats")
            ) {
              console.log("🎭 Admin dashboard/stats request failed after refresh error, allowing graceful fallback")
              return Promise.reject(error)
            }

            // Clear tokens and redirect to login
            const keysToRemove = [
              "admin_token",
              "admin_refresh_token",
              "admin_user",
              "mizizzi_token",
              "mizizzi_refresh_token",
              "user",
            ]
            keysToRemove.forEach((key) => {
              try {
                localStorage.removeItem(key)
              } catch (e) {
                console.error("Error removing localStorage key:", key, e)
              }
            })

            if (typeof window !== "undefined") {
              window.location.href = "/admin/login?reason=refresh_error"
            }
          }
        } else {
          // For regular user routes, dispatch an auth error event only for critical endpoints
          const isCriticalEndpoint =
            originalRequest.url?.includes("/api/profile") || originalRequest.url?.includes("/api/orders")

          if (isCriticalEndpoint && typeof document !== "undefined") {
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
    }

    return Promise.reject(error)
  },
)

// Store the original methods
const originalGet = api.get
const originalDelete = api.delete

// Override the get method with proper typing
api.get = async <T = any, R = AxiosResponse<T>>(url: string, config?: any): Promise<R> => {
  // Ensure config is always an object, even if undefined
  const safeConfig = config || {}

  if (url.includes("/undefined") || url.includes("/null")) {
    console.error(`[v0] Attempted to make API call with invalid ID in URL: ${url}`)
    throw new Error("Invalid ID in API request URL")
  }
  // </CHANGE>

  // Find the api.get method implementation and update the return type handling for the cart validation endpoint
  if (url.includes("/api/cart/validate")) {
    const token = typeof localStorage !== "undefined" ? getToken() : null
    if (!token) {
      console.log("No auth token for cart validation, returning default response")
      // Cache this response to prevent repeated calls
      const defaultResponse = {
        data: {
          is_valid: true,
          errors: [],
          warnings: [],
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: safeConfig,
      } as R

      // Cache for 30 seconds to prevent excessive calls
      const cacheKey = createRequestKey(url, safeConfig.params, "GET")
      productRequestCache.set(cacheKey, {
        data: defaultResponse,
        timestamp: Date.now(),
      })

      return defaultResponse
    }
  }

  // Add caching for product requests to prevent excessive API calls
  if (url.includes("/api/products") && safeConfig.method !== "POST") {
    const requestKey = createRequestKey(url, safeConfig.params, "GET")

    // Check if we're on the server side
    if (typeof window === "undefined") {
      // Server-side request - don't use deduplication or caching
      try {
        return (await originalGet.call(api, url, {
          ...safeConfig,
          withCredentials: true,
        })) as R
      } catch (error) {
        console.error(`Server-side API request to ${url} failed:`, error)
        throw error
      }
    }

    // Client-side - use deduplicateRequest to handle caching and deduplication
    return deduplicateRequest(requestKey, async () => {
      try {
        const response = (await originalGet.call(api, url, {
          ...safeConfig,
          withCredentials: true, // Always include credentials
        })) as R

        // Cache the response - cast to AxiosResponse first
        const axiosResponse = response as AxiosResponse<T>
        productRequestCache.set(requestKey, {
          data: axiosResponse.data,
          timestamp: Date.now(),
        })

        return response
      } catch (error) {
        // Remove from pending requests on error
        pendingApiRequests.delete(requestKey)
        throw error
      }
    })
  }

  // Special handling for admin endpoints
  if (url.includes("/api/admin/")) {
    // Check if we're on the server side
    if (typeof window === "undefined") {
      // Server-side admin request - use simple axios call
      try {
        return (await originalGet.call(api, url, {
          ...safeConfig,
          withCredentials: true,
        })) as R
      } catch (error) {
        console.error(`Server-side admin API request to ${url} failed:`, error)
        throw error
      }
    }

    try {
      console.log(`Making request to admin endpoint: ${url}`)

      // Get the admin token - prioritize admin_token, then fall back to mizizzi_token
      let adminToken = localStorage.getItem("admin_token")
      if (!adminToken || adminToken === "null" || adminToken !== "undefined") {
        adminToken = localStorage.getItem("mizizzi_token")
      }

      if (!adminToken || adminToken === "null" || adminToken === "undefined") {
        console.error("No admin token available for admin endpoint request")
        throw new Error("No authentication token available")
      }

      // Validate the token before using it
      if (!validateAdminToken(adminToken)) {
        console.error("❌ Invalid admin token, clearing and throwing error")
        const keysToRemove = ["admin_token", "admin_refresh_token", "mizizzi_token", "mizizzi_refresh_token"]
        keysToRemove.forEach((key) => localStorage.removeItem(key))
        throw new Error("Invalid authentication token")
      }

      console.log(`Using validated admin token: ${adminToken.substring(0, 10)}...`)

      // Use the original get method with proper headers
      const response = (await originalGet.call(api, url, {
        ...safeConfig,
        headers: {
          ...safeConfig.headers,
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      })) as R

      console.log(`Admin endpoint response status: ${(response as AxiosResponse).status}`)
      return response
    } catch (error: any) {
      console.error(`Error fetching admin endpoint ${url}:`, error)

      // If it's a 401 error, don't try to refresh here - let the response interceptor handle it
      throw error
    }
  }

  // Use the original get method with minimal configuration for non-admin endpoints
  const response = (await originalGet.call(api, url, {
    ...safeConfig,
    withCredentials: true, // Always include credentials
  })) as R

  // Cache product responses - cast to AxiosResponse first
  const axiosResponse = response as AxiosResponse<T>
  if (url.includes("/api/products") && axiosResponse.status === 200) {
    const cacheKey = `${url}${safeConfig ? JSON.stringify(safeConfig) : ""}`
    productRequestCache.set(cacheKey, {
      data: axiosResponse.data,
      timestamp: Date.now(),
    })
  }

  return response
}

// Override the delete method to properly handle CORS
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

    return originalDelete.call(api, url, updatedConfig) as Promise<R>
  } catch (error) {
    console.error(`DELETE request to ${url} failed:`, error)
    throw error
  }
}

// Add a function to help with API URL construction
export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  // Validate base URL
  if (!baseUrl.startsWith("http")) {
    console.warn(`[v0] Invalid API base URL: ${baseUrl}. Using default.`)
    return `http://localhost:5000${path.startsWith("/") ? path : `/${path}`}`
  }

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

// Method to check API availability without CORS issues
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    // First, check if we're in development mode and return true to avoid unnecessary API calls
    if (process.env.NODE_ENV === "development") {
      console.log("Development mode detected, skipping API availability check")
      return true
    }

    // Use a simple image request instead of an API call to avoid CORS issues
    // This is a common technique for checking connectivity without CORS problems
    const timestamp = new Date().getTime()
    const testImage = new Image()

    return new Promise((resolve) => {
      testImage.onload = () => {
        console.log("Connection test successful")
        resolve(true)
      }

      testImage.onerror = () => {
        console.log("Connection test failed")
        resolve(false)
      }

      // Set a timeout in case the image never loads or errors
      setTimeout(() => {
        console.log("Connection test timed out")
        resolve(false)
      }, 3000)

      // Use the API base URL domain with a non-existent image to trigger an error without CORS issues
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const domain = new URL(baseUrl).origin
      testImage.src = `${domain}/ping-test.gif?t=${timestamp}`
    })
  } catch (error) {
    console.warn("API availability check failed:", error)
    return false
  }
}

// Cache management utilities
export const clearApiCache = (): void => {
  productRequestCache.clear()
  pendingApiRequests.clear()
  console.log("API cache cleared")
}

export const getCacheStats = (): { size: number; keys: string[] } => {
  return {
    size: productRequestCache.size,
    keys: Array.from(productRequestCache.keys()),
  }
}

// Security utilities
export const clearAuthData = (): void => {
  const keysToRemove = [
    "mizizzi_token",
    "mizizzi_refresh_token",
    "mizizzi_csrf_token",
    "admin_token",
    "admin_refresh_token",
    "admin_user",
    "user",
  ]
  keysToRemove.forEach((key) => localStorage.removeItem(key))
  clearApiCache()
  console.log("Auth data cleared")
}

// Backend status utilities
export const isBackendOnline = (): boolean => {
  return true // Simplified for this version
}

export const getBackendStatus = (): { online: boolean; lastCheck: number } => {
  return {
    online: true,
    lastCheck: Date.now(),
  }
}

// API helper functions
export const apiHelpers = {
  // GET request
  get: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    return api.get<T>(url, config)
  },

  // POST request
  post: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return api.post<T>(url, data, config)
  },

  // PUT request
  put: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return api.put<T>(url, data, config)
  },

  // PATCH request
  patch: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    return api.patch<T>(url, data, config)
  },

  // DELETE request
  delete: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    return api.delete<T>(url, config)
  },

  // Upload file
  upload: <T = any>(url: string, formData: FormData, config?: any): Promise<AxiosResponse<T>> => {
    return api.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        "Content-Type": "multipart/form-data",
      },
    })
  },

  // Health check
  healthCheck: async (): Promise<boolean> => {
    try {
      const response = await api.get("/health")
      return response.status === 200
    } catch (error) {
      console.error("Health check failed:", error instanceof Error ? error.message : String(error))
      return false
    }
  },
}

// Export the main API instance as default
export default api

// Export types for convenience
export type { AxiosResponse }

export { api }

if (typeof window !== "undefined") {
  // Listen for token update events from auth context
  document.addEventListener("token-updated", (event: any) => {
    const { token, csrfToken } = event.detail
    console.log("[v0] Token updated event received, new token available")

    // The token is already stored in localStorage by auth context
    // This event just notifies us that fresh tokens are available
  })

  // Listen for token refresh events
  document.addEventListener("token-refreshed", (event: any) => {
    const { token } = event.detail
    console.log("[v0] Token refreshed event received")

    // Process any queued requests with the new token
    processQueue(null, token)
  })
}

export const testBackendConnection = async (): Promise<boolean> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

    // Use a simple fetch request to test connection
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${apiUrl}/api/health`, {
      method: "GET",
      signal: controller.signal,
      credentials: "include",
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    console.warn("[v0] Backend connection test failed:", error)
    return false
  }
}

let networkErrorCount = 0
let lastNetworkErrorTime = 0

// Wishlist API functions
export const wishlistApi = {
  // Get user's wishlist
  getWishlist: async (): Promise<AxiosResponse<any>> => {
    try {
      return await api.get("/api/wishlist/user")
    } catch (error: any) {
      // Check if it's a network/server error
      if (
        error.response?.status === 404 ||
        error.response?.status === 500 ||
        error.response?.status === 503 ||
        !error.response
      ) {
        console.log("[v0] Wishlist API unavailable, will use localStorage fallback")
        // Re-throw with a more specific error type for the context to handle
        const networkError = new Error("Backend server unavailable")
        networkError.name = "NetworkError"
        throw networkError
      }
      throw error
    }
  },

  // Add item to wishlist
  addToWishlist: async (productId: number): Promise<AxiosResponse<any>> => {
    try {
      return await api.post("/api/wishlist/user", { product_id: productId })
    } catch (error: any) {
      if (
        error.response?.status === 404 ||
        error.response?.status === 500 ||
        error.response?.status === 503 ||
        !error.response
      ) {
        console.log("[v0] Wishlist add API unavailable, will use localStorage fallback")
        const networkError = new Error("Backend server unavailable")
        networkError.name = "NetworkError"
        throw networkError
      }
      throw error
    }
  },

  removeFromWishlist: async (wishlistItemId: string | number): Promise<AxiosResponse<any>> => {
    try {
      const id = typeof wishlistItemId === "number" ? wishlistItemId.toString() : wishlistItemId
      return await api.delete(`/api/wishlist/user/${id}`)
    } catch (error: any) {
      if (
        error.response?.status === 404 ||
        error.response?.status === 500 ||
        error.response?.status === 503 ||
        !error.response
      ) {
        console.log("[v0] Wishlist remove API unavailable, will use localStorage fallback")
        const networkError = new Error("Backend server unavailable")
        networkError.name = "NetworkError"
        throw networkError
      }
      throw error
    }
  },

  // Clear entire wishlist
  clearWishlist: async (): Promise<AxiosResponse<any>> => {
    try {
      return await api.delete("/api/wishlist/user/clear")
    } catch (error: any) {
      if (
        error.response?.status === 404 ||
        error.response?.status === 500 ||
        error.response?.status === 503 ||
        !error.response
      ) {
        console.log("[v0] Wishlist clear API unavailable, will use localStorage fallback")
        const networkError = new Error("Backend server unavailable")
        networkError.name = "NetworkError"
        throw networkError
      }
      throw error
    }
  },
}

// Export wishlist functions for backward compatibility
export const getWishlist = wishlistApi.getWishlist
export const addToWishlist = wishlistApi.addToWishlist
export const removeFromWishlist = wishlistApi.removeFromWishlist

// Search API functions
export const searchApi = {
  // Semantic search for products
  searchProducts: async (
    query: string,
    options: {
      limit?: number
      category?: string
      brand?: string
      minPrice?: number
      maxPrice?: number
    } = {},
  ): Promise<AxiosResponse<any>> => {
    const params = {
      q: query.trim(),
      limit: options.limit || 10,
      ...(options.category && { category: options.category }),
      ...(options.brand && { brand: options.brand }),
      ...(options.minPrice && { min_price: options.minPrice }),
      ...(options.maxPrice && { max_price: options.maxPrice }),
    }

    try {
      console.log("[v0] Performing semantic search with params:", params)
      return await api.get("/api/search", { params })
    } catch (error: any) {
      console.error("[v0] Search API error:", error)
      throw error
    }
  },

  searchCategories: async (
    query: string,
    options: {
      limit?: number
      featured?: boolean
      parent_id?: number
    } = {},
  ): Promise<AxiosResponse<any>> => {
    const params = {
      q: query.trim(),
      per_page: options.limit || 10,
      ...(options.featured !== undefined && { featured: options.featured }),
      ...(options.parent_id && { parent_id: options.parent_id }),
    }

    try {
      console.log("[v0] Performing category search with params:", params)
      return await api.get("/api/categories/search", { params })
    } catch (error: any) {
      console.error("[v0] Category search API error:", error)
      throw error
    }
  },

  searchAll: async (query: string): Promise<AxiosResponse<any>> => {
    const requestKey = `search-all-${query}`

    return deduplicateRequest(requestKey, async () => {
      try {
        console.log(`[v0] Starting comprehensive search for: "${query}"`)

        // Use shorter timeout for individual requests to prevent overall timeout
        const searchConfig = {
          timeout: 10000, // 10 seconds per request
          withCredentials: true,
        }

        // Make requests sequentially to reduce server load
        const [productsResponse, categoriesResponse] = await Promise.allSettled([
          api.get(`/api/products/search?q=${encodeURIComponent(query)}`, searchConfig),
          api.get(`/api/categories/search?q=${encodeURIComponent(query)}`, searchConfig),
        ])

        // Handle products response
        const products =
          productsResponse.status === "fulfilled" ? productsResponse.value.data : { results: [], total: 0 }

        // Handle categories response
        const categories =
          categoriesResponse.status === "fulfilled" ? categoriesResponse.value.data : { results: [], total: 0 }

        console.log(`[v0] Search completed - Products: ${products.total}, Categories: ${categories.total}`)

        const combinedResults = {
          products: {
            results: products.results || [],
            total: products.total || 0,
          },
          categories: {
            results: categories.results || [],
            total: categories.total || 0,
          },
          query,
          search_time: Date.now(),
          suggestions: products.suggestions || [],
          total_results: (products.total || 0) + (categories.total || 0),
        }

        // Return proper AxiosResponse structure
        return {
          data: combinedResults,
          status: 200,
          statusText: "OK",
          headers: {},
          config: searchConfig,
          request: {},
        } as AxiosResponse<any>
      } catch (error) {
        console.error(`[v0] Search error for "${query}":`, error)

        // Return empty results on error instead of throwing
        const emptyResults = {
          products: { results: [], total: 0 },
          categories: { results: [], total: 0 },
          query,
          search_time: Date.now(),
          suggestions: [],
          total_results: 0,
        }

        return {
          data: emptyResults,
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
          request: {},
        } as AxiosResponse<any>
      }
    })
  },

  // Get search suggestions
  getSearchSuggestions: async (query: string): Promise<AxiosResponse<any>> => {
    try {
      return await api.get("/api/search/suggestions", {
        params: { q: query.trim() },
      })
    } catch (error: any) {
      console.error("[v0] Search suggestions API error:", error)
      throw error
    }
  },

  // Admin search (if needed)
  adminSearch: async (query: string, options: any = {}): Promise<AxiosResponse<any>> => {
    const params = {
      q: query.trim(),
      ...options,
    }

    try {
      return await api.get("/api/admin/search", { params })
    } catch (error: any) {
      console.error("[v0] Admin search API error:", error)
      throw error
    }
  },
}

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get("/health")
    return response.status === 200
  } catch (error) {
    console.error("Health check failed:", error instanceof Error ? error.message : String(error))
    return false
  }
}
