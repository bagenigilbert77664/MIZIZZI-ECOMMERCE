import api from "@/lib/api"
import type { ProductCreatePayload } from "@/types/admin"
import type { Product, Category, ProductImage, Brand } from "@/types"
// Add import for imageCache
import { imageCache } from "@/services/image-cache"
// Only showing the changes needed to integrate with the new batch service
import { imageBatchService } from "@/services/image-batch-service"

// Add a request deduplication cache at the top of the file
const pendingCartRequests = new Map<string, Promise<Product[]>>()

// Cache maps with timestamps for expiration - update type definitions
const productCache = new Map<string, { data: Product | Product[]; timestamp: number }>()
const productImagesCache = new Map<string, { data: ProductImage[]; timestamp: number }>()
const categoriesCache = new Map<string, { data: Category[]; timestamp: number }>()
const brandsCache = new Map<string, { data: Brand[]; timestamp: number }>()
const productReviewsCache = new Map<string, { data: any[]; timestamp: number }>() // Separate cache for reviews

// Cache durations
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for products
const CATEGORIES_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes for categories
const BRANDS_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes for brands

// Default seller information
const defaultSeller = {
  id: 1,
  name: "Mizizzi Store",
  rating: 4.8,
  verified: true,
  store_name: "Mizizzi Official Store",
  logo_url: "/logo.png",
}

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Default product template
const DEFAULT_PRODUCT: Product = {
  id: 0,
  name: "",
  slug: "",
  description: "",
  price: 0,
  sale_price: undefined,
  stock: 0,
  category_id: 0,
  brand_id: undefined,
  image_urls: [],
  is_featured: false,
  thumbnail_url: undefined,
  is_new: false,
  is_sale: false,
  is_flash_sale: false,
  is_luxury_deal: false,
  rating: 0,
  reviews: [],
  sku: "",
  weight: undefined,
  dimensions: undefined,
  variants: [],
  meta_title: "",
  meta_description: "",
  material: "",
  tags: [],
  created_at: "",
  updated_at: "",
  brand: undefined,
}

// Utility functions
async function prefetchData(url: string, params: any): Promise<boolean> {
  try {
    const response = await api.get(url, { params })
    return response.status === 200
  } catch (error) {
    console.error(`Error prefetching data from ${url}:`, error)
    return false
  }
}

// Enhanced token management functions
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  try {
    // For admin routes, always try admin token first, then fall back to regular token
    const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin")

    if (isAdminRoute) {
      const adminToken = localStorage.getItem("admin_token")
      if (adminToken && adminToken !== "null" && adminToken !== "undefined" && adminToken.trim() !== "") {
        console.log("✅ Using admin token for admin route")
        return adminToken.trim()
      }
    }

    // Fall back to regular token
    const token = localStorage.getItem("mizizzi_token")
    if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
      console.log("✅ Using regular token")
      return token.trim()
    }

    return null
  } catch (error) {
    console.error("❌ Error accessing localStorage:", error)
    return null
  }
}

// Enhanced JWT token validation
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split(".")[1]
    if (!base64Url) {
      console.error("❌ Invalid JWT format: missing payload")
      return null
    }

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error("❌ Error decoding JWT:", error)
    return null
  }
}

// Enhanced token validation
function validateAdminToken(token: string): boolean {
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
}

// Enhanced refresh token function with better error handling
const refreshAuthToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null

  // Get refresh token with same priority as auth context
  const refreshToken = localStorage.getItem("admin_refresh_token") || localStorage.getItem("mizizzi_refresh_token")

  if (!refreshToken || refreshToken === "null" || refreshToken === "undefined") {
    console.log("No refresh token available")
    return null
  }

  try {
    console.log("🔄 Attempting to refresh admin token...")

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

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
      console.warn(`Token refresh failed with status: ${response.status}`)

      // Clear tokens on auth failure
      if (response.status === 401 || response.status === 403) {
        console.log("Refresh token is invalid, clearing all auth data")
        const keysToRemove = [
          "admin_token",
          "admin_refresh_token",
          "admin_user",
          "mizizzi_token",
          "mizizzi_refresh_token",
          "user",
          "mizizzi_csrf_token",
        ]
        keysToRemove.forEach((key) => localStorage.removeItem(key))

        // Trigger a page reload to force re-authentication
        if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
          console.log("Redirecting to login due to invalid refresh token")
          window.location.href = "/admin/login?reason=session_expired"
        }
      }

      return null
    }

    const data = await response.json()

    if (data.access_token) {
      // Validate the new token before storing
      if (!validateAdminToken(data.access_token)) {
        console.error("❌ New token validation failed")
        return null
      }

      // Store new tokens using same pattern as auth context
      localStorage.setItem("admin_token", data.access_token)
      localStorage.setItem("mizizzi_token", data.access_token)

      if (data.refresh_token) {
        localStorage.setItem("admin_refresh_token", data.refresh_token)
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
      }

      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      if (data.user) {
        localStorage.setItem("admin_user", JSON.stringify(data.user))
        localStorage.setItem("user", JSON.stringify(data.user))
      }

      console.log("✅ Token refreshed successfully")
      return data.access_token
    }

    console.warn("No access token in refresh response")
    return null
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.warn("Token refresh request timed out")
    } else {
      console.warn("Token refresh error:", error)
    }
    return null
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
}

// API response types
interface AdminLoginResponse {
  success: boolean
  user: any
  access_token: string
  refresh_token?: string
  csrf_token?: string
  error?: string
}

interface AdminDashboardResponse {
  counts: {
    users: number
    products: number
    orders: number
    categories: number
    brands: number
    reviews: number
    pending_reviews: number
    newsletter_subscribers: number
  }
  sales: {
    today: number
    yesterday: number
    weekly: number
    monthly: number
    yearly: number
    total_revenue?: number
    pending_amount?: number
  }
  order_status: Record<string, number>
  recent_orders: any[]
  recent_users: any[]
  low_stock_products: any[]
  sales_by_category: any[]
  sales_data?: any[]
  new_signups_today?: number
  new_signups_week?: number
  orders_in_transit?: number
  low_stock_count?: number
}

// Helper function to safely parse and validate image URLs
function parseImageUrls(imageUrls: any): string[] {
  if (!imageUrls) return []

  try {
    // If it's already an array, filter and return valid URLs
    if (Array.isArray(imageUrls)) {
      // Check if it's a malformed array of characters (like the API issue)
      if (imageUrls.length > 0 && typeof imageUrls[0] === "string" && imageUrls[0].length === 1) {
        // This is likely a malformed character array, try to reconstruct
        const reconstructed = imageUrls.join("")
        try {
          const parsed = JSON.parse(reconstructed)
          if (Array.isArray(parsed)) {
            return parsed
              .filter((url): url is string => typeof url === "string" && url.trim() !== "")
              .map((url: string) => url.trim())
              .filter((url: string) => {
                return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
              })
          }
        } catch (e) {
          console.warn("Failed to reconstruct malformed image URLs:", e)
          return []
        }
      }

      // Normal array processing
      return imageUrls
        .filter((url): url is string => typeof url === "string" && url.trim() !== "")
        .map((url: string) => url.trim())
        .filter((url: string) => {
          if (url === "" || url.includes("{") || url.includes("}")) return false
          if (url === "[" || url === "]" || url.startsWith("[") || url.endsWith("]")) return false
          if (url.includes("undefined") || url.includes("null")) return false
          return url.startsWith("http") || url.startsWith("data:") || url.startsWith("/")
        })
    }

    // If it's a string, try to parse as JSON first
    if (typeof imageUrls === "string") {
      // Check for malformed strings that look like broken arrays
      if (imageUrls === "[" || imageUrls === "]" || imageUrls === "[]") {
        return []
      }

      // Check if it looks like JSON
      if (imageUrls.startsWith("[") && imageUrls.endsWith("]")) {
        try {
          const parsed = JSON.parse(imageUrls)
          if (Array.isArray(parsed)) {
            return parsed
              .filter((url): url is string => typeof url === "string" && url.trim() !== "")
              .map((url: string) => url.trim())
              .filter((url: string) => {
                if (url === "" || url.includes("{") || url.includes("}")) return false
                if (url === "[" || url === "]" || url.startsWith("[") || url.endsWith("]")) return false
                if (url.includes("undefined") || url.includes("null")) return false
                return url.startsWith("http") || url.startsWith("data:") || url.startsWith("/")
              })
          }
        } catch (error) {
          console.warn("Failed to parse image URLs JSON:", error)
          return []
        }
      }

      // If not JSON or parsing failed, treat as single URL
      const cleanUrl = imageUrls.trim()
      if (
        cleanUrl &&
        !cleanUrl.includes("{") &&
        !cleanUrl.includes("}") &&
        cleanUrl !== "[" &&
        cleanUrl !== "]" &&
        !cleanUrl.startsWith("[") &&
        !cleanUrl.endsWith("]") &&
        !cleanUrl.includes("undefined") &&
        !cleanUrl.includes("null") &&
        (cleanUrl.startsWith("http") || cleanUrl.startsWith("data:") || cleanUrl.startsWith("/"))
      ) {
        return [cleanUrl]
      }
    }

    return []
  } catch (error) {
    console.error("Error parsing image URLs:", error)
    return []
  }
}

// Helper function to validate and clean image URL
function validateImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null

  const cleanUrl = url.trim()

  // Check for invalid characters or patterns
  if (
    cleanUrl === "" ||
    cleanUrl.includes("{") ||
    cleanUrl.includes("}") ||
    cleanUrl === "undefined" ||
    cleanUrl === "null" ||
    cleanUrl === "[" ||
    cleanUrl === "]" ||
    cleanUrl.startsWith("[") ||
    cleanUrl.endsWith("]")
  ) {
    return null
  }

  // Must be a valid URL format
  if (!cleanUrl.startsWith("http") && !cleanUrl.startsWith("/") && !cleanUrl.startsWith("data:")) {
    return null
  }

  // If it's a relative URL, make sure it starts with /
  if (!cleanUrl.startsWith("http") && !cleanUrl.startsWith("data:") && !cleanUrl.startsWith("/")) {
    return `/${cleanUrl}`
  }

  return cleanUrl
}

// Helper function to get image URL from ProductImage or string
function getImageUrl(img: string | ProductImage): string {
  if (typeof img === "string") {
    return img
  }
  return img.url || ""
}

// Main admin service
export const adminService = {
  // Authentication methods
  async login(credentials: { email: string; password: string }): Promise<AdminLoginResponse> {
    try {
      console.log("🔐 Attempting admin login for:", credentials.email)

      const baseUrl = getBaseUrl()
      console.log("Using API base URL:", baseUrl)

      // Prepare login payload - use "identifier" instead of "email" to match backend expectations
      const loginPayload = {
        identifier: credentials.email.trim(), // Backend expects "identifier" field
        password: credentials.password,
        remember: false,
      }

      console.log("Login payload:", { ...loginPayload, password: "[REDACTED]" })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const response = await fetch(`${baseUrl}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(loginPayload),
          credentials: "include",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("Login response status:", response.status)

        // Get response text first to debug
        const responseText = await response.text()
        console.log("Raw response:", responseText)

        let data: any = {}
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Failed to parse response JSON:", parseError)
          return {
            success: false,
            error: "Invalid response from server",
            user: null,
            access_token: "",
          }
        }

        if (!response.ok) {
          console.error("Login failed with status:", response.status)
          console.error("Error response:", data)

          let errorMessage = "Login failed"

          if (response.status === 400) {
            errorMessage = data.error || data.message || data.msg || "Invalid email or password format"
          } else if (response.status === 401) {
            errorMessage = data.error || data.message || data.msg || "Invalid email or password"
          } else if (response.status === 403) {
            errorMessage = data.error || data.message || data.msg || "Account access denied"
          } else if (response.status === 429) {
            errorMessage = "Too many login attempts. Please try again later."
          } else if (response.status >= 500) {
            errorMessage = "Server error. Please try again later."
          } else {
            errorMessage = data.error || data.message || data.msg || `Login failed with status: ${response.status}`
          }

          return {
            success: false,
            error: errorMessage,
            user: null,
            access_token: "",
          }
        }

        console.log("Login successful")

        // Validate response structure
        if (!data.user) {
          console.error("No user data in response")
          return {
            success: false,
            error: "Invalid response: missing user data",
            user: null,
            access_token: "",
          }
        }

        if (!data.access_token) {
          console.error("No access token in response")
          return {
            success: false,
            error: "Invalid response: missing access token",
            user: null,
            access_token: "",
          }
        }

        // Check if user has admin role
        const userRole = data.user.role
        const isAdmin =
          userRole === "admin" ||
          userRole === "ADMIN" ||
          (typeof userRole === "object" && userRole.value === "admin") ||
          (typeof userRole === "object" && userRole.name === "admin")

        if (!isAdmin) {
          console.error("User does not have admin role:", userRole)
          return {
            success: false,
            error: "You don't have permission to access the admin area",
            user: null,
            access_token: "",
          }
        }

        console.log("✅ User has admin role:", userRole)

        // Validate the token before storing
        if (!validateAdminToken(data.access_token)) {
          console.error("❌ Token validation failed")
          return {
            success: false,
            error: "Invalid authentication token received",
            user: null,
            access_token: "",
          }
        }

        // Store tokens and user data
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("admin_token", data.access_token)
            localStorage.setItem("mizizzi_token", data.access_token)

            if (data.refresh_token) {
              localStorage.setItem("admin_refresh_token", data.refresh_token)
              localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
            }

            if (data.csrf_token) {
              localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
            }

            localStorage.setItem("admin_user", JSON.stringify(data.user))
            localStorage.setItem("user", JSON.stringify(data.user))

            console.log("✅ Auth data stored in localStorage")
          } catch (storageError) {
            console.error("Failed to store auth data:", storageError)
          }
        }

        return {
          success: true,
          user: data.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          csrf_token: data.csrf_token,
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          console.error("Login request timed out")
          return {
            success: false,
            error: "Login request timed out. Please check your connection and try again.",
            user: null,
            access_token: "",
          }
        }

        console.error("Login fetch error:", fetchError)

        // Check if it's a network error
        if (fetchError instanceof TypeError && fetchError.message.includes("fetch")) {
          return {
            success: false,
            error: "Unable to connect to server. Please check your internet connection.",
            user: null,
            access_token: "",
          }
        }

        return {
          success: false,
          error: "Network error. Please try again.",
          user: null,
          access_token: "",
        }
      }
    } catch (error: any) {
      console.error("Admin login error:", error)
      return {
        success: false,
        error: error.message || "An unexpected error occurred during login",
        user: null,
        access_token: "",
      }
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${getBaseUrl()}/api/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        credentials: "include",
      })
    } catch (error) {
      console.warn("Logout API call failed, continuing with local logout:", error)
    }

    // Clear all stored data
    const keysToRemove = [
      "mizizzi_token",
      "mizizzi_refresh_token",
      "mizizzi_csrf_token",
      "admin_token",
      "admin_refresh_token",
      "user",
      "admin_user",
    ]
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  },

  // Enhanced dashboard data method using direct fetch to avoid axios interceptor issues
  async getDashboardData(params?: { from_date?: string; to_date?: string }): Promise<AdminDashboardResponse> {
    const token = getAuthToken()

    if (!token) {
      console.warn("No authentication token available for dashboard")
      throw new Error("No authentication token available")
    }

    // Validate token before making request
    if (!validateAdminToken(token)) {
      console.error("❌ Invalid admin token, attempting refresh...")

      // Try to refresh token
      const newToken = await refreshAuthToken()
      if (!newToken) {
        throw new Error("Authentication failed - please log in again")
      }

      // Use the new token for the request
      return this.getDashboardData(params)
    }

    let url = `/api/admin/dashboard`
    if (params) {
      const queryParams = new URLSearchParams()
      if (params.from_date) queryParams.append("from_date", params.from_date)
      if (params.to_date) queryParams.append("to_date", params.to_date)

      const queryString = queryParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    console.log(`📊 Making dashboard request to: ${url}`)

    try {
      // Use direct fetch instead of axios to avoid interceptor issues
      const baseUrl = getBaseUrl()
      const fullUrl = `${baseUrl}${url}`

      console.log(`🔗 Full dashboard URL: ${fullUrl}`)
      console.log(`🔑 Using token: ${token.substring(0, 20)}...`)

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      })

      console.log(`📊 Dashboard response status: ${response.status}`)

      if (!response.ok) {
        if (response.status === 401) {
          console.log("🔐 Dashboard authentication failed, attempting token refresh...")

          // Try to refresh token
          const newToken = await refreshAuthToken()
          if (newToken && validateAdminToken(newToken)) {
            console.log("🔄 Retrying dashboard request with refreshed token...")

            // Retry with new token
            const retryResponse = await fetch(fullUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${newToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              credentials: "include",
            })

            if (retryResponse.ok) {
              const data = await retryResponse.json()
              console.log("✅ Dashboard data received after token refresh")
              return data
            } else {
              console.error(`❌ Dashboard retry failed with status: ${retryResponse.status}`)
              throw new Error(`Dashboard request failed: ${retryResponse.status}`)
            }
          } else {
            console.error("❌ Token refresh failed for dashboard")
            throw new Error("Authentication failed - please log in again")
          }
        } else {
          console.error(`❌ Dashboard request failed with status: ${response.status}`)
          throw new Error(`Dashboard request failed: ${response.status}`)
        }
      }

      const data = await response.json()
      console.log("✅ Dashboard data received successfully")
      return data
    } catch (error: any) {
      console.error("Dashboard request failed:", error)

      // Handle different error types
      if (error.message?.includes("401") || error.message?.includes("Authentication")) {
        throw new Error("Authentication failed - please log in again")
      } else if (error.message?.includes("404")) {
        throw new Error("Admin dashboard endpoint not found. Please check backend configuration.")
      } else if (error.message?.includes("403")) {
        throw new Error("Access forbidden. Admin privileges required.")
      } else if (error.message?.includes("500")) {
        throw new Error("Server error. Please try again later.")
      } else {
        // For any other error, throw with original message
        throw new Error(error.message || "Failed to load dashboard data")
      }
    }
  },

  // Product stats using backend routes
  async getProductStats(): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available for product stats")
    }

    if (!validateAdminToken(token)) {
      const newToken = await refreshAuthToken()
      if (!newToken) {
        throw new Error("Authentication failed - please log in again")
      }
    }

    console.log("📈 Fetching product stats...")

    const response = await api.get("/api/admin/stats/products", {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("✅ Product stats received successfully:", response.data)
    return response.data
  },

  // Sales stats using backend routes
  async getSalesStats(params: { period?: string; from?: string; to?: string }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available for sales stats")
    }

    if (!validateAdminToken(token)) {
      const newToken = await refreshAuthToken()
      if (!newToken) {
        throw new Error("Authentication failed - please log in again")
      }
    }

    const queryParams = new URLSearchParams()
    if (params.period) queryParams.append("period", params.period)
    if (params.from) queryParams.append("from", params.from)
    if (params.to) queryParams.append("to", params.to)

    const url = `/api/admin/stats/sales${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    console.log("📊 Fetching sales stats...")

    const response = await api.get(url, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log("✅ Sales stats received successfully:", response.data)
    return response.data
  },

  // Add helper methods for token validation
  validateToken(token: string): any {
    return decodeJWT(token)
  },

  isValidAdminToken(decoded: any): boolean {
    return validateAdminToken(decoded)
  },

  // User management methods using backend routes
  async getUsers(params?: {
    page?: number
    per_page?: number
    role?: string
    search?: string
    is_active?: boolean
  }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get("/api/admin/users", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async activateUser(userId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.post(
      `/api/admin/users/${userId}/activate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    return response.data
  },

  async deactivateUser(userId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.post(
      `/api/admin/users/${userId}/deactivate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    return response.data
  },

  // Order management methods using backend routes
  async getOrders(params?: {
    page?: number
    per_page?: number
    status?: string
    payment_status?: string
    search?: string
    date_from?: string
    date_to?: string
    min_amount?: string
    max_amount?: string
  }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get("/api/admin/orders", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async getOrderById(orderId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get(`/api/admin/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async updateOrderStatus(orderId: number, data: { status: string }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.put(`/api/admin/orders/${orderId}/status`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  // Category management methods using backend routes
  async getCategories(params?: {
    page?: number
    per_page?: number
    parent_id?: number
    search?: string
    is_featured?: boolean
  }): Promise<Category[]> {
    try {
      // Check cache first
      const cacheKey = `categories-${JSON.stringify(params || {})}`
      const now = Date.now()
      const cachedItem = categoriesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CATEGORIES_CACHE_DURATION) {
        console.log("Using cached categories data")
        return cachedItem.data as Category[]
      }

      const response = await api.get("/api/admin/categories", { params })
      const categories = response.data.items || response.data || []

      // Cache the categories
      categoriesCache.set(cacheKey, {
        data: categories,
        timestamp: now,
      })

      return categories
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  },

  async deleteCategory(categoryId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/categories/${categoryId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  // Brand management methods using backend routes
  async getBrands(params?: { page?: number; per_page?: number; search?: string }): Promise<Brand[]> {
    try {
      // Check cache first
      const cacheKey = `brands-${JSON.stringify(params || {})}`
      const now = Date.now()
      const cachedItem = brandsCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < BRANDS_CACHE_DURATION) {
        console.log("Using cached brands data")
        return cachedItem.data as Brand[]
      }

      // Use the brands/list endpoint for compatibility
      const response = await api.get("/api/admin/brands/list", { params })
      const brands = response.data.items || response.data || []

      // Cache the brands
      brandsCache.set(cacheKey, {
        data: brands,
        timestamp: now,
      })

      return brands
    } catch (error) {
      console.error("Error fetching brands:", error)
      throw error
    }
  },

  // Product methods using backend routes
  /**
   * Prefetch product images for multiple products
   */
  async prefetchProductImages(productIds: string[]): Promise<void> {
    try {
      // Only prefetch on client side
      if (typeof window === "undefined") return

      // Prefetch images for each product in the background
      const prefetchPromises = productIds.map(async (productId) => {
        try {
          await this.getProductImages(productId)
        } catch (error) {
          // Silently fail for prefetching
          console.debug(`Failed to prefetch images for product ${productId}`)
        }
      })

      // Don't wait for all to complete, just start them
      Promise.allSettled(prefetchPromises)
    } catch (error) {
      console.debug("Error in prefetchProductImages:", error)
    }
  },

  /**
   * Get products with optional filtering parameters using backend routes
   */
  async getProducts(params: any = {}): Promise<Product[]> {
    try {
      console.log("API call: getProducts with params:", params)

      // Normalize query parameters
      const queryParams: Record<string, any> = { ...params }

      // Convert string "false" to boolean false if needed
      if (queryParams.is_flash_sale === "false" || queryParams.is_flash_sale === false) {
        queryParams.is_flash_sale = false
      }

      if (queryParams.is_luxury_deal === "false" || queryParams.is_luxury_deal === false) {
        queryParams.is_luxury_deal = false
      }

      // Generate cache key based on params
      const cacheKey = `products-${JSON.stringify(queryParams)}`

      // At the top of getProducts function, add this check:
      const requestKey = `products-${JSON.stringify(queryParams)}`

      // Check if there's already a pending request for the same parameters
      if (pendingCartRequests.has(requestKey)) {
        console.log(`Reusing pending request for: ${requestKey}`)
        return await pendingCartRequests.get(requestKey)!
      }

      // Create the request promise
      const requestPromise = (async () => {
        const now = Date.now()
        const cachedItem = productCache.get(cacheKey)

        // Return cached data if available and not expired
        if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
          console.log(`Using cached products data for params: ${JSON.stringify(queryParams)}`)
          // Ensure we return an array
          return Array.isArray(cachedItem.data) ? (cachedItem.data as Product[]) : [cachedItem.data as Product]
        }

        // Fetch from API if not cached or cache expired
        const response = await api.get("/api/admin/products", { params: queryParams })
        console.log("API response:", response.data)

        // Handle different API response formats
        let products: Product[] = []

        if (Array.isArray(response.data)) {
          products = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          products = response.data.items
        } else if (response.data.products && Array.isArray(response.data.products)) {
          products = response.data.products
        } else {
          console.warn("Unexpected API response format:", response.data)
          products = []
        }

        // Client-side filtering if needed
        if (queryParams.is_flash_sale === false) {
          products = products.filter((product) => !product.is_flash_sale)
        }

        if (queryParams.is_luxury_deal === false) {
          products = products.filter((product) => !product.is_luxury_deal)
        }

        // Normalize and enhance products
        const enhancedProducts = await Promise.all(
          products.map(async (product) => {
            // Normalize price data
            product = this.normalizeProductPrices(product)

            // Add product type for easier filtering and display
            product.product_type = product.is_flash_sale ? "flash_sale" : product.is_luxury_deal ? "luxury" : "regular"

            // Handle image_urls parsing with improved validation
            product.image_urls = parseImageUrls(product.image_urls)

            // Add debugging for image URLs
            if (process.env.NODE_ENV === "development") {
              console.log(`Product ${product.id} image URLs:`, product.image_urls)
              console.log(`Product ${product.id} thumbnail:`, product.thumbnail_url)
            }

            // Validate thumbnail_url
            if (product.thumbnail_url) {
              product.thumbnail_url = validateImageUrl(product.thumbnail_url)
            }

            // If we have image_urls but no thumbnail_url, set the first image as thumbnail
            if (product.image_urls.length > 0 && !product.thumbnail_url) {
              product.thumbnail_url = product.image_urls[0]
            }

            // Ensure we always have at least one valid image URL
            if (!product.image_urls || product.image_urls.length === 0) {
              if (product.thumbnail_url && !product.thumbnail_url.includes("placeholder.svg")) {
                product.image_urls = [product.thumbnail_url]
              } else {
                // Set a proper placeholder
                const placeholderUrl = `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(product.name)}`
                product.image_urls = [placeholderUrl]
                product.thumbnail_url = placeholderUrl
              }
            }

            return {
              ...product,
              seller: product.seller || defaultSeller,
            }
          }),
        )

        // Cache the array of products correctly - store as array
        productCache.set(cacheKey, {
          data: enhancedProducts, // This is already an array
          timestamp: now,
        })

        // Prefetch images for all products in the background (only on client side)
        if (typeof window !== "undefined") {
          this.prefetchProductImages(enhancedProducts.map((p) => p.id.toString()))
        }

        return enhancedProducts
      })()

      // Store the promise to prevent duplicate requests
      pendingCartRequests.set(requestKey, requestPromise)

      try {
        const result = await requestPromise
        return result
      } finally {
        // Clean up the pending request
        pendingCartRequests.delete(requestKey)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      throw error
    }
  },

  /**
   * Get products by category slug using backend routes
   */
  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByCategory for slug: ${categorySlug}`)

      // Check cache first
      const cacheKey = `products-category-${categorySlug}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached products for category ${categorySlug}`)
        // Ensure we return an array
        return Array.isArray(cachedItem.data) ? (cachedItem.data as Product[]) : [cachedItem.data as Product]
      }

      const response = await api.get("/api/admin/products", {
        params: { category_slug: categorySlug },
      })
      console.log("API response for category products:", response.data)

      // Handle different API response formats
      let products: Product[] = []

      if (Array.isArray(response.data)) {
        products = response.data
      } else if (response.data.items && Array.isArray(response.data.items)) {
        products = response.data.items
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products
      } else {
        console.warn("Unexpected API response format:", response.data)
        products = []
      }

      // Enhance products with images and normalize data
      const enhancedProducts = await Promise.all(
        products.map(async (product) => {
          // Normalize price data
          product = this.normalizeProductPrices(product)

          // Handle image_urls parsing with improved validation
          product.image_urls = parseImageUrls(product.image_urls)

          // Validate thumbnail_url
          if (product.thumbnail_url) {
            product.thumbnail_url = validateImageUrl(product.thumbnail_url)
          }

          // Fetch product images if they're not already included
          if (product.image_urls.length === 0 && product.id) {
            try {
              const images = await this.getProductImages(product.id.toString())
              if (images && images.length > 0) {
                product.image_urls = images
                  .map((img: ProductImage) => validateImageUrl(getImageUrl(img)))
                  .filter((url): url is string => url !== null)

                // Set thumbnail_url to the primary image if it exists
                const primaryImage = images.find((img: ProductImage) => img.is_primary)
                if (primaryImage && validateImageUrl(getImageUrl(primaryImage))) {
                  product.thumbnail_url = validateImageUrl(getImageUrl(primaryImage))
                } else if (images[0] && validateImageUrl(getImageUrl(images[0]))) {
                  product.thumbnail_url = validateImageUrl(getImageUrl(images[0]))
                }
              }
            } catch (error) {
              console.error(`Error fetching images for product ${product.id}:`, error)
            }
          }

          return {
            ...product,
            seller: product.seller || defaultSeller,
          }
        }),
      )

      // Cache the array of products correctly - store as array
      productCache.set(cacheKey, {
        data: enhancedProducts, // This is already an array
        timestamp: now,
      })

      // Prefetch images for all products in the background
      this.prefetchProductImages(enhancedProducts.map((p) => p.id.toString()))

      return enhancedProducts
    } catch (error) {
      console.error(`Error fetching products for category ${categorySlug}:`, error)
      throw error
    }
  },

  /**
   * Get a single product by ID using backend routes
   */
  async getProduct(id: string): Promise<Product | null> {
    // Validate product ID
    if (!id || typeof id !== "string" || isNaN(Number(id))) {
      console.error("Invalid product ID:", id)
      return null
    }

    // Check cache first
    const cacheKey = `product-${id}`
    const now = Date.now()
    const cachedItem = productCache.get(cacheKey)

    if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
      console.log(`Using cached product data for id ${id}`)
      // Handle the case where the cache might contain an array
      if (Array.isArray(cachedItem.data)) {
        // If it's an array, find the product with matching ID
        const product = cachedItem.data.find((p) => p.id.toString() === id)
        return product || null
      }
      // Otherwise return the single product
      return cachedItem.data as Product
    }

    console.log(`Fetching product with id ${id} from API`)

    // Retry logic
    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        const response = await api.get(`/api/admin/products/${id}`)

        // Check if the response data is valid
        if (!response || !response.data) {
          console.warn(`Invalid API response for product ${id}, retrying...`)
          retries++
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
          continue
        }

        let product = response.data

        // Ensure the product has valid data
        if (product) {
          // Normalize price data
          product = this.normalizeProductPrices(product)

          // Ensure variants have valid prices
          if (product.variants && Array.isArray(product.variants)) {
            product.variants = product.variants.map((variant: any) => {
              if (typeof variant.price === "string") {
                variant.price = Number.parseFloat(variant.price) || 0
              }

              if (typeof variant.price !== "number" || isNaN(variant.price) || variant.price < 0) {
                console.warn(`Invalid price for variant in product ${id}, using product price`)
                variant.price = product.price
              }
              return variant
            })
          }

          // Handle images with improved validation
          product.image_urls = parseImageUrls(product.image_urls)

          // Validate thumbnail_url
          if (product.thumbnail_url) {
            product.thumbnail_url = validateImageUrl(product.thumbnail_url)
          }

          // If no valid images, try to fetch from API
          if (product.image_urls.length === 0) {
            // Only fetch images on client side to avoid server-side issues
            if (typeof window !== "undefined") {
              try {
                const images = await this.getProductImages(id)
                if (images && images.length > 0) {
                  product.image_urls = images
                    .map((img: ProductImage) => validateImageUrl(getImageUrl(img)))
                    .filter((url): url is string => url !== null)

                  // Set thumbnail_url to the primary image if it exists
                  const primaryImage = images.find((img: ProductImage) => img.is_primary)
                  if (primaryImage && validateImageUrl(getImageUrl(primaryImage))) {
                    product.thumbnail_url = validateImageUrl(getImageUrl(primaryImage))
                  } else if (images[0] && validateImageUrl(getImageUrl(images[0]))) {
                    product.thumbnail_url = validateImageUrl(getImageUrl(images[0]))
                  }

                  console.log(`Loaded ${product.image_urls.length} images for product ${id}`)
                }
              } catch (error) {
                console.error(`Error fetching images for product ${product.id}:`, error)
              }
            } else {
              // On server side, use placeholder images if no images are provided
              if (!product.thumbnail_url) {
                product.thumbnail_url = `/placeholder.svg?height=400&width=400`
              }
              if (!product.image_urls || product.image_urls.length === 0) {
                product.image_urls = [product.thumbnail_url]
              }
            }
          }

          // If we have image_urls but no thumbnail_url, set the first image as thumbnail
          if (product.image_urls.length > 0 && !product.thumbnail_url) {
            product.thumbnail_url = product.image_urls[0]
          }

          // Ensure we always have at least one image
          if (!product.image_urls || product.image_urls.length === 0) {
            const fallbackImage = product.thumbnail_url || "/placeholder.svg?height=400&width=400"
            product.image_urls = [fallbackImage]
          }
          if (!product.thumbnail_url) {
            product.thumbnail_url = product.image_urls[0] || "/placeholder.svg?height=400&width=400"
          }

          product = {
            ...product,
            seller: product.seller || defaultSeller,
          }

          // Cache the result with timestamp - ensure we store a single product, not an array
          if (product.id) {
            productCache.set(cacheKey, {
              data: product,
              timestamp: now,
            })
          }

          // Also cache by ID for future reference
          if (product.id) {
            productCache.set(`product-${product.id}`, {
              data: product,
              timestamp: now,
            })
          }
        }

        return product
      } catch (error: any) {
        console.error(`Error fetching product with id ${id} (attempt ${retries + 1}):`, error)
        if (error.response?.status === 500) {
          console.warn(`Failed to fetch product with id ${id} due to a server error.`)
          return null
        }
        retries++
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      }
    }

    console.warn(`Failed to fetch product with id ${id} after ${MAX_RETRIES} attempts.`)
    return null
  },

  /**
   * Get product images using backend routes
   */
  async getProductImages(productId: string | number): Promise<ProductImage[]> {
    try {
      // Convert productId to string for consistency
      const productIdStr = typeof productId === "number" ? productId.toString() : productId

      // First check if the images are in our cache
      const cacheKey = `product-images-${productIdStr}`
      const now = Date.now()
      const cachedItem = productImagesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        // Only log in development and reduce verbosity
        if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
          console.log(`Using cached product images for product ${productIdStr}`)
        }
        return cachedItem.data
      }

      // Only log in development
      if (process.env.NODE_ENV === "development") {
        console.log(`Fetching images for product ${productIdStr} from API`)
      }

      // Use the backend admin route for product images
      const response = await api.get(`/api/admin/products/${productIdStr}/images`)

      let images: ProductImage[] = []

      if (response.data) {
        if (Array.isArray(response.data)) {
          images = response.data
        } else if (response.data.images && Array.isArray(response.data.images)) {
          images = response.data.images
        } else if (response.data.items && Array.isArray(response.data.items)) {
          images = response.data.items
        }
      }

      // Ensure we have valid image objects with validated URLs
      const validImages = images
        .map((img, index): ProductImage | null => {
          if (!img || typeof img !== "object") return null

          // Get the URL from the image object
          const imageUrl = getImageUrl(img)
          const validUrl = validateImageUrl(imageUrl)
          if (!validUrl) return null

          return {
            id: (img as any).id || `${productIdStr}-${index}`,
            product_id: productIdStr,
            url: validUrl,
            filename: (img as any).filename || "",
            is_primary: (img as any).is_primary || false,
            sort_order: (img as any).sort_order || (img as any).position || index,
            alt_text: (img as any).alt_text || "",
          }
        })
        .filter((img): img is ProductImage => img !== null)

      // Cache the results
      productImagesCache.set(cacheKey, {
        data: validImages,
        timestamp: now,
      })

      // Also cache individual image URLs for quick access
      validImages.forEach((img) => {
        if (img.id && img.url) {
          imageCache.set(`image-${img.id}`, img.url)
        }
      })

      console.log(`Successfully fetched ${validImages.length} images for product ${productIdStr}`)
      return validImages
    } catch (error) {
      console.error(`Error fetching images for product ${productId}:`, error)
      return []
    }
  },

  /**
   * Get a specific product image by ID using backend routes
   */
  async getProductImage(imageId: string): Promise<ProductImage | null> {
    try {
      // Check if the image URL is already in our cache
      const cachedUrl = imageCache.get(`image-${imageId}`)
      if (cachedUrl) {
        console.log(`Using cached image URL for image ${imageId}`)
        return {
          id: imageId,
          url: cachedUrl,
          is_primary: false,
          product_id: "",
          filename: "",
          sort_order: 0,
        }
      }

      console.log(`Fetching product image with ID ${imageId}`)
      const response = await api.get(`/api/admin/product-images/${imageId}`)

      // Cache the image URL for future use
      if (response.data && response.data.url) {
        const validUrl = validateImageUrl(response.data.url)
        if (validUrl) {
          imageCache.set(`image-${imageId}`, validUrl)
          return {
            ...response.data,
            url: validUrl,
          }
        }
      }

      return response.data
    } catch (error) {
      console.error(`Error fetching product image with ID ${imageId}:`, error)
      return null
    }
  },

  /**
   * Invalidate cache for a specific product
   */
  invalidateProductCache(id: string): void {
    const productCacheKey = `product-${id}`
    const imagesCacheKey = `product-images-${id}`
    productCache.delete(productCacheKey)
    productImagesCache.delete(imagesCacheKey)
    imageBatchService.invalidateCache(id)
    console.log(`Cache invalidated for product ${id} and its images`)
  },

  /**
   * Invalidate all product cache
   */
  invalidateAllProductCache(): void {
    productCache.clear()
    productImagesCache.clear()
    categoriesCache.clear()
    brandsCache.clear()
    imageBatchService.clearCache()
    console.log("All product cache invalidated")
  },

  /**
   * Notify about product updates
   */
  notifyProductUpdate(productId: string): void {
    console.log(`Notifying about product update for ID: ${productId}`)

    // Invalidate cache
    this.invalidateProductCache(productId)

    // Send WebSocket notification if available
    if (typeof window !== "undefined") {
      console.log("Sending WebSocket notification for product update")
      // websocketService.send("product_updated", { id: productId, timestamp: Date.now() })

      // Dispatch custom event
      const event = new CustomEvent("product-updated", { detail: { id: productId } })
      window.dispatchEvent(event)
    }
  },

  async createProduct(data: ProductCreatePayload): Promise<Product> {
    try {
      console.log("Creating product with data:", data)

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      if (!validateAdminToken(token)) {
        const newToken = await refreshAuthToken()
        if (!newToken) {
          throw new Error("Authentication failed - please log in again")
        }
      }

      // Validate required fields
      if (!data.name || data.name.trim().length < 3) {
        throw new Error("Product name must be at least 3 characters long")
      }
      if (!data.price || data.price <= 0) {
        throw new Error("Product price must be greater than 0")
      }
      if (!data.category_id || data.category_id <= 0) {
        throw new Error("Please select a valid category")
      }

      // Prepare product data to match backend expectations
      const productData = {
        name: data.name.trim(),
        slug:
          data.slug?.trim() ||
          data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        description: data.description || "",
        price: Number(data.price),
        sale_price: data.sale_price ? Number(data.sale_price) : null,
        stock: Number(data.stock) || 0,
        category_id: Number(data.category_id),
        brand_id: data.brand_id && data.brand_id !== 0 ? Number(data.brand_id) : null,
        sku: data.sku || `SKU-${Date.now()}`,
        weight: data.weight ? Number(data.weight) : null,
        is_featured: Boolean(data.is_featured),
        is_new: Boolean(data.is_new),
        is_sale: Boolean(data.is_sale),
        is_flash_sale: Boolean(data.is_flash_sale),
        is_luxury_deal: Boolean(data.is_luxury_deal),
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        material: data.material || "",
        is_active: true,
      }

      const response = await api.post("/api/admin/products", productData, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.data) {
        throw new Error("Failed to create product")
      }

      // Invalidate cache
      this.invalidateAllProductCache()

      return response.data
    } catch (error: any) {
      console.error("Error creating product:", error)
      throw error
    }
  },

  async updateProduct(id: string, data: ProductCreatePayload): Promise<Product> {
    try {
      console.log(`Updating product with id ${id} and data:`, data)

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      if (!validateAdminToken(token)) {
        const newToken = await refreshAuthToken()
        if (!newToken) {
          throw new Error("Authentication failed - please log in again")
        }
      }

      // Validate required fields
      if (!data.name || data.name.trim().length < 3) {
        throw new Error("Product name must be at least 3 characters long")
      }
      if (!data.price || data.price <= 0) {
        throw new Error("Product price must be greater than 0")
      }
      if (!data.category_id || data.category_id <= 0) {
        throw new Error("Please select a valid category")
      }

      // Prepare product data to match backend expectations
      const productData = {
        name: data.name.trim(),
        slug:
          data.slug?.trim() ||
          data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        description: data.description || "",
        price: Number(data.price),
        sale_price: data.sale_price ? Number(data.sale_price) : null,
        stock: Number(data.stock) || 0,
        category_id: Number(data.category_id),
        brand_id: data.brand_id && data.brand_id !== 0 ? Number(data.brand_id) : null,
        sku: data.sku || `SKU-${Date.now()}`,
        weight: data.weight ? Number(data.weight) : null,
        is_featured: Boolean(data.is_featured),
        is_new: Boolean(data.is_new),
        is_sale: Boolean(data.is_sale),
        is_flash_sale: Boolean(data.is_flash_sale),
        is_luxury_deal: Boolean(data.is_luxury_deal),
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        material: data.material || "",
      }

      const response = await api.put(`/api/admin/products/${id}`, productData, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.data) {
        throw new Error("Failed to update product")
      }

      // Invalidate cache
      this.invalidateAllProductCache()

      return response.data
    } catch (error: any) {
      console.error(`Error updating product with id ${id}:`, error)
      throw error
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      console.log(`Deleting product with id ${id}`)

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      if (!validateAdminToken(token)) {
        const newToken = await refreshAuthToken()
        if (!newToken) {
          throw new Error("Authentication failed - please log in again")
        }
      }

      const response = await api.delete(`/api/admin/products/${id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      })

      if (response.status !== 200 && response.status !== 204) {
        throw new Error("Failed to delete product")
      }

      // Invalidate cache
      this.invalidateAllProductCache()
    } catch (error: any) {
      console.error(`Error deleting product with id ${id}:`, error)
      throw error
    }
  },

  /**
   * Normalize product prices to ensure they are numbers
   */
  normalizeProductPrices(product: Product): Product {
    if (typeof product.price === "string") {
      product.price = Number.parseFloat(product.price) || 0
    }

    if (typeof product.sale_price === "string") {
      product.sale_price = Number.parseFloat(product.sale_price) || undefined
    }

    if (typeof product.price !== "number" || isNaN(product.price) || product.price < 0) product.price = 0

    if (
      product.sale_price !== undefined &&
      (typeof product.sale_price !== "number" || isNaN(product.sale_price) || product.sale_price < 0)
    ) {
      product.sale_price = undefined
    }

    return product
  },

  // Image upload methods using backend routes
  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      if (!validateAdminToken(token)) {
        const newToken = await refreshAuthToken()
        if (!newToken) {
          throw new Error("Authentication failed - please log in again")
        }
      }

      const formData = new FormData()
      formData.append("file", file)

      const response = await api.post("/api/admin/upload/image", formData, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "multipart/form-data",
        },
      })

      if (!response.data || !response.data.url) {
        throw new Error("Failed to upload image")
      }

      return {
        url: response.data.url,
        filename: response.data.filename,
      }
    } catch (error: any) {
      console.error("Error uploading image:", error)
      throw error
    }
  },

  async uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      if (!validateAdminToken(token)) {
        const newToken = await refreshAuthToken()
        if (!newToken) {
          throw new Error("Authentication failed - please log in again")
        }
      }

      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files[]", file)
      })

      const response = await api.post(`/api/admin/products/${productId}/upload-images`, formData, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "multipart/form-data",
        },
      })

      if (!response.data || !response.data.images) {
        throw new Error("Failed to upload product images")
      }

      // Invalidate cache for this product
      this.invalidateProductCache(productId)

      return response.data.images
    } catch (error: any) {
      console.error("Error uploading product images:", error)
      throw error
    }
  },

  async deleteProductImage(imageId: string): Promise<void> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      if (!validateAdminToken(token)) {
        const newToken = await refreshAuthToken()
        if (!newToken) {
          throw new Error("Authentication failed - please log in again")
        }
      }

      const response = await api.delete(`/api/admin/product-images/${imageId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      })

      if (response.status !== 200 && response.status !== 204) {
        throw new Error("Failed to delete product image")
      }

      // Invalidate all product cache since we don't know which product this image belongs to
      this.invalidateAllProductCache()
    } catch (error: any) {
      console.error("Error deleting product image:", error)
      throw error
    }
  },

  async setPrimaryImage(imageId: string): Promise<void> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      if (!validateAdminToken(token)) {
        const newToken = await refreshAuthToken()
        if (!newToken) {
          throw new Error("Authentication failed - please log in again")
        }
      }

      const response = await api.put(
        `/api/admin/product-images/${imageId}/set-primary`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (response.status !== 200) {
        throw new Error("Failed to set primary image")
      }

      // Invalidate all product cache since we don't know which product this image belongs to
      this.invalidateAllProductCache()
    } catch (error: any) {
      console.error("Error setting primary image:", error)
      throw error
    }
  },

  // Newsletter management using backend routes
  async getNewsletters(params?: {
    page?: number
    per_page?: number
    is_active?: boolean
    search?: string
  }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get("/api/admin/newsletters", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async toggleNewsletter(newsletterId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.post(
      `/api/admin/newsletters/${newsletterId}/toggle`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    return response.data
  },

  async exportNewsletters(params?: { is_active?: boolean }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get("/api/admin/newsletters/export", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async deleteNewsletter(newsletterId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/newsletters/${newsletterId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  // Cart management using backend routes
  async getCartItems(params?: {
    page?: number
    per_page?: number
    user_id?: number
    product_id?: number
  }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get("/api/admin/cart-items", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async deleteCartItem(cartItemId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/cart-items/${cartItemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async clearUserCart(userId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/users/${userId}/cart/clear`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  // Wishlist management using backend routes
  async getWishlistItems(params?: {
    page?: number
    per_page?: number
    user_id?: number
    product_id?: number
  }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get("/api/admin/wishlist-items", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async deleteWishlistItem(wishlistItemId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/wishlist-items/${wishlistItemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async clearUserWishlist(userId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/users/${userId}/wishlist/clear`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  // Address management using backend routes
  async getAddresses(params?: {
    page?: number
    per_page?: number
    user_id?: number
    type?: string
    is_default?: boolean
    search?: string
  }): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get("/api/admin/addresses", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async getAddressById(addressId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.get(`/api/admin/addresses/${addressId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async updateAddress(addressId: string, data: any): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.put(`/api/admin/addresses/${addressId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  async deleteAddress(addressId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/addresses/${addressId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    return response.data
  },

  // Bulk operations using backend routes
  async bulkUpdateProducts(productIds: string[], updates: any): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.post(
      "/api/admin/products/bulk-update",
      {
        product_ids: productIds,
        updates,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    // Invalidate cache after bulk update
    this.invalidateAllProductCache()

    return response.data
  },

  async updateProductStock(productId: string, stock: number): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.put(
      `/api/admin/products/${productId}/stock`,
      {
        stock,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    // Invalidate cache for this product
    this.invalidateProductCache(productId)

    return response.data
  },

  // Category management using backend routes
  async createCategory(data: any): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.post("/api/admin/categories", data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    // Invalidate categories cache
    categoriesCache.clear()

    return response.data
  },

  async updateCategory(categoryId: string, data: any): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.put(`/api/admin/categories/${categoryId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    // Invalidate categories cache
    categoriesCache.clear()

    return response.data
  },

  async toggleCategoryFeatured(categoryId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.post(
      `/api/admin/categories/${categoryId}/toggle-featured`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    // Invalidate categories cache
    categoriesCache.clear()

    return response.data
  },

  // Brand management using backend routes
  async createBrand(data: any): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.post("/api/admin/brands", data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    // Invalidate brands cache
    brandsCache.clear()

    return response.data
  },

  async updateBrand(brandId: string, data: any): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.put(`/api/admin/brands/${brandId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    // Invalidate brands cache
    brandsCache.clear()

    return response.data
  },

  async deleteBrand(brandId: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      throw new Error("No authentication token available")
    }

    const response = await api.delete(`/api/admin/brands/${brandId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    // Invalidate brands cache
    brandsCache.clear()

    return response.data
  },
  // Add this method to the adminService object
  isServiceAvailable(): boolean {
    try {
      const baseUrl = getBaseUrl()
      return !!baseUrl && typeof this.login === "function"
    } catch (error) {
      console.error("Service availability check failed:", error)
      return false
    }
  },
}

export default adminService
