import api from "@/lib/api"
import type { AdminPaginatedResponse, ProductCreatePayload } from "@/types/admin"
import type { Product } from "@/types"
import { productService } from "@/services/product"

// Declare the missing variables
const productCache = new Map()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
const websocketService = {
  send: (event: string, data: any) => {
    console.log(`Simulating WebSocket send: ${event}`, data)
  },
}

async function prefetchData(url: string, params: any): Promise<boolean> {
  try {
    const response = await api.get(url, { params })
    return response.status === 200
  } catch (error) {
    console.error(`Error prefetching data from ${url}:`, error)
    return false
  }
}

// Define the base URL for admin API endpoints
const ADMIN_API_BASE = "/api/admin"

// Define types for admin API responses
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

// Admin service with methods for interacting with the admin API
export const adminService = {
  // Authentication
  async login(credentials: { email: string; password: string; remember?: boolean }): Promise<AdminLoginResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
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
        localStorage.setItem("admin_token", data.access_token) // Also store as admin token
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
      // Try to call the logout endpoint
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mizizzi_token") || ""}`,
        },
        credentials: "include",
      })
    } catch (error) {
      console.warn("Logout API call failed, continuing with local logout:", error)
    }

    // Clear tokens and user data regardless of API response
    localStorage.removeItem("mizizzi_token")
    localStorage.removeItem("mizizzi_refresh_token")
    localStorage.removeItem("mizizzi_csrf_token")
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_refresh_token")
    localStorage.removeItem("user")
    localStorage.removeItem("admin_user")
  },

  // Dashboard data
  async getDashboardData(params?: { from_date?: string; to_date?: string }): Promise<AdminDashboardResponse> {
    try {
      // Use direct fetch to avoid CORS issues with axios
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Build the URL with query parameters if provided
      let url = `${baseUrl}/api/admin/dashboard`
      if (params) {
        const queryParams = new URLSearchParams()
        if (params.from_date) queryParams.append("from_date", params.from_date)
        if (params.to_date) queryParams.append("to_date", params.to_date)

        const queryString = queryParams.toString()
        if (queryString) {
          url += `?${queryString}`
        }
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
        throw new Error(`Dashboard request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      throw error
    }
  },

  // Product statistics
  async getProductStats(): Promise<any> {
    try {
      // Use direct fetch to avoid CORS issues with axios
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const url = `${baseUrl}/api/admin/stats/products`

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

  // Sales statistics
  async getSalesStats(params: { period?: string; from?: string; to?: string }): Promise<any> {
    try {
      // Use direct fetch to avoid CORS issues with axios
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Build the URL with query parameters
      const queryParams = new URLSearchParams()
      if (params.period) queryParams.append("period", params.period)
      if (params.from) queryParams.append("from", params.from)
      if (params.to) queryParams.append("to", params.to)

      const url = `${baseUrl}/api/admin/stats/sales${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

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

  // Users
  async getUsers(params?: { page?: number; per_page?: number; role?: string; search?: string }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`)

      // Add query parameters if provided
      if (params) {
        if (params.page) url.searchParams.append("page", params.page.toString())
        if (params.per_page) url.searchParams.append("per_page", params.per_page.toString())
        if (params.role) url.searchParams.append("role", params.role)
        if (params.search) url.searchParams.append("q", params.search)
      }

      const response = await fetch(url.toString(), {
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

  // Products
  async getProducts(params?: {
    page?: number
    per_page?: number
    category_id?: number
    brand_id?: number
    search?: string
    min_price?: number
    max_price?: number
    stock_status?: string
    featured?: boolean
    new?: boolean
    sale?: boolean
    flash_sale?: boolean
    luxury_deal?: boolean
  }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Build the URL with query parameters
      let url = `${baseUrl}/api/admin/products`

      // Create a new params object with a very large per_page value to get all products
      const updatedParams = {
        ...params,
        per_page: 10000, // Set a very large number to get all products
      }

      const queryParams = new URLSearchParams()
      Object.entries(updatedParams).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })

      const queryString = queryParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }

      console.log("Fetching all products with URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Products request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching products:", error)
      throw error
    }
  },

  // Get a single product
  async getProduct(id: string): Promise<Product | null> {
    try {
      // Check cache first
      const cacheKey = `product-${id}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached product data for id ${id}`)
        return cachedItem.data
      }

      console.log(`Fetching product with id ${id} from API`)
      const response = await api.get(`/api/products/${id}`)

      // Cache the result with timestamp
      if (response.data) {
        productCache.set(cacheKey, {
          data: response.data,
          timestamp: now,
        })
      }

      return this.mapProductFromApi(response.data)
    } catch (error) {
      console.error(`Error fetching product with id ${id}:`, error)
      return null
    }
  },

  // Invalidate cache for a specific product
  invalidateProductCache(id: string): void {
    const cacheKey = `product-${id}`
    productCache.delete(cacheKey)
    console.log(`Cache invalidated for product ${id}`)
  },

  // Invalidate all product cache
  invalidateAllProductCache(): void {
    productCache.clear()
    console.log("All product cache invalidated")
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const response = await api.get(`/api/products/${slug}`)
      return this.mapProductFromApi(response.data)
    } catch (error) {
      console.error(`Error fetching product with slug ${slug}:`, error)
      return null
    }
  },

  async getFeaturedProducts(): Promise<Product[]> {
    const response = await this.getProducts({ featured: true })
    return response.items
  },

  async getNewProducts(): Promise<Product[]> {
    const response = await this.getProducts({ new: true })
    return response.items
  },

  async getSaleProducts(): Promise<Product[]> {
    const response = await this.getProducts({ sale: true })
    return response.items
  },

  async getFlashSaleProducts(): Promise<Product[]> {
    const response = await this.getProducts({ flash_sale: true })
    return response.items
  },

  async getLuxuryDealProducts(): Promise<Product[]> {
    const response = await this.getProducts({ luxury_deal: true })
    return response.items
  },

  async getProductsByIds(productIds: number[]): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByIds for ids: ${productIds.join(", ")}`)
      const response = await api.get("/api/products/batch", {
        params: { ids: productIds.join(",") },
      })
      console.log("API response for batch products:", response.data)
      return (response.data.items || []).map((item: any) => this.mapProductFromApi(item))
    } catch (error) {
      console.error(`Error fetching products by ids:`, error)
      return []
    }
  },

  // Add a method to prefetch products for faster navigation
  async prefetchProductsByCategory(categoryId: string): Promise<boolean> {
    return prefetchData("/api/products", { category_id: categoryId, limit: 12 })
  },

  // Add a method to prefetch featured products for the homepage
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

  // Notify about product updates
  notifyProductUpdate(productId: string): void {
    console.log(`Notifying about product update for ID: ${productId}`)

    // Invalidate cache
    this.invalidateProductCache(productId)
    this.invalidateAllProductCache()

    // Send WebSocket notification if available
    if (typeof window !== "undefined") {
      console.log("Sending WebSocket notification for product update")
      websocketService.send("product_updated", { id: productId, timestamp: Date.now() })

      // Also dispatch a custom event that components can listen for
      const event = new CustomEvent("product-updated", { detail: { id: productId } })
      window.dispatchEvent(event)
    }
  },

  // Helper method to map API order data to our frontend Order type
  mapProductFromApi(apiProduct: any): Product {
    const product: Product = {
      id: apiProduct.id,
      name: apiProduct.name,
      slug: apiProduct.slug,
      description: apiProduct.description,
      price: apiProduct.price,
      sale_price: apiProduct.sale_price,
      stock: apiProduct.stock,
      category_id: apiProduct.category_id,
      brand_id: apiProduct.brand_id,
      image_urls: apiProduct.image_urls,
      is_featured: apiProduct.is_featured,
      thumbnail_url: apiProduct.thumbnail_url,
      is_new: apiProduct.is_new,
      is_sale: apiProduct.is_sale,
      is_flash_sale: apiProduct.is_flash_sale,
      is_luxury_deal: apiProduct.is_luxury_deal,
      rating: apiProduct.rating,
      reviews: apiProduct.reviews,
      sku: apiProduct.sku,
      weight: apiProduct.weight,
      dimensions: apiProduct.dimensions,
      variants: apiProduct.variants,
      meta_title: apiProduct.meta_title,
      meta_description: apiProduct.meta_description,
      material: apiProduct.material,
      tags: apiProduct.tags,
      created_at: apiProduct.created_at,
      updated_at: apiProduct.updated_at,
      // Ensure brand is always an object
      brand:
        typeof apiProduct.brand === "string"
          ? {
              id: 0, // Or some default ID
              name: apiProduct.brand,
              slug: "", // Or generate a slug
            }
          : apiProduct.brand || null,
    }
    return product
  },

  /**
   * Update a product
   */
  async updateProduct(id: string, data: any): Promise<Product> {
    try {
      console.log("Updating product with data:", data)

      // Get the token from localStorage
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      // Set up headers with authentication
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }

      // Add a timeout to ensure the request doesn't hang
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        // Make the API call with proper headers and timeout
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/products/${id}`, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(data),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Check if the response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("API error response:", errorData)
          throw new Error(errorData.message || `Failed to update product. Status: ${response.status}`)
        }

        // Parse the response
        const responseData = await response.json()
        console.log("Product updated successfully:", responseData)

        // Notify about product update via WebSocket
        try {
          websocketService.send("product_updated", { id: id, timestamp: Date.now() })
          console.log("WebSocket notification sent for product update")

          // Invalidate cache for this product
          this.invalidateProductCache(id)

          // Also dispatch a custom event that components can listen for
          if (typeof window !== "undefined") {
            const event = new CustomEvent("product-updated", { detail: { id, product: responseData } })
            window.dispatchEvent(event)
            console.log("Custom event dispatched for product update")
          }
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

      // Check if this is an authentication error
      if (error.response?.status === 401 || error.message?.includes("Authentication")) {
        throw new Error("Authentication failed. Your session has expired. Please log in again.")
      }

      throw error
    }
  },

  // Delete a product
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log("Deleting product with ID:", id)

      // Get the token from localStorage
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      // Set up headers with authentication
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }

      // Add a timeout to ensure the request doesn't hang
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/products/${id}`, {
          method: "DELETE",
          headers: headers,
          signal: controller.signal,
          credentials: "include", // Add credentials: include to ensure cookies are sent
        })

        clearTimeout(timeoutId)

        // Check if the response is ok
        if (!response.ok) {
          // Handle 401 Unauthorized specifically
          if (response.status === 401) {
            throw new Error("Authentication failed. Your session has expired. Please log in again.")
          }

          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to delete product. Status: ${response.status}`)
        }

        // Parse the response
        const responseData = await response.json()
        console.log("Delete product response:", responseData)

        // Notify about product deletion
        try {
          if (typeof productService !== "undefined" && typeof productService.notifyProductUpdate === "function") {
            productService.notifyProductUpdate(id)
          }
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

  // Create a product
  async createProduct(data: ProductCreatePayload): Promise<Product> {
    try {
      console.log("Creating product with data:", data)

      // Add a timeout to ensure the request doesn't hang
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        // Get the token from localStorage
        const token = localStorage.getItem("admin_token")
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.")
        }

        // Set up headers with authentication
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }

        // Make the API call with proper headers and timeout
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/products`, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Check if the response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("API error response:", errorData)
          throw new Error(errorData.message || `Failed to create product. Status: ${response.status}`)
        }

        // Parse the response
        const responseData = await response.json()
        console.log("Product created successfully:", responseData)

        // Notify about new product
        if (responseData && responseData.id) {
          try {
            productService.notifyProductUpdate(responseData.id.toString())
          } catch (notifyError) {
            console.warn("Failed to notify about new product:", notifyError)
          }
        }

        return responseData
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === "AbortError") {
          console.error("Create request timed out")
          throw new Error("Request timed out. Please try again.")
        }

        throw fetchError
      }
    } catch (error: any) {
      console.error("Error creating product:", error)

      // Check if this is an authentication error
      if (error.response?.status === 401 || error.message?.includes("Authentication")) {
        throw new Error("Authentication failed. Your session has expired. Please log in again.")
      }

      throw error
    }
  },

  // Orders
  async getOrders(params?: {
    page?: number
    per_page?: number
    status?: string
    payment_status?: string
    search?: string
    date_from?: string
    date_to?: string
    min_amount?: number
    max_amount?: number
  }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders`)

      // Add query parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Orders request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching orders:", error)
      throw error
    }
  },

  // Get a single order by ID
  async getOrder(orderId: number): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders/${orderId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Order request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error)
      throw error
    }
  },

  // Update order status
  async updateOrderStatus(
    orderId: number,
    data: { status: string; tracking_number?: string; tracking_url?: string; notes?: string },
  ): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Order status update failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error updating order status for order ${orderId}:`, error)
      throw error
    }
  },

  // Categories
  async getCategories(params?: {
    page?: number
    per_page?: number
    parent_id?: number
    search?: string
    is_featured?: boolean
  }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Build the URL with query parameters
      let url = `${baseUrl}/api/admin/categories`

      // Create a new params object with a very large per_page value to get all categories
      const updatedParams = {
        ...params,
        per_page: 10000, // Set a very large number to get all categories
      }

      if (updatedParams) {
        const queryParams = new URLSearchParams()
        Object.entries(updatedParams).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString())
          }
        })

        const queryString = queryParams.toString()
        if (queryString) {
          url += `?${queryString}`
        }
      }

      console.log("Fetching all categories with URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Categories request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  },

  // Brands
  async getBrands(params?: { page?: number; per_page?: number; search?: string }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Build the URL with query parameters
      let url = `${baseUrl}/api/admin/brands`

      // Add query parameters if provided
      if (params) {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value.toString())
          }
        })

        const queryString = queryParams.toString()
        if (queryString) {
          url += `?${queryString}`
        }
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
        throw new Error(`Brands request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching brands:", error)
      throw error
    }
  },

  // Get all brands (no pagination) for dropdowns
  async getBrandsList(): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/brands/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Brands list request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching brands list:", error)
      throw error
    }
  },

  // Reviews
  async getReviews(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/reviews", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching reviews:", error)
      throw error
    }
  },

  // Newsletter subscribers
  async getNewsletterSubscribers(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/newsletters", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching newsletter subscribers:", error)
      throw error
    }
  },

  // Newsletters
  async getNewsletters(params?: {
    page?: number
    per_page?: number
    is_active?: boolean
    search?: string
  }): Promise<any> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/newsletters`)

      // Add query parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Newsletters request failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching newsletters:", error)
      throw error
    }
  },

  // Get admin profile
  async getProfile(): Promise<any> {
    try {
      const response = await api.get("/api/admin/profile")
      return response.data
    } catch (error) {
      console.error("Error fetching admin profile:", error)
      throw error
    }
  },

  // Update admin profile
  async updateProfile(data: any): Promise<any> {
    try {
      const response = await api.put("/api/admin/profile", data)
      return response.data
    } catch (error) {
      console.error("Error updating admin profile:", error)
      throw error
    }
  },

  // Get order details
  async getOrderDetails(id: string): Promise<any> {
    try {
      const response = await api.get(`/api/admin/orders/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching order details for order ${id}:`, error)
      throw error
    }
  },

  // Create category
  async createCategory(data: any): Promise<any> {
    try {
      const response = await api.post("/api/admin/categories", data)
      return response.data
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  },

  // Update category
  async updateCategory(id: string, data: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/categories/${id}`, data)
      return response.data
    } catch (error) {
      console.error(`Error updating category ${id}:`, error)
      throw error
    }
  },

  // Delete category
  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await api.delete(`/api/admin/categories/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return response.data
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error)
      throw error
    }
  },

  // Create brand
  async createBrand(data: any): Promise<any> {
    try {
      const response = await api.post("/api/admin/brands", data)
      return response.data
    } catch (error) {
      console.error("Error creating brand:", error)
      throw error
    }
  },

  // Update brand
  async updateBrand(id: string, data: any): Promise<any> {
    try {
      const response = await api.put(`/api/admin/brands/${id}`, data)
      return response.data
    } catch (error) {
      console.error(`Error updating brand ${id}:`, error)
      throw error
    }
  },

  // Delete brand
  async deleteBrand(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/brands/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting brand ${id}:`, error)
      throw error
    }
  },

  // Approve/reject review
  async updateReviewStatus(id: string, status: "approved" | "rejected"): Promise<any> {
    try {
      const response = await api.put(`/api/admin/reviews/${id}/status`, { status })
      return response.data
    } catch (error) {
      console.error(`Error updating review ${id} status:`, error)
      throw error
    }
  },

  // Delete review
  async deleteReview(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/api/admin/reviews/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error)
      throw error
    }
  },

  // Send newsletter
  async sendNewsletter(data: { subject: string; content: string; recipientGroups?: string[] }): Promise<any> {
    try {
      const response = await api.post("/api/admin/newsletters/send", data)
      return response.data
    } catch (error) {
      console.error("Error sending newsletter:", error)
      throw error
    }
  },

  // Get admin notifications
  async getNotifications(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/notifications", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching notifications:", error)
      // Return empty data structure instead of throwing
      return {
        items: [],
        meta: {
          current_page: 1,
          per_page: 10,
          total: 0,
          last_page: 1,
          from: 0,
          to: 0,
        },
      }
    }
  },

  // Get system settings
  async getSettings(): Promise<any> {
    try {
      const response = await api.get("/api/admin/settings")
      return response.data
    } catch (error) {
      console.error("Error fetching system settings:", error)
      throw error
    }
  },

  // Update system settings
  async updateSettings(data: any): Promise<any> {
    try {
      const response = await api.put("/api/admin/settings", data)
      return response.data
    } catch (error) {
      console.error("Error updating system settings:", error)
      throw error
    }
  },

  // Update the activateUser and deactivateUser methods
  async activateUser(id: string): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await api.post(
        `/api/admin/users/${id}/activate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      return response.data
    } catch (error) {
      console.error(`Error activating user ${id}:`, error)
      throw error
    }
  },

  async deactivateUser(id: string): Promise<any> {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await api.post(
        `/api/admin/users/${id}/deactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      return response.data
    } catch (error) {
      console.error(`Error deactivating user ${id}:`, error)
      throw error
    }
  },

  // Get product image
  async getProductImage(productId: string): Promise<string> {
    try {
      // Make sure we have a valid API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const url = `${baseUrl}/api/admin/products/${productId}/image`

      console.log(`Fetching image from: ${url}`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        console.warn(`Failed to fetch image for product ${productId}:`, response.statusText)
        return "/placeholder.svg"
      }

      const data = await response.json()
      return data.url || "/placeholder.svg"
    } catch (error) {
      console.error(`Error fetching image for product ${productId}:`, error)
      return "/placeholder.svg"
    }
  },
}