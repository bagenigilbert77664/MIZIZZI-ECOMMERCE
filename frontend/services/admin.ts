import api from "@/lib/api"
import type { AdminDashboardData, AdminPaginatedResponse } from "@/types/admin"
import type { Product, Category, Brand, Order, User, Review } from "@/types"

export const adminService = {
  // Dashboard
  getDashboardData: async (): Promise<AdminDashboardData> => {
    try {
      const response = await api.get("/api/mizizzi_admin/dashboard")
      return response.data
    } catch (error) {
      console.error("API Error:", error)
      // Return a default structure to prevent rendering errors
      return {
        counts: { users: 0, products: 0, orders: 0 },
        sales: { today: 0, monthly: 0 },
        order_status: {},
        recent_orders: [],
      }
    }
  },

  // Products
  getProducts: async (params = {}): Promise<AdminPaginatedResponse<Product>> => {
    try {
      const response = await api.get("/api/products", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching products:", error)
      throw error
    }
  },

  getProduct: async (id: string): Promise<Product> => {
    try {
      const response = await api.get(`/api/products/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error)
      throw error
    }
  },

  createProduct: async (productData: any): Promise<Product> => {
    try {
      const response = await api.post("/api/mizizzi_admin/products", productData)
      return response.data
    } catch (error) {
      console.error("Error creating product:", error)
      throw error
    }
  },

  updateProduct: async (id: string, productData: any): Promise<Product> => {
    try {
      const response = await api.put(`/api/mizizzi_admin/products/${id}`, productData)
      return response.data
    } catch (error) {
      console.error(`Error updating product ${id}:`, error)
      throw error
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    try {
      const response = await api.delete(`/api/mizizzi_admin/products/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error)
      throw error
    }
  },

  // Categories
  getCategories: async (params = {}): Promise<AdminPaginatedResponse<Category>> => {
    try {
      const response = await api.get("/api/categories", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  },

  getCategory: async (id: string): Promise<Category> => {
    try {
      const response = await api.get(`/api/categories/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error)
      throw error
    }
  },

  createCategory: async (categoryData: any): Promise<Category> => {
    try {
      const response = await api.post("/api/mizizzi_admin/categories", categoryData)
      return response.data
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  },

  updateCategory: async (id: string, categoryData: any): Promise<Category> => {
    try {
      const response = await api.put(`/api/mizizzi_admin/categories/${id}`, categoryData)
      return response.data
    } catch (error) {
      console.error(`Error updating category ${id}:`, error)
      throw error
    }
  },

  deleteCategory: async (id: string): Promise<void> => {
    try {
      const response = await api.delete(`/api/mizizzi_admin/categories/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error)
      throw error
    }
  },

  // Brands
  getBrands: async (params = {}): Promise<AdminPaginatedResponse<Brand>> => {
    try {
      const response = await api.get("/api/brands", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching brands:", error)
      throw error
    }
  },

  createBrand: async (brandData: any): Promise<Brand> => {
    try {
      const response = await api.post("/api/mizizzi_admin/brands", brandData)
      return response.data
    } catch (error) {
      console.error("Error creating brand:", error)
      throw error
    }
  },

  updateBrand: async (id: string, brandData: any): Promise<Brand> => {
    try {
      const response = await api.put(`/api/mizizzi_admin/brands/${id}`, brandData)
      return response.data
    } catch (error) {
      console.error(`Error updating brand ${id}:`, error)
      throw error
    }
  },

  deleteBrand: async (id: string): Promise<void> => {
    try {
      const response = await api.delete(`/api/mizizzi_admin/brands/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting brand ${id}:`, error)
      throw error
    }
  },

  // Orders
  getOrders: async (params = {}): Promise<AdminPaginatedResponse<Order>> => {
    try {
      const response = await api.get("/api/mizizzi_admin/orders", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching orders:", error)
      throw error
    }
  },

  getOrder: async (id: string): Promise<Order> => {
    try {
      const response = await api.get(`/api/mizizzi_admin/orders/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching order ${id}:`, error)
      throw error
    }
  },

  updateOrderStatus: async (id: string, statusData: any): Promise<Order> => {
    try {
      const response = await api.put(`/api/mizizzi_admin/orders/${id}/status`, statusData)
      return response.data
    } catch (error) {
      console.error(`Error updating order status ${id}:`, error)
      throw error
    }
  },

  // Customers
  getCustomers: async (params = {}): Promise<AdminPaginatedResponse<User>> => {
    try {
      const response = await api.get("/api/mizizzi_admin/users", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching customers:", error)
      throw error
    }
  },

  getCustomer: async (id: string): Promise<User> => {
    try {
      const response = await api.get(`/api/mizizzi_admin/users/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching customer ${id}:`, error)
      throw error
    }
  },

  // Reviews
  getReviews: async (params = {}): Promise<AdminPaginatedResponse<Review>> => {
    try {
      const response = await api.get("/api/mizizzi_admin/reviews", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching reviews:", error)
      throw error
    }
  },

  approveReview: async (id: string): Promise<Review> => {
    try {
      const response = await api.put(`/api/mizizzi_admin/reviews/${id}/approve`)
      return response.data
    } catch (error) {
      console.error(`Error approving review ${id}:`, error)
      throw error
    }
  },

  rejectReview: async (id: string): Promise<Review> => {
    try {
      const response = await api.put(`/api/mizizzi_admin/reviews/${id}/reject`)
      return response.data
    } catch (error) {
      console.error(`Error rejecting review ${id}:`, error)
      throw error
    }
  },

  deleteReview: async (id: string): Promise<void> => {
    try {
      const response = await api.delete(`/api/mizizzi_admin/reviews/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error)
      throw error
    }
  },
}

