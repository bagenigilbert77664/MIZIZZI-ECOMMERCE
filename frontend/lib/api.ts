import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from "axios"

// Add this at the top of the file if it doesn't exist
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Add request deduplication for product requests to prevent excessive API calls
// Add this near the top of the file with other helper functions
const productRequestCache = new Map<string, { data: any; timestamp: number }>()
const PRODUCT_CACHE_TTL = 60000 // 1 minute cache TTL

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

  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    console.log("Token refresh already in progress...")
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    })
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

  try {
    console.log("🔄 Attempting to refresh authentication token...")

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
      // Validate the new token before storing it
      if (!validateAdminToken(data.access_token)) {
        console.error("❌ New token validation failed")
        processQueue(new Error("Invalid token received"), null)
        return null
      }

      // Store tokens for both systems with validation
      localStorage.setItem("mizizzi_token", data.access_token)

      if (isAdminRoute() || isAdminUser()) {
        localStorage.setItem("admin_token", data.access_token)
        console.log("✅ Admin token updated and validated")
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

      // Process successful queue
      processQueue(null, data.access_token)
      return data.access_token
    } else {
      console.error("No access token in refresh response")
      processQueue(new Error("No access token received"), null)
      return null
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.warn("Token refresh request timed out")
    } else {
      console.error("Token refresh error:", error)
    }

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
      // Validate admin token before using it
      if (config.url?.includes("/api/admin/") && !validateAdminToken(token)) {
        console.error("❌ Invalid admin token detected, clearing tokens")
        // Clear invalid tokens
        const keysToRemove = ["mizizzi_token", "admin_token", "mizizzi_refresh_token", "admin_refresh_token"]
        keysToRemove.forEach((key) => localStorage.removeItem(key))

        // Don't add invalid token to request
        token = null
      } else {
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
      }
    }

    if (!token) {
      // Only warn for endpoints that actually need authentication
      const needsAuth =
        config.url?.includes("/api/cart") ||
        config.url?.includes("/api/admin") ||
        config.url?.includes("/api/user") ||
        config.url?.includes("/api/orders")

      // Don't log warnings for product requests - they should work without auth
      const isProductRequest = config.url?.includes("/api/products")

      if (needsAuth && !config.url?.includes("/api/cart/validate") && !isProductRequest) {
        console.warn(`No valid token available for request to ${config.url}`)
      }
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

// Add response interceptor for logging and error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const url = response.config.url || ""
    console.log(`✅ API response from ${url}: ${response.status}`)

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

    // Handle network errors more gracefully
    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      console.warn(`❌ Network error for ${originalRequest.url}: Backend server may not be running`)

      // For critical endpoints, dispatch network error events
      if (originalRequest.url?.includes("/api/admin/") || originalRequest.url?.includes("/api/products")) {
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("network-error", {
              detail: {
                message: "Network error. Please check if the backend server is running.",
                originalRequest,
              },
            }),
          )
        }
      }
    }

    // Handle 401 Unauthorized errors with token refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      console.warn(`🔐 Authentication failed for ${originalRequest.url}`)

      // Initialize retry count
      originalRequest._retryCount = originalRequest._retryCount || 0

      // Limit retries to prevent infinite loops
      if (originalRequest._retryCount >= 2) {
        console.error("❌ Max retries reached for authentication")

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
          keysToRemove.forEach((key) => localStorage.removeItem(key))

          window.location.href = "/admin/login?reason=max_retries_exceeded"
        }

        return Promise.reject(error)
      }

      // For non-critical endpoints like wishlist, handle gracefully without showing errors
      if (originalRequest.url?.includes("/api/wishlist")) {
        console.log("Wishlist request failed with 401, handling gracefully")
        return Promise.reject(error)
      }

      // For cart operations, handle gracefully without showing errors
      if (originalRequest.url?.includes("/api/cart/")) {
        console.log("Cart operation failed with 401, handling gracefully")

        // Dispatch auth error event for cart operations
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("auth-error", {
              detail: {
                status: 401,
                message: "Authentication failed for cart operation",
                originalRequest,
                isCartOperation: true,
              },
            }),
          )
        }

        // Don't retry cart operations, let the cart service handle it locally
        return Promise.reject(error)
      }

      // For product requests, don't try to refresh tokens - they should work without auth
      if (originalRequest.url?.includes("/api/products")) {
        console.log("Product request failed with 401, but products should work without auth")
        return Promise.reject(error)
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
            keysToRemove.forEach((key) => localStorage.removeItem(key))

            window.location.href = "/admin/login?reason=token_refresh_failed"
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
          keysToRemove.forEach((key) => localStorage.removeItem(key))

          window.location.href = "/admin/login?reason=refresh_error"
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

// Make sure the API module is properly exported as default
export default api
