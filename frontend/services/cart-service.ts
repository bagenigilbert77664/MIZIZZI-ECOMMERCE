import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

// Types
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
    seller?: {
      name?: string
      rating?: number
      verified?: boolean
      store_name?: string
    }
    stock?: number
    sku?: string
    price: number
    sale_price?: number | null
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
  item_ids?: number[]
  required_product_id?: number
  min_order_value?: number
  max_order_value?: number
  max_order_quantity?: number
  min_amount?: number
  max_amount?: number
  remaining_limit?: number
  [key: string]: any
}

export interface CartValidationWarning {
  message: string
  code: string
  item_id?: number
  available_quantity?: number
  current_quantity?: number
  new_quantity?: number
  old_price?: number
  new_price?: number
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

export interface Coupon {
  id: number
  code: string
  description: string
  discount_type: string
  discount_value: number
  min_order_value?: number
  max_discount?: number
  start_date: string
  end_date: string
  is_active: boolean
}

// Request queue to prevent multiple simultaneous requests
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

// Helper functions for cart service
const getLocalCartItems = (): CartItem[] => {
  if (typeof window === "undefined") return []

  try {
    const items = localStorage.getItem("cartItems")
    if (!items) return []

    return JSON.parse(items)
  } catch (error) {
    console.error("Error parsing cart items from localStorage:", error)
    return []
  }
}

const saveLocalCartItems = (items: CartItem[]): void => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("cartItems", JSON.stringify(items))
  } catch (error) {
    console.error("Error saving cart items to localStorage:", error)
  }
}

const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

// Improved API availability check that doesn't cause CORS issues
const checkApiAvailability = async (): Promise<boolean> => {
  // First check if we have an authentication token
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("mizizzi_token") : null

  // If no token, we know we should use local storage mode
  if (!token || token === "null" || token === "undefined") {
    console.log("No auth token available, using local storage mode")
    return false
  }

  try {
    // Try a simple request to a known endpoint with a very short timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/cart/summary`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // If we get any response (even 401), the API is available
    return response.status < 500
  } catch (error: any) {
    // If it's an abort error, API might be slow but available
    if (error.name === "AbortError") {
      console.log("API request timed out, assuming unavailable")
      return false
    }

    // For network errors, assume API is unavailable
    console.log("API availability check failed, using local storage mode")
    return false
  }
}

class CartService {
  private requestQueue = new RequestQueue()
  private pendingRequests = new Map<string, AbortController>()
  private pendingPromises = new Map<string, Promise<any>>() // Add separate map for promises
  private requestCache = new Map<string, { data: any; timestamp: number }>()
  private CACHE_TTL = 2000 // Cache time-to-live in ms
  private MIN_REQUEST_INTERVAL = 500 // Minimum time between identical requests in ms
  private STOCK_VALIDATION_TTL = 1000 // 1 second TTL for stock validation

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
    // Also clean up any pending promise
    this.pendingPromises.delete(key)
  }

  // Helper to check if a request is too frequent
  private isTooFrequent(key: string): boolean {
    const cachedItem = this.requestCache.get(key)
    if (!cachedItem) return false

    const now = Date.now()
    return now - cachedItem.timestamp < this.MIN_REQUEST_INTERVAL
  }

  // Enhanced input validation
  private validateInput(
    value: any,
    type: "number" | "string" | "boolean",
    options?: { min?: number; max?: number; required?: boolean; stockLimit?: number },
  ): { isValid: boolean; sanitized?: any; error?: string } {
    const opts = { required: true, ...options }

    if (value === null || value === undefined) {
      if (opts.required) {
        return { isValid: false, error: `${type} is required` }
      }
      return { isValid: true, sanitized: null }
    }

    switch (type) {
      case "number":
        let num = typeof value === "string" ? Number.parseFloat(value) : value

        if (typeof num !== "number" || isNaN(num) || !isFinite(num)) {
          return { isValid: false, error: "Invalid number format" }
        }

        // Check for scientific notation
        if (value.toString().toLowerCase().includes("e")) {
          return { isValid: false, error: "Scientific notation not allowed" }
        }

        if (opts.min !== undefined && num < opts.min) {
          return { isValid: false, error: `Value must be at least ${opts.min}` }
        }

        // Use the max parameter directly, with fallback to stockLimit, then default
        const maxLimit = opts.max || opts.stockLimit || 100
        if (num > maxLimit) {
          return { isValid: false, error: `Value must be at most ${maxLimit}` }
        }

        // Round to avoid floating point issues
        num = Math.round(num * 100) / 100

        return { isValid: true, sanitized: num }

      case "string":
        if (typeof value !== "string") {
          return { isValid: false, error: "Value must be a string" }
        }
        return { isValid: true, sanitized: value.trim() }

      case "boolean":
        return { isValid: true, sanitized: Boolean(value) }

      default:
        return { isValid: false, error: "Unknown validation type" }
    }
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
      // Add a timeout to the request
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await this.requestQueue.add(() => api.get("/api/cart", { signal: controller.signal }))

      clearTimeout(timeoutId)

      // Cache the response
      this.requestCache.set(requestKey, {
        data: response.data,
        timestamp: Date.now(),
      })

      return response.data
    } catch (error: any) {
      // Don't report errors for aborted requests
      if (error.name === "AbortError") {
        console.log("Cart request aborted")
        throw new Error("Request aborted")
      }

      console.error("Error fetching cart:", error)

      // For network errors or authentication errors, provide a more user-friendly response
      if (!error.response || error.response.status === 401) {
        // Return an empty cart instead of throwing an error
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: 0,
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            same_as_shipping: true,
            requires_shipping: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: [],
          message: "Using offline cart",
        }
      }

      throw new Error(error.response?.data?.error || "Failed to fetch cart")
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Add an item to the cart
  async addToCart(productId: number, quantity: number, variantId?: number): Promise<CartResponse> {
    // Enhanced input validation - first check stock availability
    const productIdValidation = this.validateInput(productId, "number", { min: 1, max: 999999999 })
    if (!productIdValidation.isValid) {
      console.error("Invalid productId provided to addToCart:", productId, productIdValidation.error)
      throw new Error(`Invalid product ID: ${productIdValidation.error}`)
    }

    // Check stock availability first to get dynamic limit
    let stockLimit = 100 // Reduced default fallback from 999
    try {
      const { inventoryService } = await import("@/services/inventory-service")
      const availability = await inventoryService.checkAvailability(productId, quantity, variantId)
      stockLimit = Math.min(availability.available_quantity || 100, 100) // Cap at 100

      if (!availability.is_available) {
        throw new Error(`Only ${availability.available_quantity} items available in stock`)
      }
    } catch (error) {
      console.warn("Could not check stock availability:", error)
      // Continue with default limit if stock check fails
    }

    const quantityValidation = this.validateInput(quantity, "number", {
      min: 1,
      max: stockLimit, // Use stockLimit instead of stockLimit property
    })
    if (!quantityValidation.isValid) {
      console.error("Invalid quantity provided to addToCart:", quantity, quantityValidation.error)
      throw new Error(`Invalid quantity: ${quantityValidation.error}`)
    }

    // Validate variantId if provided
    if (variantId !== undefined && variantId !== null) {
      const variantValidation = this.validateInput(variantId, "number", { min: 1, max: 999999999, required: false })
      if (!variantValidation.isValid) {
        console.error("Invalid variantId provided to addToCart:", variantId, variantValidation.error)
        variantId = undefined // Reset to undefined if invalid
      } else {
        variantId = variantValidation.sanitized
      }
    }

    const sanitizedProductId = productIdValidation.sanitized
    const sanitizedQuantity = quantityValidation.sanitized

    const payload = {
      product_id: sanitizedProductId,
      quantity: sanitizedQuantity,
      ...(variantId && { variant_id: variantId }),
    }

    const requestKey = this.createRequestKey("/api/cart/items", payload)

    // CRITICAL: Check if there's already a pending promise for this exact operation
    if (this.pendingPromises.has(requestKey)) {
      console.log("Duplicate add to cart request detected, waiting for existing request")
      try {
        // Wait for the existing promise to complete
        return await this.pendingPromises.get(requestKey)!
      } catch (error) {
        console.error("Existing request failed:", error)
        // Clean up and continue with new request if existing one failed
        this.pendingPromises.delete(requestKey)
      }
    }

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      // First check if we have a valid token - if not, handle locally immediately
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("mizizzi_token") : null

      if (!token || token === "null" || token === "undefined") {
        console.log("No auth token for add to cart, handling locally")

        // Get existing cart items from local storage
        const existingItems = this.getLocalCartItems()

        // Try to get product data to set proper price
        let productPrice = 0
        try {
          // Import productService here to avoid circular dependency
          const { productService } = await import("@/services/product")
          const product = await productService.getProduct(sanitizedProductId.toString())
          if (product) {
            productPrice = product.sale_price || product.price || 0
          }
        } catch (error) {
          console.warn("Could not fetch product price for local cart:", error)
          productPrice = 0
        }

        // Check if item already exists
        const existingItemIndex = existingItems.findIndex(
          (item) =>
            item.product_id === sanitizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if item exists - ADD to existing quantity
          existingItems[existingItemIndex].quantity += sanitizedQuantity
          // Ensure price is set if it was 0
          if (existingItems[existingItemIndex].price === 0 && productPrice > 0) {
            existingItems[existingItemIndex].price = productPrice
          }
          existingItems[existingItemIndex].total =
            existingItems[existingItemIndex].price * existingItems[existingItemIndex].quantity
        } else {
          // Add new item
          existingItems.push({
            id: Date.now(),
            product_id: sanitizedProductId,
            variant_id: variantId || null,
            quantity: sanitizedQuantity,
            price: productPrice, // Use fetched price
            total: productPrice * sanitizedQuantity,
            product: {
              id: sanitizedProductId,
              name: `Product ${sanitizedProductId}`,
              slug: `product-${sanitizedProductId}`,
              thumbnail_url: "",
              image_urls: [],
              price: productPrice,
              sale_price: null,
            },
          })
        }

        // Save to local storage
        this.saveLocalCartItems(existingItems)

        // Clean up the pending request
        this.pendingRequests.delete(requestKey)

        // Return a mock successful response
        const response = {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(existingItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: this.calculateSubtotal(existingItems),
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: existingItems,
          message: "Item added to cart (offline mode)",
        }

        return response
      }

      // Check if API is available before making the request
      const isApiAvailable = await checkApiAvailability()

      if (!isApiAvailable) {
        console.log("API not available, handling add to cart locally")

        // Try to get product data to set proper price
        let productPrice = 0
        try {
          const { productService } = await import("@/services/product")
          const product = await productService.getProduct(sanitizedProductId.toString())
          if (product) {
            productPrice = product.sale_price || product.price || 0
          }
        } catch (error) {
          console.warn("Could not fetch product price for local cart:", error)
          productPrice = 0
        }

        // Handle locally even if we have a token
        const existingItems = this.getLocalCartItems()

        // Check if item already exists
        const existingItemIndex = existingItems.findIndex(
          (item) =>
            item.product_id === sanitizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if item exists - ADD to existing quantity
          existingItems[existingItemIndex].quantity += sanitizedQuantity
          // Ensure price is set if it was 0
          if (existingItems[existingItemIndex].price === 0 && productPrice > 0) {
            existingItems[existingItemIndex].price = productPrice
          }
          existingItems[existingItemIndex].total =
            existingItems[existingItemIndex].price * existingItems[existingItemIndex].quantity
        } else {
          // Add new item
          existingItems.push({
            id: Date.now(),
            product_id: sanitizedProductId,
            variant_id: variantId || null,
            quantity: sanitizedQuantity,
            price: productPrice, // Use fetched price
            total: productPrice * sanitizedQuantity,
            product: {
              id: sanitizedProductId,
              name: `Product ${sanitizedProductId}`,
              slug: `product-${sanitizedProductId}`,
              thumbnail_url: "",
              image_urls: [],
              price: productPrice,
              sale_price: null,
            },
          })
        }

        // Save to local storage
        this.saveLocalCartItems(existingItems)

        // Clean up the pending request
        this.pendingRequests.delete(requestKey)

        // Return a mock successful response
        const response = {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(existingItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: this.calculateSubtotal(existingItems),
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: existingItems,
          message: "Item added to cart (offline mode)",
        }

        return response
      }

      // If we have a token and API is available, proceed with API call
      const requestPromise = this.requestQueue
        .add(() => api.post("/api/cart/items", payload, { signal: controller.signal }))
        .then((response) => {
          // Clear cart cache since it's now changed
          this.clearCache()
          return response.data
        })
        .finally(() => {
          // Clean up both maps when request completes
          this.pendingRequests.delete(requestKey)
          this.pendingPromises.delete(requestKey)
        })

      // Store the promise so duplicate requests can wait for it
      this.pendingPromises.set(requestKey, requestPromise)

      const response = await requestPromise

      return response
    } catch (error) {
      console.error("Error adding to cart:", error)

      // Clean up on error
      this.pendingRequests.delete(requestKey)
      this.pendingPromises.delete(requestKey)

      // Handle 401 errors by falling back to local storage
      if ((error as any).response?.status === 401) {
        console.log("Authentication failed, adding to cart locally")

        // Get existing cart items from local storage
        const existingItems = this.getLocalCartItems()

        // Check if item already exists
        const existingItemIndex = existingItems.findIndex(
          (item) =>
            item.product_id === sanitizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if item exists - ADD to existing quantity
          existingItems[existingItemIndex].quantity += sanitizedQuantity
          existingItems[existingItemIndex].total =
            existingItems[existingItemIndex].price * existingItems[existingItemIndex].quantity
        } else {
          // Add new item
          existingItems.push({
            id: Date.now(),
            product_id: sanitizedProductId,
            variant_id: variantId || null,
            quantity: sanitizedQuantity,
            price: 0, // Will be updated when product data is fetched
            total: 0,
            product: {
              id: sanitizedProductId,
              name: `Product ${sanitizedProductId}`,
              slug: `product-${sanitizedProductId}`,
              thumbnail_url: "",
              image_urls: [],
              price: 0,
              sale_price: null,
            },
          })
        }

        // Save to local storage
        this.saveLocalCartItems(existingItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(existingItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: this.calculateSubtotal(existingItems),
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: existingItems,
          message: "Item added to cart (offline mode)",
        }
      }

      // Don't report errors for aborted requests
      if ((error as any).name === "AbortError") {
        throw new Error("Request aborted")
      }

      // Check if this is an authentication error
      if ((error as any).response?.status === 401) {
        // For authentication errors, throw a specific error that can be handled by the cart context
        const authError = new Error("Authentication required")
        authError.name = "AuthenticationError"
        throw authError
      }

      // Extract validation errors if available
      const validationErrors = (error as any).response?.data?.errors || []

      // Check for stock-related errors
      const stockError = validationErrors.find((e: any) => e.code === "out_of_stock" || e.code === "insufficient_stock")

      if (stockError) {
        // For stock errors, show a more specific toast message
        const errorTitle = stockError.code === "out_of_stock" ? "Out of Stock" : "Insufficient Stock"
        toast({
          title: errorTitle,
          description: stockError.message || "There's an issue with the product stock",
          variant: "destructive",
        })
      } else if (validationErrors.length > 0) {
        // For other validation errors
        const errorMessage = validationErrors[0].message || "Failed to add item to cart"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        // For general errors
        toast({
          title: "Error",
          description: (error as any).response?.data?.error || "Failed to add item to cart",
          variant: "destructive",
        })
      }

      throw error
    }
  }

  // Update cart item quantity with enhanced validation
  async updateQuantity(itemId: number, quantity: number): Promise<CartResponse> {
    // Enhanced input validation
    const itemIdValidation = this.validateInput(itemId, "number", { min: 1, max: 999999999 })
    if (!itemIdValidation.isValid) {
      console.error("Invalid itemId provided to updateQuantity:", itemId, itemIdValidation.error)
      throw new Error(`Invalid item ID: ${itemIdValidation.error}`)
    }

    const quantityValidation = this.validateInput(quantity, "number", { min: 1, max: 999 })
    if (!quantityValidation.isValid) {
      console.error("Invalid quantity provided to updateQuantity:", quantity, quantityValidation.error)
      throw new Error(`Invalid quantity: ${quantityValidation.error}`)
    }

    const sanitizedItemId = itemIdValidation.sanitized
    const sanitizedQuantity = quantityValidation.sanitized

    const requestKey = this.createRequestKey(`/api/cart/items/${sanitizedItemId}`, { quantity: sanitizedQuantity })

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
      // First check if we have a valid token - if not, handle locally immediately
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("mizizzi_token") : null

      if (!token || token === "null" || token === "undefined") {
        console.log("No auth token for cart update, handling locally")

        // Handle locally for unauthenticated users
        const localItems = this.getLocalCartItems()
        const updatedItems = localItems.map((item) => {
          if (item.id === sanitizedItemId) {
            return {
              ...item,
              quantity: sanitizedQuantity,
              total: item.price * sanitizedQuantity,
            }
          }
          return item
        })

        this.saveLocalCartItems(updatedItems)

        // Clean up the pending request
        this.pendingRequests.delete(requestKey)

        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(updatedItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: this.calculateSubtotal(updatedItems),
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: updatedItems,
          message: "Item updated in cart (offline mode)",
        }
      }

      // Check if API is available before making the request
      const isApiAvailable = await checkApiAvailability()

      if (!isApiAvailable) {
        console.log("API not available, handling cart update locally")

        // Handle locally even if we have a token
        const localItems = this.getLocalCartItems()
        const updatedItems = localItems.map((item) => {
          if (item.id === sanitizedItemId) {
            return {
              ...item,
              quantity: sanitizedQuantity,
              total: item.price * sanitizedQuantity,
            }
          }
          return item
        })

        this.saveLocalCartItems(updatedItems)

        // Clean up the pending request
        this.pendingRequests.delete(requestKey)

        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(updatedItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: this.calculateSubtotal(updatedItems),
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: updatedItems,
          message: "Item updated in cart (offline mode)",
        }
      }

      // Only make API call if we have token and API is available
      try {
        console.log(`Making API call to update item ${sanitizedItemId} with quantity ${sanitizedQuantity}`)

        const response = await this.requestQueue.add(() =>
          api.put(
            `/api/cart/items/${sanitizedItemId}`,
            { quantity: sanitizedQuantity }, // Use sanitized quantity
            {
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
              },
            },
          ),
        )

        // Update cache timestamp
        this.requestCache.set(requestKey, {
          data: response.data,
          timestamp: Date.now(),
        })

        // Clear cart cache since it's now changed
        this.clearCache()

        return response.data
      } catch (apiError: any) {
        console.error("API error in updateQuantity:", apiError)

        // Handle 400 errors specifically with detailed logging
        if (apiError.response?.status === 400) {
          console.error("Bad request error details:", {
            status: apiError.response.status,
            data: apiError.response.data,
            config: {
              url: apiError.config?.url,
              method: apiError.config?.method,
              data: apiError.config?.data,
            },
            requestPayload: { quantity: sanitizedQuantity },
            itemId: sanitizedItemId,
          })

          // Check if it's a validation error
          if (apiError.response.data?.errors) {
            const errors = apiError.response.data.errors
            const errorMessage = errors[0]?.message || "Invalid request"

            toast({
              title: "Invalid Update",
              description: errorMessage,
              variant: "destructive",
            })

            throw new Error(errorMessage)
          } else if (apiError.response.data?.error) {
            toast({
              title: "Update Failed",
              description: apiError.response.data.error,
              variant: "destructive",
            })

            throw new Error(apiError.response.data.error)
          } else {
            toast({
              title: "Update Failed",
              description: "Unable to update item quantity. Please try again.",
              variant: "destructive",
            })

            throw new Error("Bad request")
          }
        }

        // Handle 401 errors by falling back to localStorage
        if (apiError.response?.status === 401) {
          console.log("Authentication failed, updating cart locally")

          // Fallback to local storage
          const localItems = this.getLocalCartItems()
          const updatedItems = localItems.map((item) => {
            if (item.id === sanitizedItemId) {
              return {
                ...item,
                quantity: sanitizedQuantity,
                total: item.price * sanitizedQuantity,
              }
            }
            return item
          })

          this.saveLocalCartItems(updatedItems)

          return {
            success: true,
            cart: {
              id: 0,
              user_id: 0,
              is_active: true,
              subtotal: this.calculateSubtotal(updatedItems),
              tax: 0,
              shipping: 0,
              discount: 0,
              total: this.calculateSubtotal(updatedItems),
              same_as_shipping: true,
              requires_shipping: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            items: updatedItems,
            message: "Item updated in cart (offline mode)",
          }
        }

        // For other errors, rethrow
        throw apiError
      }
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
          description: error.response?.data?.error || "Failed to update item quantity. Please try again.",
          variant: "destructive",
        })
      }

      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
      this.pendingPromises.delete(requestKey)
    }
  }

  // Remove an item from the cart
  async removeItem(itemId: number): Promise<CartResponse> {
    const requestKey = this.createRequestKey(`/api/cart/items/${itemId}`)

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      // First check if we have a valid token - if not, handle locally immediately
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("mizizzi_token") : null

      if (!token || token === "null" || token === "undefined") {
        console.log("No auth token for remove item, handling locally")

        // Get current localStorage items
        const localItems = this.getLocalCartItems()

        // Remove the item locally by itemId
        const updatedItems = localItems.filter((item) => item.id !== itemId)

        // Save updated items to localStorage
        this.saveLocalCartItems(updatedItems)

        // Clean up the pending request
        this.pendingRequests.delete(requestKey)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(updatedItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: this.calculateSubtotal(updatedItems),
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: updatedItems,
          message: "Item removed from cart (offline mode)",
        }
      }

      // For authenticated users, try the API call
      const response = await this.requestQueue.add(() =>
        api.delete(`/api/cart/items/${itemId}`, { signal: controller.signal }),
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

      // Handle 401 errors by falling back to localStorage for unauthenticated users
      if (error.response?.status === 401) {
        console.log("Authentication failed, removing item locally")

        // Get current localStorage items
        const localItems = this.getLocalCartItems()

        // Remove the item locally by itemId
        const updatedItems = localItems.filter((item) => item.id !== itemId)

        // Save updated items to localStorage
        this.saveLocalCartItems(updatedItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(updatedItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: this.calculateSubtotal(updatedItems),
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: updatedItems,
          message: "Item removed from cart (offline mode)",
        }
      }

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove item from cart",
        variant: "destructive",
      })
      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
      this.pendingPromises.delete(requestKey)
    }
  }

  // Clear the cart
  async clearCart(): Promise<boolean> {
    try {
      // Get the current cart items
      const cartResponse = await this.getCart()

      if (cartResponse && cartResponse.items && cartResponse.items.length > 0) {
        console.log(`Clearing ${cartResponse.items.length} items from cart individually...`)

        // Remove each item from the cart one by one
        for (const item of cartResponse.items) {
          try {
            await api.delete(`/api/cart/items/${item.id}`)
            console.log(`Successfully removed item ${item.id} from cart`)
          } catch (itemError) {
            console.warn(`Failed to remove item ${item.id} from cart:`, itemError)
            // Continue with other items even if one fails
          }
        }
      }

      // Clear local storage cart data
      if (typeof window !== "undefined") {
        localStorage.removeItem("cartItems")

        // Dispatch events to notify other components
        window.dispatchEvent(new CustomEvent("cart:cleared"))

        // Also dispatch a cart-updated event with empty cart details
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: 0,
              total: 0,
              message: "Cart has been cleared",
              timestamp: new Date().toISOString(),
            },
          }),
        )
      }

      return true
    } catch (error) {
      console.error("Error clearing cart:", error)

      // Even if the API calls fail, clear the local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("cartItems")

        // Still dispatch events even if API calls fail
        window.dispatchEvent(new CustomEvent("cart:cleared"))
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: 0,
              total: 0,
              message: "Cart has been cleared",
              timestamp: new Date().toISOString(),
            },
          }),
        )
      }

      return false
    }
  }

  // Apply a coupon to the cart
  async applyCoupon(couponCode: string): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/coupons", { code: couponCode })

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/coupons", { code: couponCode }, { signal: controller.signal }),
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

      // Extract validation errors if available
      const validationErrors = error.response?.data?.errors || []
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors[0].message || "Failed to apply coupon"
        toast({
          title: "Invalid Coupon",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Invalid Coupon",
          description: error.response?.data?.error || "Failed to apply coupon",
          variant: "destructive",
        })
      }

      throw error
    } finally {
      this.pendingRequests.delete(requestKey)
    }
  }

  // Remove a coupon from the cart
  async removeCoupon(): Promise<CartResponse> {
    const requestKey = this.createRequestKey("/api/cart/coupons")

    // Abort any pending request for the same endpoint
    this.abortPendingRequest(requestKey)

    // Create new abort controller
    const controller = new AbortController()
    this.pendingRequests.set(requestKey, controller)

    try {
      const response = await this.requestQueue.add(() => api.delete("/api/cart/coupons", { signal: controller.signal }))

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

      // Extract validation errors if available
      const validationErrors = error.response?.data?.errors || []
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors[0].message || "Failed to set shipping address"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to set shipping address",
          variant: "destructive",
        })
      }

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

      // Extract validation errors if available
      const validationErrors = error.response?.data?.errors || []
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors[0].message || "Failed to set billing address"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to set billing address",
          variant: "destructive",
        })
      }

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

      // Extract validation errors if available
      const validationErrors = error.response?.data?.errors || []
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors[0].message || "Failed to set shipping method"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to set shipping method",
          variant: "destructive",
        })
      }

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

      // Extract validation errors if available
      const validationErrors = error.response?.data?.errors || []
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors[0].message || "Failed to set payment method"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to set payment method",
          variant: "destructive",
        })
      }

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
    const requestKey = this.createRequestKey("/api/cart/shipping-options", { requires_shipping: requiresShipping })

    try {
      const response = await this.requestQueue.add(() =>
        api.post("/api/cart/shipping-options", { requires_shipping: requiresShipping }),
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

    // Check cache first, but with a shorter TTL for stock validation
    const cachedItem = this.requestCache.get(requestKey)
    const STOCK_VALIDATION_TTL = 1000 // 1 second TTL for stock validation
    if (cachedItem && Date.now() - cachedItem.timestamp < this.STOCK_VALIDATION_TTL) {
      return cachedItem.data
    }

    try {
      console.log("Validating cart with server...")

      // Create a custom fetch request with proper CORS settings
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const fullUrl = `${baseUrl}/api/cart/validate`

      // Get the token for authorization
      const token = localStorage.getItem("mizizzi_token")

      const response = await fetch(fullUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) {
        const data = await response.json()
        const validation = {
          is_valid: data.is_valid,
          errors: data.errors || [],
          warnings: data.warnings || [],
        }

        // Cache the response with a short TTL
        this.requestCache.set(requestKey, {
          data: validation,
          timestamp: Date.now(),
        })

        return validation
      }

      // If server response is not OK, return a fallback response
      console.warn("Cart validation returned non-OK status:", response.status)
      const validation = {
        is_valid: true,
        errors: [],
        warnings: [
          {
            code: "network_warning",
            message: "Cart validation returned an unexpected response. Some items may have stock limitations.",
          },
        ],
      }

      // Cache the fallback response
      this.requestCache.set(requestKey, {
        data: validation,
        timestamp: Date.now(),
      })

      return validation
    } catch (error) {
      console.error("Error validating cart:", error)

      // If there's a network error, return a more graceful response
      return {
        is_valid: true, // Assume valid to not block the user
        errors: [],
        warnings: [
          {
            code: "network_error",
            message: "Could not validate cart due to network issues. Some items may have stock limitations.",
          },
        ],
      }
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

  // Add helper methods for local storage operations
  private getLocalCartItems(): CartItem[] {
    if (typeof window === "undefined") return []

    try {
      const items = localStorage.getItem("cartItems")
      if (!items) return []

      return JSON.parse(items)
    } catch (error) {
      console.error("Error parsing cart items from localStorage:", error)
      return []
    }
  }

  private saveLocalCartItems(items: CartItem[]): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("cartItems", JSON.stringify(items))
    } catch (error) {
      console.error("Error saving cart items to localStorage:", error)
    }
  }

  private calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  // Add a token refresh method
  private async refreshToken(): Promise<boolean> {
    if (typeof window === "undefined") return false

    try {
      const refreshToken = localStorage.getItem("mizizzi_refresh_token")
      if (!refreshToken || refreshToken === "null" || refreshToken === "undefined") {
        return false
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${apiUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        // Clear invalid tokens
        localStorage.removeItem("mizizzi_token")
        localStorage.removeItem("mizizzi_refresh_token")
        return false
      }

      const data = await response.json()
      if (data.access_token) {
        localStorage.setItem("mizizzi_token", data.access_token)
        if (data.refresh_token) {
          localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
        }
        return true
      }

      return false
    } catch (error) {
      console.error("Token refresh failed:", error)
      return false
    }
  }
}

// Create and export the cart service instance
export const cartService = {
  async getCart() {
    try {
      const response = await api.get("/api/cart")
      return response.data
    } catch (error) {
      console.error("Error fetching cart:", error)
      return {
        success: true,
        cart: {
          id: 0,
          user_id: 0,
          is_active: true,
          subtotal: 0,
          tax: 0,
          shipping: 0,
          discount: 0,
          total: 0,
          same_as_shipping: true,
          requires_shipping: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        items: [],
      }
    }
  },

  async addToCart(productId: number, quantity = 1, variantId?: number) {
    try {
      // Enhanced input validation
      if (!productId || typeof productId !== "number" || isNaN(productId) || productId <= 0) {
        console.error("Invalid productId provided to addToCart:", productId)
        throw new Error("Invalid product ID")
      }

      if (!quantity || typeof quantity !== "number" || isNaN(quantity) || quantity <= 0 || quantity > 999) {
        console.error("Invalid quantity provided to addToCart:", quantity)
        throw new Error("Invalid quantity")
      }

      // Ensure variantId is valid if provided
      if (
        variantId !== undefined &&
        variantId !== null &&
        (typeof variantId !== "number" || isNaN(variantId) || variantId <= 0)
      ) {
        console.error("Invalid variantId provided to addToCart:", variantId)
        variantId = undefined // Reset to undefined if invalid
      }

      // First check if we have a valid token - if not, handle locally immediately
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("mizizzi_token") : null

      if (!token || token === "null" || token === "undefined") {
        console.log("No auth token for add to cart, handling locally")

        // Get existing cart items from local storage
        const existingItems = this.getLocalCartItems()

        // Check if item already exists
        const existingItemIndex = existingItems.findIndex(
          (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          existingItems[existingItemIndex].quantity += quantity
        } else {
          // Add new item
          existingItems.push({
            id: Date.now(),
            product_id: productId,
            variant_id: variantId || null,
            quantity,
            price: 0, // Will be updated when product data is fetched
            total: 0,
            product: {
              id: productId,
              name: `Product ${productId}`,
              slug: `product-${productId}`,
              thumbnail_url: "",
              image_urls: [],
              price: 0,
              sale_price: null,
            },
          })
        }

        // Save to local storage
        this.saveLocalCartItems(existingItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(existingItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: existingItems,
          message: "Item added to cart (offline mode)",
        }
      }

      // Check if API is available before making the request
      const isApiAvailable = await checkApiAvailability()

      if (!isApiAvailable) {
        console.log("API not available, handling add to cart locally")

        // Handle locally even if we have a token
        const existingItems = this.getLocalCartItems()

        // Check if item already exists
        const existingItemIndex = existingItems.findIndex(
          (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          existingItems[existingItemIndex].quantity += quantity
        } else {
          // Add new item
          existingItems.push({
            id: Date.now(),
            product_id: productId,
            variant_id: variantId || null,
            quantity,
            price: 0, // Will be updated when product data is fetched
            total: 0,
            product: {
              id: productId,
              name: `Product ${productId}`,
              slug: `product-${productId}`,
              thumbnail_url: "",
              image_urls: [],
              price: 0,
              sale_price: null,
            },
          })
        }

        // Save to local storage
        this.saveLocalCartItems(existingItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(existingItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: existingItems,
          message: "Item added to cart (offline mode)",
        }
      }

      // If API is available, proceed with normal API call
      const response = await api.post("/api/cart/items", {
        product_id: productId,
        quantity,
        variant_id: variantId,
      })
      return response.data
    } catch (error) {
      console.error("Error adding to cart:", error)

      // Handle 404 errors by falling back to local storage
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as any).response &&
        (error as any).response.status === 404
      ) {
        console.log("API endpoint not found, using local storage fallback")

        // Get existing cart items from local storage
        const existingItems = this.getLocalCartItems()

        // Check if item already exists
        const existingItemIndex = existingItems.findIndex(
          (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          existingItems[existingItemIndex].quantity += quantity
        } else {
          // Add new item
          existingItems.push({
            id: Date.now(),
            product_id: productId,
            variant_id: variantId || null,
            quantity,
            price: 0, // Will be updated when product data is fetched
            total: 0,
            product: {
              id: productId,
              name: `Product ${productId}`,
              slug: `product-${productId}`,
              thumbnail_url: "",
              image_urls: [],
              price: 0,
              sale_price: null,
            },
          })
        }

        // Save to local storage
        this.saveLocalCartItems(existingItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(existingItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: existingItems,
          message: "Item added to cart (offline mode)",
        }
      }

      throw error
    }
  },

  async updateQuantity(itemId: number, quantity: number) {
    // Enhanced input validation
    if (!itemId || typeof itemId !== "number" || isNaN(itemId) || itemId <= 0) {
      console.error("Invalid itemId provided to updateQuantity:", itemId)
      throw new Error("Invalid item ID")
    }

    if (!quantity || typeof quantity !== "number" || isNaN(quantity) || quantity <= 0 || quantity > 999) {
      console.error("Invalid quantity provided to updateQuantity:", quantity)
      throw new Error("Invalid quantity")
    }

    // Check for scientific notation
    if (itemId.toString().includes("e") || quantity.toString().includes("e")) {
      console.error("Scientific notation detected in updateQuantity:", { itemId, quantity })
      throw new Error("Invalid number format")
    }

    // First check if we have a valid token - if not, handle locally immediately
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("mizizzi_token") : null

    if (!token || token === "null" || token === "undefined") {
      console.log("No auth token for cart update, handling locally")

      // Get current localStorage items
      const localItems = this.getLocalCartItems()

      // Find and update the item locally
      const updatedItems = localItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: quantity,
            total: item.price * quantity,
          }
        }
        return item
      })

      // Save updated items to localStorage
      this.saveLocalCartItems(updatedItems)

      // Return a mock successful response
      return {
        success: true,
        cart: {
          id: 0,
          user_id: 0,
          is_active: true,
          subtotal: this.calculateSubtotal(updatedItems),
          tax: 0,
          shipping: 0,
          discount: 0,
          total: 0,
          same_as_shipping: true,
          requires_shipping: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        items: updatedItems,
        message: "Item updated in cart (offline mode)",
      }
    }

    try {
      // Only make API call if we have a token
      const response = await api.put(`/api/cart/items/${itemId}`, {
        quantity: Math.floor(quantity), // Ensure integer quantity
      })
      return response.data
    } catch (error: any) {
      console.error("Error updating cart item:", error)

      // Handle 401 errors by falling back to localStorage for unauthenticated users
      if (error.response?.status === 401) {
        console.log("User not authenticated, updating cart locally")

        // Get current localStorage items
        const localItems = this.getLocalCartItems()

        // Find and update the item locally
        const updatedItems = localItems.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity: quantity,
              total: item.price * quantity,
            }
          }
          return item
        })

        // Save updated items to localStorage
        this.saveLocalCartItems(updatedItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(updatedItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: updatedItems,
          message: "Item updated in cart (offline mode)",
        }
      }

      // For other errors, rethrow with more context
      const errorMessage = error.response?.data?.error || "Failed to update item quantity"
      const enhancedError = new Error(errorMessage)
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  },

  async removeItem(itemId: number) {
    try {
      // First check if we're authenticated
      const token = localStorage.getItem("mizizzi_token")

      if (!token) {
        // For unauthenticated users, handle removal locally
        console.log("User not authenticated, removing item locally")

        // Get current localStorage items
        const localItems = this.getLocalCartItems()

        // Remove the item locally by itemId
        const updatedItems = localItems.filter((item) => item.id !== itemId)

        // Save updated items to localStorage
        this.saveLocalCartItems(updatedItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(updatedItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            same_as_shipping: true,
            requires_shipping: true,
          },
          items: updatedItems,
          message: "Item removed from cart (offline mode)",
        }
      }

      // For authenticated users, try the API call
      const response = await api.delete(`/api/cart/items/${itemId}`)
      return response.data
    } catch (error: any) {
      console.error("Error removing cart item:", error)

      // Handle 401 errors by falling back to localStorage for unauthenticated users
      if (error.response?.status === 401) {
        console.log("User not authenticated, removing item locally")

        // Get current localStorage items
        const localItems = this.getLocalCartItems()

        // Remove the item locally by itemId
        const updatedItems = localItems.filter((item) => item.id !== itemId)

        // Save updated items to localStorage
        this.saveLocalCartItems(updatedItems)

        // Return a mock successful response
        return {
          success: true,
          cart: {
            id: 0,
            user_id: 0,
            is_active: true,
            subtotal: this.calculateSubtotal(updatedItems),
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            same_as_shipping: true,
            requires_shipping: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          items: updatedItems,
          message: "Item removed from cart (offline mode)",
        }
      }

      throw error
    }
  },

  async clearCart(): Promise<boolean> {
    try {
      // Get the current cart items
      const cartResponse = await this.getCart()

      if (cartResponse && cartResponse.items && cartResponse.items.length > 0) {
        console.log(`Clearing ${cartResponse.items.length} items from cart individually...`)

        // Remove each item from the cart one by one
        for (const item of cartResponse.items) {
          try {
            await api.delete(`/api/cart/items/${item.id}`)
            console.log(`Successfully removed item ${item.id} from cart`)
          } catch (itemError) {
            console.warn(`Failed to remove item ${item.id} from cart:`, itemError)
            // Continue with other items even if one fails
          }
        }
      }

      // Clear local storage cart data
      if (typeof window !== "undefined") {
        localStorage.removeItem("cartItems")

        // Dispatch events to notify other components
        window.dispatchEvent(new CustomEvent("cart:cleared"))

        // Also dispatch a cart-updated event with empty cart details
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: 0,
              total: 0,
              message: "Cart has been cleared",
              timestamp: new Date().toISOString(),
            },
          }),
        )
      }

      return true
    } catch (error) {
      console.error("Error clearing cart:", error)

      // Even if the API calls fail, clear the local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("cartItems")

        // Still dispatch events even if API calls fail
        window.dispatchEvent(new CustomEvent("cart:cleared"))
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: 0,
              total: 0,
              message: "Cart has been cleared",
              timestamp: new Date().toISOString(),
            },
          }),
        )
      }

      return false
    }
  },

  async applyCoupon(code: string) {
    try {
      const response = await api.post("/api/cart/coupons", { code })
      return response.data
    } catch (error) {
      console.error("Error applying coupon:", error)
      throw error
    }
  },

  async removeCoupon() {
    try {
      const response = await api.delete("/api/cart/coupons")
      return response.data
    } catch (error) {
      console.error("Error removing coupon:", error)
      throw error
    }
  },

  async setShippingAddress(addressId: number) {
    try {
      const response = await api.post("/api/cart/shipping-address", { address_id: addressId })
      return response.data
    } catch (error) {
      console.error("Error setting shipping address:", error)
      throw error
    }
  },

  async setBillingAddress(addressId: number, sameAsShipping = false) {
    try {
      const payload = sameAsShipping ? { same_as_shipping: true } : { address_id: addressId, same_as_shipping: false }
      const response = await api.post("/api/cart/billing-address", payload)
      return response.data
    } catch (error) {
      console.error("Error setting billing address:", error)
      throw error
    }
  },

  async setShippingMethod(shippingMethodId: number) {
    try {
      const response = await api.post("/api/cart/shipping-method", { shipping_method_id: shippingMethodId })
      return response.data
    } catch (error) {
      console.error("Error setting shipping method:", error)
      throw error
    }
  },

  async setPaymentMethod(paymentMethodId: number) {
    try {
      const response = await api.post("/api/cart/payment-method", { payment_method_id: paymentMethodId })
      return response.data
    } catch (error) {
      console.error("Error setting payment method:", error)
      throw error
    }
  },

  async setCartNotes(notes: string) {
    try {
      const response = await api.post("/api/cart/notes", { notes })
      return response.data
    } catch (error) {
      console.error("Error setting cart notes:", error)
      throw error
    }
  },

  async setRequiresShipping(requiresShipping: boolean) {
    try {
      const response = await api.post("/api/cart/shipping-options", { requires_shipping: requiresShipping })
      return response.data
    } catch (error) {
      console.error("Error setting requires shipping flag:", error)
      throw error
    }
  },

  async validateCart() {
    try {
      const response = await api.get("/api/cart/validate")
      return {
        is_valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: [],
      }
    } catch (error) {
      console.error("Error validating cart:", error)
      return {
        is_valid: false,
        errors: [{ message: "Failed to validate cart", code: "validation_error" }],
        warnings: [],
      }
    }
  },

  async validateCheckout() {
    try {
      const response = await api.get("/api/cart/checkout/validate")
      return {
        is_valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: [],
      }
    } catch (error) {
      console.error("Error validating checkout:", error)
      return {
        is_valid: false,
        errors: [{ message: "Failed to validate checkout", code: "validation_error" }],
        warnings: [],
      }
    }
  },

  async getCartSummary() {
    try {
      const response = await api.get("/api/cart/summary")
      return {
        item_count: response.data.item_count,
        total: response.data.total,
        has_items: response.data.has_items,
      }
    } catch (error) {
      console.error("Error fetching cart summary:", error)
      return {
        item_count: 0,
        total: 0,
        has_items: false,
      }
    }
  },

  async getShippingMethods() {
    try {
      const response = await api.get("/api/cart/shipping-methods")
      return response.data.shipping_methods || []
    } catch (error) {
      console.error("Error fetching shipping methods:", error)
      return []
    }
  },

  async getPaymentMethods() {
    try {
      const response = await api.get("/api/cart/payment-methods")
      return response.data.payment_methods || []
    } catch (error) {
      console.error("Error fetching payment methods:", error)
      return []
    }
  },

  // Add helper methods for local storage operations
  getLocalCartItems(): CartItem[] {
    if (typeof window === "undefined") return []

    try {
      const items = localStorage.getItem("cartItems")
      if (!items) return []

      return JSON.parse(items)
    } catch (error) {
      console.error("Error parsing cart items from localStorage:", error)
      return []
    }
  },

  saveLocalCartItems(items: CartItem[]): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("cartItems", JSON.stringify(items))
    } catch (error) {
      console.error("Error saving cart items to localStorage:", error)
    }
  },

  calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  },

  // Add method to check API availability
  async checkApiAvailability(): Promise<boolean> {
    try {
      // Try a simple GET request to check if the API is available
      await api.get("/api/health-check", {
        headers: {
          // Prevent caching
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
      return true
    } catch (error: any) {
      // If we get a 404 specifically for the health check endpoint, the API might still be available
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        error.response &&
        error.response.status === 404 &&
        error.response.config &&
        error.response.config.url &&
        error.response.config.url.includes("health-check")
      ) {
        try {
          // Try another endpoint that should exist
          await api.get("/api", {
            headers: {
              // Prevent caching
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Expires: "0",
            },
          })
          return true
        } catch (innerError) {
          return false
        }
      }
      return false
    }
  },
}

export default cartService
