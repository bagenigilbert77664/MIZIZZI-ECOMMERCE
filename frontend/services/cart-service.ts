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

class CartService {
  // Get the current cart
  async getCart(): Promise<CartResponse> {
    try {
      const response = await api.get("/api/cart")
      return response.data
    } catch (error: any) {
      console.error("Error fetching cart:", error)
      throw new Error(error.response?.data?.error || "Failed to fetch cart")
    }
  }

  // Add an item to the cart
  async addToCart(productId: number, quantity: number, variantId?: number): Promise<CartResponse> {
    try {
      const payload = {
        product_id: productId,
        quantity,
        ...(variantId && { variant_id: variantId }),
      }

      const response = await api.post("/api/cart/add", payload)
      return response.data
    } catch (error: any) {
      console.error("Error adding to cart:", error)

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
    }
  }

  // Update cart item quantity
  async updateQuantity(itemId: number, quantity: number): Promise<CartResponse> {
    try {
      const response = await api.put(`/api/cart/update/${itemId}`, { quantity })
      return response.data
    } catch (error: any) {
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
    }
  }

  // Remove an item from the cart
  async removeItem(itemId: number): Promise<CartResponse> {
    try {
      const response = await api.delete(`/api/cart/remove/${itemId}`)
      return response.data
    } catch (error: any) {
      console.error("Error removing cart item:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove item from cart",
        variant: "destructive",
      })
      throw error
    }
  }

  // Clear the cart
  async clearCart(): Promise<CartResponse> {
    try {
      const response = await api.delete("/api/cart/clear")
      return response.data
    } catch (error: any) {
      console.error("Error clearing cart:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to clear cart",
        variant: "destructive",
      })
      throw error
    }
  }

  // Apply a coupon to the cart
  async applyCoupon(couponCode: string): Promise<CartResponse> {
    try {
      const response = await api.post("/api/cart/apply-coupon", { coupon_code: couponCode })
      return response.data
    } catch (error: any) {
      console.error("Error applying coupon:", error)
      toast({
        title: "Invalid Coupon",
        description: error.response?.data?.errors?.[0]?.message || "Failed to apply coupon",
        variant: "destructive",
      })
      throw error
    }
  }

  // Remove a coupon from the cart
  async removeCoupon(): Promise<CartResponse> {
    try {
      const response = await api.delete("/api/cart/remove-coupon")
      return response.data
    } catch (error: any) {
      console.error("Error removing coupon:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove coupon",
        variant: "destructive",
      })
      throw error
    }
  }

  // Set shipping address
  async setShippingAddress(addressId: number): Promise<CartResponse> {
    try {
      const response = await api.post("/api/cart/shipping-address", { address_id: addressId })
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
    try {
      const payload = sameAsShipping ? { same_as_shipping: true } : { address_id: addressId, same_as_shipping: false }

      const response = await api.post("/api/cart/billing-address", payload)
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
    try {
      const response = await api.post("/api/cart/shipping-method", { shipping_method_id: shippingMethodId })
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
    try {
      const response = await api.post("/api/cart/payment-method", { payment_method_id: paymentMethodId })
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
    try {
      const response = await api.post("/api/cart/notes", { notes })
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

  // Set requires shipping flag
  async setRequiresShipping(requiresShipping: boolean): Promise<CartResponse> {
    try {
      const response = await api.post("/api/cart/requires-shipping", { requires_shipping: requiresShipping })
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
    try {
      const response = await api.get("/api/cart/validate")
      return {
        is_valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
      }
    } catch (error: any) {
      console.error("Error validating cart:", error)
      throw new Error(error.response?.data?.error || "Failed to validate cart")
    }
  }

  // Validate cart for checkout
  async validateCheckout(): Promise<CartValidation> {
    try {
      const response = await api.get("/api/cart/checkout/validate")
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
    try {
      const response = await api.get("/api/cart/summary")
      return {
        item_count: response.data.item_count,
        total: response.data.total,
        has_items: response.data.has_items,
      }
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
    try {
      const response = await api.get("/api/cart/shipping-methods")
      return response.data.shipping_methods || []
    } catch (error: any) {
      console.error("Error fetching shipping methods:", error)
      return []
    }
  }

  // Get available payment methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await api.get("/api/cart/payment-methods")
      return response.data.payment_methods || []
    } catch (error: any) {
      console.error("Error fetching payment methods:", error)
      return []
    }
  }
}

export const cartService = new CartService()
