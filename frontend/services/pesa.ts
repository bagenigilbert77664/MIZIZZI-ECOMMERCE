import { toast } from "@/components/ui/use-toast"

export interface PesapalPaymentRequest {
  order_id: string
  amount: number
  currency: string
  customer_email: string
  customer_phone: string
  description: string
  callback_url?: string
  billing_address?: {
    first_name: string
    last_name: string
    email_address?: string
    phone_number?: string
    line_1: string
    city: string
    country_code: string
    postal_code: string
  }
  cart_items?: Array<{
    product_id: number
    name: string
    quantity: number
    price: number
    total: number
  }>
  subtotal?: number
  shipping_cost?: number
  tax_amount?: number
  payment_method?: string
  metadata?: Record<string, any>
}

export interface PesapalPaymentResponse {
  status: "success" | "error"
  order_tracking_id?: string
  merchant_reference?: string
  redirect_url?: string
  transaction_id?: string
  message?: string
  error?: string
  error_code?: string
}

export interface PesapalTransactionStatus {
  status: "success" | "error"
  payment_status?: string
  payment_method?: string
  payment_account?: string
  confirmation_code?: string
  merchant_reference?: string
  amount?: number
  currency?: string
  message?: string
  error?: string
}

class PesaService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
    console.log("[PesaService] Initialized with backend URL:", this.baseUrl)
    console.log("[PesaService] Environment variables:", {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    })
    this.refreshToken()
  }

  /**
   * Refresh the authentication token from localStorage
   */
  private refreshToken(): void {
    this.token =
      localStorage.getItem("mizizzi_token") || localStorage.getItem("token") || localStorage.getItem("access_token")
  }

  /**
   * Get authentication headers for API requests
   */
  private getHeaders(): HeadersInit {
    this.refreshToken()

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    return headers
  }

  /**
   * Make HTTP request with proper error handling
   */
  private async makeRequest<T>(endpoint: string, method = "GET", body?: any): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      console.log(`[PesaService] Making ${method} request to:`, url)
      console.log(`[PesaService] Backend URL:`, this.baseUrl)
      console.log(`[PesaService] Full endpoint:`, endpoint)

      const requestOptions: RequestInit = {
        method,
        headers: this.getHeaders(),
        credentials: "include",
      }

      if (body && method !== "GET") {
        requestOptions.body = JSON.stringify(body)
        console.log(`[PesaService] Request body:`, JSON.stringify(body, null, 2))
      }

      const response = await fetch(url, requestOptions)

      let data: any
      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const textData = await response.text()
        console.log(`[PesaService] Non-JSON response:`, textData)
        data = { message: textData }
      }

      console.log(`[PesaService] Response status:`, response.status)
      console.log(`[PesaService] Response data:`, data)

      if (!response.ok) {
        if (response.status === 400) {
          const errorMessage = data.message || data.error || data.detail || "Invalid request data"
          console.error(`[PesaService] 400 Bad Request:`, errorMessage)
          throw new Error(`Validation Error: ${errorMessage}`)
        }

        throw new Error(data.message || data.error || data.detail || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data as T
    } catch (error: any) {
      console.error(`[PesaService] Request failed:`, error)

      if (error.name === "TypeError" && error.message === "Failed to fetch") {
        console.error(`[PesaService] Network connectivity error - backend may be unreachable`)
        console.error(`[PesaService] Attempted URL: ${this.baseUrl}${endpoint}`)
        throw new Error("Unable to connect to payment server. Please check your internet connection and try again.")
      }

      throw error
    }
  }

  /**
   * Initiate a Pesapal card payment
   */
  async initiateCardPayment(paymentData: PesapalPaymentRequest): Promise<PesapalPaymentResponse> {
    try {
      console.log("[PesaService] Initiating Pesapal card payment")

      // Validate payment data
      const validationErrors = this.validatePaymentData(paymentData)
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.join(", ")
        toast({
          title: "Payment Validation Failed",
          description: errorMessage,
          variant: "destructive",
        })
        return {
          status: "error",
          error: errorMessage,
          error_code: "VALIDATION_ERROR",
        }
      }

      // Format phone number
      const formattedPaymentData = {
        ...paymentData,
        customer_phone: this.formatPhoneNumber(paymentData.customer_phone),
        billing_address: paymentData.billing_address
          ? {
              ...paymentData.billing_address,
              phone_number: this.formatPhoneNumber(
                paymentData.billing_address.phone_number || paymentData.customer_phone,
              ),
              email_address: paymentData.billing_address.email_address || paymentData.customer_email,
            }
          : undefined,
      }

      const response = await this.makeRequest<PesapalPaymentResponse>(
        "/api/pesapal/card/initiate",
        "POST",
        formattedPaymentData,
      )

      if (response.status === "success") {
        toast({
          title: "Payment Initiated",
          description: "Redirecting to Pesapal payment page...",
          variant: "default",
        })

        if (response.redirect_url) {
          console.log("[PesaService] Pesapal redirect URL received:", response.redirect_url)
        }
      } else {
        toast({
          title: "Payment Failed",
          description: response.message || response.error || "Failed to initiate payment",
          variant: "destructive",
        })
      }

      return response
    } catch (error: any) {
      console.error("[PesaService] Payment initiation error:", error)

      const errorMessage = error.message || "Failed to initiate payment"
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      })

      return {
        status: "error",
        error: errorMessage,
        error_code: "REQUEST_ERROR",
      }
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PesapalTransactionStatus> {
    try {
      console.log("[PesaService] Checking payment status for:", transactionId)

      const response = await this.makeRequest<PesapalTransactionStatus>(
        `/api/pesapal/card/status/${transactionId}`,
        "GET",
      )

      return response
    } catch (error: any) {
      console.error("[PesaService] Payment status check error:", error)

      return {
        status: "error",
        error: error.message || "Failed to check payment status",
      }
    }
  }

  /**
   * Handle Pesapal callback
   */
  async handleCallback(callbackData: any): Promise<any> {
    try {
      console.log("[PesaService] Handling Pesapal callback:", callbackData)

      const response = await this.makeRequest<any>("/api/pesapal/callback", "POST", callbackData)

      return response
    } catch (error: any) {
      console.error("[PesaService] Callback handling error:", error)
      throw error
    }
  }

  /**
   * Validate payment data before sending
   */
  validatePaymentData(paymentData: PesapalPaymentRequest): string[] {
    const errors: string[] = []

    if (!paymentData.order_id || paymentData.order_id.trim().length === 0) {
      errors.push("Order ID is required")
    }

    // Required fields validation
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push("Amount must be greater than 0")
    }

    if (!paymentData.currency || !["KES", "USD", "EUR", "GBP"].includes(paymentData.currency)) {
      errors.push("Invalid currency. Supported: KES, USD, EUR, GBP")
    }

    if (!paymentData.customer_email || !this.validateEmail(paymentData.customer_email)) {
      errors.push("Valid email address is required")
    }

    if (!paymentData.customer_phone || !this.validatePhone(paymentData.customer_phone)) {
      errors.push("Valid phone number is required")
    }

    if (!paymentData.description || paymentData.description.trim().length === 0) {
      errors.push("Payment description is required")
    }

    if (paymentData.billing_address) {
      const billing = paymentData.billing_address
      if (!billing.first_name || billing.first_name.trim().length === 0) {
        errors.push("First name is required")
      }
      if (!billing.last_name || billing.last_name.trim().length === 0) {
        errors.push("Last name is required")
      }
      if (!billing.line_1 || billing.line_1.trim().length === 0) {
        errors.push("Billing address line 1 is required")
      }
      if (!billing.city || billing.city.trim().length === 0) {
        errors.push("Billing city is required")
      }
      if (!billing.country_code || billing.country_code.length !== 2) {
        errors.push("Valid country code is required")
      }
    }

    return errors
  }

  /**
   * Format phone number for Pesapal
   */
  formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, "")

    if (cleanPhone.length === 9 && cleanPhone.startsWith("7")) {
      return `254${cleanPhone}`
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith("07")) {
      return `254${cleanPhone.substring(1)}`
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith("254")) {
      return cleanPhone
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith("254")) {
      return cleanPhone.substring(1)
    }

    return phone
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone number format
   */
  private validatePhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, "")
    return cleanPhone.length >= 9 && cleanPhone.length <= 13
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodName(method: string): string {
    const methodNames: Record<string, string> = {
      mpesa: "M-PESA",
      airtel: "Airtel Money",
      cards: "Credit/Debit Card",
      "visa-ewallet": "Visa e-wallet",
      "cash-on-delivery": "Cash on Delivery",
    }

    return methodNames[method] || method
  }

  /**
   * Get payment status display message
   */
  getStatusMessage(status: string): string {
    const statusMessages: Record<string, string> = {
      PENDING: "Payment is being processed",
      COMPLETED: "Payment completed successfully",
      FAILED: "Payment failed",
      CANCELLED: "Payment was cancelled",
      INVALID: "Invalid payment",
      REVERSED: "Payment was reversed",
    }

    return statusMessages[status] || "Unknown payment status"
  }

  /**
   * Create payment request from cart data
   */
  createPaymentRequest(cartData: any, customerData: any, orderTotal: number, orderId: string): PesapalPaymentRequest {
    const callbackUrl = `${window.location.origin}/payment-success`

    const paymentRequest: PesapalPaymentRequest = {
      order_id: orderId,
      amount: Math.round(orderTotal * 100) / 100, // Ensure 2 decimal places
      currency: "KES",
      customer_email: customerData.email || "customer@example.com",
      customer_phone: this.formatPhoneNumber(customerData.phone || "254700000000"),
      description: `MIZIZZI Order ${orderId} - ${new Date().toISOString().split("T")[0]}`,
      callback_url: callbackUrl,
      billing_address: {
        first_name: customerData.firstName || customerData.first_name || "Customer",
        last_name: customerData.lastName || customerData.last_name || "Name",
        email_address: customerData.email || "customer@example.com",
        phone_number: this.formatPhoneNumber(customerData.phone || "254700000000"),
        line_1: customerData.address || customerData.line_1 || "Nairobi",
        city: customerData.city || "Nairobi",
        country_code: "KE",
        postal_code: customerData.postalCode || customerData.postal_code || "00100",
      },
      cart_items: cartData.items || [],
      subtotal: cartData.subtotal || orderTotal * 0.86, // Approximate subtotal if not provided
      shipping_cost: cartData.shipping || cartData.shipping_cost || 0,
      tax_amount: cartData.tax || cartData.tax_amount || orderTotal * 0.14, // 14% tax if not provided
      payment_method: "pesapal",
      metadata: {
        source: "mizizzi_checkout",
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || window.location.origin,
      },
    }

    console.log("[PesaService] Created payment request:", paymentRequest)
    return paymentRequest
  }

  /**
   * Create Pesapal payment request and get redirect URL (pay first approach)
   */
  async createPesapalPaymentRequest(
    cartData: any,
    customerData: any,
    orderTotal: number,
  ): Promise<PesapalPaymentResponse> {
    try {
      console.log("[PesaService] Creating Pesapal payment request (pay first approach)")

      // Generate a temporary merchant reference for tracking
      const tempMerchantRef = `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const callbackUrl = `${window.location.origin}/payment-success`

      const paymentRequest: PesapalPaymentRequest = {
        order_id: tempMerchantRef, // Use temp reference since no order exists yet
        amount: Math.round(orderTotal * 100) / 100,
        currency: "KES",
        customer_email: customerData.email || "customer@example.com",
        customer_phone: this.formatPhoneNumber(customerData.phone || "254700000000"),
        description: `MIZIZZI Payment - ${new Date().toISOString().split("T")[0]}`,
        callback_url: callbackUrl,
        billing_address: {
          first_name: customerData.firstName || customerData.first_name || "Customer",
          last_name: customerData.lastName || customerData.last_name || "Name",
          email_address: customerData.email || "customer@example.com",
          phone_number: this.formatPhoneNumber(customerData.phone || "254700000000"),
          line_1: customerData.address || customerData.address_line1 || "Nairobi",
          city: customerData.city || "Nairobi",
          country_code: "KE",
          postal_code: customerData.postalCode || customerData.postal_code || "00100",
        },
        cart_items: cartData.items || [],
        subtotal: cartData.subtotal || orderTotal * 0.86,
        shipping_cost: cartData.shipping || cartData.shipping_cost || 0,
        tax_amount: cartData.tax || cartData.tax_amount || orderTotal * 0.14,
        payment_method: "pesapal",
        metadata: {
          source: "mizizzi_checkout",
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer || window.location.origin,
          cart_data: cartData, // Store cart data for order creation after payment
          customer_data: customerData, // Store customer data for order creation after payment
        },
      }

      console.log("[PesaService] Payment request data:", paymentRequest)

      // Validate payment data
      const validationErrors = this.validatePaymentData(paymentRequest)
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.join(", ")
        toast({
          title: "Payment Validation Failed",
          description: errorMessage,
          variant: "destructive",
        })
        return {
          status: "error",
          error: errorMessage,
          error_code: "VALIDATION_ERROR",
        }
      }

      const response = await this.makeRequest<PesapalPaymentResponse>(
        "/api/pesapal/card/pay-first",
        "POST",
        paymentRequest,
      )

      if (response.status === "success" && response.redirect_url) {
        console.log("[PesaService] Pesapal redirect URL received:", response.redirect_url)

        toast({
          title: "Redirecting to Payment",
          description: "Taking you to Pesapal to complete your payment...",
          variant: "default",
        })

        localStorage.setItem(
          "pesapal_payment_tracking",
          JSON.stringify({
            order_tracking_id: response.order_tracking_id,
            merchant_reference: response.merchant_reference,
            transaction_id: response.transaction_id,
            amount: orderTotal,
            cart_data: cartData,
            customer_data: customerData,
            timestamp: new Date().toISOString(),
          }),
        )

        window.location.href = response.redirect_url

        return response
      } else {
        toast({
          title: "Payment Failed",
          description: response.message || response.error || "Failed to create payment request",
          variant: "destructive",
        })
        return response
      }
    } catch (error: any) {
      console.error("[PesaService] Payment request creation error:", error)

      const errorMessage = error.message || "Failed to create payment request"
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      })

      return {
        status: "error",
        error: errorMessage,
        error_code: "REQUEST_ERROR",
      }
    }
  }
}

export const pesaService = new PesaService()
export default pesaService
