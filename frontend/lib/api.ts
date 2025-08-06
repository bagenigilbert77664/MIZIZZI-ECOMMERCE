import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from "axios"
import { logger } from "./logger"

// Extend AxiosRequestConfig to include custom properties
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
    _retryCount?: number
    _skipErrorHandling?: boolean
  }
  export interface AxiosRequestConfig {
    skipErrorHandling?: boolean
  }
}

// Environment configuration with fallbacks
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const IS_PRODUCTION = process.env.NODE_ENV === "production"
const IS_DEVELOPMENT = process.env.NODE_ENV === "development"

// Warn about missing environment variables in development
if (!process.env.NEXT_PUBLIC_API_URL && IS_DEVELOPMENT) {
  logger.warn("NEXT_PUBLIC_API_URL environment variable not set, using fallback: http://localhost:5000")
}

// Types
interface TokenRefreshResponse {
  access_token: string
  refresh_token?: string
  csrf_token?: string
  user?: Record<string, unknown>
}

interface CachedRequest {
  data: unknown
  timestamp: number
}

interface QueuedRequest {
  resolve: (value: string | null) => void
  reject: (reason?: unknown) => void
}

interface ApiError extends Error {
  status?: number
  code?: string
  isNetworkError?: boolean
  isBackendUnavailable?: boolean
}

// Constants
const REQUEST_TIMEOUT = 30000 // 30 seconds
const PRODUCT_CACHE_TTL = 60000 // 1 minute
const MAX_RETRY_ATTEMPTS = 2
const TOKEN_REFRESH_TIMEOUT = 15000 // 15 seconds
const TOKEN_EXPIRY_BUFFER = 30 // 30 seconds buffer for token expiry

// Global backend availability state
let isBackendAvailable = true
let lastBackendCheck = 0
const BACKEND_CHECK_INTERVAL = 30000 // 30 seconds

// Cache and queue management
const productRequestCache = new Map<string, CachedRequest>()
const cancelControllers = new Map<string, AbortController>()
const pendingApiRequests = new Map<string, Promise<unknown>>()
let isRefreshing = false
let failedQueue: QueuedRequest[] = []

// Enhanced storage utilities with basic obfuscation
const obfuscateValue = (value: string): string => {
  if (IS_PRODUCTION) {
    try {
      return btoa(value)
    } catch (error) {
      logger.warn("Failed to obfuscate value", { error: (error as Error).message })
      return value
    }
  }
  return value
}

const deobfuscateValue = (value: string): string => {
  if (IS_PRODUCTION) {
    try {
      return atob(value)
    } catch (error) {
      return value
    }
  }
  return value
}

const getStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null

  try {
    const item = localStorage.getItem(key)
    if (!item || item === "null" || item === "undefined") return null

    const deobfuscated = deobfuscateValue(item)
    return deobfuscated.trim() !== "" ? deobfuscated.trim() : null
  } catch (error) {
    if (IS_DEVELOPMENT) {
      logger.error("Error accessing localStorage", { key, error: (error as Error).message })
    }
    return null
  }
}

const removeStorageItems = (keys: string[]): void => {
  if (typeof window === "undefined") return

  try {
    keys.forEach((key) => {
      localStorage.removeItem(key)
      if (key.includes("token")) {
        productRequestCache.clear()
        pendingApiRequests.clear()
      }
    })
  } catch (error) {
    if (IS_DEVELOPMENT) {
      logger.error("Error removing localStorage items", { keys, error: (error as Error).message })
    }
  }
}

const setStorageItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return

  try {
    const obfuscated = obfuscateValue(value)
    localStorage.setItem(key, obfuscated)
  } catch (error) {
    if (IS_DEVELOPMENT) {
      logger.error("Error setting localStorage item", { key, error: (error as Error).message })
    }
  }
}

// Backend availability check
const checkBackendAvailability = async (): Promise<boolean> => {
  const now = Date.now()
  if (now - lastBackendCheck < BACKEND_CHECK_INTERVAL && isBackendAvailable) {
    return isBackendAvailable
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${API_BASE_URL}/api/health-check`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-cache",
    })

    clearTimeout(timeoutId)
    const wasAvailable = isBackendAvailable
    isBackendAvailable = response.ok
    lastBackendCheck = now

    if (!isBackendAvailable) {
      logger.warn("Backend health check failed", { status: response.status })
      if (wasAvailable) {
        // Dispatch event if status changed from available to unavailable
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("backend-unavailable", {
              detail: {
                message: "Server is currently unavailable. Please try again later.",
              },
            }),
          )
        }
      }
    } else if (!wasAvailable) {
      // Dispatch event if status changed from unavailable to available
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("backend-restored", {
            detail: {
              message: "Successfully reconnected to the server.",
            },
          }),
        )
      }
    }

    return isBackendAvailable
  } catch (error) {
    const wasAvailable = isBackendAvailable
    isBackendAvailable = false
    lastBackendCheck = now

    if (IS_DEVELOPMENT) {
      logger.warn("Backend unavailable", { error: (error as Error).message })
    }

    if (wasAvailable) {
      // Dispatch event if status changed from available to unavailable
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("backend-unavailable", {
            detail: {
              message: "Cannot connect to server. Please check your internet connection and try again.",
            },
          }),
        )
      }
    }

    return false
  }
}

// Route detection utilities
const isAdminRoute = (): boolean => {
  if (typeof window === "undefined") return false
  return window.location.pathname.startsWith("/admin")
}

const isAdminUser = (): boolean => {
  if (typeof window === "undefined") return false

  const adminToken = getStorageItem("admin_token")
  if (adminToken) return true

  const userStr = getStorageItem("user")
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      if (typeof user.role === "string") {
        return user.role.toLowerCase() === "admin"
      }
      if (user.role && typeof user.role === "object" && "value" in user.role) {
        return (user.role as { value: string }).value.toLowerCase() === "admin"
      }
    } catch (error) {
      if (IS_DEVELOPMENT) {
        logger.error("Failed to parse user from localStorage", { error: (error as Error).message })
      }
    }
  }
  return false
}

// Enhanced token utilities
const getToken = (): string | null => {
  if (typeof window === "undefined") return null

  if (isAdminRoute()) {
    const adminToken = getStorageItem("admin_token")
    if (adminToken) return adminToken
  }

  return getStorageItem("mizizzi_token")
}

interface JWTPayload {
  exp?: number
  role?: string
  user_role?: string
  user?: {
    role?: string
  }
}

const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    if (IS_DEVELOPMENT) {
      logger.error("Error decoding JWT", { error: (error as Error).message })
    }
    return null
  }
}

const validateAdminToken = (token: string): boolean => {
  try {
    const decoded = decodeJWT(token)
    if (!decoded) return false

    const now = Math.floor(Date.now() / 1000)
    if (decoded.exp && decoded.exp < now + TOKEN_EXPIRY_BUFFER) {
      if (IS_DEVELOPMENT) {
        logger.warn("Token is expired or expiring soon")
      }
      return false
    }

    const userRole = decoded.role || decoded.user_role || decoded.user?.role
    const isAdmin =
      userRole === "admin" ||
      userRole === "ADMIN" ||
      (typeof userRole === "object" && (userRole as any).value === "admin") ||
      (typeof userRole === "object" && (userRole as any).name === "admin")

    if (!isAdmin && IS_DEVELOPMENT) {
      logger.warn("User does not have admin role", { role: userRole })
    }

    return isAdmin
  } catch (error) {
    if (IS_DEVELOPMENT) {
      logger.error("Token validation error", { error: (error as Error).message })
    }
    return false
  }
}

// Queue management
const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((request) => {
    if (error) {
      request.reject(error)
    } else {
      request.resolve(token)
    }
  })
  failedQueue = []
}

// Request deduplication
const createRequestKey = (url: string, params?: Record<string, unknown>, method = "GET"): string => {
  const paramString = params ? JSON.stringify(params) : ""
  return `${method}:${url}:${paramString}`
}
const deduplicateRequest = async <T>(key: string, requestFn: () => Promise<T>)
: Promise<T> =>
{
  if (pendingApiRequests.has(key)) {
    if (IS_DEVELOPMENT) {
      logger.debug("Reusing pending request", { key })
    }
    return pendingApiRequests.get(key) as Promise<T>
  }

  const requestPromise = requestFn()
    .then((response) => {
      pendingApiRequests.delete(key)
      return response
    })
    .catch((error) => {
      pendingApiRequests.delete(key)
      throw error
    })

  pendingApiRequests.set(key, requestPromise)
  return requestPromise
}

// Abort controller management
const getAbortController = (endpoint: string): AbortSignal => {
  if (cancelControllers.has(endpoint)) {
    cancelControllers.get(endpoint)?.abort("Request superseded by newer request")
    cancelControllers.delete(endpoint)
  }

  const controller = new AbortController()
  cancelControllers.set(endpoint, controller)
  return controller.signal
}

// Enhanced token refresh logic
const refreshAuthToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    })
  }

  let refreshToken: string | null = null
  if (isAdminRoute() || isAdminUser()) {
    refreshToken = getStorageItem("admin_refresh_token")
  }
  if (!refreshToken) {
    refreshToken = getStorageItem("mizizzi_refresh_token")
  }

  if (!refreshToken) {
    const error = new Error("No refresh token available") as ApiError
    error.code = "NO_REFRESH_TOKEN"
    processQueue(error, null)
    return null
  }

  isRefreshing = true

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TOKEN_REFRESH_TIMEOUT)

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      // Corrected refresh endpoint
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
      const error = new Error(`Token refresh failed`) as ApiError
      error.status = response.status
      error.code = "TOKEN_REFRESH_FAILED"

      if (response.status === 401 || response.status === 403) {
        const keysToRemove = [
          "mizizzi_token",
          "mizizzi_refresh_token",
          "mizizzi_csrf_token",
          "admin_token",
          "admin_refresh_token",
          "admin_user",
          "user",
        ]
        removeStorageItems(keysToRemove)

        if (isAdminRoute()) {
          window.location.href = "/admin/login?reason=session_expired"
        }
      }

      processQueue(error, null)
      return null
    }

    const data: TokenRefreshResponse = await response.json()

    if (data.access_token) {
      setStorageItem("mizizzi_token", data.access_token)
      if (isAdminRoute() || isAdminUser()) {
        setStorageItem("admin_token", data.access_token)
      }

      if (data.csrf_token) {
        setStorageItem("mizizzi_csrf_token", data.csrf_token)
      }

      if (data.refresh_token) {
        setStorageItem("mizizzi_refresh_token", data.refresh_token)
        if (isAdminRoute() || isAdminUser()) {
          setStorageItem("admin_refresh_token", data.refresh_token)
        }
      }

      if (data.user) {
        setStorageItem("user", JSON.stringify(data.user))
        if (isAdminRoute() || isAdminUser()) {
          setStorageItem("admin_user", JSON.stringify(data.user))
        }
      }

      processQueue(null, data.access_token)
      return data.access_token
    } else {
      const error = new Error("No access token received") as ApiError
      error.code = "NO_ACCESS_TOKEN"
      processQueue(error, null)
      return null
    }
  } catch (error) {
    const apiError = error as ApiError

    if (apiError.name === "AbortError") {
      apiError.code = "TOKEN_REFRESH_TIMEOUT"
      if (IS_DEVELOPMENT) {
        logger.warn("Token refresh request timed out")
      }
    } else {
      apiError.code = "TOKEN_REFRESH_ERROR"
      logger.error("Token refresh error", { error: apiError.message })
    }

    if (apiError.message?.includes("401") || apiError.message?.includes("403")) {
      const keysToRemove = [
        "mizizzi_token",
        "mizizzi_refresh_token",
        "mizizzi_csrf_token",
        "admin_token",
        "admin_refresh_token",
        "admin_user",
        "user",
      ]
      removeStorageItems(keysToRemove)

      if (isAdminRoute()) {
        window.location.href = "/admin/login?reason=token_refresh_failed"
      }
    }

    processQueue(apiError, null)
    return null
  } finally {
    isRefreshing = false
  }
}

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// Enhanced request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = getToken()

    if (token) {
      if (config.url?.includes("/api/admin/") && !validateAdminToken(token)) {
        logger.error("Invalid admin token detected, clearing tokens")
        const keysToRemove = ["mizizzi_token", "admin_token", "mizizzi_refresh_token", "admin_refresh_token"]
        removeStorageItems(keysToRemove)
      } else {
        config.headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`
      }
    }

    config.headers["X-Requested-With"] = "XMLHttpRequest"

    // Check backend availability for critical requests
    if (!config._skipErrorHandling) {
      const isCriticalRequest =
        config.url?.includes("/api/admin/") ||
        config.url?.includes("/api/auth/") ||
        config.method?.toLowerCase() !== "get"

      if (isCriticalRequest) {
        const backendAvailable = await checkBackendAvailability()
        if (!backendAvailable) {
          const error = new Error("Backend service unavailable") as ApiError
          error.code = "BACKEND_UNAVAILABLE"
          error.isBackendUnavailable = true
          throw error
        }
      }
    }

    if (IS_DEVELOPMENT) {
      const method = config.method?.toUpperCase() || "GET"
      const url = config.url || ""
      logger.debug(`API ${method} request`, {
        url,
        hasParams: !!config.params,
        hasData: !!config.data,
        hasAuth: !!config.headers.Authorization,
      })
    }

    return config
  },
  (error) => {
    logger.error("API request error", { error: (error as Error).message })
    return Promise.reject(error)
  },
)

// Enhanced response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Mark backend as available on successful response
    if (!isBackendAvailable) {
      isBackendAvailable = true
      lastBackendCheck = Date.now()
      logger.info("Backend connection restored")
      // Dispatch event for backend restored
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("backend-restored", {
            detail: {
              message: "Successfully reconnected to the server.",
            },
          }),
        )
      }
    }

    if (IS_DEVELOPMENT) {
      logger.debug("API response", {
        url: response.config.url,
        status: response.status,
        dataSize: response.data ? JSON.stringify(response.data).length : 0,
      })
    }

    // Fix ProductImage position/sort_order issue
    if (
      response.data &&
      response.config.url?.includes("/api/admin/products/") &&
      !response.config.url?.includes("/list")
    ) {
      if (response.data.images && Array.isArray(response.data.images)) {
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
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig
    const apiError = error as ApiError

    // Enhanced network error handling
    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      apiError.isNetworkError = true
      apiError.code = "NETWORK_ERROR"
      isBackendAvailable = false
      lastBackendCheck = Date.now()

      if (IS_DEVELOPMENT) {
        logger.warn("Network error detected", { url: originalRequest?.url })
      }

      // For non-critical requests, return graceful fallback
      if (originalRequest?.url?.includes("/api/products") && originalRequest?.method?.toLowerCase() === "get") {
        return Promise.resolve({
          data: [],
          status: 200,
          statusText: "OK (Offline)",
          headers: {},
          config: originalRequest,
        } as AxiosResponse)
      }

      // Dispatch network error event for critical endpoints
      if (originalRequest?.url?.includes("/api/admin/") || originalRequest?.url?.includes("/api/auth/")) {
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("network-error", {
              detail: {
                message: "Cannot connect to server. Please check your internet connection and try again.",
                originalRequest,
                isNetworkError: true,
              },
            }),
          )
        }
      }
    }

    // Handle backend unavailable error
    if (apiError.isBackendUnavailable) {
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("backend-unavailable", {
            detail: {
              message: "Server is currently unavailable. Please try again later.",
              originalRequest,
            },
          }),
        )
      }
      return Promise.reject(apiError)
    }

    // Enhanced 401 handling with retry logic
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retryCount = originalRequest._retryCount || 0

      if (originalRequest._retryCount >= MAX_RETRY_ATTEMPTS) {
        logger.error("Max retries reached for authentication")
        if (isAdminRoute()) {
          const keysToRemove = [
            "admin_token",
            "admin_refresh_token",
            "admin_user",
            "mizizzi_token",
            "mizizzi_refresh_token",
            "user",
          ]
          removeStorageItems(keysToRemove)
          window.location.href = "/admin/login?reason=max_retries_exceeded"
        }
        return Promise.reject(apiError)
      }

      // Handle non-critical endpoints gracefully
      const nonCriticalEndpoints = ["/api/wishlist", "/api/cart/", "/api/products"]
      const isNonCritical = nonCriticalEndpoints.some((endpoint) => originalRequest.url?.includes(endpoint))

      if (isNonCritical) {
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("auth-error", {
              detail: {
                status: 401,
                message: "Authentication failed",
                originalRequest,
                isNonCritical: true,
              },
            }),
          )
        }
        return Promise.reject(apiError)
      }

      // Handle admin route authentication
      if (isAdminRoute()) {
        if (typeof window !== "undefined" && window.location.pathname.includes("/admin/login")) {
          return Promise.reject(apiError)
        }

        originalRequest._retry = true
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

        try {
          const newToken = await refreshAuthToken()
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return api(originalRequest)
          } else {
            const dashboardEndpoints = ["/api/admin/dashboard", "/api/admin/stats"]
            const isDashboardRequest = dashboardEndpoints.some((endpoint) => originalRequest.url?.includes(endpoint))

            if (isDashboardRequest) {
              return Promise.reject(apiError)
            }

            const keysToRemove = [
              "admin_token",
              "admin_refresh_token",
              "admin_user",
              "mizizzi_token",
              "mizizzi_refresh_token",
              "user",
            ]
            removeStorageItems(keysToRemove)
            window.location.href = "/admin/login?reason=token_refresh_failed"
          }
        } catch (refreshError) {
          logger.error("Token refresh failed", { error: (refreshError as Error).message })

          const dashboardEndpoints = ["/api/admin/dashboard", "/api/admin/stats"]
          const isDashboardRequest = dashboardEndpoints.some((endpoint) => originalRequest.url?.includes(endpoint))

          if (isDashboardRequest) {
            return Promise.reject(apiError)
          }

          const keysToRemove = [
            "admin_token",
            "admin_refresh_token",
            "admin_user",
            "mizizzi_token",
            "mizizzi_refresh_token",
            "user",
          ]
          removeStorageItems(keysToRemove)
          window.location.href = "/admin/login?reason=refresh_error"
        }
      } else {
        const criticalEndpoints = ["/api/profile", "/api/orders"]
        const isCriticalEndpoint = criticalEndpoints.some((endpoint) => originalRequest.url?.includes(endpoint))

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

    return Promise.reject(apiError)
  },
)

// Store original methods for enhancement
const originalGet = api.get
const originalPost = api.post
const originalPut = api.put
const originalDelete = api.delete

// Enhanced GET method with offline support
api.get = async <T = unknown, R = AxiosResponse<T>>(url: string, config?: any): Promise<R> => {
  const safeConfig = { ...config, _skipErrorHandling: config?.skipErrorHandling }

  // Handle cart validation without auth
  if (url.includes("/api/cart/validate")) {
    const token = getToken()
    if (!token) {
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

      return defaultResponse
    }
  }

  // Enhanced caching for product requests
  if (url.includes("/api/products") && safeConfig.method !== "POST") {
    const requestKey = createRequestKey(url, safeConfig.params, "GET")

    const cached = productRequestCache.get(requestKey)
    if (cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
      if (IS_DEVELOPMENT) {
        logger.debug("Using cached product data", { key: requestKey })
      }
      return cached.data as R
    }

    if (typeof window === "undefined") {
      try {
        return (await originalGet.call(api, url, {
          ...safeConfig,
          withCredentials: true,
        })) as R
      } catch (error) {
        logger.error("Server-side API request failed", {
          url,
          error: (error as Error).message,
        })
        throw error
      }
    }

    return deduplicateRequest(requestKey, async () => {
      try {
        const response = (await originalGet.call(api, url, {
          ...safeConfig,
          withCredentials: true,
        })) as R

        const axiosResponse = response as AxiosResponse<T>
        productRequestCache.set(requestKey, {
          data: axiosResponse.data,
          timestamp: Date.now(),
        })
        return response
      } catch (error) {
        pendingApiRequests.delete(requestKey)

        // Return cached data if available during network error
        if ((error as ApiError).isNetworkError && cached) {
          logger.warn("Returning stale cached data due to network error", { key: requestKey })
          return cached.data as R
        }

        throw error
      }
    })
  }

  // Enhanced admin endpoint handling
  if (url.includes("/api/admin/")) {
    if (typeof window === "undefined") {
      try {
        return (await originalGet.call(api, url, {
          ...safeConfig,
          withCredentials: true,
        })) as R
      } catch (error) {
        logger.error("Server-side admin API request failed", {
          url,
          error: (error as Error).message,
        })
        throw error
      }
    }

    try {
      let adminToken = getStorageItem("admin_token")
      if (!adminToken) {
        adminToken = getStorageItem("mizizzi_token")
      }

      if (!adminToken) {
        const error = new Error("No authentication token available") as ApiError
        error.code = "NO_AUTH_TOKEN"
        throw error
      }

      if (!validateAdminToken(adminToken)) {
        const keysToRemove = ["admin_token", "admin_refresh_token", "mizizzi_token", "mizizzi_refresh_token"]
        removeStorageItems(keysToRemove)
        const error = new Error("Invalid authentication token") as ApiError
        error.code = "INVALID_AUTH_TOKEN"
        throw error
      }

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

      return response
    } catch (error) {
      logger.error("Admin endpoint request failed", {
        url,
        error: (error as Error).message,
      })
      throw error
    }
  }

  // Standard GET request
  try {
    const response = (await originalGet.call(api, url, {
      ...safeConfig,
      withCredentials: true,
    })) as R

    const axiosResponse = response as AxiosResponse<T>
    if (url.includes("/api/products") && axiosResponse.status === 200) {
      const cacheKey = `${url}${safeConfig ? JSON.stringify(safeConfig) : ""}`
      productRequestCache.set(cacheKey, {
        data: axiosResponse.data,
        timestamp: Date.now(),
      })
    }

    return response
  } catch (error) {
    // For non-critical GET requests, provide fallback responses
    if ((error as ApiError).isNetworkError && url.includes("/api/")) {
      logger.warn("Providing fallback response for network error", { url })

      return {
        data: [],
        status: 200,
        statusText: "OK (Offline)",
        headers: {},
        config: safeConfig,
      } as R
    }

    throw error
  }
}

// Enhanced POST method
api.post = async <T = unknown, R = AxiosResponse<T>>(url: string, data?: any, config?: any): Promise<R> => {
  try {
    return (await originalPost.call(api, url, data, {
      ...config,
      withCredentials: true,
    })) as R
  } catch (error) {
    const apiError = error as ApiError

    if (apiError.isNetworkError || apiError.isBackendUnavailable) {
      logger.error("POST request failed due to network/backend issues", {
        url,
        error: apiError.message,
      })
    }

    throw error
  }
}

// Enhanced PUT method
api.put = async <T = unknown, R = AxiosResponse<T>>(url: string, data?: any, config?: any): Promise<R> => {
  try {
    return (await originalPut.call(api, url, data, {
      ...config,
      withCredentials: true,
    })) as R
  } catch (error) {
    const apiError = error as ApiError

    if (apiError.isNetworkError || apiError.isBackendUnavailable) {
      logger.error("PUT request failed due to network/backend issues", {
        url,
        error: apiError.message,
      })
    }

    throw error
  }
}

// Enhanced DELETE method
api.delete = async <T = unknown, R = AxiosResponse<T>>(url: string, config?: any): Promise<R> => {
  const updatedConfig = {
    ...config,
    withCredentials: true,
  }

  try {
    if (url.includes("/api/wishlist")) {
      const fullUrl = `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`
      try {
        await fetch(fullUrl, {
          method: "OPTIONS",
          credentials: "include",
        })
      } catch (error) {
        if (IS_DEVELOPMENT) {
          logger.warn("Preflight request failed", {
            url,
            error: (error as Error).message,
          })
        }
      }
    }

    return originalDelete.call(api, url, updatedConfig) as Promise<R>
  } catch (error) {
    const apiError = error as ApiError

    if (apiError.isNetworkError || apiError.isBackendUnavailable) {
      logger.error("DELETE request failed due to network/backend issues", {
        url,
        error: apiError.message,
      })
    }

    throw error
  }
}

// Enhanced utility functions
export const getApiPath = (path: string): string => {
  if (!path.startsWith("/api/")) {
    return `/api${path.startsWith("/") ? path : `/${path}`}`
  }
  return path
}

export const apiWithCancel = (endpoint: string, config: Record<string, unknown> = {}) => {
  return api({
    ...config,
    url: endpoint,
    signal: getAbortController(endpoint),
    headers: { ...((config as any).headers || {}) },
  })
}

export const prefetchData = async (url: string, params: Record<string, unknown> = {}): Promise<boolean> => {
  try {
    await api.get(url, { params, skipErrorHandling: true })
    return true
  } catch (error) {
    logger.error("Failed to prefetch data", {
      url,
      error: (error as Error).message,
    })
    return false
  }
}

// Enhanced API health check
export const checkApiAvailability = async (): Promise<boolean> => {
  return checkBackendAvailability()
}

// Cache management utilities
export const clearApiCache = (): void => {
  productRequestCache.clear()
  pendingApiRequests.clear()
  if (IS_DEVELOPMENT) {
    logger.debug("API cache cleared")
  }
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
  removeStorageItems(keysToRemove)
  clearApiCache()

  if (IS_DEVELOPMENT) {
    logger.debug("Auth data cleared")
  }
}

// Backend status utilities
export const isBackendOnline = (): boolean => {
  return isBackendAvailable
}

export const getBackendStatus = (): { online: boolean; lastCheck: number } => {
  return {
    online: isBackendAvailable,
    lastCheck: lastBackendCheck,
  }
}

export default api
