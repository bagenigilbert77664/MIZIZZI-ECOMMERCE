import api from "@/lib/api"
import type { Order, OrderItem } from "@/types"

// Cache for orders to prevent redundant API calls
const orderCache = new Map<string, { data: Order; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const orderService = {
  async getOrders(params = {}): Promise<Order[]> {
    try {
      const queryParams: Record<string, any> = {
        ...params,
        include_items: true,
        per_page: 100,
        limit: 1000,
      }

      const response = await api.get("/api/orders", { params: queryParams })

      let orders: Order[] = []

      // First try the correct backend format: response.data.data.orders
      if (response.data?.data?.orders && Array.isArray(response.data.data.orders)) {
        orders = response.data.data.orders.map((item: any) => this.mapOrderFromApi(item))
      }
      // Fallback to legacy format: response.data.data (array)
      else if (response.data?.data && Array.isArray(response.data.data)) {
        orders = response.data.data.map((item: any) => this.mapOrderFromApi(item))
      }
      // Another fallback: response.data.items
      else if (response.data?.items && Array.isArray(response.data.items)) {
        orders = response.data.items.map((item: any) => this.mapOrderFromApi(item))
      }
      // Direct array response
      else if (Array.isArray(response.data)) {
        orders = response.data.map((item: any) => this.mapOrderFromApi(item))
      }

      return orders
    } catch (error: any) {
      console.error("Error fetching orders:", error)
      return []
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (!id || id.trim() === "" || id === "undefined" || id === "null") {
      console.error("Invalid order ID provided:", id)
      return null
    }

    let apiId = id
    if (id.startsWith("order-")) {
      apiId = id.replace("order-", "")
    }

    try {
      // Check cache first
      const cacheKey = `order-${id}`
      const now = Date.now()
      const cachedItem = orderCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        return cachedItem.data
      }

      // Check if we're offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        try {
          const offlineOrders = JSON.parse(localStorage.getItem("offlineOrders") || "[]")
          const offlineOrder = offlineOrders.find((order: any) => order.id === id || order.id === apiId)
          if (offlineOrder) {
            return this.mapOrderFromApi(offlineOrder)
          }
        } catch (storageError) {
          console.error("Error checking localStorage for offline orders:", storageError)
        }
      }

      console.log("[v0] Fetching order from API with ID:", apiId)
      const response = await api.get(`/api/orders/${apiId}`)

      console.log("[v0] ===== FULL API RESPONSE DEBUG =====")
      console.log("[v0] response:", response)
      console.log("[v0] response.data:", response.data)
      console.log("[v0] response.data type:", typeof response.data)
      console.log("[v0] response.data keys:", response.data ? Object.keys(response.data) : "no keys")

      if (response.data?.data) {
        console.log("[v0] response.data.data:", response.data.data)
        console.log("[v0] response.data.data type:", typeof response.data.data)
        console.log("[v0] response.data.data keys:", Object.keys(response.data.data))
      }

      if (response.data?.order) {
        console.log("[v0] response.data.order:", response.data.order)
        console.log("[v0] response.data.order type:", typeof response.data.order)
        console.log("[v0] response.data.order keys:", Object.keys(response.data.order))
      }
      console.log("[v0] ===== END DEBUG =====")

      if (!response.data) {
        console.error("[v0] API returned no data for order:", apiId)
        return null
      }

      let rawOrderData = null

      // Try: response.data.data.order (nested structure)
      if (response.data?.data?.order) {
        console.log("[v0] Using response.data.data.order structure")
        rawOrderData = response.data.data.order
      }
      // Try: response.data.order (direct order property)
      else if (response.data?.order) {
        console.log("[v0] Using response.data.order structure")
        rawOrderData = response.data.order
      }
      // Try: response.data.data (data property)
      else if (response.data?.data) {
        console.log("[v0] Using response.data.data structure")
        rawOrderData = response.data.data
      }
      // Try: response.data (direct response)
      else {
        console.log("[v0] Using response.data structure")
        rawOrderData = response.data
      }

      console.log("[v0] Selected rawOrderData:", rawOrderData)
      console.log("[v0] rawOrderData.order_number:", rawOrderData?.order_number)
      console.log("[v0] rawOrderData.items:", rawOrderData?.items)
      console.log("[v0] rawOrderData.order_items:", rawOrderData?.order_items)

      // Map the API response to our Order type
      const order = this.mapOrderFromApi(rawOrderData)

      console.log("[v0] Mapped order:", order)
      console.log("[v0] Mapped order number:", order.order_number)
      console.log("[v0] Mapped order items count:", order.items?.length)
      console.log("[v0] Mapped order total:", order.total)

      // Cache the result with timestamp using original ID as key
      orderCache.set(cacheKey, {
        data: order,
        timestamp: now,
      })

      return order
    } catch (error: any) {
      console.error("[v0] Error fetching order:", error)
      console.error("[v0] Error response:", error.response)
      console.error("[v0] Error response data:", error.response?.data)
      console.error("[v0] Error response status:", error.response?.status)

      if (error.response?.status === 404) {
        // Check localStorage for offline support before throwing error
        if (typeof window !== "undefined") {
          try {
            const offlineOrders = JSON.parse(localStorage.getItem("offlineOrders") || "[]")
            const offlineOrder = offlineOrders.find((order: any) => order.id === id || order.id === apiId)
            if (offlineOrder) {
              return this.mapOrderFromApi(offlineOrder)
            }
          } catch (storageError) {
            // Silently fail for localStorage errors
          }
        }
        // Throw descriptive error for 404
        throw new Error(`Order #${apiId} not found. This order may have been deleted or does not exist.`)
      }

      // Handle permission errors
      if (error.response?.status === 403) {
        throw new Error("You do not have permission to view this order.")
      }

      // Handle authentication errors
      if (error.response?.status === 401) {
        throw new Error("Please sign in to view this order.")
      }

      // Log other errors (network issues, server errors, etc.)
      console.error(`Error fetching order ${apiId}:`, error.message || error)

      // Check if we have a locally stored order (for offline support)
      if (typeof window !== "undefined") {
        try {
          const offlineOrders = JSON.parse(localStorage.getItem("offlineOrders") || "[]")
          const offlineOrder = offlineOrders.find((order: any) => order.id === id || order.id === apiId)
          if (offlineOrder) {
            return this.mapOrderFromApi(offlineOrder)
          }
        } catch (storageError) {
          // Silently fail for localStorage errors
        }
      }

      // Throw a generic error for other cases
      throw new Error(error.message || "Failed to load order. Please try again later.")
    }
  },

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return this.getOrders({ status })
  },

  // Get canceled orders
  async getCanceledOrders(): Promise<Order[]> {
    return this.getOrdersByStatus("cancelled")
  },

  // Get returned orders
  async getReturnedOrders(): Promise<Order[]> {
    return this.getOrdersByStatus("returned")
  },

  // Improve the getOrderStats method to be more reliable
  async getOrderStats(): Promise<{
    total: number
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    returned: number
  }> {
    try {
      const response = await api.get("/api/orders/stats")

      // Validate the response data
      if (response.data && typeof response.data === "object") {
        // Ensure all required properties exist
        const stats = {
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          processing: response.data.processing || 0,
          shipped: response.data.shipped || 0,
          delivered: response.data.delivered || 0,
          cancelled: response.data.cancelled || 0,
          returned: response.data.returned || 0,
        }

        return stats
      }

      // If response format is invalid, throw error to trigger fallback
      throw new Error("Invalid stats format received from API")
    } catch (error) {
      console.error("Error fetching order stats:", error)

      // If API fails, try to calculate stats from all orders
      try {
        const allOrders = await this.getOrders()

        if (Array.isArray(allOrders)) {
          const stats = {
            total: allOrders.length,
            pending: allOrders.filter((order) => order.status?.toLowerCase() === "pending").length,
            processing: allOrders.filter((order) => order.status?.toLowerCase() === "processing").length,
            shipped: allOrders.filter((order) => order.status?.toLowerCase() === "shipped").length,
            delivered: allOrders.filter((order) => order.status?.toLowerCase() === "delivered").length,
            cancelled: allOrders.filter(
              (order) => order.status?.toLowerCase() === "cancelled" || order.status?.toLowerCase() === "canceled",
            ).length,
            returned: allOrders.filter((order) => order.status?.toLowerCase() === "returned").length,
          }

          return stats
        }
      } catch (fallbackError) {
        console.error("Error calculating stats from orders:", fallbackError)
      }

      // Return zeros as last resort
      return {
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0,
      }
    }
  },

  // Update the cancelOrder method to use the correct API endpoint
  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    try {
      let apiId = orderId
      if (orderId.startsWith("order-")) {
        apiId = orderId.replace("order-", "")
      }

      await api.post(`/api/orders/${apiId}/cancel`, { reason })

      // Invalidate cache for this order
      const cacheKey = `order-${orderId}`
      orderCache.delete(cacheKey)

      return true
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error)
      return false
    }
  },
  async returnOrder(orderId: string, reason: string): Promise<boolean> {
    try {
      let apiId = orderId
      if (orderId.startsWith("order-")) {
        apiId = orderId.replace("order-", "")
      }

      await api.post(`/api/orders/${apiId}/return`, { reason })

      // Invalidate cache for this order
      const cacheKey = `order-${orderId}`
      orderCache.delete(cacheKey)

      return true
    } catch (error: any) {
      console.error(`Error returning order ${orderId}:`, error)

      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error(
          "Return endpoint not available. Please ensure the backend server has been restarted to pick up the new return endpoint.",
        )
      }

      if (error.response?.status === 400) {
        const message = error.response?.data?.message || error.response?.data?.error || "Invalid return request"
        throw new Error(message)
      }

      if (error.response?.status === 403) {
        throw new Error("You do not have permission to return this order.")
      }

      if (error.response?.status === 401) {
        throw new Error("Please sign in to return this order.")
      }

      // Generic error
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to process return request. Please try again later.",
      )
    }
  },

  // Update the searchOrders method to use the correct API endpoint
  async searchOrders(query: string): Promise<Order[]> {
    try {
      const response = await api.get("/api/orders", {
        params: { search: query, include_items: true },
      })

      let orders: Order[] = []
      if (response.data?.data && Array.isArray(response.data.data)) {
        orders = response.data.data.map((item: any) => this.mapOrderFromApi(item))
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        orders = response.data.items.map((item: any) => this.mapOrderFromApi(item))
      } else if (Array.isArray(response.data)) {
        orders = response.data.map((item: any) => this.mapOrderFromApi(item))
      }

      return orders
    } catch (error) {
      console.error(`Failed to search orders with query "${query}":`, error)
      return []
    }
  },

  // Get recent orders (last 30 days)
  async getRecentOrders(): Promise<Order[]> {
    try {
      // If there's no dedicated endpoint, filter orders by date client-side
      const allOrders = await this.getOrders()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      return allOrders.filter((order) => {
        const orderDate = new Date(order.created_at)
        return !isNaN(orderDate.getTime()) && orderDate >= thirtyDaysAgo
      })
    } catch (error) {
      console.error("Failed to fetch recent orders:", error)
      return []
    }
  },

  // Update the trackOrder method to use the correct API endpoint
  async trackOrder(trackingNumber: string): Promise<any> {
    try {
      const response = await api.get(`/api/tracking/${trackingNumber}`)
      return response.data
    } catch (error) {
      console.error(`Error tracking order with number ${trackingNumber}:`, error)
      return null
    }
  },

  // Add the createOrder method
  async createOrder(orderData: any): Promise<any> {
    try {
      const endpoint = "/api/orders"

      const formattedOrderData = {
        payment_method: orderData.payment_method || "pesapal",
        shipping_method: orderData.shipping_method || "standard",
        notes: orderData.notes || "",
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address || orderData.shipping_address,
        shipping_cost: orderData.shipping_cost || 0,
        tax: orderData.tax || 0,
        coupon_code: orderData.coupon_code || null,
        clear_cart: orderData.clear_cart === true, // Only clear cart if explicitly true
      }

      console.log("[v0] Formatted order data being sent to API:", formattedOrderData)

      // Make the API request to the correct endpoint
      const response = await api.post(endpoint, formattedOrderData)

      // Clear any cached orders to ensure fresh data on next fetch
      Array.from(orderCache.keys())
        .filter((key) => key.startsWith("order-"))
        .forEach((key) => orderCache.delete(key))

      return response.data
    } catch (error: any) {
      console.error("Error creating order:", error)

      if (error.response) {
        console.error("API response error:", error.response.status, error.response.data)
      } else if (error.request) {
        throw new Error("Backend server is not responding. Please start the backend server.")
      }

      throw error // Re-throw the error to be handled by the caller
    }
  },

  // Helper method to map API order data to our frontend Order type
  mapOrderFromApi(apiOrder: any): Order {
    console.log("[v0] ===== mapOrderFromApi START =====")
    console.log("[v0] Full apiOrder object:", JSON.stringify(apiOrder, null, 2))

    if (!apiOrder) {
      console.error("Received null or undefined order from API")
      return this.createEmptyOrder()
    }

    try {
      const itemsArray = apiOrder.items || apiOrder.order_items || []

      console.log("[v0] Items array:", JSON.stringify(itemsArray, null, 2))

      // Safely parse items array
      const items: OrderItem[] = Array.isArray(itemsArray)
        ? itemsArray.map((item: any, itemIndex: number) => {
            console.log(`[v0] ===== Processing item ${itemIndex} =====`)
            console.log("[v0] Raw item:", JSON.stringify(item, null, 2))

            try {
              let productName = "Unknown Product"
              let productImage = "/placeholder.svg?height=200&width=200"

              // Extract product name from multiple possible locations
              if (item.product?.name) {
                productName = item.product.name
                console.log("[v0] Product name from item.product.name:", productName)
              } else if (item.product_name) {
                productName = item.product_name
                console.log("[v0] Product name from item.product_name:", productName)
              } else if (item.name) {
                productName = item.name
                console.log("[v0] Product name from item.name:", productName)
              }

              // Extract product image from multiple possible locations
              if (item.product?.thumbnail_url && item.product.thumbnail_url !== "") {
                productImage = item.product.thumbnail_url
                console.log("[v0] Product image from item.product.thumbnail_url:", productImage)
              } else if (
                item.product?.image_urls &&
                Array.isArray(item.product.image_urls) &&
                item.product.image_urls.length > 0
              ) {
                productImage = item.product.image_urls[0]
                console.log("[v0] Product image from item.product.image_urls[0]:", productImage)
              } else if (item.thumbnail_url && item.thumbnail_url !== "") {
                productImage = item.thumbnail_url
                console.log("[v0] Product image from item.thumbnail_url:", productImage)
              } else if (item.image_url && item.image_url !== "") {
                productImage = item.image_url
                console.log("[v0] Product image from item.image_url:", productImage)
              } else if (item.product_image && item.product_image !== "") {
                productImage = item.product_image
                console.log("[v0] Product image from item.product_image:", productImage)
              }

              // Extract product data safely
              const product = item.product
                ? {
                    id: item.product.id || "",
                    name: productName,
                    slug: item.product.slug || "",
                    price: Number.parseFloat(item.price || 0),
                    thumbnail_url: productImage,
                    image_urls:
                      item.product.image_urls &&
                      Array.isArray(item.product.image_urls) &&
                      item.product.image_urls.length > 0
                        ? item.product.image_urls.filter((url: string) => url && url !== "")
                        : [productImage],
                    description: item.product.description || "",
                    sku: item.product.sku || "",
                    category: item.product.category || "",
                    variation: item.variant
                      ? {
                          color: item.variant.color || "",
                          size: item.variant.size || "",
                        }
                      : {},
                  }
                : null

              const mappedItem = {
                id: item.id || `item-${Math.floor(Math.random() * 100000)}`,
                product_id: item.product_id || "",
                quantity: Number.parseInt(item.quantity || 1, 10),
                price: Number.parseFloat(item.price || 0),
                total: Number.parseFloat(item.total || (item.price || 0) * (item.quantity || 1)),
                product: product,
                product_name: productName,
                name: productName,
                image_url: productImage,
                thumbnail_url: productImage,
                variation: item.variant || item.variation || {},
              }

              console.log("[v0] Final mapped item:", JSON.stringify(mappedItem, null, 2))
              return mappedItem
            } catch (itemError) {
              console.error("[v0] Error parsing order item:", itemError)
              // Return a fallback item
              return {
                id: `item-${Math.floor(Math.random() * 100000)}`,
                product_id: item.product_id || "",
                quantity: 1,
                price: 0,
                total: 0,
                product_name: "Error loading product",
                name: "Error loading product",
                image_url: "/placeholder.svg?height=200&width=200",
                thumbnail_url: "/placeholder.svg?height=200&width=200",
                variation: {},
              }
            }
          })
        : []

      console.log("[v0] Total items mapped:", items.length)
      console.log("[v0] All mapped items:", JSON.stringify(items, null, 2))

      // Safely parse addresses
      let shippingAddress = null
      try {
        shippingAddress = apiOrder.shipping_address
          ? typeof apiOrder.shipping_address === "string"
            ? JSON.parse(apiOrder.shipping_address)
            : apiOrder.shipping_address
          : null
      } catch (addressError) {
        console.error("Error parsing shipping address:", addressError)
      }

      let billingAddress = null
      try {
        billingAddress = apiOrder.billing_address
          ? typeof apiOrder.billing_address === "string"
            ? JSON.parse(apiOrder.billing_address)
            : apiOrder.billing_address
          : null
      } catch (addressError) {
        console.error("Error parsing billing address:", addressError)
      }

      // Calculate subtotal from items if not provided
      const subtotal = apiOrder.subtotal || this.calculateSubtotal(items)

      // Calculate total if not provided
      const total =
        apiOrder.total_amount ||
        apiOrder.total ||
        subtotal + Number.parseFloat(apiOrder.shipping_cost || 0) + Number.parseFloat(apiOrder.tax || 0)

      // Backend generates 9-digit numbers like "355203627" (Jumia-style)
      // If order_number is missing (old orders), use the order ID instead
      const orderNumber = apiOrder.order_number || apiOrder.id?.toString() || "unknown"
      console.log("[v0] Final order number:", orderNumber)
      console.log(
        "[v0] Order number source:",
        apiOrder.order_number ? "order_number field" : apiOrder.id ? "id field" : "fallback to unknown",
      )

      console.log(
        "[v0] Pricing - Subtotal:",
        subtotal,
        "Shipping:",
        apiOrder.shipping_cost,
        "Tax:",
        apiOrder.tax,
        "Total:",
        total,
      )

      // Map the API order to our frontend Order type
      const mappedOrder = {
        id: apiOrder.id?.toString() || `order-${Math.floor(Math.random() * 100000)}`,
        user_id: apiOrder.user_id?.toString() || "",
        order_number: orderNumber,
        status: apiOrder.status || "pending",
        created_at: apiOrder.created_at || new Date().toISOString(),
        updated_at: apiOrder.updated_at || new Date().toISOString(),
        items: items,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        payment_method: apiOrder.payment_method || "Credit Card",
        payment_status: apiOrder.payment_status || "pending",
        shipping_method: apiOrder.shipping_method || "Standard Delivery",
        shipping_cost: Number.parseFloat(apiOrder.shipping_cost || 0),
        tracking_number: apiOrder.tracking_number || "",
        subtotal: subtotal,
        shipping: Number.parseFloat(apiOrder.shipping_cost || 0),
        tax: Number.parseFloat(apiOrder.tax || 0),
        total: total,
        total_amount: total,
        notes: apiOrder.notes || "",
      }

      console.log("[v0] Final mapped order:", mappedOrder)

      return mappedOrder
    } catch (error) {
      console.error("Error mapping order from API:", error)
      return this.createEmptyOrder()
    }
  },

  // Helper method to calculate subtotal from items
  calculateSubtotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => {
      return sum + item.total
    }, 0)
  },

  // Method to prefetch order data for faster navigation
  async prefetchOrderDetails(orderId: string): Promise<boolean> {
    try {
      // Check if already cached
      const cacheKey = `order-${orderId}`
      if (orderCache.has(cacheKey)) {
        return true
      }

      // Prefetch in the background
      this.getOrderById(orderId).catch((err) => {
        console.error(`Error prefetching order ${orderId}:`, err)
      })

      return true
    } catch (error) {
      console.error(`Error prefetching order ${orderId}:`, error)
      return false
    }
  },

  // Helper method to generate a realistic estimated delivery date
  generateEstimatedDelivery(): string {
    const today = new Date()
    const deliveryDate = new Date(today)
    deliveryDate.setDate(today.getDate() + Math.floor(Math.random() * 7) + 3) // 3-10 days from now
    return deliveryDate.toISOString()
  },

  // Add this new helper method for creating empty orders
  createEmptyOrder(): Order {
    const orderId = `error-${Math.floor(Math.random() * 100000)}`
    return {
      id: orderId,
      user_id: "",
      order_number: `ORD-${orderId.substring(6)}`,
      status: "error",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
      shipping_address: null,
      billing_address: null,
      payment_method: "Unknown",
      payment_status: "error",
      shipping_method: "Unknown",
      shipping_cost: 0,
      tracking_number: "",
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      total_amount: 0,
      notes: "Error loading order details",
    }
  },
}

// Export as default for compatibility with existing imports
export default orderService

export const createOrder = orderService.createOrder
