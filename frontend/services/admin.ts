import { API_URL } from "@/config"
import { handleApiError } from "../lib/api-helpers"

export const adminService = {
  // Dashboard data
  async getDashboardData() {
    try {
      const response = await fetch(`${API_URL}/admin/dashboard`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      throw error
    }
  },

  // Product statistics
  async getProductStats() {
    try {
      const response = await fetch(`${API_URL}/admin/stats/products`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching product stats:", error)
      throw error
    }
  },

  // Sales statistics
  async getSalesStats({ period = "month" }) {
    try {
      const response = await fetch(`${API_URL}/admin/stats/sales?period=${period}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching sales stats:", error)
      throw error
    }
  },

  // Users
  async getUsers(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      const response = await fetch(`${API_URL}/admin/users?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching users:", error)
      throw error
    }
  },

  // Products
  async getProducts(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      const response = await fetch(`${API_URL}/admin/products?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching products:", error)
      throw error
    }
  },

  // Orders
  async getOrders(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      const response = await fetch(`${API_URL}/admin/orders?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching orders:", error)
      throw error
    }
  },

  // Categories
  async getCategories(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      const response = await fetch(`${API_URL}/admin/categories?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  },

  // Brands
  async getBrands(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      const response = await fetch(`${API_URL}/admin/brands?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching brands:", error)
      throw error
    }
  },

  // Reviews
  async getReviews(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      const response = await fetch(`${API_URL}/admin/reviews?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching reviews:", error)
      throw error
    }
  },

  // Newsletter subscribers
  async getNewsletterSubscribers(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      const response = await fetch(`${API_URL}/admin/newsletters?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching newsletter subscribers:", error)
      throw error
    }
  },
}
