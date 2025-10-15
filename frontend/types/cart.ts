// Cart-related TypeScript interfaces and types

export interface CartItem {
  id: number
  cart_id?: number
  user_id?: number
  product_id: number
  variant_id?: number | null
  quantity: number
  price: number
  subtotal?: number
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
    sale_price: number | null
  }
  variant?: {
    id: number
    color?: string
    size?: string
    price?: number
    sale_price?: number | null
  } | null
  created_at?: string
  updated_at?: string
}

export interface Cart {
  id: number
  user_id: number
  guest_id?: string
  is_guest?: boolean
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
  last_activity?: string
  expires_at?: string
  shipping_method?: {
    id: number
    name: string
    description: string
    cost: number
    estimated_days: string
  }
  payment_method?: {
    id: number
    name: string
    code: string
    description: string
  }
  shipping_address?: Address
  billing_address?: Address
}

export interface Address {
  id: number
  first_name: string
  last_name: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
}

export interface CartResponse {
  success: boolean
  cart: Cart
  items: CartItem[]
  message?: string
  validation?: CartValidation
  errors?: CartValidationError[]
  warnings?: CartValidationWarning[]
}

export interface CartSummary {
  item_count: number
  total: number
  has_items: boolean
  guest?: boolean
}

export interface CartSummaryResponse {
  success: boolean
  item_count: number
  total: number
  has_items: boolean
  guest?: boolean
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
  product_id?: number
  variant_id?: number
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
  requested_quantity?: number
  available_quantity?: number
  current_quantity?: number
  new_quantity?: number
  old_price?: number
  new_price?: number
  [key: string]: any
}

export interface CartValidationWarning {
  message: string
  code: string
  item_id?: number
  product_id?: number
  variant_id?: number
  available_quantity?: number
  current_quantity?: number
  new_quantity?: number
  old_price?: number
  new_price?: number
  [key: string]: any
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
  type?: string
  value?: number
  min_purchase?: number
  max_discount?: number
  start_date?: string
  end_date?: string
  usage_limit?: number
  used_count?: number
  is_active?: boolean
  description?: string
  discount_type?: string
  discount_value?: number
  min_order_value?: number
}

export interface CartHealthResponse {
  status: string
  service: string
  timestamp: string
}

export interface CheckoutValidationResponse extends CartValidation {
  cart?: Cart
  items?: CartItem[]
}

export interface RequestQueueItem {
  id: string
  request: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  timestamp: number
}

// Request Queue class for managing API requests
export class RequestQueue {
  private queue: RequestQueueItem[] = []
  private processing = false
  private readonly BATCH_SIZE = 5
  private readonly BATCH_DELAY = 100

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const item: RequestQueueItem = {
        id: Math.random().toString(36).substr(2, 9),
        request,
        resolve,
        reject,
        timestamp: Date.now(),
      }

      this.queue.push(item)
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.BATCH_SIZE)

        await Promise.allSettled(
          batch.map(async (item) => {
            try {
              const result = await item.request()
              item.resolve(result)
            } catch (error) {
              item.reject(error)
            }
          }),
        )

        if (this.queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY))
        }
      }
    } finally {
      this.processing = false
    }
  }

  clear() {
    this.queue.forEach((item) => {
      item.reject(new Error("Queue cleared"))
    })
    this.queue = []
  }

  size() {
    return this.queue.length
  }
}

export interface ICartService {
  getCart(): Promise<CartResponse>
  addToCart(productId: number, quantity: number, variantId?: number): Promise<CartResponse>
  updateQuantity(itemId: number, quantity: number): Promise<CartResponse>
  removeItem(itemId: number): Promise<CartResponse>
  clearCart(): Promise<boolean>
  getCartSummary(): Promise<CartSummary>
  healthCheck(): Promise<CartHealthResponse>
  applyCoupon(couponCode: string): Promise<CartResponse>
  removeCoupon(): Promise<CartResponse>
  getShippingMethods(): Promise<ShippingMethod[]>
  setShippingMethod(shippingMethodId: number): Promise<CartResponse>
  getPaymentMethods(): Promise<PaymentMethod[]>
  setPaymentMethod(paymentMethodId: number): Promise<CartResponse>
  setShippingAddress(addressId: number): Promise<CartResponse>
  setBillingAddress(addressId?: number, sameAsShipping?: boolean): Promise<CartResponse>
  setCartNotes(notes: string): Promise<CartResponse>
  setShippingOptions(requiresShipping: boolean): Promise<CartResponse>
  validateCart(): Promise<CartValidation>
  validateCheckout(): Promise<CheckoutValidationResponse>
}
