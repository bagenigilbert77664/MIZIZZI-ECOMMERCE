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
  reservation_id?: string
}

export interface InventorySummary {
  product_id: number
  total_stock_level: number
  total_reserved_quantity: number
  total_available_quantity: number
  is_in_stock: boolean
  is_low_stock: boolean
  items: InventoryItem[]
}

const USER_INVENTORY_BASE = "/api/inventory/user"
const ADMIN_INVENTORY_BASE = "/api/inventory/admin"

class InventoryService {
  async checkAvailability(productId: number, quantity = 1, variantId?: number): Promise<AvailabilityResponse> {
    try {
      const params = new URLSearchParams()
      params.append("quantity", quantity.toString())
      if (variantId) params.append("variant_id", variantId.toString())

      const response = await api.get(`${USER_INVENTORY_BASE}/availability/${productId}?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error checking product availability:", error)
      throw new Error(error.response?.data?.error || "Failed to check product availability")
    }
  }

  async getProductInventory(productId: number, variantId?: number): Promise<InventoryItem | InventoryItem[]> {
    try {
      const params = new URLSearchParams()
      if (variantId) params.append("variant_id", variantId.toString())

      const response = await api.get(`${USER_INVENTORY_BASE}/product/${productId}?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error getting product inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to get product inventory")
    }
  }

  async getProductInventorySummary(productId: number, variantId?: number): Promise<InventorySummary> {
    // Ensure productId is a number
    const pid = typeof productId === "string" ? Number.parseInt(productId, 10) : productId
    const data = await this.getProductInventory(pid, variantId)

    const items: InventoryItem[] = Array.isArray(data) ? data : [data as InventoryItem]

    // Defensive normalization in case available_quantity is missing
    const normalized = items.map((it) => ({
      ...it,
      available_quantity:
        typeof it.available_quantity === "number"
          ? it.available_quantity
          : Math.max(0, (it.stock_level ?? 0) - (it.reserved_quantity ?? 0)),
      is_in_stock:
        typeof it.is_in_stock === "boolean"
          ? it.is_in_stock
          : Math.max(0, (it.stock_level ?? 0) - (it.reserved_quantity ?? 0)) > 0,
      is_low_stock:
        typeof it.is_low_stock === "boolean"
          ? it.is_low_stock
          : Math.max(0, (it.stock_level ?? 0) - (it.reserved_quantity ?? 0)) <= (it.low_stock_threshold ?? 0),
    }))

    const total_stock_level = normalized.reduce((sum, it) => sum + (it.stock_level ?? 0), 0)
    const total_reserved_quantity = normalized.reduce((sum, it) => sum + (it.reserved_quantity ?? 0), 0)
    const total_available_quantity = normalized.reduce((sum, it) => sum + (it.available_quantity ?? 0), 0)
    const is_in_stock = total_available_quantity > 0
    // Consider low stock if any item is low, or if total available is below the smallest threshold among items
    const minThreshold =
      normalized.length > 0
        ? Math.min(...normalized.map((it) => (typeof it.low_stock_threshold === "number" ? it.low_stock_threshold : 0)))
        : 0
    const is_low_stock =
      normalized.some((it) => it.is_low_stock) ||
      (minThreshold > 0 && total_available_quantity > 0 && total_available_quantity <= minThreshold)

    return {
      product_id: pid,
      total_stock_level,
      total_reserved_quantity,
      total_available_quantity,
      is_in_stock,
      is_low_stock,
      items: normalized,
    }
  }

  async getAllInventory(page = 1, perPage = 20, filters: Record<string, any> = {}): Promise<InventoryResponse> {
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, value.toString())
      })

      const response = await api.get(`${USER_INVENTORY_BASE}/?${params.toString()}`)
      // Normalize to InventoryResponse shape
      const data = response.data
      const items: InventoryItem[] = (data.inventory || []).map((it: any) => ({
        ...it,
        is_in_stock: !!it.is_in_stock,
        is_low_stock: !!it.is_low_stock,
      }))
      const pagination = data.pagination || {
        page,
        per_page: perPage,
        total_pages: Math.ceil((items.length || 0) / perPage),
        total_items: items.length,
      }
      return { items, pagination }
    } catch (error: any) {
      console.error("Error getting inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to get inventory")
    }
  }

  async getLowStockItems(page = 1, perPage = 20): Promise<InventoryResponse> {
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())
      const response = await api.get(`${ADMIN_INVENTORY_BASE}/low-stock?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error getting low stock items:", error)
      throw new Error(error.response?.data?.error || "Failed to get low stock items")
    }
  }

  async getOutOfStockItems(page = 1, perPage = 20): Promise<InventoryResponse> {
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())
      const response = await api.get(`${ADMIN_INVENTORY_BASE}/out-of-stock?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error("Error getting out of stock items:", error)
      throw new Error(error.response?.data?.error || "Failed to get out of stock items")
    }
  }

  async updateInventory(inventoryId: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await api.put(`${ADMIN_INVENTORY_BASE}/${inventoryId}`, data)
      toast({ title: "Inventory Updated", description: "Inventory has been updated successfully" })
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

  async adjustInventory(
    productId: number,
    adjustment: number,
    variantId?: number,
    reason?: string,
  ): Promise<InventoryItem> {
    try {
      const data = { adjustment, variant_id: variantId, reason }
      const response = await api.post(`${ADMIN_INVENTORY_BASE}/adjust/${productId}`, data)
      toast({ title: "Inventory Adjusted", description: "Inventory has been adjusted successfully" })
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

  async reserveInventory(
    productId: number,
    quantity: number,
    variantId?: number,
    reservationId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = { quantity, variant_id: variantId, reservation_id: reservationId }
      const response = await api.post(`${USER_INVENTORY_BASE}/reserve/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error reserving inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to reserve inventory")
    }
  }

  async releaseInventory(
    productId: number,
    quantity: number,
    variantId?: number,
    reservationId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = { quantity, variant_id: variantId, reservation_id: reservationId }
      const response = await api.post(`${USER_INVENTORY_BASE}/release/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error releasing inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to release inventory")
    }
  }

  async commitInventory(
    productId: number,
    quantity: number,
    variantId?: number,
    reservationId?: string,
    orderId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = { quantity, variant_id: variantId, reservation_id: reservationId, order_id: orderId }
      const response = await api.post(`${USER_INVENTORY_BASE}/commit/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error committing inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to commit inventory")
    }
  }

  async validateCartItems(
    cartItems: { product_id: number; variant_id?: number; quantity: number }[],
  ): Promise<CartValidationResponse> {
    try {
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        console.log("No authentication token found, skipping server validation")
        return { is_valid: true, errors: [], warnings: [] }
      }
      const response = await api.post(`${USER_INVENTORY_BASE}/validate-cart`, { items: cartItems })
      return response.data
    } catch (error: any) {
      console.error("Cart validation error:", error)
      if (error.response?.status === 401) {
        return { is_valid: true, errors: [], warnings: [] }
      }
      return {
        is_valid: true,
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

  async createInventory(data: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await api.post(`${ADMIN_INVENTORY_BASE}/`, data)
      toast({ title: "Inventory Created", description: "New inventory item has been created successfully" })
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

  async syncInventoryFromProducts(): Promise<{ created: number; updated: number }> {
    try {
      // If your backend exposes a different admin sync route (e.g. /api/admin/inventory/sync),
      // switch this path to match. For now, keep admin base for consistency.
      const response = await api.post(`${ADMIN_INVENTORY_BASE}/sync-from-products`)
      toast({
        title: "Inventory Synced",
        description: `Created ${response.data.created} and updated ${response.data.updated} inventory items`,
      })
      return { created: response.data.created, updated: response.data.updated }
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

  async batchReserveInventory(items: ReservationRequest[]): Promise<boolean> {
    try {
      for (const item of items) {
        await this.reserveInventory(item.product_id, item.quantity, item.variant_id, item.reservation_id)
      }
      return true
    } catch (error: any) {
      console.error("Error batch reserving inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to reserve inventory for some items")
    }
  }

  async batchReleaseInventory(items: ReservationRequest[]): Promise<boolean> {
    try {
      for (const item of items) {
        await this.releaseInventory(item.product_id, item.quantity, item.variant_id, item.reservation_id)
      }
      return true
    } catch (error: any) {
      console.error("Error batch releasing inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to release inventory for some items")
    }
  }

  async reserveForCart(
    productId: number,
    quantity: number,
    variantId?: number,
    cartId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = { quantity, variant_id: variantId, cart_id: cartId, is_cart_reservation: true }
      const response = await api.post(`${USER_INVENTORY_BASE}/reserve/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error reserving inventory for cart:", error)
      throw new Error(error.response?.data?.error || "Failed to reserve inventory")
    }
  }

  async releaseCartReservation(
    productId: number,
    quantity: number,
    variantId?: number,
    cartId?: string,
  ): Promise<InventoryItem> {
    try {
      const data = { quantity, variant_id: variantId, cart_id: cartId, is_cart_reservation: true }
      const response = await api.post(`${USER_INVENTORY_BASE}/release/${productId}`, data)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error releasing cart reservation:", error)
      throw new Error(error.response?.data?.error || "Failed to release reservation")
    }
  }

  async convertReservationToOrder(cartId: string, orderId: string): Promise<boolean> {
    try {
      const response = await api.post(`${USER_INVENTORY_BASE}/complete-order/${orderId}`, { cart_id: cartId })
      return response.data.success ?? true
    } catch (error: any) {
      console.error("Error converting reservation to order:", error)
      throw new Error(error.response?.data?.error || "Failed to convert reservation")
    }
  }
}

export const inventoryService = new InventoryService()
export default inventoryService
