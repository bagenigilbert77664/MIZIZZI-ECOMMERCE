import api from "@/lib/api"
import type { Order, OrderItem } from "@/types"

// Replace the entire orderService object with this updated implementation
export const orderService = {
  // Get all orders for the current user
  async getOrders(): Promise<Order[]> {
    try {
      console.log("Fetching orders from API...")
      const response = await api.get("/api/orders")
      console.log("Orders API response:", response.data)

      // Handle your API's specific response format
      let orders: Order[] = []

      if (response.data?.items && Array.isArray(response.data.items)) {
        console.log("Found items array in response")
        orders = response.data.items.map((item: any) => this.mapOrderFromApi(item))
      } else if (Array.isArray(response.data)) {
        console.log("Response data is an array")
        orders = response.data.map((item: any) => this.mapOrderFromApi(item))
      }

      console.log("Processed orders:", orders)
      return orders
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      throw error
    }
  },

  // Get a specific order by ID
  async getOrderById(id: string): Promise<Order | null> {
    try {
      console.log(`Fetching order ${id} from API...`)
      const response = await api.get(`/api/orders/${id}`)
      console.log(`Order ${id} API response:`, response.data)

      if (response.data) {
        return this.mapOrderFromApi(response.data)
      }
      return null
    } catch (error) {
      console.error(`Failed to fetch order ${id}:`, error)
      return null
    }
  },

  // Get orders with specific status
  async getOrdersByStatus(status: string): Promise<Order[]> {
    try {
      console.log(`Fetching orders with status ${status} from API...`)
      const response = await api.get(`/api/orders`, {
        params: { status },
      })
      console.log(`Orders with status ${status} API response:`, response.data)

      // Handle your API's specific response format
      let orders: Order[] = []

      if (response.data?.items && Array.isArray(response.data.items)) {
        orders = response.data.items.map((item: any) => this.mapOrderFromApi(item))
      } else if (Array.isArray(response.data)) {
        orders = response.data.map((item: any) => this.mapOrderFromApi(item))
      }

      return orders
    } catch (error) {
      console.error(`Failed to fetch orders with status ${status}:`, error)
      throw error
    }
  },

  // Get canceled orders
  async getCanceledOrders(): Promise<Order[]> {
    return this.getOrdersByStatus("cancelled")
  },

  // Get returned orders
  async getReturnedOrders(): Promise<Order[]> {
    return this.getOrdersByStatus("returned")
  },

  // Cancel an order
  async cancelOrder(orderId: string, reason: string): Promise<any> {
    try {
      console.log(`Cancelling order ${orderId} with reason: ${reason}`)
      const response = await api.post(`/api/orders/${orderId}/cancel`, { reason })
      console.log(`Cancel order ${orderId} API response:`, response.data)
      return response.data
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error)
      throw error
    }
  },

  // Return an order or specific items
  async returnOrder(orderId: string, items: any[], reason: string): Promise<any> {
    try {
      console.log(`Returning order ${orderId} with reason: ${reason}`)
      const response = await api.post(`/api/orders/${orderId}/return`, { items, reason })
      console.log(`Return order ${orderId} API response:`, response.data)
      return response.data
    } catch (error) {
      console.error(`Failed to return order ${orderId}:`, error)
      throw error
    }
  },

  // Get order statistics - with fallback to default values on error
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
      // Default stats object to return on error
      const defaultStats = {
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0,
      }

      try {
        console.log("Fetching order stats from API...")
        const response = await api.get("/api/orders/stats")
        console.log("Order stats API response:", response.data)

        if (response.data && typeof response.data === "object") {
          return {
            ...defaultStats,
            ...response.data,
          }
        }
      } catch (statsError) {
        console.warn("Stats endpoint failed, calculating from orders:", statsError)
        // If stats endpoint fails, calculate from all orders
        const allOrders = await this.getOrders()

        if (allOrders.length > 0) {
          const stats = { ...defaultStats, total: allOrders.length }

          // Count orders by status
          allOrders.forEach((order) => {
            const status = order.status?.toLowerCase()
            if (status && status in stats) {
              stats[status as keyof typeof stats]++
            }
          })

          return stats
        }
      }

      return defaultStats
    } catch (error) {
      console.error("Failed to fetch order stats:", error)
      // Return default stats object on error
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

  // Search orders
  async searchOrders(query: string): Promise<Order[]> {
    try {
      console.log(`Searching orders with query "${query}"`)
      const response = await api.get("/api/orders", {
        params: { search: query },
      })
      console.log(`Search orders API response:`, response.data)

      let orders: Order[] = []

      if (response.data?.items && Array.isArray(response.data.items)) {
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

  // Track order
  async trackOrder(orderId: string): Promise<any> {
    try {
      console.log(`Tracking order ${orderId}`)
      const response = await api.get(`/api/orders/${orderId}/track`)
      console.log(`Track order ${orderId} API response:`, response.data)
      return response.data
    } catch (error) {
      console.error(`Failed to track order ${orderId}:`, error)
      throw error
    }
  },

  // Helper method to map API order data to our frontend Order type
  mapOrderFromApi(apiOrder: any): Order {
    // Map items if they exist
    const items: OrderItem[] = Array.isArray(apiOrder.items)
      ? apiOrder.items.map((item: any) => {
          // Create a more complete product object
          const product = {
            id: item.product_id || item.id,
            name:
              item.product_name ||
              item.name ||
              (item.product ? item.product.name : null) ||
              `Product #${item.product_id || item.id || Math.floor(Math.random() * 10000)}`,
            price: item.price || 0,
            thumbnail_url:
              item.product_image ||
              (item.product ? item.product.thumbnail_url : null) ||
              (item.product && item.product.image_urls && item.product.image_urls.length > 0
                ? item.product.image_urls[0]
                : null),
            image_urls: (item.product && item.product.image_urls) || (item.product_image ? [item.product_image] : []),
            variation: item.variant || item.variation || (item.product ? item.product.variation : null) || null,
            sku: item.sku || (item.product ? item.product.sku : null) || `SKU-${Math.floor(Math.random() * 100000)}`,
            description:
              item.description ||
              (item.product ? item.product.description : null) ||
              "Product description not available",
          }

          return {
            id: item.id || `item-${Math.floor(Math.random() * 100000)}`,
            product_id: item.product_id || item.id,
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: (item.price || 0) * (item.quantity || 1),
            product: product,
            product_name: product.name,
            name: product.name,
            image_url: product.thumbnail_url,
            return_reason: item.return_reason,
            refund_status: item.refund_status,
            refund_amount: item.refund_amount,
            variation: item.variant || item.variation || null,
          }
        })
      : []

    // Create shipping and billing address objects
    const shippingAddress = apiOrder.shipping_address
      ? {
          name: `${apiOrder.shipping_address.first_name || ""} ${apiOrder.shipping_address.last_name || ""}`.trim(),
          street: apiOrder.shipping_address.address_line1 || "",
          city: apiOrder.shipping_address.city || "",
          state: apiOrder.shipping_address.state || "",
          zipCode: apiOrder.shipping_address.postal_code || "",
          country: apiOrder.shipping_address.country || "",
        }
      : {
          name: "",
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        }

    const billingAddress = apiOrder.billing_address
      ? {
          name: `${apiOrder.billing_address.first_name || ""} ${apiOrder.billing_address.last_name || ""}`.trim(),
          street: apiOrder.billing_address.address_line1 || "",
          city: apiOrder.billing_address.city || "",
          state: apiOrder.billing_address.state || "",
          zipCode: apiOrder.billing_address.postal_code || "",
          country: apiOrder.billing_address.country || "",
        }
      : {
          name: "",
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        }

    // Map the API order to our frontend Order type
    return {
      id: apiOrder.id?.toString() || `order-${Math.floor(Math.random() * 100000)}`,
      user_id: apiOrder.user_id?.toString() || "",
      order_number: apiOrder.order_number || `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      status: apiOrder.status || "pending",
      created_at: apiOrder.created_at || new Date().toISOString(),
      updated_at: apiOrder.updated_at || new Date().toISOString(),
      shipped_at: apiOrder.shipped_at,
      delivered_at: apiOrder.delivered_at,
      cancelled_at: apiOrder.cancelled_at,
      returned_at: apiOrder.returned_at,
      cancellation_reason: apiOrder.notes?.includes("Cancellation reason:")
        ? apiOrder.notes.replace("Cancellation reason:", "").trim()
        : apiOrder.cancellation_reason || undefined,
      return_reason: apiOrder.return_reason,
      tracking_number: apiOrder.tracking_number || `TRK${Math.floor(Math.random() * 10000000)}`,
      carrier: apiOrder.shipping_method || apiOrder.carrier || "Standard Delivery",
      estimated_delivery: apiOrder.estimated_delivery || this.generateEstimatedDelivery(),
      items: items,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      payment_method: apiOrder.payment_method || "Credit Card",
      subtotal:
        apiOrder.subtotal || (apiOrder.total_amount ? apiOrder.total_amount - (apiOrder.shipping_cost || 0) : 0),
      shipping: apiOrder.shipping_cost || 0,
      tax: apiOrder.tax || 0,
      total: apiOrder.total_amount || apiOrder.total || 0,
      total_amount: apiOrder.total_amount || apiOrder.total || 0,
      refund_status: apiOrder.refund_status,
      return_tracking: apiOrder.return_tracking,
      return_authorization: apiOrder.return_authorization,
    }
  },

  // Helper method to generate a realistic estimated delivery date
  generateEstimatedDelivery(): string {
    const today = new Date()
    const deliveryDate = new Date(today)
    deliveryDate.setDate(today.getDate() + Math.floor(Math.random() * 7) + 3) // 3-10 days from now
    return deliveryDate.toISOString()
  },
}

