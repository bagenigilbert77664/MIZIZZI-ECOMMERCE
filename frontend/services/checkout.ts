import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface CheckoutRequest {
  payment_method: string
  shipping_method?: number
  shipping_address: number
  billing_address?: number
  same_as_shipping?: boolean
  notes?: string
  phone?: string
}

interface CheckoutResponse {
  success: boolean
  message?: string
  error?: string
  order?: {
    id: number
    order_number: string
    total_amount: number
    status: string
    payment_status: string
    created_at: string
  }
  payment?: {
    id: number
    transaction_id: string
    amount: number
    status: string
    payment_method: string
  }
  payment_instructions?: any
  payment_redirect?: string
}

// Process checkout with the correct API endpoint
export const processCheckout = async (checkoutData: CheckoutRequest): Promise<CheckoutResponse> => {
  try {
    const response = await api.post("/api/checkout/process", checkoutData)

    if (response.status < 200 || response.status >= 300) {
      const errorData = response.data
      console.error("Checkout error:", errorData)
      throw new Error(errorData.error || "Failed to process checkout")
    }

    const data = response.data
    return {
      success: true,
      message: data.message || "Order created successfully",
      order: data.order || null,
      payment: data.payment || null,
      payment_instructions: data.payment_instructions || null,
      payment_redirect: data.payment_redirect || null,
    }
  } catch (error: any) {
    console.error("Error processing checkout:", error)

    toast({
      title: "Checkout Failed",
      description: error.message || "An error occurred during checkout. Please try again.",
      variant: "destructive",
    })

    return {
      success: false,
      error: error.message || "Failed to process checkout",
    }
  }
}

// Validate cart items before checkout
export const validateCart = async () => {
  try {
    const response = await api.post("/api/checkout/validate-cart")

    if (response.status < 200 || response.status >= 300) {
      throw new Error("Failed to validate cart")
    }

    return response.data
  } catch (error) {
    console.error("Error validating cart:", error)
    return {
      success: false,
      is_valid: false,
      stock_issues: [],
      price_changes: [],
    }
  }
}

// Calculate checkout totals
export const calculateTotals = async (data: { shipping_method_id?: number; coupon_code?: string }) => {
  try {
    const response = await api.post("/api/checkout/calculate-totals", data)

    if (response.status < 200 || response.status >= 300) {
      throw new Error("Failed to calculate totals")
    }

    return response.data
  } catch (error) {
    console.error("Error calculating totals:", error)
    return {
      success: false,
      subtotal: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 0,
    }
  }
}

// Get available shipping methods
export const getShippingMethods = async () => {
  try {
    const response = await api.get("/api/checkout/shipping-methods")

    if (response.status < 200 || response.status >= 300) {
      throw new Error("Failed to fetch shipping methods")
    }

    return response.data
  } catch (error) {
    console.error("Error fetching shipping methods:", error)
    return {
      success: false,
      shipping_methods: [],
    }
  }
}

// Get available payment methods
export const getPaymentMethods = async () => {
  try {
    const response = await api.get("/api/payment/methods")

    if (response.status < 200 || response.status >= 300) {
      throw new Error("Failed to fetch payment methods")
    }

    return response.data
  } catch (error) {
    console.error("Error fetching payment methods:", error)
    return {
      success: false,
      payment_methods: [],
    }
  }
}

// Check payment status for an order
export const checkPaymentStatus = async (orderId: string | number) => {
  try {
    const response = await api.get(`/api/checkout/check-payment-status/${orderId}`)

    if (response.status < 200 || response.status >= 300) {
      throw new Error("Failed to check payment status")
    }

    return response.data
  } catch (error) {
    console.error("Error checking payment status:", error)
    return {
      success: false,
      order: null,
      payment: null,
    }
  }
}

// Complete an order after successful payment
export const completeOrder = async (orderId: string | number) => {
  try {
    const response = await api.post(`/api/checkout/complete-order/${orderId}`)

    if (response.status < 200 || response.status >= 300) {
      throw new Error("Failed to complete order")
    }

    return response.data
  } catch (error) {
    console.error("Error completing order:", error)
    return {
      success: false,
      message: "Failed to complete order",
    }
  }
}
