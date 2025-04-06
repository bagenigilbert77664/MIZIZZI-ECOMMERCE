import  api  from "@/lib/api"
import type { Order, OrderItem } from "@/types"

// Cache for orders to prevent redundant API calls
const orderCache = new Map<string, { data: Order; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const orderService = {
  async getOrders(params = {}): Promise<Order[]> {
    try {
      console.log("API call: getOrders with params:", params)
      // Include items with product details by default
      const queryParams = { ...params, include_items: true }
      const response = await api.get("/api/orders", { params: queryParams })

      // Handle different response formats
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
      console.error("Error fetching orders:", error)
      return []
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    try {
      // Check cache first
      const cacheKey = `order-${id}`
      const now = Date.now()
      const cachedItem = orderCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached order data for id ${id}`)
        return cachedItem.data
      }

      console.log(`Fetching order with id ${id} from API`)
      const response = await api.get(`/api/orders/${id}`)

      if (!response.data) {
        throw new Error(`Order with ID ${id} not found`)
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
      throw error
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

  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    try {
      await api.post(`/api/orders/${orderId}/cancel`, { reason })

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
      await api.post(`/api/orders/${orderId}/return`, { reason })

      // Invalidate cache for this order
      const cacheKey = `order-${orderId}`
      orderCache.delete(cacheKey)

      return true
    } catch (error) {
      console.error(`Error returning order ${orderId}:`, error)
      return false
    }
  },

  // Search orders
  async searchOrders(query: string): Promise<Order[]> {
    try {
      console.log(`Searching orders with query "${query}"`)
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

  async trackOrder(trackingNumber: string): Promise<any> {
    try {
      const response = await api.get(`/api/tracking/${trackingNumber}`)
      return response.data
    } catch (error) {
      console.error(`Error tracking order with number ${trackingNumber}:`, error)
      return null
    }
  },

  // Helper method to map API order data to our frontend Order type
  mapOrderFromApi(apiOrder: any): Order {
    // Map items if they exist
    const items: OrderItem[] = Array.isArray(apiOrder.items)
      ? apiOrder.items.map((item: any) => {
          // Extract product data from the API response
          const product = item.product
            ? {
                id: item.product.id,
                name: item.product.name,
                slug: item.product.slug || "",
                price: item.price,
                thumbnail_url:
                  item.product.thumbnail_url && item.product.thumbnail_url !== ""
                    ? item.product.thumbnail_url
                    : Array.isArray(item.product.image_urls) && item.product.image_urls.length > 0
                      ? item.product.image_urls[0]
                      : "",
                image_urls:
                  Array.isArray(item.product.image_urls) && item.product.image_urls.length > 0
                    ? item.product.image_urls.filter((url: string) => url && url !== "")
                    : item.product.thumbnail_url && item.product.thumbnail_url !== ""
                      ? [item.product.thumbnail_url]
                      : [],
                description: "",
                sku: "",
                category: "",
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
            (product?.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : "")

          return {
            id: item.id || `item-${Math.floor(Math.random() * 100000)}`,
            product_id: item.product_id,
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: item.total || (item.price || 0) * (item.quantity || 1), // Ensure total is always set
            product: product,
            product_name: product?.name || "Product",
            name: product?.name || "Product",
            image_url: thumbnailUrl,
            thumbnail_url: thumbnailUrl, // Set the thumbnail_url property
            variation: item.variant || {},
          }
        })
      : []

    // Create shipping and billing address objects
    const shippingAddress = apiOrder.shipping_address
      ? typeof apiOrder.shipping_address === "string"
        ? JSON.parse(apiOrder.shipping_address)
        : apiOrder.shipping_address
      : null

    const billingAddress = apiOrder.billing_address
      ? typeof apiOrder.billing_address === "string"
        ? JSON.parse(apiOrder.billing_address)
        : apiOrder.billing_address
      : null

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
      shipping_cost: apiOrder.shipping_cost || 0,
      tracking_number: apiOrder.tracking_number || "",
      subtotal: this.calculateSubtotal(items),
      shipping: apiOrder.shipping_cost || 0,
      tax: 0, // Add tax calculation if available in your API
      total: apiOrder.total_amount || 0,
      total_amount: apiOrder.total_amount || 0,
      notes: apiOrder.notes || "",
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

  // Add the createOrder method
  async createOrder(orderData: any): Promise<any> {
    try {
      console.log("Creating new order with data:", JSON.stringify(orderData))

      // Ensure shipping_address and billing_address are objects, not strings
      const processedOrderData = {
        ...orderData,
        // If shipping_address is a string, parse it; otherwise, use it as is
        shipping_address:
          typeof orderData.shipping_address === "string"
            ? JSON.parse(orderData.shipping_address)
            : orderData.shipping_address,
        // If billing_address is a string, parse it; otherwise, use it as is
        billing_address:
          typeof orderData.billing_address === "string"
            ? JSON.parse(orderData.billing_address)
            : orderData.billing_address,
      }

      const response = await api.post("/api/orders", processedOrderData)
      return response.data
    } catch (error) {
      console.error("Error creating order:", error)
      console.error("API response error:", (error as any).response)
      throw error
    }
  },
}

// Export as default for compatibility with existing imports
export default orderService
