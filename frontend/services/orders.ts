// Order Service for handling API requests related to orders
import api from "@/lib/api"

// Define the order service
export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  product_image: string
  quantity: number
  price: number
  total: number
  variant_id?: number | null
  product?: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    image_urls: string[]
    category?: string
  }
}

export interface Order {
  id: number
  user_id: number
  order_number: string
  status: string
  total: number
  subtotal: number
  tax: number
  shipping: number
  payment_method: string
  shipping_address: {
    first_name: string
    last_name: string
    email?: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    postal_code: string
    country: string
    phone?: string
  }
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface CreateOrderRequest {
  shipping_address: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  billing_address: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  payment_method: string
  shipping_method: string
  notes?: string
  shipping_cost: number
  subtotal: number
  total: number
  items: {
    product_id: number
    quantity: number
    price: number
    variant_id?: number | null
  }[]
}

class OrderService {
  private logPrefix = "[OrderService]"

  private log(message: string, data?: any) {
    console.log(this.logPrefix, message, data ? data : "")
  }

  async getOrders(): Promise<Order[]> {
    try {
      this.log("Fetching orders")
      const response = await api.get("/api/orders")

      if (response.data && Array.isArray(response.data.items)) {
        return response.data.items
      } else if (Array.isArray(response.data)) {
        return response.data
      }

      return []
    } catch (error) {
      this.log("Error fetching orders", error)
      throw error
    }
  }

  async getOrderById(id: string | number): Promise<Order> {
    try {
      this.log(`Fetching order ${id}`)
      const response = await api.get(`/api/orders/${id}`)

      // If the order items don't have product details, fetch them
      if (response.data && response.data.items && response.data.items.length > 0) {
        const items = response.data.items
        const needsProductDetails = items.some((item: OrderItem) => !item.product || !item.product.name)

        if (needsProductDetails) {
          // Get product IDs from order items
          const productIds = items.map((item: OrderItem) => item.product_id)

          try {
            // Fetch product details
            const productsResponse = await api.get("/api/products/batch", {
              params: { ids: productIds.join(",") },
            })

            if (productsResponse.data && Array.isArray(productsResponse.data)) {
              const productsMap = productsResponse.data.reduce((map, product) => {
                map[product.id] = product
                return map
              }, {})

              // Update order items with product details
              response.data.items = items.map((item: OrderItem) => {
                const product = productsMap[item.product_id]
                if (product) {
                  return {
                    ...item,
                    product_name: product.name,
                    product_image: product.thumbnail_url || (product.image_urls && product.image_urls[0]),
                    product: {
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      thumbnail_url: product.thumbnail_url || (product.image_urls && product.image_urls[0]),
                      image_urls: product.image_urls,
                      category: product.category,
                    },
                  }
                }
                return item
              })
            }
          } catch (error) {
            this.log("Error fetching product details for order items", error)
          }
        }
      }

      return response.data
    } catch (error) {
      this.log(`Error fetching order ${id}`, error)
      throw error
    }
  }

  async createOrderWithCartItems(orderData: CreateOrderRequest): Promise<Order> {
    try {
      this.log("Creating new order with cart items")

      // Validate the order data before submission
      if (!orderData.shipping_address) {
        throw new Error("Shipping address is required")
      }

      if (!orderData.payment_method) {
        throw new Error("Payment method is required")
      }

      if (!orderData.items || orderData.items.length === 0) {
        throw new Error("Order must contain at least one item")
      }

      const response = await api.post("/api/orders/checkout", orderData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      this.log("Order created successfully")
      return response.data
    } catch (error: any) {
      this.log("Error creating order", error)

      // Enhanced error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = error.response.data?.message || error.response.data?.error || "Failed to create order"
        throw new Error(errorMessage)
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error("No response received from server. Please check your internet connection and try again.")
      } else {
        // Something happened in setting up the request that triggered an Error
        throw error
      }
    }
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    try {
      this.log(`Updating order ${id} status to ${status}`)
      const response = await api.patch(`/api/orders/${id}/status`, { status })
      this.log(`Order ${id} status updated successfully`)
      return response.data
    } catch (error) {
      this.log(`Error updating order ${id} status`, error)
      throw error
    }
  }

  async cancelOrder(id: number): Promise<Order> {
    try {
      this.log(`Cancelling order ${id}`)
      const response = await api.post(`/api/orders/${id}/cancel`)
      this.log(`Order ${id} cancelled successfully`)
      return response.data
    } catch (error) {
      this.log(`Error cancelling order ${id}`, error)
      throw error
    }
  }
}

export const orderService = new OrderService()

