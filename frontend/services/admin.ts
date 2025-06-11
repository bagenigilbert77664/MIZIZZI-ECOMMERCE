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

// WebSocket service mock
// const websocketService = {
//   send: (event: string, data: any) => {
//     console.log(`Simulating WebSocket send: ${event}`, data)
//   },
// }

// Default product template
const DEFAULT_PRODUCT: Product = {
  id: 0,
  name: "",
  slug: "",
  description: "",
  price: 0,
  sale_price: null,
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

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  try {
    // First try the main token
    let token = localStorage.getItem("mizizzi_token")

    // If no token, try admin-specific token
    if (!token) {
      token = localStorage.getItem("admin_token")
    }

    if (token) {
      console.log(`Found token: ${token.substring(0, 10)}...`)
      return token
    }

    console.warn("No authentication token found in localStorage")
    return null
  } catch (error) {
    console.error("Error accessing localStorage:", error)
    return null
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
}

// API response types
interface AdminLoginResponse {
  user: any
  access_token: string
  refresh_token?: string
  csrf_token?: string
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
  }
  order_status: Record<string, number>
  recent_orders: any[]
  recent_users: any[]
  low_stock_products: any[]
  sales_by_category: any[]
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
          return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
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
                return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
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
        (cleanUrl.startsWith("http") || cleanUrl.startsWith("/") || cleanUrl.startsWith("data:"))
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
function validateImageUrl(url: string): string | null {
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

// Main admin service
export const adminService = {
  // Authentication methods
  async login(credentials: { email: string; password: string; remember?: boolean }): Promise<AdminLoginResponse> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: credentials.email,
          password: credentials.password,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Login failed with status: ${response.status}`)
      }

      const data = await response.json()

      // Check if user has admin role
      if (!data.user || data.user.role !== "admin") {
        throw new Error("You don't have permission to access the admin area")
      }

      // Store tokens in localStorage
      if (data.access_token) {
        localStorage.setItem("mizizzi_token", data.access_token)
        localStorage.setItem("admin_token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
        localStorage.setItem("admin_refresh_token", data.refresh_token)
      }
      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      // Store user data
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("admin_user", JSON.stringify(data.user))

      return data
    } catch (error) {
      console.error("Admin login error:", error)
      throw error
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

  // Dashboard methods
  async getDashboardData(params?: { from_date?: string; to_date?: string }): Promise<AdminDashboardResponse> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("No authentication token available")
      }

      let url = `${getBaseUrl()}/api/admin/dashboard`
      if (params) {
        const queryParams = new URLSearchParams()
        if (params.from_date) queryParams.append("from_date", params.from_date)
        if (params.to_date) queryParams.append("to_date", params.to_date)

        const queryString = queryParams.toString()
        if (queryString) {
          url += `?${queryString}`
        }
      }

      console.log(`Making dashboard request to: ${url}`)
      console.log(`Using token: ${token?.substring(0, 10)}...`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      })

      console.log(`Dashboard response status: ${response.status}`)

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh the token
          console.log("🔄 Token expired, attempting refresh...")
          const refreshToken =
            localStorage.getItem("admin_refresh_token") || localStorage.getItem("mizizzi_refresh_token")

          if (refreshToken) {
            try {
              const refreshResponse = await fetch(`${getBaseUrl()}/api/refresh`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${refreshToken}`,
                },
                credentials: "include",
              })

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json()
                console.log("✅ Token refresh successful in admin service")

                if (refreshData.access_token) {
                  // Store new tokens
                  localStorage.setItem("mizizzi_token", refreshData.access_token)
                  localStorage.setItem("admin_token", refreshData.access_token)

                  if (refreshData.refresh_token) {
                    localStorage.setItem("mizizzi_refresh_token", refreshData.refresh_token)
                    localStorage.setItem("admin_refresh_token", refreshData.refresh_token)
                  }

                  // Store user data if provided
                  if (refreshData.user) {
                    localStorage.setItem("user", JSON.stringify(refreshData.user))
                    localStorage.setItem("admin_user", JSON.stringify(refreshData.user))
                  }

                  // Retry the original request with new token
                  const retryResponse = await fetch(url, {
                    method: "GET",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${refreshData.access_token}`,
                      Accept: "application/json",
                      "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "include",
                  })

                  if (retryResponse.ok) {
                    console.log("✅ Retry request successful after token refresh")
                    return await retryResponse.json()
                  } else {
                    console.error("❌ Retry request failed even after token refresh")
                  }
                }
              } else {
                console.error("❌ Token refresh failed in admin service")
              }
            } catch (refreshError) {
              console.error("❌ Token refresh error in admin service:", refreshError)
            }
          } else {
            console.warn("❌ No refresh token available in admin service")
          }

          // If refresh fails, redirect to login
          if (typeof window !== "undefined") {
            console.log("🚪 Redirecting to login due to authentication failure")
            window.location.href = "/admin/login?reason=session_expired"
          }
          throw new Error("Authentication failed - redirecting to login")
        }

        const errorText = await response.text()
        console.error(`Dashboard request failed: ${response.status} - ${errorText}`)
        throw new Error(`Dashboard request failed with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Dashboard data received successfully")
      return data
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      throw error
    }
  },

  async getProductStats(): Promise<any> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("No authentication token available")
      }

      const url = `${getBaseUrl()}/api/admin/stats/products`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Product stats request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching product stats:", error)
      throw error
    }
  },

  async getSalesStats(params: { period?: string; from?: string; to?: string }): Promise<any> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("No authentication token available")
      }

      const queryParams = new URLSearchParams()
      if (params.period) queryParams.append("period", params.period)
      if (params.from) queryParams.append("from", params.from)
      if (params.to) queryParams.append("to", params.to)

      const url = `${getBaseUrl()}/api/admin/stats/sales${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Sales stats request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching sales stats:", error)
      throw error
    }
  },

  // User methods
  async getUsers(params?: {
    page?: number
    per_page?: number
    role?: string
    search?: string
    is_active?: boolean
  }): Promise<any> {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("No authentication token available")
      }

      let url = `${getBaseUrl()}/api/admin/users`

      const queryParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
          }
        })
      }

      const queryString = queryParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Users request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching users:", error)
      throw error
    }
  },

  // Product methods
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
   * Get products with optional filtering parameters
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
        const response = await api.get("/api/products", { params: queryParams })
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
      return []
    }
  },

  /**
   * Get products by category slug
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

      const response = await api.get("/api/products", {
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
                  .map((img: ProductImage) => validateImageUrl(img.url))
                  .filter((url): url is string => url !== null)

                // Set thumbnail_url to the primary image if it exists
                const primaryImage = images.find((img: ProductImage) => img.is_primary)
                if (primaryImage && validateImageUrl(primaryImage.url)) {
                  product.thumbnail_url = validateImageUrl(primaryImage.url)
                } else if (images[0] && validateImageUrl(images[0].url)) {
                  product.thumbnail_url = validateImageUrl(images[0].url)
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
      return []
    }
  },

  /**
   * Get a single product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    // Validate product ID
    if (!id || typeof id !== "string" || isNaN(Number(id))) {
      console.error("Invalid product ID:", id)
      return null
    }

    // Check if API_BASE_URL is defined
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    if (!API_BASE_URL) {
      console.error("API_BASE_URL is not defined in environment variables.")
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

    // Make sure we have a complete URL
    const url = `${API_BASE_URL}/api/products/${id}`
    console.log(`Making request to: ${url}`)

    // Retry logic
    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        const response = await api.get(url)

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
                    .map((img: ProductImage) => validateImageUrl(img.url))
                    .filter((url): url is string => url !== null)

                  // Set thumbnail_url to the primary image if it exists
                  const primaryImage = images.find((img: ProductImage) => img.is_primary)
                  if (primaryImage && validateImageUrl(primaryImage.url)) {
                    product.thumbnail_url = validateImageUrl(primaryImage.url)
                  } else if (images[0] && validateImageUrl(images[0].url)) {
                    product.thumbnail_url = validateImageUrl(images[0].url)
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
   * Get product images using the batch service
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

      // Use the batch service instead of direct API call
      const images = await imageBatchService.fetchProductImages(productIdStr)

      // Ensure we have valid image objects with validated URLs
      const validImages = images
        .map((img, index): ProductImage | null => {
          if (!img || typeof img !== "object") return null

          // Get the URL from the image object
          const imageUrl = typeof img === "string" ? img : (img as any).url || img
          const validUrl = typeof imageUrl === "string" ? validateImageUrl(imageUrl) : null
          if (!validUrl) return null

          return {
            id: (img as any).id || `${productIdStr}-${index}`,
            product_id: productIdStr,
            url: validUrl,
            filename: (img as any).filename || "",
            is_primary: (img as any).is_primary || false,
            sort_order: (img as any).sort_order || index,
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

      // Try direct API call as fallback
      try {
        console.log(`Trying direct API call for product ${productId} images`)
        const response = await api.get(`/api/products/${productId}/images`)

        if (response.data) {
          let images: ProductImage[] = []

          if (Array.isArray(response.data)) {
            images = response.data
          } else if (response.data.images && Array.isArray(response.data.images)) {
            images = response.data.images
          } else if (response.data.items && Array.isArray(response.data.items)) {
            images = response.data.items
          }

          // Convert to proper format if needed and validate URLs
          const validImages = images
            .map((img, index): ProductImage | null => {
              // Handle both string URLs and image objects
              const imageUrl = typeof img === "string" ? img : (typeof img.url === "string" ? img.url : "")
              const validUrl = typeof imageUrl === "string" ? validateImageUrl(imageUrl) : null
              if (!validUrl) return null

              return {
                id: typeof img === "object" && img.id ? img.id : `${productId}-${index}`,
                product_id: productId,
                url: validUrl,
                filename: typeof img === "object" && img.filename ? img.filename : "",
                is_primary: typeof img === "object" && img.is_primary ? img.is_primary : index === 0,
                sort_order: typeof img === "object" && img.sort_order ? img.sort_order : index,
                alt_text: typeof img === "object" && img.alt_text ? img.alt_text : "",
              }
            })
            .filter((img): img is ProductImage => img !== null)

          if (validImages.length > 0) {
            // Cache the results
            productImagesCache.set(`product-images-${productId}`, {
              data: validImages,
              timestamp: Date.now(),
            })

            console.log(`Fallback API call successful: ${validImages.length} images for product ${productId}`)
            return validImages
          }
        }
      } catch (fallbackError) {
        console.error(`Fallback API call also failed for product ${productId}:`, fallbackError)
      }

      return []
    }
  },

  /**
   * Get a specific product image by ID
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
      const response = await api.get(`/api/product-images/${imageId}`)

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

      // Prepare product data
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
        image_urls: data.image_urls || [],
        thumbnail_url:
          data.thumbnail_url || (data.image_urls && data.image_urls.length > 0 ? data.image_urls[0] : null),
        variants: data.variants || [],
      }

      const response = await fetch(`${getBaseUrl()}/api/admin/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(productData),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API error response:", errorData)

        if (response.status === 401) {
          throw new Error("Authentication failed. Your session has expired. Please log in again.")
        } else if (response.status === 400) {
          throw new Error(errorData.error || errorData.message || "Invalid product data. Please check all fields.")
        } else if (response.status === 409) {
          throw new Error("A product with this name or SKU already exists.")
        } else if (response.status === 422) {
          if (errorData.errors) {
            const validationErrors = Object.entries(errorData.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
              .join("; ")
            throw new Error(`Validation errors: ${validationErrors}`)
          }
          throw new Error(errorData.error || errorData.message || "Validation failed")
        } else {
          throw new Error(
            errorData.error || errorData.message || `Failed to create product. Status: ${response.status}`,
          )
        }
      }

      const responseData = await response.json()
      console.log("Product created successfully:", responseData)

      let createdProduct
      if (responseData.product) {
        createdProduct = responseData.product
      } else if (responseData.data) {
        createdProduct = responseData.data
      } else {
        createdProduct = responseData
      }

      // Notify about new product
      if (createdProduct && createdProduct.id) {
        try {
          this.notifyProductUpdate(createdProduct.id.toString())
        } catch (notifyError) {
          console.warn("Failed to notify about new product:", notifyError)
        }
      }

      return createdProduct
    } catch (error: any) {
      console.error("Error creating product:", error)
      throw error
    }
  },

  async updateProduct(id: string, data: any): Promise<Product> {
    try {
      console.log("Updating product with data:", data)

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      try {
        const response = await fetch(`${getBaseUrl()}/api/admin/products/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
          credentials: "include",
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("API error response:", errorData)
          throw new Error(errorData.message || `Failed to update product. Status: ${response.status}`)
        }

        const responseData = await response.json()
        console.log("Product updated successfully:", responseData)

        // Notify about product update
        try {
          this.notifyProductUpdate(id)
        } catch (notifyError) {
          console.warn("Failed to notify about product update:", notifyError)
        }

        return responseData
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          console.error("Update request timed out")
          throw new Error("Request timed out. Please try again.")
        }

        throw fetchError
      }
    } catch (error: any) {
      console.error("Error updating product:", error)
      throw error
    }
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log("Deleting product with ID:", id)

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const response = await fetch(`${getBaseUrl()}/api/admin/products/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          credentials: "include",
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication failed. Your session has expired. Please log in again.")
          }

          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to delete product. Status: ${response.status}`)
        }

        const responseData = await response.json()
        console.log("Delete product response:", responseData)

        // Notify about product deletion
        try {
          this.notifyProductUpdate(id)
        } catch (notifyError) {
          console.warn("Failed to notify about product deletion:", notifyError)
        }

        return responseData || { success: true, message: "Product deleted successfully" }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          console.error("Delete request timed out")
          throw new Error("Request timed out. The product may or may not have been deleted.")
        }

        throw fetchError
      }
    } catch (error: any) {
      console.error("Error deleting product:", error)
      throw error
    }
  },

  /**
   * Get categories
   */
  async getCategories(params?: {
    page?: number
    per_page?: number
    parent_id?: number
    search?: string
    is_featured?: boolean
  }): Promise<Category[]> {
    try {
      // Check cache first
      const cacheKey = "all-categories"
      const now = Date.now()
      const cachedItem = categoriesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CATEGORIES_CACHE_DURATION) {
        console.log("Using cached categories data")
        return cachedItem.data as Category[]
      }

      const response = await api.get("/api/categories", { params })
      const categories = response.data.items || response.data || []

      // Cache the categories
      categoriesCache.set(cacheKey, {
        data: categories,
        timestamp: now,
      })

      return categories
    } catch (error) {
      console.error("Error fetching categories:", error)
      return []
    }
  },

  /**
   * Get brands
   */
  async getBrands(params?: { page?: number; per_page?: number; search?: string }): Promise<Brand[]> {
    try {
      // Check cache first
      const cacheKey = "all-brands"
      const now = Date.now()
      const cachedItem = brandsCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < BRANDS_CACHE_DURATION) {
        console.log("Using cached brands data")
        return cachedItem.data as Brand[]
      }

      const response = await api.get("/api/brands", { params })
      const brands = response.data.items || response.data || []

      // Cache the brands
      brandsCache.set(cacheKey, {
        data: brands,
        timestamp: now,
      })

      return brands
    } catch (error) {
      console.error("Error fetching brands:", error)
      return []
    }
  },

  /**
   * Normalize product prices and IDs
   */
  normalizeProductPrices(product: Product): Product {
    // Normalize product ID to number
    if (typeof product.id === "string") {
      product.id = Number.parseInt(product.id, 10)
    }

    // Ensure ID is a valid number
    if (typeof product.id !== "number" || isNaN(product.id)) {
      console.warn(`Invalid ID for product, using 0 as fallback`)
      product.id = 0
    }

    // Convert price to number if it's a string
    if (typeof product.price === "string") {
      product.price = Number.parseFloat(product.price) || 0
    }

    // Ensure price is a valid number
    if (typeof product.price !== "number" || isNaN(product.price) || product.price < 0) {
      console.warn(`Invalid price for product ${product.id}, setting default price`)
      product.price = 0
    }

    // Convert sale_price to number if it's a string
    if (typeof product.sale_price === "string") {
      product.sale_price = Number.parseFloat(product.sale_price) || null
    }

    // Ensure sale_price is a valid number or null
    if (
      product.sale_price !== undefined &&
      product.sale_price !== null &&
      (typeof product.sale_price !== "number" || isNaN(product.sale_price) || product.sale_price < 0)
    ) {
      console.warn(`Invalid sale_price for product ${product.id}, setting to null`)
      product.sale_price = null
    }

    return product
  },

  /**
   * Get products for cart items by IDs
   * Returns an array of products
   */
  async getProductsForCartItems(productIds: number[]): Promise<Product[]> {
    try {
      if (!productIds || productIds.length === 0) {
        return []
      }

      // Create a cache key for this request
      const cacheKey = productIds.sort().join(",")

      // Create an array to store the results
      const productList: Product[] = []

      // Check cache first for each product
      const uncachedIds: number[] = []

      productIds.forEach((id: number) => {
        const cacheKey = `product-${id}`
        const cachedItem = productCache.get(cacheKey)

        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
          // Use cached data
          const product = Array.isArray(cachedItem.data)
            ? cachedItem.data.find((p) => Number(p.id) === id)
            : (cachedItem.data as Product)

          if (product) {
            productList.push(product)
          } else {
            uncachedIds.push(id)
          }
        } else {
          uncachedIds.push(id)
        }
      })

      // If all products were in cache, return early
      if (uncachedIds.length === 0) {
        return productList
      }

      // Fetch uncached products
      const response = await api.get("/api/products")

      let allProducts: Product[] = []
      if (Array.isArray(response.data)) {
        allProducts = response.data
      } else if (response.data.items && Array.isArray(response.data.items)) {
        allProducts = response.data.items
      } else if (response.data.products && Array.isArray(response.data.products)) {
        allProducts = response.data.products
      }

      // Filter products to only include the ones we need
      const products = allProducts.filter((product) => {
        const productId = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id
        return uncachedIds.includes(productId)
      })

      // Process and cache the fetched products
      products.forEach((product) => {
        // Normalize product ID to number
        if (typeof product.id === "string") {
          product.id = Number.parseInt(product.id, 10)
        }

        // Normalize price data
        product = this.normalizeProductPrices(product)

        // Handle images with improved validation
        product.image_urls = parseImageUrls(product.image_urls)

        // Validate thumbnail_url
        if (product.thumbnail_url) {
          product.thumbnail_url = validateImageUrl(product.thumbnail_url)
        }

        // If we have image_urls but no thumbnail_url, set the first image as thumbnail
        if (product.image_urls && product.image_urls.length > 0 && !product.thumbnail_url) {
          product.thumbnail_url = product.image_urls[0]
        }

        // Add to the result array
        if (product.id) {
          productList.push({
            ...product,
            seller: product.seller || defaultSeller,
          })

          // Cache for future use
          productCache.set(`product-${product.id}`, {
            data: product,
            timestamp: Date.now(),
          })
        }
      })

      return productList
    } catch (error) {
      console.error("Error fetching products for cart items:", error)
      return []
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    products: number
    images: number
    categories: number
    brands: number
    batchServiceStats: any
  } {
    return {
      products: productCache.size,
      images: productImagesCache.size,
      categories: categoriesCache.size,
      brands: brandsCache.size,
      batchServiceStats: imageBatchService.getCacheStats(),
    }
  },

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    productCache.clear()
    productImagesCache.clear()
    categoriesCache.clear()
    brandsCache.clear()
    imageBatchService.clearCache()
    console.log("All caches cleared")
  },

  async getFeaturedProducts(): Promise<Product[]> {
    const response = await this.getProducts({ featured: true })
    return response
  },

  async getNewProducts(): Promise<Product[]> {
    const response = await this.getProducts({ new: true })
    return response
  },

  async getSaleProducts(): Promise<Product[]> {
    const response = await this.getProducts({ sale: true })
    return response
  },

  async getFlashSaleProducts(): Promise<Product[]> {
    const response = await this.getProducts({ flash_sale: true })
    return response
  },

  async getLuxuryDealProducts(): Promise<Product[]> {
    const response = await this.getProducts({ luxury_deal: true })
    return response
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const response = await api.get(`/api/products/${slug}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product with slug ${slug}:`, error)
      return null
    }
  },

  async getProductsByIds(productIds: number[]): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByIds for ids: ${productIds.join(", ")}`)
      const response = await api.get("/api/products/batch", {
        params: { ids: productIds.join(",") },
      })
      console.log("API response for batch products:", response.data)
      return (response.data.items || []).map((item: any) => item)
    } catch (error) {
      console.error(`Error fetching products by ids:`, error)
      return []
    }
  },

  // Prefetching methods
  async prefetchProductsByCategory(categoryId: string): Promise<boolean> {
    return prefetchData("/api/products", { category_id: categoryId, limit: 12 })
  },

  async prefetchHomePageProducts(): Promise<void> {
    try {
      await Promise.allSettled([
        this.prefetchProductsByCategory("featured"),
        prefetchData("/api/products", { flash_sale: true }),
        prefetchData("/api/products", { luxury_deal: true }),
        prefetchData("/api/products", { limit: 12 }),
      ])
    } catch (error) {
      console.error("Error prefetching homepage products:", error)
    }
  },

  // System health check
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      return response.ok
    } catch (error) {
      console.warn("API health check failed:", error)
      return false
    }
  },

  // Error handling
  handleApiError(error: any, context: string): void {
    console.error(`API Error in ${context}:`, error)

    // Check if it's a network error
    if (!navigator.onLine) {
      console.warn("Network is offline, using cached data where possible")
      return
    }

    // Check if it's a server error
    if (error.status >= 500) {
      console.warn("Server error detected, implementing fallback strategies")
      return
    }

    // Check if it's an auth error
    if (error.status === 401) {
      console.warn("Authentication error, may need to refresh token")
      return
    }
  },
}
