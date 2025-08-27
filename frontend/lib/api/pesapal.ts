import { getAuthToken } from "./auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface NetworkError extends Error {
  code: "NETWORK_ERROR" | "SERVER_UNAVAILABLE" | "TIMEOUT" | "API_ERROR"
  originalError?: Error
}

export interface PesapalPaymentRequest {
  order_id: string
  amount: number
  currency: string
  customer_email: string
  customer_phone: string
  description: string
  billing_address: {
    first_name: string
    last_name: string
    line_1: string
    city: string
    country_code: string
    postal_code?: string
  }
  callback_url?: string
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
  discount_amount?: number
}

export interface PesapalPaymentResponse {
  status: "success" | "error"
  message: string
  transaction_id?: string
  order_tracking_id?: string
  redirect_url?: string
  merchant_reference?: string
  expires_at?: string
  payment_method?: string
}

export interface PesapalStatusResponse {
  status: "success" | "error"
  transaction_status: "pending" | "completed" | "failed" | "cancelled" | "expired" | "initiated"
  message: string
  transaction_data?: {
    id: string
    order_id: string
    amount: number
    currency: string
    email: string
    payment_method: string
    card_type?: string
    last_four_digits?: string
    receipt_number?: string
    transaction_date?: string
    created_at: string
    expires_at?: string
    status: string
  }
}

export interface MobileMoneyRequest {
  phone_number: string
  amount: number
  order_id: string
  description: string
  customer_email?: string
}

export interface MobileMoneyResponse {
  status: "success" | "error"
  message: string
  transaction_id?: string
  checkout_request_id?: string
  customer_message?: string
  merchant_reference?: string
}

export interface EWalletRequest {
  email: string
  password: string
  amount: number
  order_id: string
  description: string
}

export interface MVISARequest {
  phone_number: string
  email: string
  amount: number
  order_id: string
  description: string
}

export interface EWalletResponse {
  status: "success" | "error"
  message: string
  transaction_id?: string
  merchant_reference?: string
  redirect_url?: string
}

export interface TransactionListRequest {
  page?: number
  per_page?: number
  status?: string
  from_date?: string
  to_date?: string
  order_id?: string
}

export interface TransactionListResponse {
  status: "success" | "error"
  message: string
  transactions: Array<{
    id: string
    order_id: string
    merchant_reference: string
    amount: number
    currency: string
    email: string
    status: string
    description: string
    payment_method: string
    card_type?: string
    last_four_digits?: string
    receipt_number?: string
    transaction_date?: string
    created_at: string
    expires_at?: string
    status_message: string
  }>
  pagination: {
    page: number
    pages: number
    per_page: number
    total: number
    has_next: boolean
    has_prev: boolean
  }
  summary: {
    total_amount: number
    completed_count: number
    pending_count: number
    failed_count: number
    cancelled_count: number
  }
}

export interface AdminTransactionListResponse extends TransactionListResponse {
  transactions: Array<{
    id: string
    user_id: number
    user_email?: string
    user_name?: string
    order_id: string
    merchant_reference: string
    pesapal_tracking_id?: string
    amount: number
    currency: string
    email: string
    phone_number: string
    status: string
    description: string
    payment_method: string
    card_type?: string
    last_four_digits?: string
    receipt_number?: string
    error_message?: string
    transaction_date?: string
    callback_received_at?: string
    created_at: string
    expires_at?: string
    status_message: string
  }>
}

export interface AdminStatsResponse {
  status: "success" | "error"
  message: string
  stats: {
    total_transactions: number
    total_amount: number
    completed_transactions: number
    completed_amount: number
    pending_transactions: number
    pending_amount: number
    failed_transactions: number
    success_rate: number
    average_transaction_amount: number
    daily_stats: Array<{
      date: string
      transactions: number
      amount: number
      success_rate: number
    }>
    payment_method_breakdown: {
      [key: string]: {
        count: number
        amount: number
        success_rate: number
      }
    }
  }
}

export interface CashOnDeliveryRequest {
  order_id: string
  amount: number
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: {
    first_name: string
    last_name: string
    line_1: string
    city: string
    country_code: string
    postal_code?: string
  }
  delivery_time_preference?: string
  special_instructions?: string
}

export interface CashOnDeliveryResponse {
  status: "success" | "error"
  message: string
  order_id: string
  delivery_reference: string
  estimated_delivery_date: string
  delivery_fee?: number
}

class PesapalAPI {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken()

    console.log(`[v0] Making API request to: ${API_BASE_URL}${endpoint}`)
    if (options.body) {
      const bodyData = JSON.parse(options.body as string)
      if (bodyData.amount) {
        console.log(`[v0] Payment amount being sent: KES ${bodyData.amount}`)
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`[v0] API request failed: ${response.status} - ${errorData.message || response.statusText}`)

        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`) as NetworkError
        if (response.status >= 500) {
          error.code = "SERVER_UNAVAILABLE"
        } else {
          error.code = "API_ERROR"
        }
        throw error
      }

      const data = await response.json()
      console.log(`[v0] API request successful:`, data)
      return data
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error(`[v0] Request timeout for ${endpoint}`)
        const timeoutError = new Error("Request timed out. Please check your connection and try again.") as NetworkError
        timeoutError.code = "TIMEOUT"
        throw timeoutError
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error(`[v0] Network error - Backend server may not be running at ${API_BASE_URL}`)
        const networkError = new Error(
          `❌ Backend server is not available at ${API_BASE_URL}. Please ensure the backend server is running on port 5000.`,
        ) as NetworkError
        networkError.code = "NETWORK_ERROR"
        networkError.originalError = error
        throw networkError
      }

      // Re-throw NetworkError instances
      if ((error as NetworkError).code) {
        throw error
      }

      console.error(`[v0] Unexpected error during API request:`, error)
      const genericError = new Error(`Unexpected error: ${error.message}`) as NetworkError
      genericError.code = "API_ERROR"
      genericError.originalError = error
      throw genericError
    }
  }

  async initiateCardPayment(data: PesapalPaymentRequest): Promise<PesapalPaymentResponse> {
    try {
      console.log(`[v0] Initiating Pesapal card payment for order: ${data.order_id}`)
      console.log(
        `[v0] Real cart total: KES ${data.amount} (Subtotal: ${data.subtotal}, Shipping: ${data.shipping_cost}, Tax: ${data.tax_amount})`,
      )

      const healthCheck = await this.checkServerHealth()
      console.log(`[v0] Health check result: ${healthCheck.message}`)

      // Only block if we're certain the server is not available
      if (!healthCheck.available && healthCheck.message.includes("not running")) {
        throw new Error(healthCheck.message)
      }

      return await this.makeRequest<PesapalPaymentResponse>("/api/pesapal/card/initiate", {
        method: "POST",
        body: JSON.stringify(data),
      })
    } catch (error: any) {
      console.error(`[v0] Pesapal card payment initiation failed:`, error)

      if (error.message && error.message.includes("CORS")) {
        throw new Error(
          "❌ Payment service has a configuration issue (CORS). Please contact support or try again later.",
        )
      }

      const networkError = error as NetworkError
      if (networkError.code === "NETWORK_ERROR") {
        throw new Error(
          "❌ Payment service is currently unavailable. Please ensure the backend server is running and try again.",
        )
      } else if (networkError.code === "SERVER_UNAVAILABLE") {
        throw new Error("❌ Payment server is experiencing issues. Please try again in a few moments.")
      } else if (networkError.code === "TIMEOUT") {
        throw new Error("❌ Payment request timed out. Please check your connection and try again.")
      }

      throw error
    }
  }

  async checkCardPaymentStatus(transactionId: string): Promise<PesapalStatusResponse> {
    try {
      console.log(`[v0] Checking Pesapal card payment status for transaction: ${transactionId}`)
      return await this.makeRequest<PesapalStatusResponse>(`/api/pesapal/card/status/${transactionId}`)
    } catch (error) {
      console.error(`[v0] Pesapal card payment status check failed:`, error)
      throw error
    }
  }

  async initiateMpesaPayment(
    data: MobileMoneyRequest & {
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
      discount_amount?: number
    },
  ): Promise<MobileMoneyResponse> {
    try {
      console.log(`[v0] Initiating Pesapal M-PESA payment for order: ${data.order_id}`)
      console.log(`[v0] M-PESA payment amount: KES ${data.amount} (Real cart total, not fallback)`)
      if (data.cart_items) {
        console.log(
          `[v0] Cart items:`,
          data.cart_items.map((item) => `${item.name} x${item.quantity} = KES ${item.total}`),
        )
      }

      const healthCheck = await this.checkServerHealth()
      console.log(`[v0] Health check result: ${healthCheck.message}`)

      // Only block if we're certain the server is not available
      if (!healthCheck.available && healthCheck.message.includes("not running")) {
        throw new Error(healthCheck.message)
      }

      const pesapalData: PesapalPaymentRequest = {
        order_id: data.order_id,
        amount: data.amount,
        currency: "KES",
        customer_email: data.customer_email || "customer@mizizzi.com",
        customer_phone: data.phone_number,
        description: data.description,
        billing_address: {
          first_name: "Customer",
          last_name: "User",
          line_1: "Nairobi",
          city: "Nairobi",
          country_code: "KE",
          postal_code: "00100",
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mizizzi.com"}/api/pesapal/callback`,
        cart_items: data.cart_items,
        subtotal: data.subtotal,
        shipping_cost: data.shipping_cost,
        tax_amount: data.tax_amount,
        discount_amount: data.discount_amount,
      }

      const response = await this.makeRequest<PesapalPaymentResponse>("/api/pesapal/card/initiate", {
        method: "POST",
        body: JSON.stringify(pesapalData),
      })

      return {
        status: response.status,
        message: response.message,
        transaction_id: response.transaction_id,
        checkout_request_id: response.order_tracking_id,
        customer_message: response.message,
        merchant_reference: response.merchant_reference,
      }
    } catch (error: any) {
      console.error(`[v0] Pesapal M-PESA payment initiation failed:`, error)

      if (error.message && error.message.includes("CORS")) {
        throw new Error(
          "❌ Payment service has a configuration issue (CORS). Please contact support or try again later.",
        )
      }

      const networkError = error as NetworkError
      if (networkError.code === "NETWORK_ERROR") {
        throw new Error(
          "❌ M-PESA payment service is currently unavailable. Please ensure the backend server is running and try again.",
        )
      } else if (networkError.code === "SERVER_UNAVAILABLE") {
        throw new Error("❌ M-PESA payment server is experiencing issues. Please try again in a few moments.")
      } else if (networkError.code === "TIMEOUT") {
        throw new Error("❌ M-PESA payment request timed out. Please check your connection and try again.")
      }

      throw error
    }
  }

  async checkMpesaPaymentStatus(transactionId: string): Promise<PesapalStatusResponse> {
    try {
      console.log(`[v0] Checking Pesapal M-PESA payment status for transaction: ${transactionId}`)
      return await this.makeRequest<PesapalStatusResponse>(`/api/pesapal/card/status/${transactionId}`)
    } catch (error) {
      console.error(`[v0] Pesapal M-PESA payment status check failed:`, error)
      throw error
    }
  }

  async getUserTransactions(params: TransactionListRequest = {}): Promise<TransactionListResponse> {
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append("page", params.page.toString())
      if (params.per_page) queryParams.append("per_page", params.per_page.toString())
      if (params.status) queryParams.append("status", params.status)
      if (params.from_date) queryParams.append("from_date", params.from_date)
      if (params.to_date) queryParams.append("to_date", params.to_date)
      if (params.order_id) queryParams.append("order_id", params.order_id)

      const endpoint = `/api/pesapal/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      console.log(`[v0] Fetching user transactions from Pesapal`)
      return await this.makeRequest<TransactionListResponse>(endpoint)
    } catch (error) {
      console.error(`[v0] Failed to fetch user transactions from Pesapal:`, error)
      throw error
    }
  }

  async getAdminTransactions(
    params: TransactionListRequest & { user_id?: number; search?: string } = {},
  ): Promise<AdminTransactionListResponse> {
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append("page", params.page.toString())
      if (params.per_page) queryParams.append("per_page", params.per_page.toString())
      if (params.status) queryParams.append("status", params.status)
      if (params.user_id) queryParams.append("user_id", params.user_id.toString())
      if (params.from_date) queryParams.append("from_date", params.from_date)
      if (params.to_date) queryParams.append("to_date", params.to_date)
      if (params.search) queryParams.append("search", params.search)

      const endpoint = `/api/pesapal/admin/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      console.log(`[v0] Fetching admin transactions from Pesapal`)
      return await this.makeRequest<AdminTransactionListResponse>(endpoint)
    } catch (error) {
      console.error(`[v0] Failed to fetch admin transactions from Pesapal:`, error)
      throw error
    }
  }

  async getAdminStats(from_date?: string, to_date?: string): Promise<AdminStatsResponse> {
    try {
      const queryParams = new URLSearchParams()
      if (from_date) queryParams.append("from_date", from_date)
      if (to_date) queryParams.append("to_date", to_date)

      const endpoint = `/api/pesapal/admin/stats${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
      console.log(`[v0] Fetching admin stats from Pesapal`)
      return await this.makeRequest<AdminStatsResponse>(endpoint)
    } catch (error) {
      console.error(`[v0] Failed to fetch admin stats from Pesapal:`, error)
      throw error
    }
  }

  async getPaymentConfig() {
    try {
      console.log(`[v0] Fetching Pesapal payment configuration`)
      return await this.makeRequest("/api/pesapal/config")
    } catch (error) {
      console.error(`[v0] Failed to fetch Pesapal payment config:`, error)
      throw error
    }
  }

  async healthCheck() {
    try {
      console.log(`[v0] Performing Pesapal health check`)
      return await this.makeRequest("/api/pesapal/health")
    } catch (error: any) {
      console.error(`[v0] Pesapal health check failed:`, error)

      const networkError = error as NetworkError
      if (networkError.code === "NETWORK_ERROR") {
        throw new Error("❌ Backend server is not running. Please start the server and try again.")
      }

      throw error
    }
  }

  async checkServerHealth(): Promise<{ available: boolean; message: string }> {
    try {
      console.log(`[v0] Checking backend server health at ${API_BASE_URL}`)
      await this.makeRequest("/api/profile")
      return { available: true, message: "Backend server is running" }
    } catch (error: any) {
      console.error(`[v0] Health check error:`, error)

      if (error.message && error.message.includes("CORS")) {
        console.log(`[v0] CORS error detected, but server appears to be running`)
        return {
          available: true,
          message: "Backend server is running (CORS configuration detected)",
        }
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        // Check if this might be a CORS issue rather than server being down
        console.log(`[v0] Network error - could be CORS or server unavailable`)
        return {
          available: true, // Assume server is running, just CORS issue
          message: "Backend server detected (network/CORS configuration issue)",
        }
      }

      const networkError = error as NetworkError
      if (networkError.code === "NETWORK_ERROR") {
        return {
          available: false,
          message: `Backend server is not running at ${API_BASE_URL}. Please start the backend server on port 5000.`,
        }
      }
      return {
        available: true, // Default to available to allow payment attempts
        message: `Backend server health check inconclusive: ${error.message}`,
      }
    }
  }

  validatePaymentAmount(amount: number, currency = "KES"): { valid: boolean; error?: string } {
    if (!amount || amount <= 0) {
      return { valid: false, error: "Amount must be greater than 0" }
    }
    if (amount > 2000000) {
      return { valid: false, error: "Amount exceeds maximum limit of 2,000,000" }
    }
    if (amount < 10) {
      return { valid: false, error: "Amount must be at least KES 10 for real transactions" }
    }
    return { valid: true }
  }

  validatePhoneNumber(phone: string): { valid: boolean; formatted?: string; error?: string } {
    if (!phone) {
      return { valid: false, error: "Phone number is required" }
    }

    const cleaned = phone.replace(/\D/g, "")

    if (cleaned.startsWith("254") && cleaned.length === 12) {
      return { valid: true, formatted: cleaned }
    }
    if (cleaned.startsWith("0") && cleaned.length === 10) {
      return { valid: true, formatted: `254${cleaned.substring(1)}` }
    }
    if (cleaned.length === 9) {
      return { valid: true, formatted: `254${cleaned}` }
    }

    return { valid: false, error: "Invalid phone number format" }
  }

  validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) {
      return { valid: false, error: "Email is required" }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { valid: false, error: "Invalid email format" }
    }
    return { valid: true }
  }

  async pollPaymentStatus(transactionId: string, maxAttempts = 30, intervalMs = 2000): Promise<PesapalStatusResponse> {
    console.log(`[v0] Starting Pesapal payment status polling for transaction: ${transactionId}`)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.checkCardPaymentStatus(transactionId)

        if (
          status.transaction_status === "completed" ||
          status.transaction_status === "failed" ||
          status.transaction_status === "cancelled"
        ) {
          console.log(`[v0] Payment status polling completed after ${attempt} attempts: ${status.transaction_status}`)
          return status
        }

        if (attempt < maxAttempts) {
          console.log(`[v0] Payment still pending, attempt ${attempt}/${maxAttempts}, waiting ${intervalMs}ms...`)
          await new Promise((resolve) => setTimeout(resolve, intervalMs))
        }
      } catch (error) {
        console.error(`[v0] Error during payment status polling attempt ${attempt}:`, error)
        if (attempt === maxAttempts) {
          throw error
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
      }
    }

    throw new Error(`Pesapal payment status polling timed out after ${maxAttempts} attempts`)
  }
}

export const pesapalAPI = new PesapalAPI()
