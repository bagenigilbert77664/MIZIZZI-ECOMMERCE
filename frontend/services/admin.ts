import api from "@/lib/api"
import type {
  AdminDashboardData,
  AdminLoginCredentials,
  AdminPaginatedResponse,
  ProductStatistics,
  SalesStatistics,
  ProductCreatePayload,
} from "@/types/admin"
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

export const adminService = {
  // Dashboard data
  async getDashboardData(params = {}): Promise<AdminDashboardData> {
    try {
      const response = await api.get("/api/admin/dashboard", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      throw error
    }
  },

  // Product statistics
  async getProductStats(params = {}): Promise<ProductStatistics> {
    try {
      const response = await api.get("/api/admin/stats/products", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching product stats:", error)
      throw error
    }
  },

  // Update the getSalesStats method signature to properly type the parameters
  // Sales statistics
  async getSalesStats({
    period = "month",
    from,
    to,
    ...params
  }: {
    period?: string
    from?: string
    to?: string
    [key: string]: any
  } = {}): Promise<SalesStatistics> {
    try {
      const response = await api.get(`/api/admin/stats/sales`, {
        params: { period, from, to, ...params },
      })
      return response.data
    } catch (error) {
      console.error("Error fetching sales stats:", error)
      throw error
    }
  },

  // Users
  async getUsers(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/users", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching users:", error)
      throw error
    }
  },

  // Products
  async getProducts(params = {}): Promise<AdminPaginatedResponse<Product>> {
    try {
      const response = await api.get("/api/admin/products", { params })
      return response.data
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
        })

        clearTimeout(timeoutId)

        // Check if the response is ok
        if (!response.ok) {
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
  async getOrders(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/orders", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching orders:", error)
      throw error
    }
  },

  // Categories
  async getCategories(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      const response = await api.get("/api/admin/categories", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  },

  // Brands - Modified to handle multiple endpoints and errors
  async getBrands(params = {}): Promise<AdminPaginatedResponse<any>> {
    try {
      // Try multiple endpoints with different methods
      const brandsData = { items: [], meta: { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 } }

      // First try GET request to /api/admin/brands
      try {
        const response = await api.get("/api/admin/brands", { params })
        if (response.data && response.data.items) {
          return response.data
        }
      } catch (error: any) {
        console.log("GET /api/admin/brands failed, trying alternatives...")

        // If 405 Method Not Allowed, try POST to /api/admin/brands/list
        if (error.response && error.response.status === 405) {
          try {
            const postResponse = await api.post("/api/admin/brands/list", params)
            if (postResponse.data && postResponse.data.items) {
              return postResponse.data
            }
          } catch (postError) {
            console.error("POST to /api/admin/brands/list failed:", postError)
          }
        }

        // Try direct GET to /api/admin/brands/list
        try {
          const getListResponse = await api.get("/api/admin/brands/list", { params })
          if (getListResponse.data && getListResponse.data.items) {
            return getListResponse.data
          }
        } catch (getListError) {
          console.error("GET to /api/admin/brands/list failed:", getListError)
        }

        // Try with fetch API as last resort
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
          const fetchResponse = await fetch(`${apiUrl}/api/admin/brands/list`)
          if (fetchResponse.ok) {
            const data = await fetchResponse.json()
            if (data && data.items) {
              return data
            }
          }
        } catch (fetchError) {
          console.error("Fetch to /api/admin/brands/list failed:", fetchError)
        }
      }

      // If all attempts fail, return empty data
      console.warn("All attempts to fetch brands failed, returning empty data")
      return brandsData
    } catch (error) {
      console.error("Error in getBrands:", error)
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

  // Admin login
  async login(
    credentials: AdminLoginCredentials,
  ): Promise<{ user: any; token: string; refreshToken?: string; expiresIn?: number }> {
    try {
      const response = await api.post("/api/admin/auth/login", credentials)

      // Store the token in localStorage with expiry
      if (response.data && response.data.token) {
        const expiry = new Date()
        expiry.setSeconds(expiry.getSeconds() + (response.data.expiresIn || 3600))

        localStorage.setItem("admin_token", response.data.token)
        localStorage.setItem("admin_token_expiry", expiry.toISOString())

        if (response.data.refreshToken) {
          localStorage.setItem("admin_refresh_token", response.data.refreshToken)
        }
      }

      return response.data
    } catch (error) {
      console.error("Admin login error:", error)
      throw error
    }
  },

  // Admin logout
  async logout(): Promise<{ success: boolean }> {
    try {
      const response = await api.post("/api/admin/auth/logout")

      // Clear tokens regardless of API response
      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_token_expiry")
      localStorage.removeItem("admin_refresh_token")

      return response.data
    } catch (error) {
      console.error("Admin logout error:", error)

      // Still clear tokens even if API call fails
      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_token_expiry")
      localStorage.removeItem("admin_refresh_token")

      return { success: false }
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

  // Update order status
  async updateOrderStatus(id: string, status: string): Promise<any> {
    try {
      const response = await api.put(`/api/admin/orders/${id}/status`, { status })
      return response.data
    } catch (error) {
      console.error(`Error updating status for order ${id}:`, error)
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
      const response = await api.delete(`/api/admin/categories/${id}`)
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
}
