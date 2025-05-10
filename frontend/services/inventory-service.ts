import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

// Types
export interface InventoryItem {
  id: number
  product_id: number
  variant_id?: number | null
  stock_level: number
  reserved_quantity: number
  available_quantity: number
  reorder_level: number
  low_stock_threshold: number
  sku?: string
  location?: string
  status: string
  last_updated: string
  created_at: string
  product_name?: string
  product_sku?: string
  variant_info?: {
    id: number
    color?: string
    size?: string
    sku?: string
  }
  is_in_stock: boolean
  is_low_stock: boolean
}

export interface InventoryResponse {
  items: InventoryItem[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
}

export interface AvailabilityResponse {
  product_id: number
  variant_id?: number | null
  requested_quantity: number
  available_quantity: number
  is_available: boolean
  status: string
  is_low_stock?: boolean
}

// First, let's extend the CartValidationResponse type to include the missing properties
export interface CartValidationResponse {
  is_valid: boolean
  errors: {
    message: string
    code: string
    product_id: number
    variant_id?: number
    available_stock?: number
    item_id?: number
    [key: string]: any
  }[]
  warnings: {
    message: string
    code: string
    product_id?: number
    variant_id?: number
    [key: string]: any
  }[]
  // Add these new properties
  stockIssues?: {
    message: string
    code: string
    product_id: number
    variant_id?: number
    available_stock?: number
    item_id?: number
    [key: string]: any
  }[]
  priceChanges?: {
    message: string
    code: string
    product_id: number
    variant_id?: number
    old_price?: number
    new_price?: number
    item_id?: number
    [key: string]: any
  }[]
  invalidItems?: {
    message: string
    code: string
    product_id: number
    variant_id?: number
    item_id?: number
    [key: string]: any
  }[]
}

export interface ReservationRequest {
  product_id: number
  variant_id?: number
  quantity: number
  reservation_id?: string // Cart ID or session ID
}

class InventoryService {
  /**
   * Check product availability
   */
  async checkAvailability(productId: number, quantity = 1, variantId?: number): Promise<AvailabilityResponse> {
    try {
      const params = new URLSearchParams()
      params.append("quantity", quantity.toString())
      if (variantId) {
        params.append("variant_id", variantId.toString())
      }

      const response = await api.get(`/api/inventory/check-availability/${productId}?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error checking product availability:", error)
      throw new Error(error.response?.data?.error || "Failed to check product availability")
    }
  }

  /**
   * Get inventory for a product
   */
  async getProductInventory(productId: number, variantId?: number): Promise<InventoryItem | InventoryItem[]> {
    try {
      const params = new URLSearchParams()
      if (variantId) {
        params.append("variant_id", variantId.toString())
      }

      const response = await api.get(`/api/inventory/product/${productId}?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error getting product inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to get product inventory")
    }
  }

  /**
   * Get all inventory items (admin only)
   */
  async getAllInventory(page = 1, perPage = 20, filters: Record<string, any> = {}): Promise<InventoryResponse> {
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })

      const response = await api.get(`/api/inventory/?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error getting inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to get inventory")
    }
  }

  /**
   * Get low stock items (admin only)
   */
  async getLowStockItems(page = 1, perPage = 20): Promise<InventoryResponse> {
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())

      const response = await api.get(`/api/inventory/low-stock?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error getting low stock items:", error)
      throw new Error(error.response?.data?.error || "Failed to get low stock items")
    }
  }

  /**
   * Get out of stock items (admin only)
   */
  async getOutOfStockItems(page = 1, perPage = 20): Promise<InventoryResponse> {
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())

      const response = await api.get(`/api/inventory/out-of-stock?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error getting out of stock items:", error)
      throw new Error(error.response?.data?.error || "Failed to get out of stock items")
    }
  }

  /**
   * Update inventory (admin only)
   */
  async updateInventory(inventoryId: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await api.put(`/api/inventory/${inventoryId}`, data)

      toast({
        title: "Inventory Updated",
        description: "Inventory has been updated successfully",
      })

      return response.data.inventory
    } catch (error: any) {
      console.error("Error updating inventory:", error)

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update inventory",
        variant: "destructive",
      })

      throw new Error(error.response?.data?.error || "Failed to update inventory")
    }
  }

  /**
   * Adjust inventory (admin only)
   */
  async adjustInventory(
    productId: number,
    adjustment: number,
    variantId?: number,
    reason?: string,
  ): Promise<InventoryItem> {
    try {
      const data = {
        adjustment,
        variant_id: variantId,
        reason,
      }

      const response = await api.post(`/api/inventory/adjust/${productId}`, data)

      toast({
        title: "Inventory Adjusted",
        description: "Inventory has been adjusted successfully",
      })

      return response.data.inventory
    } catch (error: any) {
      console.error("Error adjusting inventory:", error)

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to adjust inventory",
        variant: "destructive",
      })

      throw new Error(error.response?.data?.error || "Failed to adjust inventory")
    }
  }

  /**
   * Reserve inventory (when adding to cart)
   */
  async reserveInventory(
    productId: number,
    quantity: number,
    variantId?: number,
    reservationId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = {
        quantity,
        variant_id: variantId,
        reservation_id: reservationId,
      }

      const response = await api.post(`/api/inventory/reserve/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error reserving inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to reserve inventory")
    }
  }

  /**
   * Release inventory (when removing from cart)
   */
  async releaseInventory(
    productId: number,
    quantity: number,
    variantId?: number,
    reservationId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = {
        quantity,
        variant_id: variantId,
        reservation_id: reservationId,
      }

      const response = await api.post(`/api/inventory/release/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error releasing inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to release inventory")
    }
  }

  /**
   * Commit inventory (when completing an order)
   */
  async commitInventory(
    productId: number,
    quantity: number,
    variantId?: number,
    reservationId?: string,
    orderId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = {
        quantity,
        variant_id: variantId,
        reservation_id: reservationId,
        order_id: orderId,
      }

      const response = await api.post(`/api/inventory/commit/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error committing inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to commit inventory")
    }
  }

  /**
   * Validate cart items against inventory
   */
  async validateCartItems(
    cartItems: { product_id: number; variant_id?: number; quantity: number }[],
  ): Promise<CartValidationResponse> {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem("mizizzi_token")

      // If no token, return a valid response for unauthenticated users
      if (!token) {
        console.log("No authentication token found, skipping server validation")
        return {
          is_valid: true,
          errors: [],
          warnings: [],
        }
      }

      const response = await api.post("/api/cart/validate", { items: cartItems })
      return response.data
    } catch (error: any) {
      console.error("Cart validation error:", error)

      // For authentication errors, return a valid response
      if (error.response?.status === 401) {
        return {
          is_valid: true,
          errors: [],
          warnings: [],
        }
      }

      // For other errors, return a warning
      return {
        is_valid: true, // Still allow checkout
        errors: [],
        warnings: [
          {
            code: "validation_error",
            message: "Could not validate product availability. Some items may have limited stock.",
          },
        ],
      }
    }
  }

  /**
   * Create new inventory item (admin only)
   */
  async createInventory(data: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await api.post("/api/inventory/", data)

      toast({
        title: "Inventory Created",
        description: "New inventory item has been created successfully",
      })

      return response.data.inventory
    } catch (error: any) {
      console.error("Error creating inventory:", error)

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create inventory",
        variant: "destructive",
      })

      throw new Error(error.response?.data?.error || "Failed to create inventory")
    }
  }

  /**
   * Sync inventory from products (admin only)
   */
  async syncInventoryFromProducts(): Promise<{ created: number; updated: number }> {
    try {
      const response = await api.post("/api/inventory/sync-from-products")

      toast({
        title: "Inventory Synced",
        description: `Created ${response.data.created} and updated ${response.data.updated} inventory items`,
      })

      return {
        created: response.data.created,
        updated: response.data.updated,
      }
    } catch (error: any) {
      console.error("Error syncing inventory:", error)

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to sync inventory",
        variant: "destructive",
      })

      throw new Error(error.response?.data?.error || "Failed to sync inventory")
    }
  }

  /**
   * Batch reserve inventory for multiple products
   */
  async batchReserveInventory(items: ReservationRequest[]): Promise<boolean> {
    try {
      // Since there's no batch endpoint, we'll do this sequentially
      for (const item of items) {
        await this.reserveInventory(item.product_id, item.quantity, item.variant_id, item.reservation_id)
      }
      return true
    } catch (error: any) {
      console.error("Error batch reserving inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to reserve inventory for some items")
    }
  }

  /**
   * Batch release inventory for multiple products
   */
  async batchReleaseInventory(items: ReservationRequest[]): Promise<boolean> {
    try {
      // Since there's no batch endpoint, we'll do this sequentially
      for (const item of items) {
        await this.releaseInventory(item.product_id, item.quantity, item.variant_id, item.reservation_id)
      }
      return true
    } catch (error: any) {
      console.error("Error batch releasing inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to release inventory for some items")
    }
  }

  /**
   * Reserve inventory for a cart without reducing stock
   */
  async reserveForCart(
    productId: number,
    quantity: number,
    variantId?: number,
    cartId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = {
        quantity,
        variant_id: variantId,
        cart_id: cartId,
        is_cart_reservation: true,
      }

      const response = await api.post(`/api/inventory/reserve/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error reserving inventory for cart:", error)
      throw new Error(error.response?.data?.error || "Failed to reserve inventory")
    }
  }

  /**
   * Release cart reservation when item is removed from cart
   */
  async releaseCartReservation(
    productId: number,
    quantity: number,
    variantId?: number,
    cartId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = {
        quantity,
        variant_id: variantId,
        cart_id: cartId,
        is_cart_reservation: true,
      }

      const response = await api.post(`/api/inventory/release-reservation/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error releasing cart reservation:", error)
      throw new Error(error.response?.data?.error || "Failed to release reservation")
    }
  }

  /**
   * Convert cart reservations to actual inventory reduction after checkout
   */
  async convertReservationToOrder(cartId: string, orderId: string): Promise<boolean> {
    try {
      const response = await api.post(`/api/inventory/convert-reservation`, {
        cart_id: cartId,
        order_id: orderId,
      })
      return response.data.success
    } catch (error: any) {
      console.error("Error converting reservation to order:", error)
      throw new Error(error.response?.data?.error || "Failed to convert reservation")
    }
  }
}

export const inventoryService = new InventoryService()
export default inventoryService
