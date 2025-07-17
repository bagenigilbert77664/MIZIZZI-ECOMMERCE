import api from "@/lib/api"

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
  last_updated?: string
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
}

// Cache for inventory data with shorter duration for real-time updates
const inventoryCache = new Map<string, { data: any; timestamp: number }>()
const INVENTORY_CACHE_DURATION = 30 * 1000 // 30 seconds cache for real-time updates

class InventoryService {
  /**
   * Check product availability with real backend data
   */
  async checkAvailability(productId: number, quantity = 1, variantId?: number): Promise<AvailabilityResponse> {
    try {
      const params = new URLSearchParams()
      params.append("quantity", quantity.toString())
      if (variantId) {
        params.append("variant_id", variantId.toString())
      }

      console.log(`Checking availability for product ${productId}, quantity: ${quantity}`)

      // Always fetch fresh data for availability checks
      const response = await api.get(`/api/inventory/check-availability/${productId}?${params.toString()}`)

      if (response.data) {
        console.log(`Real inventory data for product ${productId}:`, response.data)
        return response.data
      }

      throw new Error("No inventory data received")
    } catch (error: any) {
      console.error("Error checking product availability:", error)

      // Fallback: try to get inventory from product endpoint
      try {
        const productInventory = await this.getProductInventory(productId, variantId)

        if (productInventory) {
          const inventory = Array.isArray(productInventory) ? productInventory[0] : productInventory
          const availableStock = inventory.available_quantity || inventory.stock_level || 0

          console.log(`Fallback inventory data for product ${productId}: ${availableStock} available`)

          return {
            product_id: productId,
            variant_id: variantId || null,
            requested_quantity: quantity,
            available_quantity: availableStock,
            is_available: quantity <= availableStock,
            status: "success",
            is_low_stock: availableStock <= (inventory.low_stock_threshold || 5),
          }
        }
      } catch (fallbackError) {
        console.error("Fallback inventory check also failed:", fallbackError)
      }

      // Final fallback with conservative stock levels
      return {
        product_id: productId,
        variant_id: variantId || null,
        requested_quantity: quantity,
        available_quantity: 0,
        is_available: false,
        status: "error",
        is_low_stock: true,
      }
    }
  }

  /**
   * Get real inventory for a product (always fresh data)
   */
  async getProductInventory(productId: number, variantId?: number): Promise<InventoryItem | InventoryItem[]> {
    try {
      const params = new URLSearchParams()
      if (variantId) {
        params.append("variant_id", variantId.toString())
      }

      console.log(`Fetching fresh inventory for product ${productId}`)

      // Always fetch fresh data, no caching for inventory
      const response = await api.get(`/api/inventory/product/${productId}?${params.toString()}`)

      if (response.data) {
        console.log(`Fresh inventory data for product ${productId}:`, response.data)
        return response.data
      }

      throw new Error("No inventory data received")
    } catch (error: any) {
      console.error("Error getting product inventory:", error)
      throw new Error(error.response?.data?.error || "Failed to get product inventory")
    }
  }

  /**
   * Get inventory summary for a product (always fresh for UI display)
   */
  async getProductInventorySummary(
    productId: number,
    variantId?: number,
  ): Promise<{
    available_quantity: number
    is_in_stock: boolean
    is_low_stock: boolean
    stock_status: "in_stock" | "low_stock" | "out_of_stock"
    last_updated?: string
  }> {
    try {
      // Always fetch fresh data for summary
      const inventory = await this.getProductInventory(productId, variantId)

      if (inventory) {
        const item = Array.isArray(inventory) ? inventory[0] : inventory
        const availableQty = item.available_quantity || item.stock_level || 0
        const lowStockThreshold = item.low_stock_threshold || 5

        return {
          available_quantity: availableQty,
          is_in_stock: availableQty > 0,
          is_low_stock: availableQty <= lowStockThreshold && availableQty > 0,
          stock_status:
            availableQty === 0 ? "out_of_stock" : availableQty <= lowStockThreshold ? "low_stock" : "in_stock",
          last_updated: item.last_updated,
        }
      }

      return {
        available_quantity: 0,
        is_in_stock: false,
        is_low_stock: false,
        stock_status: "out_of_stock",
      }
    } catch (error) {
      console.error(`Error getting inventory summary for product ${productId}:`, error)
      return {
        available_quantity: 0,
        is_in_stock: false,
        is_low_stock: false,
        stock_status: "out_of_stock",
      }
    }
  }

  /**
   * Trigger inventory reduction for completed order
   */
  async completeOrderInventory(orderId: number): Promise<boolean> {
    try {
      console.log(`Triggering inventory reduction for order ${orderId}`)

      const response = await api.post(`/api/inventory/complete-order/${orderId}`)

      if (response.data && response.data.inventory_updates) {
        console.log(`Inventory reduced for order ${orderId}:`, response.data.inventory_updates)

        // Clear cache for affected products
        response.data.inventory_updates.forEach((update: any) => {
          this.clearProductInventoryCache(update.product_id)
        })

        // Dispatch inventory update events for each affected product
        response.data.inventory_updates.forEach((update: any) => {
          document.dispatchEvent(
            new CustomEvent("inventory-updated", {
              detail: {
                productId: update.product_id,
                orderId: orderId,
                quantityReduced: update.quantity_reduced,
                newAvailableQuantity: update.new_available_quantity,
              },
            }),
          )
        })

        return true
      }

      return false
    } catch (error: any) {
      console.error(`Error completing order inventory for order ${orderId}:`, error)
      return false
    }
  }

  /**
   * Validate cart items against real inventory
   */
  async validateCartItems(
    cartItems: { product_id: number; variant_id?: number; quantity: number }[],
  ): Promise<CartValidationResponse> {
    try {
      const token = localStorage.getItem("mizizzi_token")

      if (!token) {
        console.log("No authentication token found, skipping server validation")
        return {
          is_valid: true,
          errors: [],
          warnings: [],
        }
      }

      // Use real backend validation with fresh data
      const response = await api.post("/api/cart/validate", { items: cartItems })
      return response.data
    } catch (error: any) {
      console.error("Cart validation error:", error)

      if (error.response?.status === 401) {
        return {
          is_valid: true,
          errors: [],
          warnings: [],
        }
      }

      // Try to validate against individual inventory checks
      try {
        const errors: any[] = []
        const warnings: any[] = []

        for (const item of cartItems) {
          const availability = await this.checkAvailability(item.product_id, item.quantity, item.variant_id)

          if (!availability.is_available) {
            errors.push({
              code: "insufficient_stock",
              message: `Only ${availability.available_quantity} items available for this product`,
              product_id: item.product_id,
              variant_id: item.variant_id,
              available_stock: availability.available_quantity,
            })
          } else if (availability.is_low_stock) {
            warnings.push({
              code: "low_stock",
              message: `Low stock: Only ${availability.available_quantity} items remaining`,
              product_id: item.product_id,
              variant_id: item.variant_id,
            })
          }
        }

        return {
          is_valid: errors.length === 0,
          errors,
          warnings,
        }
      } catch (validationError) {
        console.error("Manual validation also failed:", validationError)

        return {
          is_valid: true,
          errors: [],
          warnings: [
            {
              code: "validation_error",
              message: "Could not validate product availability. Please check stock levels manually.",
            },
          ],
        }
      }
    }
  }

  /**
   * Clear inventory cache for a specific product
   */
  clearProductInventoryCache(productId?: number): void {
    if (productId) {
      // Clear specific product cache
      const keysToDelete = Array.from(inventoryCache.keys()).filter((key) => key.startsWith(`inventory-${productId}-`))
      keysToDelete.forEach((key) => inventoryCache.delete(key))
      console.log(`Cleared inventory cache for product ${productId}`)
    } else {
      // Clear all inventory cache
      inventoryCache.clear()
      console.log("Cleared all inventory cache")
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    inventoryCache.clear()
    console.log("All inventory caches cleared")
  }

  /**
   * Get real-time inventory updates for multiple products
   */
  async getMultipleProductInventory(productIds: number[]): Promise<Record<number, InventoryItem>> {
    try {
      const response = await api.post("/api/inventory/bulk-check", { product_ids: productIds })

      if (response.data && response.data.inventory_items) {
        const inventoryMap: Record<number, InventoryItem> = {}

        response.data.inventory_items.forEach((item: InventoryItem) => {
          inventoryMap[item.product_id] = item
        })

        return inventoryMap
      }

      return {}
    } catch (error: any) {
      console.error("Error fetching bulk inventory:", error)
      return {}
    }
  }

  /**
   * Subscribe to real-time inventory updates
   */
  subscribeToInventoryUpdates(productIds: number[], callback: (updates: any) => void): () => void {
    const handleInventoryUpdate = (event: CustomEvent) => {
      const { productId, ...updateData } = event.detail

      if (productIds.includes(productId)) {
        callback({ productId, ...updateData })
      }
    }

    document.addEventListener("inventory-updated", handleInventoryUpdate as EventListener)

    return () => {
      document.removeEventListener("inventory-updated", handleInventoryUpdate as EventListener)
    }
  }

  /**
   * Handle order completion and trigger inventory updates
   */
  async handleOrderCompletion(
    orderId: string,
    items: Array<{ product_id: number; quantity: number; variant_id?: number }>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Processing order completion for order ${orderId}`)

      // Trigger inventory reduction for each item
      const results = await Promise.allSettled(
        items.map(async (item) => {
          try {
            // Clear cache for this product
            this.clearProductInventoryCache(item.product_id)

            // Dispatch inventory update event
            document.dispatchEvent(
              new CustomEvent("inventory-updated", {
                detail: {
                  productId: item.product_id,
                  orderId: orderId,
                  quantityReduced: item.quantity,
                  variantId: item.variant_id,
                },
              }),
            )

            return { success: true, productId: item.product_id }
          } catch (error) {
            console.error(`Failed to update inventory for product ${item.product_id}:`, error)
            return { success: false, productId: item.product_id, error }
          }
        }),
      )

      const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length
      const failed = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success),
      ).length

      console.log(`Order ${orderId} inventory update: ${successful} successful, ${failed} failed`)

      return {
        success: failed === 0,
        error: failed > 0 ? `${failed} items failed to update` : undefined,
      }
    } catch (error: any) {
      console.error(`Error handling order completion for ${orderId}:`, error)
      return {
        success: false,
        error: error.message || "Failed to process order completion",
      }
    }
  }
}

export const inventoryService = new InventoryService()
export default inventoryService
