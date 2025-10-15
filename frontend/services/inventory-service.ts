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

export interface EnhancedInventoryItem extends InventoryItem {
  product?: {
    id: number
    name: string
    slug: string
    price: number
    sale_price?: number
    thumbnail_url?: string
    image_urls?: string[]
    category?: { name: string }
    brand?: { name: string }
    sku?: string
  }
}

export interface InventoryResponse {
  items: EnhancedInventoryItem[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
  statistics?: {
    total_items: number
    in_stock: number
    low_stock: number
    out_of_stock: number
    total_value: number
    reserved_quantity: number
    needs_reorder: number
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
  items: EnhancedInventoryItem[]
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

  async getProductInventory(
    productId: number,
    variantId?: number,
  ): Promise<EnhancedInventoryItem | EnhancedInventoryItem[]> {
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

    console.log("[v0] Getting inventory summary for product:", pid, "variant:", variantId)

    const data = await this.getProductInventory(pid, variantId)

    const items: EnhancedInventoryItem[] = Array.isArray(data) ? data : [data as EnhancedInventoryItem]

    console.log("[v0] Raw inventory data:", items)

    // Defensive normalization in case available_quantity is missing
    const normalized = items.map((it) => {
      const available =
        typeof it.available_quantity === "number"
          ? it.available_quantity
          : Math.max(0, (it.stock_level ?? 0) - (it.reserved_quantity ?? 0))

      const inStock = typeof it.is_in_stock === "boolean" ? it.is_in_stock : available > 0

      const lowStock =
        typeof it.is_low_stock === "boolean"
          ? it.is_low_stock
          : available > 0 && available <= (it.low_stock_threshold ?? 5)

      console.log("[v0] Normalized item:", {
        id: it.id,
        stock_level: it.stock_level,
        reserved_quantity: it.reserved_quantity,
        available_quantity: available,
        is_in_stock: inStock,
        is_low_stock: lowStock,
      })

      return {
        ...it,
        available_quantity: available,
        is_in_stock: inStock,
        is_low_stock: lowStock,
      }
    })

    const total_stock_level = normalized.reduce((sum, it) => sum + (it.stock_level ?? 0), 0)
    const total_reserved_quantity = normalized.reduce((sum, it) => sum + (it.reserved_quantity ?? 0), 0)
    const total_available_quantity = normalized.reduce((sum, it) => sum + (it.available_quantity ?? 0), 0)
    const is_in_stock = total_available_quantity > 0
    // Consider low stock if any item is low, or if total available is below the smallest threshold among items
    const minThreshold =
      normalized.length > 0
        ? Math.min(...normalized.map((it) => (typeof it.low_stock_threshold === "number" ? it.low_stock_threshold : 5)))
        : 5
    const is_low_stock =
      normalized.some((it) => it.is_low_stock) ||
      (minThreshold > 0 && total_available_quantity > 0 && total_available_quantity <= minThreshold)

    const summary = {
      product_id: pid,
      total_stock_level,
      total_reserved_quantity,
      total_available_quantity,
      is_in_stock,
      is_low_stock,
      items: normalized,
    }

    console.log("[v0] Final inventory summary:", summary)

    return summary
  }

  async getAllInventory(page = 1, perPage = 20, filters: Record<string, any> = {}): Promise<InventoryResponse> {
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("per_page", perPage.toString())
      params.append("include_product_details", "true")
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })

      const response = await api.get(`${ADMIN_INVENTORY_BASE}/?${params.toString()}`)

      // Normalize response data structure
      const data = response.data
      let items: any[] = []
      let pagination = {
        page,
        per_page: perPage,
        total_pages: 1,
        total_items: 0,
      }
      let statistics: any = {}

      if (data.success && data.inventory) {
        items = data.inventory.map((item: any) => ({
          ...item,
          is_in_stock: item.available_quantity > 0,
          is_low_stock: item.available_quantity > 0 && item.available_quantity <= (item.low_stock_threshold || 5),
          available_quantity: Math.max(0, (item.stock_level || 0) - (item.reserved_quantity || 0)),
          product: item.product
            ? {
                id: item.product.id,
                name: item.product.name,
                slug: item.product.slug,
                price: item.product.price,
                sale_price: item.product.sale_price,
                thumbnail_url: item.product.thumbnail_url || (item.product.image_urls && item.product.image_urls[0]),
                image_urls: item.product.image_urls || [],
                category: item.product.category,
                brand: item.product.brand,
                sku: item.product.sku,
              }
            : undefined,
        }))

        if (data.pagination) {
          pagination = {
            page: data.pagination.page || page,
            per_page: data.pagination.per_page || perPage,
            total_pages: data.pagination.pages || Math.ceil((data.pagination.total || items.length) / perPage),
            total_items: data.pagination.total || items.length,
          }
        }

        if (data.statistics) {
          statistics = {
            total_items: data.statistics.total_items || 0,
            in_stock: data.statistics.in_stock || 0,
            low_stock: data.statistics.low_stock || 0,
            out_of_stock: data.statistics.out_of_stock || 0,
            total_value: data.statistics.total_value || 0,
            reserved_quantity: data.statistics.reserved_quantity || 0,
            needs_reorder: data.statistics.needs_reorder || 0,
          }
        }
      }

      return { items, pagination, statistics }
    } catch (error: any) {
      console.error("Error getting admin inventory:", error)
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

  async updateInventory(inventoryId: number, data: Partial<EnhancedInventoryItem>): Promise<EnhancedInventoryItem> {
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
  ): Promise<EnhancedInventoryItem> {
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

  async quickStockAdjustment(
    productId: number,
    adjustment: number,
    variantId?: number,
    reason?: string,
  ): Promise<EnhancedInventoryItem> {
    try {
      const data = { adjustment, variant_id: variantId, reason: reason || "Quick adjustment" }
      const response = await api.post(`${ADMIN_INVENTORY_BASE}/adjust/${productId}`, data)
      toast({
        title: "Stock Adjusted",
        description: `Stock ${adjustment > 0 ? "increased" : "decreased"} by ${Math.abs(adjustment)} units`,
      })
      return response.data.inventory
    } catch (error: any) {
      console.error("Error adjusting stock:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to adjust stock",
        variant: "destructive",
      })
      throw new Error(error.response?.data?.error || "Failed to adjust stock")
    }
  }

  async bulkAdjustInventory(
    adjustments: { product_id: number; variant_id?: number; adjustment: number; reason: string }[],
  ): Promise<{ successful: number; failed: number; details: any }> {
    try {
      const response = await api.post(`${ADMIN_INVENTORY_BASE}/bulk-adjust`, { adjustments })
      toast({
        title: "Bulk Adjustment Complete",
        description: `${response.data.successful} items adjusted successfully`,
      })
      return response.data
    } catch (error: any) {
      console.error("Error in bulk adjustment:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to process bulk adjustments",
        variant: "destructive",
      })
      throw new Error(error.response?.data?.error || "Failed to process bulk adjustments")
    }
  }

  async reserveInventory(
    productId: number,
    quantity: number,
    variantId?: number,
    reservationId?: string,
  ): Promise<EnhancedInventoryItem> {
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
  ): Promise<EnhancedInventoryItem> {
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
  ): Promise<EnhancedInventoryItem> {
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

  async createInventory(data: Partial<EnhancedInventoryItem>): Promise<EnhancedInventoryItem> {
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
  ): Promise<EnhancedInventoryItem> {
    try {
      const data = { quantity, variant_id: variantId, cart_id: cartId, is_cart_reservation: true }
      const response = await api.post(`${USER_INVENTORY_BASE}/reserve/${productId}`, data)

      console.log(`[v0] Successfully reserved ${quantity} units of product ${productId} for cart ${cartId}`)
      return response.data.inventory
    } catch (error: any) {
      console.error("Error reserving inventory for cart:", error)

      if (error.response?.status === 400) {
        const errorData = error.response.data
        if (errorData.code === "insufficient_stock" || errorData.code === "out_of_stock") {
          throw new Error(errorData.message || `Insufficient stock for product ${productId}`)
        }
      }

      throw new Error(error.response?.data?.error || "Failed to reserve inventory")
    }
  }

  async releaseCartReservation(
    productId: number,
    quantity: number,
    variantId?: number,
    cartId?: string,
  ): Promise<EnhancedInventoryItem> {
    try {
      const data = { quantity, variant_id: variantId, cart_id: cartId, is_cart_reservation: true }
      const response = await api.post(`${USER_INVENTORY_BASE}/release/${productId}`, data)

      console.log(`[v0] Successfully released ${quantity} units of product ${productId} from cart ${cartId}`)
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

  async handleOrderCompletion(orderId: string, cartId?: string): Promise<boolean> {
    try {
      if (cartId) {
        // Convert cart reservations to committed inventory
        return await this.convertReservationToOrder(cartId, orderId)
      } else {
        // Handle order completion without cart (direct order)
        const response = await api.post(`${USER_INVENTORY_BASE}/complete-order/${orderId}`)
        return response.data.success ?? true
      }
    } catch (error: any) {
      console.error("Error handling order completion:", error)
      throw new Error(error.response?.data?.error || "Failed to complete order")
    }
  }

  async validateCartInventory(
    cartItems: { product_id: number; variant_id?: number; quantity: number; id?: number }[],
  ): Promise<{
    isValid: boolean
    errors: Array<{
      itemId?: number
      productId: number
      variantId?: number
      requestedQuantity: number
      availableQuantity: number
      message: string
    }>
    warnings: Array<{
      itemId?: number
      productId: number
      variantId?: number
      message: string
    }>
  }> {
    const errors: any[] = []
    const warnings: any[] = []

    for (const item of cartItems) {
      try {
        const inventorySummary = await this.getProductInventorySummary(item.product_id, item.variant_id)

        // Check if item is out of stock
        if (!inventorySummary.is_in_stock) {
          errors.push({
            itemId: item.id,
            productId: item.product_id,
            variantId: item.variant_id,
            requestedQuantity: item.quantity,
            availableQuantity: 0,
            message: `Product ${item.product_id} is out of stock`,
          })
          continue
        }

        // Check if requested quantity exceeds available
        if (item.quantity > inventorySummary.total_available_quantity) {
          errors.push({
            itemId: item.id,
            productId: item.product_id,
            variantId: item.variant_id,
            requestedQuantity: item.quantity,
            availableQuantity: inventorySummary.total_available_quantity,
            message: `Only ${inventorySummary.total_available_quantity} units available for product ${item.product_id}`,
          })
          continue
        }

        // Check for low stock warning
        if (inventorySummary.is_low_stock) {
          warnings.push({
            itemId: item.id,
            productId: item.product_id,
            variantId: item.variant_id,
            message: `Product ${item.product_id} is low in stock (${inventorySummary.total_available_quantity} remaining)`,
          })
        }
      } catch (error) {
        console.error(`Error validating inventory for product ${item.product_id}:`, error)
        warnings.push({
          itemId: item.id,
          productId: item.product_id,
          variantId: item.variant_id,
          message: `Could not validate stock for product ${item.product_id}`,
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  async getInventoryStats(): Promise<{
    total_items: number
    in_stock: number
    low_stock: number
    out_of_stock: number
    total_value: number
    reserved_quantity: number
    needs_reorder: number
  }> {
    try {
      const response = await api.get(`${ADMIN_INVENTORY_BASE}/reports/summary`)
      const summary = response.data.summary || {}

      return {
        total_items: summary.total_items || 0,
        in_stock: summary.active_items || 0,
        low_stock: summary.low_stock_items || 0,
        out_of_stock: summary.out_of_stock_items || 0,
        total_value: summary.total_stock_value || 0,
        reserved_quantity: summary.reserved_stock_value || 0,
        needs_reorder: summary.items_needing_reorder || 0,
      }
    } catch (error: any) {
      console.error("Error getting inventory stats:", error)
      // Return default stats on error
      return {
        total_items: 0,
        in_stock: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
        reserved_quantity: 0,
        needs_reorder: 0,
      }
    }
  }

  async exportInventory(format: "csv" | "json" = "csv", status?: string): Promise<Blob | any> {
    try {
      const params = new URLSearchParams()
      params.append("format", format)
      if (status) params.append("status", status)

      const response = await api.get(`${ADMIN_INVENTORY_BASE}/export?${params.toString()}`, {
        responseType: format === "csv" ? "blob" : "json",
      })

      if (format === "csv") {
        return new Blob([response.data], { type: "text/csv" })
      } else {
        return response.data
      }
    } catch (error: any) {
      console.error("Error exporting inventory:", error)
      toast({
        title: "Export Error",
        description: error.response?.data?.error || "Failed to export inventory",
        variant: "destructive",
      })
      throw new Error(error.response?.data?.error || "Failed to export inventory")
    }
  }

  async getInventoryHistory(params?: {
    page?: number
    per_page?: number
    product_id?: number
    action_type?: string
    start_date?: string
    end_date?: string
    admin_id?: number
    search?: string
  }): Promise<{
    movements: Array<{
      id: number
      product_id: number
      product_name?: string
      product_sku?: string
      variant_id?: number
      variant_info?: string
      action_type: string
      quantity_change: number
      previous_quantity: number
      new_quantity: number
      reason?: string
      admin_id?: number
      admin_name?: string
      created_at: string
      order_id?: number
      notes?: string
    }>
    pagination: {
      page: number
      per_page: number
      total_pages: number
      total_items: number
    }
    statistics?: {
      total_additions: number
      total_removals: number
      total_adjustments: number
      total_sales: number
      total_returns: number
    }
  }> {
    try {
      const queryParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
          }
        })
      }

      const response = await api.get(`${ADMIN_INVENTORY_BASE}/reports/movement?${queryParams.toString()}`)

      const data = response.data
      return {
        movements: data.movements || data.items || [],
        pagination: data.pagination || {
          page: params?.page || 1,
          per_page: params?.per_page || 20,
          total_pages: 1,
          total_items: 0,
        },
        statistics: data.statistics || {
          total_additions: 0,
          total_removals: 0,
          total_adjustments: 0,
          total_sales: 0,
          total_returns: 0,
        },
      }
    } catch (error: any) {
      console.error("Error fetching inventory history:", error)
      throw new Error(error.response?.data?.error || "Failed to fetch inventory history")
    }
  }
}

export const inventoryService = new InventoryService()
export default inventoryService
