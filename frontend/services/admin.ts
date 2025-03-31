import api from "@/lib/api"
import type { AdminDashboardData, AdminPaginatedResponse } from "@/types/admin"
import type {
  Product,
  Category,
  Brand,
  Order,
  User,
  Review,
  Address,
  Newsletter,
  CartItem,
  WishlistItem,
} from "@/types"

export const adminService = {
  // Dashboard
  getDashboardData: async (): Promise<AdminDashboardData> => {
    try {
      const response = await api.get("/api/admin/dashboard")
      return response.data
    } catch (error) {
      console.error("API Error:", error)
      // Return a default structure to prevent rendering errors
      return {
        counts: {
          users: 0,
          products: 0,
          orders: 0,
          categories: 0,
          brands: 0,
          reviews: 0,
          pending_reviews: 0,
          newsletter_subscribers: 0,
        },
        sales: {
          today: 0,
          monthly: 0,
          yesterday: 0,
          weekly: 0,
          yearly: 0,
        },
        order_status: {},
        recent_orders: [],
        recent_users: [],
        low_stock_products: [],
        sales_by_category: [],
      }
    }
  },

  // Users
  getUsers: async (params = {}): Promise<AdminPaginatedResponse<User>> => {
    try {
      const response = await api.get("/api/admin/users", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching users:", error)
      throw error
    }
  },

  getUser: async (id: string): Promise<User> => {
    try {
      const response = await api.get(`/api/admin/users/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error)
      throw error
    }
  },

  createUser: async (userData: any): Promise<User> => {
    try {
      const response = await api.post("/api/admin/users", userData)
      return response.data.user
    } catch (error) {
      console.error("Error creating user:", error)
      throw error
    }
  },

  updateUser: async (id: string, userData: any): Promise<User> => {
    try {
      const response = await api.put(`/api/admin/users/${id}`, userData)
      return response.data.user
    } catch (error) {
      console.error(`Error updating user ${id}:`, error)
      throw error
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/users/${id}`)
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error)
      throw error
    }
  },

  activateUser: async (id: string): Promise<User> => {
    try {
      const response = await api.post(`/api/admin/users/${id}/activate`)
      return response.data.user
    } catch (error) {
      console.error(`Error activating user ${id}:`, error)
      throw error
    }
  },

  deactivateUser: async (id: string): Promise<User> => {
    try {
      const response = await api.post(`/api/admin/users/${id}/deactivate`)
      return response.data.user
    } catch (error) {
      console.error(`Error deactivating user ${id}:`, error)
      throw error
    }
  },

  // Products
  getProducts: async (params = {}): Promise<AdminPaginatedResponse<Product>> => {
    try {
      const response = await api.get("/api/admin/products", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching products:", error)
      throw error
    }
  },

  getProduct: async (id: string): Promise<Product> => {
    try {
      const response = await api.get(`/api/admin/products/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error)
      throw error
    }
  },

  createProduct: async (productData: any): Promise<Product> => {
    try {
      const response = await api.post("/api/admin/products", productData)
      return response.data.product
    } catch (error) {
      console.error("Error creating product:", error)
      throw error
    }
  },

  updateProduct: async (id: string, productData: any): Promise<Product> => {
    try {
      const response = await api.put(`/api/admin/products/${id}`, productData)
      return response.data.product
    } catch (error) {
      console.error(`Error updating product ${id}:`, error)
      throw error
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/products/${id}`)
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error)
      throw error
    }
  },

  updateProductStock: async (id: string, stock: number): Promise<Product> => {
    try {
      const response = await api.put(`/api/admin/products/${id}/stock`, { stock })
      return response.data.product
    } catch (error) {
      console.error(`Error updating product stock ${id}:`, error)
      throw error
    }
  },

  bulkUpdateProducts: async (productIds: string[], updates: any): Promise<any> => {
    try {
      const response = await api.post(`/api/admin/products/bulk-update`, {
        product_ids: productIds,
        updates,
      })
      return response.data
    } catch (error) {
      console.error(`Error bulk updating products:`, error)
      throw error
    }
  },

  // Product Images
  getProductImages: async (productId: string): Promise<any> => {
    try {
      const response = await api.get(`/api/admin/products/${productId}/images`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product images for ${productId}:`, error)
      throw error
    }
  },

  addProductImages: async (productId: string, images: any[]): Promise<any> => {
    try {
      const response = await api.post(`/api/admin/products/${productId}/images`, { images })
      return response.data
    } catch (error) {
      console.error(`Error adding product images for ${productId}:`, error)
      throw error
    }
  },

  updateProductImage: async (productId: string, imageId: string, imageData: any): Promise<any> => {
    try {
      const response = await api.put(`/api/admin/products/${productId}/images/${imageId}`, imageData)
      return response.data
    } catch (error) {
      console.error(`Error updating product image ${imageId}:`, error)
      throw error
    }
  },

  deleteProductImage: async (productId: string, imageId: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/products/${productId}/images/${imageId}`)
    } catch (error) {
      console.error(`Error deleting product image ${imageId}:`, error)
      throw error
    }
  },

  deleteAllProductImages: async (productId: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/products/${productId}/images`)
    } catch (error) {
      console.error(`Error deleting all product images for ${productId}:`, error)
      throw error
    }
  },

  // Product Variants
  getProductVariants: async (productId: string): Promise<any> => {
    try {
      const response = await api.get(`/api/admin/products/${productId}/variants`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product variants for ${productId}:`, error)
      throw error
    }
  },

  getProductVariant: async (productId: string, variantId: string): Promise<any> => {
    try {
      const response = await api.get(`/api/admin/products/${productId}/variants/${variantId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product variant ${variantId}:`, error)
      throw error
    }
  },

  addProductVariants: async (productId: string, variants: any[]): Promise<any> => {
    try {
      const response = await api.post(`/api/admin/products/${productId}/variants`, { variants })
      return response.data
    } catch (error) {
      console.error(`Error adding product variants for ${productId}:`, error)
      throw error
    }
  },

  updateProductVariant: async (productId: string, variantId: string, variantData: any): Promise<any> => {
    try {
      const response = await api.put(`/api/admin/products/${productId}/variants/${variantId}`, variantData)
      return response.data
    } catch (error) {
      console.error(`Error updating product variant ${variantId}:`, error)
      throw error
    }
  },

  deleteProductVariant: async (productId: string, variantId: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/products/${productId}/variants/${variantId}`)
    } catch (error) {
      console.error(`Error deleting product variant ${variantId}:`, error)
      throw error
    }
  },

  // Categories
  getCategories: async (params = {}): Promise<AdminPaginatedResponse<Category>> => {
    try {
      const response = await api.get("/api/admin/categories", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching categories:", error)
      throw error
    }
  },

  getCategory: async (id: string): Promise<Category> => {
    try {
      const response = await api.get(`/api/admin/categories/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error)
      throw error
    }
  },

  createCategory: async (categoryData: any): Promise<Category> => {
    try {
      const response = await api.post("/api/admin/categories", categoryData)
      return response.data.category
    } catch (error) {
      console.error("Error creating category:", error)
      throw error
    }
  },

  updateCategory: async (id: string, categoryData: any): Promise<Category> => {
    try {
      const response = await api.put(`/api/admin/categories/${id}`, categoryData)
      return response.data.category
    } catch (error) {
      console.error(`Error updating category ${id}:`, error)
      throw error
    }
  },

  deleteCategory: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/categories/${id}`)
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error)
      throw error
    }
  },

  toggleCategoryFeatured: async (id: string): Promise<Category> => {
    try {
      const response = await api.post(`/api/admin/categories/${id}/toggle-featured`)
      return response.data.category
    } catch (error) {
      console.error(`Error toggling category featured status ${id}:`, error)
      throw error
    }
  },

  // Brands
  getBrands: async (params = {}): Promise<AdminPaginatedResponse<Brand>> => {
    try {
      const response = await api.get("/api/admin/brands", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching brands:", error)
      throw error
    }
  },

  createBrand: async (brandData: any): Promise<Brand> => {
    try {
      const response = await api.post("/api/admin/brands", brandData)
      return response.data
    } catch (error) {
      console.error("Error creating brand:", error)
      throw error
    }
  },

  updateBrand: async (id: string, brandData: any): Promise<Brand> => {
    try {
      const response = await api.put(`/api/admin/brands/${id}`, brandData)
      return response.data
    } catch (error) {
      console.error(`Error updating brand ${id}:`, error)
      throw error
    }
  },

  deleteBrand: async (id: string): Promise<void> => {
    try {
      const response = await api.delete(`/api/admin/brands/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting brand ${id}:`, error)
      throw error
    }
  },

  // Orders
  getOrders: async (params = {}): Promise<AdminPaginatedResponse<Order>> => {
    try {
      const response = await api.get("/api/admin/orders", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching orders:", error)
      throw error
    }
  },

  getOrder: async (id: string): Promise<Order> => {
    try {
      const response = await api.get(`/api/admin/orders/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching order ${id}:`, error)
      throw error
    }
  },

  updateOrderStatus: async (id: string, statusData: any): Promise<Order> => {
    try {
      const response = await api.put(`/api/admin/orders/${id}/status`, statusData)
      return response.data.order
    } catch (error) {
      console.error(`Error updating order status ${id}:`, error)
      throw error
    }
  },

  // Cart Items
  getCartItems: async (params = {}): Promise<AdminPaginatedResponse<CartItem>> => {
    try {
      const response = await api.get("/api/admin/cart-items", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching cart items:", error)
      throw error
    }
  },

  deleteCartItem: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/cart-items/${id}`)
    } catch (error) {
      console.error(`Error deleting cart item ${id}:`, error)
      throw error
    }
  },

  clearUserCart: async (userId: string): Promise<any> => {
    try {
      const response = await api.delete(`/api/admin/users/${userId}/cart/clear`)
      return response.data
    } catch (error) {
      console.error(`Error clearing cart for user ${userId}:`, error)
      throw error
    }
  },

  // Wishlist Items
  getWishlistItems: async (params = {}): Promise<AdminPaginatedResponse<WishlistItem>> => {
    try {
      const response = await api.get("/api/admin/wishlist-items", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching wishlist items:", error)
      throw error
    }
  },

  deleteWishlistItem: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/wishlist-items/${id}`)
    } catch (error) {
      console.error(`Error deleting wishlist item ${id}:`, error)
      throw error
    }
  },

  clearUserWishlist: async (userId: string): Promise<any> => {
    try {
      const response = await api.delete(`/api/admin/users/${userId}/wishlist/clear`)
      return response.data
    } catch (error) {
      console.error(`Error clearing wishlist for user ${userId}:`, error)
      throw error
    }
  },

  // Address Types
  getAddressTypes: async (): Promise<any> => {
    try {
      const response = await api.get("/api/admin/address-types")
      return response.data.address_types
    } catch (error) {
      console.error("Error fetching address types:", error)
      throw error
    }
  },

  // Addresses
  getAddresses: async (params = {}): Promise<AdminPaginatedResponse<Address>> => {
    try {
      const response = await api.get("/api/admin/addresses", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching addresses:", error)
      throw error
    }
  },

  getAddress: async (id: string): Promise<Address> => {
    try {
      const response = await api.get(`/api/admin/addresses/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching address ${id}:`, error)
      throw error
    }
  },

  updateAddress: async (id: string, addressData: any): Promise<Address> => {
    try {
      const response = await api.put(`/api/admin/addresses/${id}`, addressData)
      return response.data.address
    } catch (error) {
      console.error(`Error updating address ${id}:`, error)
      throw error
    }
  },

  deleteAddress: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/addresses/${id}`)
    } catch (error) {
      console.error(`Error deleting address ${id}:`, error)
      throw error
    }
  },

  // Newsletters
  getNewsletters: async (params = {}): Promise<AdminPaginatedResponse<Newsletter>> => {
    try {
      const response = await api.get("/api/admin/newsletters", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching newsletters:", error)
      throw error
    }
  },

  toggleNewsletter: async (id: string): Promise<Newsletter> => {
    try {
      const response = await api.post(`/api/admin/newsletters/${id}/toggle`)
      return response.data.newsletter
    } catch (error) {
      console.error(`Error toggling newsletter ${id}:`, error)
      throw error
    }
  },

  exportNewsletters: async (params = {}): Promise<any> => {
    try {
      const response = await api.get("/api/admin/newsletters/export", { params })
      return response.data
    } catch (error) {
      console.error("Error exporting newsletters:", error)
      throw error
    }
  },

  deleteNewsletter: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/admin/newsletters/${id}`)
    } catch (error) {
      console.error(`Error deleting newsletter ${id}:`, error)
      throw error
    }
  },

  // Statistics
  getSalesStats: async (params = {}): Promise<any> => {
    try {
      const response = await api.get("/api/admin/stats/sales", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching sales statistics:", error)
      throw error
    }
  },

  getProductStats: async (): Promise<any> => {
    try {
      const response = await api.get("/api/admin/stats/products")
      return response.data
    } catch (error) {
      console.error("Error fetching product statistics:", error)
      throw error
    }
  },

  // Customers
  getCustomers: async (params = {}): Promise<AdminPaginatedResponse<User>> => {
    try {
      const response = await api.get("/api/admin/users", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching customers:", error)
      throw error
    }
  },

  getCustomer: async (id: string): Promise<User> => {
    try {
      const response = await api.get(`/api/admin/users/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching customer ${id}:`, error)
      throw error
    }
  },

  // Reviews
  getReviews: async (params = {}): Promise<AdminPaginatedResponse<Review>> => {
    try {
      const response = await api.get("/api/admin/reviews", { params })
      return response.data
    } catch (error) {
      console.error("Error fetching reviews:", error)
      throw error
    }
  },

  approveReview: async (id: string): Promise<Review> => {
    try {
      const response = await api.put(`/api/admin/reviews/${id}/approve`)
      return response.data
    } catch (error) {
      console.error(`Error approving review ${id}:`, error)
      throw error
    }
  },

  rejectReview: async (id: string): Promise<Review> => {
    try {
      const response = await api.put(`/api/admin/reviews/${id}/reject`)
      return response.data
    } catch (error) {
      console.error(`Error rejecting review ${id}:`, error)
      throw error
    }
  },

  deleteReview: async (id: string): Promise<void> => {
    try {
      const response = await api.delete(`/api/admin/reviews/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error)
      throw error
    }
  },
}

