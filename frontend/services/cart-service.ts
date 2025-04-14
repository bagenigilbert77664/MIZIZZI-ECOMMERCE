import api from "@/lib/api"
import { toast } from "@/hooks/use-toast"

export interface CartItem {
  id: number
  product_id: number
  variant_id?: number | null
  quantity: number
  price: number
  total: number
  product: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    image_urls: string[]
    category?: string
    sku?: string
    stock?: number
  }
}

export interface Cart {
  id: number
  user_id: number
  is_active: boolean
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  coupon_code?: string
  shipping_method_id?: number
  payment_method_id?: number
  shipping_address_id?: number
  billing_address_id?: number
  same_as_shipping: boolean
  requires_shipping: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface CartSummary {
  item_count: number
  total: number
  has_items: boolean
}

export interface CartValidation {
  is_valid: boolean
  errors: CartValidationError[]
  warnings: CartValidationWarning[]
}

export interface CartValidationError {
  message: string
  code: string
  item_id?: number
  available_stock?: number
  min_quantity?: number
  max_quantity?: number
  [key: string]: any
}

export interface CartValidationWarning {
  message: string
  code: string
  item_id?: number
  [key: string]: any
}

export interface CartResponse {
  success: boolean
  cart: Cart
  items: CartItem[]
  validation?: CartValidation
  message?: string
  errors?: CartValidationError[]
  warnings?: CartValidationWarning[]
}

export interface CartSummaryResponse {
  success: boolean
  item_count: number
  total: number
  has_items: boolean
}

export interface ShippingMethod {
  id: number
  name: string
  description: string
  cost: number
  estimated_days: string
}

export interface PaymentMethod {
  id: number
  name: string
  code: string
  description: string
  instructions?: string
}

// Add a request queue to prevent multiple simultaneous requests
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false

  public async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true
    const request = this.queue.shift()

    try {
      await request?.()
    } catch (error) {
      console.error("Error processing queue item:", error)
    } finally {
      this.processing = false
      this.processQueue()
    }
  }
}

class CartService {
  private requestQueue = new RequestQueue()
  private lastFetchTime = 0
  private pendingRequests = new Map<string, AbortController>()
  private MIN_REQUEST_INTERVAL = 500 // Minimum time between identical requests in ms
  private requestCache = new Map<string, { data: any; timestamp: number }>()
  private CACHE_TTL = 2000 // Cache time-to-live in ms

  // Helper to create a request key
  private createRequestKey(endpoint: string, params?: any): string {
    return `${endpoint}:${params ? JSON.stringify(params) : ""}`
  }

  // Helper to abort pending requests
  private abortPendingRequest(key: string) {
    const controller = this.pendingRequests.get(key)
    if (controller) {
      controller.abort()
      this.pendingRequests.delete(key)
    }
  }

  // Helper to check if a request is too frequent
  private isTooFrequent(key: string): boolean {
    const cachedItem = this.requestCache.get(key)
    if (!cachedItem) return false

    const now = Date.now()
    return now - cachedItem.timestamp < this.MIN_REQUEST_INTERVAL
  }

  // Get the current cart
  async getCart(): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart")

    // Check cache first
    const cachedItem = this.requestCache.get(requestKey)
    if (cachedItem && Date.now() - cachedItem.timestamp < this.CACHE_TTL) {
      return cachedItem.data
    }

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() => api.get("/api/cart", { signal: controller.signal }))

      // Cache the response
      this.requestCache.set(requestKey, {
        data: response.data,
        timestamp: Date.now(),
      })

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        throw new Error("Request aborted")
      }

      console.error("Error fetching cart:", error)
      throw new Error(error.response?.data?.error || "Failed to fetch cart")
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Add an item to the cart
  async addToCart(productId: number, quantity: number, variantId?: number): Promise<CartResponse> {
    const payload = {
      product_id: productId,
      quantity,
      ...(variantId && { variant_id: variantId }),
    }

    const requestKey = this.createRequestKey("/api/cart/add", payload)

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/add", payload, { signal: controller.signal }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        throw new Error("Request aborted")
      }

      console.error("Error adding to cart:", error)

      // Check if this is an authentication error
      if (error.response?.status === 401) {
        // For authentication errors, throw a specific error that can be handled by the cart context
        const authError = new Error("Authentication required")
        authError.name = "AuthenticationError"
        throw authError
      }

      // Extract validation errors if available
      const validationErrors = error.response?.data?.errors || []
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors[0].message || "Failed to add item to cart"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to add item to cart",
          variant: "destructive",
        })
      }

      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Update cart item quantity
  async updateQuantity(itemId: number, quantity: number): Promise<CartResponse> {
    const requestKey = this.createRequestKey(`/api/cart/update/${itemId}`, { quantity })

    // If the request is too frequent, throttle it
    if (this.isTooFrequent(requestKey)) {
      await new Promise((resolve) => setTimeout(resolve, this.MIN_REQUEST_INTERVAL))
    }

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() =>
        api.put(`/api/cart/update/${itemId}`, { quantity }, { signal: controller.signal }),
      )

      // Update cache timestamp
      this.requestCache.set(requestKey, {
        data: response.data,
        timestamp: Date.now(),
      })

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        throw new Error("Request aborted")
      }

      console.error("Error updating cart item:", error)

      // Extract validation errors if available
      const validationErrors = error.response?.data?.errors || []
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors[0].message || "Failed to update item quantity"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to update item quantity",
          variant: "destructive",
        })
      }

      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Remove an item from the cart
  async removeItem(itemId: number): Promise<CartResponse> {
    const requestKey = this.createRequestKey(`/api/cart/remove/${itemId}`)

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() =>
        api.delete(`/api/cart/remove/${itemId}`, { signal: controller.signal }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        throw new Error("Request aborted")
      }

      console.error("Error removing cart item:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove item from cart",
        variant: "destructive",
      })
      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Clear the cart
  async clearCart(): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/clear")

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() => api.delete("/api/cart/clear", { signal: controller.signal }))

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        throw new Error("Request aborted")
      }

      console.error("Error clearing cart:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to clear cart",
        variant: "destructive",
      })
      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Apply a coupon to the cart
  async applyCoupon(couponCode: string): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/apply-coupon", { coupon_code: couponCode })

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/apply-coupon", { coupon_code: couponCode }, { signal: controller.signal }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        throw new Error("Request aborted")
      }

      console.error("Error applying coupon:", error)
      toast({
        title: "Invalid Coupon",
        description: error.response?.data?.errors?.[0]?.message || "Failed to apply coupon",
        variant: "destructive",
      })
      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Remove a coupon from the cart
  async removeCoupon(): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/remove-coupon")

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() =>
        api.delete("/api/cart/remove-coupon", { signal: controller.signal }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        throw new Error("Request aborted")
      }

      console.error("Error removing coupon:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove coupon",
        variant: "destructive",
      })
      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Set shipping address
  async setShippingAddress(addressId: number): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/shipping-address", { address_id: addressId })

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/shipping-address", { address_id: addressId }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      console.error("Error setting shipping address:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to set shipping address",
        variant: "destructive",
      })
      throw error
    }
  }

  // Set billing address
  async setBillingAddress(addressId: number, sameAsShipping = false): Promise<CartResponse> {
    const payload = sameAsShipping ? { same_as_shipping: true } : { address_id: addressId, same_as_shipping: false }
    const requestKey = this.createRequestKey("/api/cart/billing-address", payload)

    try {
      const response = await this.requestQueue.add(() => api.post("/api/cart/billing-address", payload))

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      console.error("Error setting billing address:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to set billing address",
        variant: "destructive",
      })
      throw error
    }
  }

  // Set shipping method
  async setShippingMethod(shippingMethodId: number): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/shipping-method", { shipping_method_id: shippingMethodId })

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/shipping-method", { shipping_method_id: shippingMethodId }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      console.error("Error setting shipping method:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to set shipping method",
        variant: "destructive",
      })
      throw error
    }
  }

  // Set payment method
  async setPaymentMethod(paymentMethodId: number): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/payment-method", { payment_method_id: paymentMethodId })

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/payment-method", { payment_method_id: paymentMethodId }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      console.error("Error setting payment method:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to set payment method",
        variant: "destructive",
      })
      throw error
    }
  }

  // Set cart notes
  async setCartNotes(notes: string): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/notes", { notes })

    try {
      const response = await this.requestQueue.add(() => api.post("/api/cart/notes", { notes }))

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      console.error("Error setting cart notes:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to set cart notes",
        variant: "destructive",
      })
      throw error
    }
  }

  // Set requires shipping
  async setRequiresShipping(requiresShipping: boolean): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/requires-shipping", { requires_shipping: requiresShipping })

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/requires-shipping", { requires_shipping: requiresShipping }),
      )

      // Clear cart cache since it's now changed
      this.clearCache()

      return response.data
    } catch (error: any) {
      console.error("Error setting requires shipping flag:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update shipping requirements",
        variant: "destructive",
      })
      throw error
    }
  }

  // Validate cart
  async validateCart(): Promise<CartValidation> {
    const requestKey = this.createRequestKey("/api/cart/validate")

    // Check cache first
    const cachedItem = this.requestCache.get(requestKey)
    if (cachedItem && Date.now() - cachedItem.timestamp < this.CACHE_TTL) {
      return cachedItem.data
    }

    try {
      const response = await this.requestQueue.add(() => api.get("/api/cart/validate"))

      const validation = {
        is_valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
      }

      // Cache the response
      this.requestCache.set(requestKey, {
        data: validation,
        timestamp: Date.now(),
      })

      return validation
    } catch (error: any) {
      console.error("Error validating cart:", error)
      throw new Error(error.response?.data?.error || "Failed to validate cart")
    }
  }

  // Validate checkout
  async validateCheckout(): Promise<CartValidation> {
    const requestKey = this.createRequestKey("/api/cart/checkout/validate")

    try {
      const response = await this.requestQueue.add(() => api.get("/api/cart/checkout/validate"))

      return {
        is_valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
      }
    } catch (error: any) {
      console.error("Error validating checkout:", error)
      throw new Error(error.response?.data?.error || "Failed to validate checkout")
    }
  }

  // Get cart summary
  async getCartSummary(): Promise<CartSummary> {
    const requestKey = this.createRequestKey("/api/cart/summary")

    // Check cache first
    const cachedItem = this.requestCache.get(requestKey)
    if (cachedItem && Date.now() - cachedItem.timestamp < this.CACHE_TTL) {
      return cachedItem.data
    }

    try {
      const response = await this.requestQueue.add(() => api.get("/api/cart/summary"))

      const summary = {
        item_count: response.data.item_count,
        total: response.data.total,
        has_items: response.data.has_items,
      }

      // Cache the response
      this.requestCache.set(requestKey, {
        data: summary,
        timestamp: Date.now(),
      })

      return summary
    } catch (error: any) {
      console.error("Error fetching cart summary:", error)
      return {
        item_count: 0,
        total: 0,
        has_items: false,
      }
    }
  }

  // Get available shipping methods
  async getShippingMethods(): Promise<ShippingMethod[]> {
    const requestKey = this.createRequestKey("/api/cart/shipping-methods")

    // Check cache first
    const cachedItem = this.requestCache.get(requestKey)
    if (cachedItem && Date.now() - cachedItem.timestamp < this.CACHE_TTL) {
      return cachedItem.data
    }

    try {
      const response = await this.requestQueue.add(() => api.get("/api/cart/shipping-methods"))

      const methods = response.data.shipping_methods || []

      // Cache the response
      this.requestCache.set(requestKey, {
        data: methods,
        timestamp: Date.now(),
      })

      return methods
    } catch (error: any) {
      console.error("Error fetching shipping methods:", error)
      return []
    }
  }

  // Get available payment methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const requestKey = this.createRequestKey("/api/cart/payment-methods")

    // Check cache first
    const cachedItem = this.requestCache.get(requestKey)
    if (cachedItem && Date.now() - cachedItem.timestamp < this.CACHE_TTL) {
      return cachedItem.data
    }

    try {
      const response = await this.requestQueue.add(() => api.get("/api/cart/payment-methods"))

      const methods = response.data.payment_methods || []

      // Cache the response
      this.requestCache.set(requestKey, {
        data: methods,
        timestamp: Date.now(),
      })

      return methods
    } catch (error: any) {
      console.error("Error fetching payment methods:", error)
      return []
    }
  }

  // Clear all cache
  private clearCache() {
    this.requestCache.clear()
  }
}

export const cartService = new CartService()
