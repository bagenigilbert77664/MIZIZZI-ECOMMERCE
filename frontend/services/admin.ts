import api from "@/lib/api"
import type {
  AdminDashboardData,
  AdminLoginCredentials,
  AdminPaginatedResponse,
  ProductStatistics,
  SalesStatistics,
  ProductCreatePayload,
} from "@/types/admin"
import type { Product } from "@/types/index"
import { productService } from "@/services/product"

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
  async getProduct(id: string): Promise<Product> {
    try {
      const response = await api.get(`/api/admin/products/${id}`)
      return response.data
    } catch (error) {
      console.error("Error fetching product:", error)
      throw error
    }
  },

  /**
   * Update a product
   */
  async updateProduct(id: string, data: any): Promise<Product> {
    try {
      console.log("Updating product with data:", data)

      const response = await api.put(`/api/admin/products/${id}`, data)

      if (!response.data) {
        throw new Error("No data returned from server")
      }

      console.log("Product updated successfully:", response.data)

      return response.data
    } catch (error: any) {
      console.error("Error updating product:", error)
      throw error
    }
  },

  // Delete a product
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log("Deleting product with ID:", id)

      // Add a timeout to ensure the request completes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const response = await api.delete(`/api/admin/products/${id}`, {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("Delete product response:", response.data)

        // Notify about product deletion
        try {
          productService.notifyProductUpdate(id)
        } catch (notifyError) {
          console.warn("Failed to notify about product deletion:", notifyError)
          // Continue even if notification fails
        }

        return response.data || { success: true, message: "Product deleted successfully" }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        // Handle specific error cases
        if (fetchError.name === "AbortError") {
          console.error("Delete request timed out")
          throw new Error("Request timed out. The product may or may not have been deleted.")
        }

        // Check for authentication errors
        if (fetchError.response?.status === 401) {
          console.error("Authentication error during delete")
          throw { ...fetchError, status: 401, message: "Authentication failed. Please log in again." }
        }

        throw fetchError
      }
    } catch (error: any) {
      console.error("Error deleting product:", error)

      // Return a standardized error response
      throw {
        status: error.response?.status || 500,
        message: error.message || "Failed to delete product. Please try again.",
      }
    }
  },

  // Create a product
  async createProduct(data: ProductCreatePayload): Promise<Product> {
    try {
      const response = await api.post("/api/admin/products", data)

      // Notify about new product
      if (response.data && response.data.id) {
        productService.notifyProductUpdate(response.data.id.toString())
      }

      return response.data
    } catch (error) {
      console.error("Error creating product:", error)
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
  async login(credentials: AdminLoginCredentials): Promise<{ user: any; token: string }> {
    try {
      const response = await api.post("/api/admin/auth/login", credentials)
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
      return response.data
    } catch (error) {
      console.error("Admin logout error:", error)
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

