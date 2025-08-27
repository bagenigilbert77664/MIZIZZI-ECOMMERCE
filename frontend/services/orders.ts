import api from "@/lib/api"
import type { Order, OrderItem } from "@/types"

// Cache for orders to prevent redundant API calls
const orderCache = new Map<string, { data: Order; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const orderService = {
  async getOrders(params = {}): Promise<Order[]> {
    try {
      console.log("API call: getOrders with params:", params)
      // Include items with product details by default
      const queryParams: Record<string, any> = {
        ...params,
        include_items: true,
        // Remove any hardcoded limit to fetch all orders
        per_page: 100, // Increased from any previous limit to a much higher value
      }
      const response = await api.get("/api/order/orders", { params: queryParams })

      // Handle different response formats
      let orders: Order[] = []
      if (response.data?.data && Array.isArray(response.data.data)) {
        orders = response.data.data.map((item: any) => this.mapOrderFromApi(item))
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        orders = response.data.items.map((item: any) => this.mapOrderFromApi(item))
      } else if (Array.isArray(response.data)) {
        orders = response.data.map((item: any) => this.mapOrderFromApi(item))
      }

      // No filtering or limiting of orders here - return all that we get
      return orders
    } catch (error) {
      console.error("Error fetching orders:", error)
      return []
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (!id) {
      console.error("getOrderById called with empty id")
      return null
    }

    try {
      // Check cache first
      const cacheKey = `order-${id}`
      const now = Date.now()
      const cachedItem = orderCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached order data for id ${id}`)
        return cachedItem.data
      }

      // Check if we're offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.log("Device is offline, checking localStorage for order")
        try {
          const offlineOrders = JSON.parse(localStorage.getItem("offlineOrders") || "[]")
          const offlineOrder = offlineOrders.find((order: any) => order.id === id)
          if (offlineOrder) {
            return this.mapOrderFromApi(offlineOrder)
          }
        } catch (storageError) {
          console.error("Error checking localStorage for offline orders:", storageError)
        }
      }

      console.log(`Fetching order with id ${id} from API`)
      const response = await api.get(`/api/order/orders/${id}`)

      if (!response.data) {
        console.error(`No data returned for order ${id}`)
        return null
      }

      // Map the API response to our Order type
      const order = this.mapOrderFromApi(response.data.data || response.data)

      // Cache the result with timestamp
      orderCache.set(cacheKey, {
        data: order,
        timestamp: now,
      })

      return order
    } catch (error) {
      console.error(`Error fetching order with id ${id}:`, error)

      // Check if we have a locally stored order (for offline support)
      if (typeof window !== "undefined") {
        try {
          const offlineOrders = JSON.parse(localStorage.getItem("offlineOrders") || "[]")
          const offlineOrder = offlineOrders.find((order: any) => order.id === id)
          if (offlineOrder) {
            console.log("Found offline order:", offlineOrder)
            return this.mapOrderFromApi(offlineOrder)
          }
        } catch (storageError) {
          console.error("Error checking localStorage for offline orders:", storageError)
        }
      }

      return null
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
      console.log("Fetching order stats from API endpoint")
      const response = await api.get("/api/order/orders/stats")

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

        console.log("Order stats received from API:", stats)
        return stats
      }

      // If response format is invalid, throw error to trigger fallback
      throw new Error("Invalid stats format received from API")
    } catch (error) {
      console.error("Error fetching order stats:", error)

      // If API fails, try to calculate stats from all orders
      try {
        console.log("Attempting to calculate stats from all orders")
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

          console.log("Stats calculated from orders:", stats)
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
      await api.post(`/api/order/orders/${orderId}/cancel`, { reason })

      // Invalidate cache for this order
      const cacheKey = `order-${orderId}`
      orderCache.delete(cacheKey)

      return true
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error)
      return false
    }
  },
  // Update the returnOrder method to use the correct API endpoint
  async returnOrder(orderId: string, reason: string): Promise<boolean> {
    try {
      await api.post(`/api/order/orders/${orderId}/return`, { reason })

      // Invalidate cache for this order
      const cacheKey = `order-${orderId}`
      orderCache.delete(cacheKey)

      return true
    } catch (error) {
      console.error(`Error returning order ${orderId}:`, error)
      return false
    }
  },

  // Update the searchOrders method to use the correct API endpoint
  async searchOrders(query: string): Promise<Order[]> {
    try {
      console.log(`Searching orders with query "${query}"`)
      const response = await api.get("/api/order/orders", {
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
      const response = await api.get(`/api/order/tracking/${trackingNumber}`)
      return response.data
    } catch (error) {
      console.error(`Error tracking order with number ${trackingNumber}:`, error)
      return null
    }
  },

  // Add the createOrder method
  async createOrder(orderData: any): Promise<any> {
    console.log("[v0] Creating new order with data:", orderData)

    try {
      // Backend expects /api/orders not /api/order/orders based on the route blueprint
      const endpoint = "/api/orders"

      // Backend creates order from cart, so we only need payment info and addresses
      const formattedOrderData = {
        payment_method: orderData.payment_method || "pesapal",
        shipping_method: orderData.shipping_method || "standard",
        notes: orderData.notes || "",
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address || orderData.shipping_address,
        shipping_cost: orderData.shipping_cost || 0,
        tax: orderData.tax || 0,
        coupon_code: orderData.coupon_code || null,
        clear_cart: orderData.clear_cart !== false, // Default to true
      }

      // Log the formatted payload for debugging
      console.log("[v0] Sending formatted order payload:", JSON.stringify(formattedOrderData, null, 2))

      // Make the API request to the correct endpoint
      const response = await api.post(endpoint, formattedOrderData)

      console.log("[v0] Order creation response:", response.data)

      // Clear any cached orders to ensure fresh data on next fetch
      Array.from(orderCache.keys())
        .filter((key) => key.startsWith("order-"))
        .forEach((key) => orderCache.delete(key))

      return response.data
    } catch (error: any) {
      console.error("[v0] Error creating order:", error)

      // Surface backend error message if available
      if (error.response) {
        console.error("[v0] API response error status:", error.response.status)
        console.error("[v0] API response error data:", error.response.data)

        // Show backend error message in the thrown error
        const backendError = error.response.data?.error || "Unknown backend error"
        throw new Error(`[OrderService] Backend error: ${backendError}`)
      } else if (error.request) {
        console.error("[v0] Network error - no response received:", error.request)
        throw new Error("[OrderService] Network error - no response received")
      } else {
        console.error("[v0] Request setup error:", error.message)
        throw new Error(`[OrderService] Request setup error: ${error.message}`)
      }
    }
  },

  // Helper method to map API order data to our frontend Order type
  mapOrderFromApi(apiOrder: any): Order {
    if (!apiOrder) {
      console.error("Received null or undefined order from API")
      return this.createEmptyOrder()
    }

    try {
      // Safely parse items array
      const items: OrderItem[] = Array.isArray(apiOrder.items)
        ? apiOrder.items.map((item: any) => {
            try {
              // Extract product data safely
              const product = item.product
                ? {
                    id: item.product.id || "",
                    name: item.product.name || "Unknown Product",
                    slug: item.product.slug || "",
                    price: Number.parseFloat(item.price || 0),
                    thumbnail_url:
                      item.product.thumbnail_url && item.product.thumbnail_url !== ""
                        ? item.product.thumbnail_url
                        : Array.isArray(item.product.image_urls) && item.product.image_urls.length > 0
                          ? item.product.image_urls[0]
                          : "/placeholder.svg?height=200&width=200",
                    image_urls:
                      Array.isArray(item.product.image_urls) && item.product.image_urls.length > 0
                        ? item.product.image_urls.filter((url: string) => url && url !== "")
                        : item.product.thumbnail_url && item.product.thumbnail_url !== ""
                          ? [item.product.thumbnail_url]
                          : ["/placeholder.svg?height=200&width=200"],
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

              // Get thumbnail URL for the item
              const thumbnailUrl =
                product?.thumbnail_url ||
                (product?.image_urls && product.image_urls.length > 0
                  ? product.image_urls[0]
                  : "/placeholder.svg?height=200&width=200")

              return {
                id: item.id || `item-${Math.floor(Math.random() * 100000)}`,
                product_id: item.product_id || "",
                quantity: Number.parseInt(item.quantity || 1, 10),
                price: Number.parseFloat(item.price || 0),
                total: Number.parseFloat(item.total || (item.price || 0) * (item.quantity || 1)),
                product: product,
                product_name: product?.name || "Product",
                name: product?.name || "Product",
                image_url: thumbnailUrl,
                thumbnail_url: thumbnailUrl,
                variation: item.variant || {},
              }
            } catch (itemError) {
              console.error("Error parsing order item:", itemError, item)
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

      // Map the API order to our frontend Order type
      return {
        id: apiOrder.id?.toString() || `order-${Math.floor(Math.random() * 100000)}`,
        user_id: apiOrder.user_id?.toString() || "",
        order_number: apiOrder.order_number || `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
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
    } catch (error) {
      console.error("Error mapping order from API:", error, apiOrder)
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
