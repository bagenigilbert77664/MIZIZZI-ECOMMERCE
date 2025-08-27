import  API_URL  from "@/config"
import api from "@/lib/api"

/**
 * Interface for M-PESA payment request
 */
interface MpesaPaymentRequest {
  phone: string
  amount: number
  order_id?: string | number
  account_reference?: string
  transaction_desc?: string
}

/**
 * Interface for M-PESA cart payment request
 */
interface MpesaCartPaymentRequest {
  phone: string
  account_reference?: string
  transaction_desc?: string
}

/**
 * Interface for M-PESA payment response
 */
interface MpesaPaymentResponse {
  success: boolean
  message?: string
  error?: string
  checkout_request_id?: string
  merchant_request_id?: string
  response_code?: string
  response_description?: string
  customer_message?: string
  transaction_id?: string
  response?: any
}

/**
 * Interface for M-PESA status query request
 */
interface MpesaStatusQueryRequest {
  checkout_request_id: string
}

/**
 * Interface for M-PESA status query response
 */
interface MpesaStatusQueryResponse {
  success: boolean
  error?: string
  response?: {
    ResultCode: number
    ResultDesc: string
    TransactionId?: string
    MpesaReceiptNumber?: string
    TransactionDate?: string
    PhoneNumber?: string
    [key: string]: any
  }
}

/**
 * Interface for transaction history
 */
interface MpesaTransaction {
  id: number
  transaction_id: string
  checkout_request_id: string
  merchant_request_id: string
  phone_number: string
  amount: number
  account_reference: string
  transaction_desc: string
  status: "pending" | "completed" | "failed" | "cancelled"
  result_code?: number
  result_desc?: string
  mpesa_receipt_number?: string
  transaction_date?: string
  created_at: string
  updated_at: string
  order_id?: number
}

/**
 * Service for handling M-PESA payment operations
 */
export class MpesaService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = API_URL || "http://localhost:5000"
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

    if (!this.token) {
      throw new Error("Authentication token not found. Please log in to continue.")
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    }
  }

  /**
   * Initiate M-PESA STK Push payment
   */
  async initiateDirectPayment(params: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    try {
      console.log("Initiating M-PESA STK Push payment:", params)

      // Validate inputs
      if (!params.phone || !params.amount) {
        throw new Error("Phone number and amount are required")
      }

      if (params.amount <= 0) {
        throw new Error("Amount must be greater than 0")
      }

      // Ensure minimum amount is 1 KES for M-PESA
      const validatedAmount = Math.max(Math.round(params.amount), 1)

      // Format the phone number
      const formattedPhone = this.formatPhoneNumber(params.phone)
      console.log("Formatted phone number:", formattedPhone)

      // Validate phone number format
      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error("Invalid phone number format. Please use a valid Kenyan phone number.")
      }

      // Create payload with proper validation
      const payload = {
        phone_number: formattedPhone,
        amount: validatedAmount,
        account_reference: params.account_reference || `MIZIZZI-${Date.now()}`,
        transaction_desc: params.transaction_desc || "Payment for order",
        ...(params.order_id && { order_id: params.order_id }),
      }

      console.log("Sending STK Push payload:", payload)

      // Make API request to initiate STK Push
      const response = await api.post("/api/mpesa/initiate", payload)

      console.log("STK Push API response:", response.data)

      if (response.data.success) {
        const data = response.data

        // Store pending payment in localStorage for recovery
        this.storePendingPayment({
          checkout_request_id: data.checkout_request_id,
          merchant_request_id: data.merchant_request_id,
          phone: formattedPhone,
          amount: validatedAmount,
          account_reference: payload.account_reference,
          order_id: params.order_id,
          timestamp: new Date().toISOString(),
        })

        return {
          success: true,
          message: data.message || "STK Push sent successfully",
          checkout_request_id: data.checkout_request_id,
          merchant_request_id: data.merchant_request_id,
          response_code: data.response_code,
          response_description: data.response_description,
          customer_message: data.customer_message,
          transaction_id: data.transaction_id,
          response: data,
        }
      } else {
        throw new Error(response.data.error || "Failed to initiate STK Push")
      }
    } catch (error: any) {
      console.error("Error initiating STK Push:", error)

      // Enhanced error logging
      if (error.response) {
        console.error("Response status:", error.response.status)
        console.error("Response data:", error.response.data)
        console.error("Response headers:", error.response.headers)
      }

      let errorMessage = "Failed to initiate payment"

      // Handle specific error cases
      if (error.response?.status === 400) {
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else {
          errorMessage = "Bad request - please check your payment details"
        }
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed - please log in again"
      } else if (error.response?.status === 500) {
        errorMessage = "Server error - please try again later"
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
        response: error.response?.data,
      }
    }
  }

  /**
   * Initiate M-PESA payment for cart items
   */
  async initiateCartPayment(params: MpesaCartPaymentRequest): Promise<MpesaPaymentResponse> {
    try {
      console.log("Initiating M-PESA cart payment:", params)

      const formattedPhone = this.formatPhoneNumber(params.phone)

      const payload = {
        phone_number: formattedPhone,
        account_reference: params.account_reference || `CART-${Date.now()}`,
        transaction_desc: params.transaction_desc || "Payment for cart items",
      }

      console.log("Sending cart payment payload:", payload)

      const response = await api.post("/api/mpesa/cart-payment", payload)

      console.log("Cart payment API response:", response.data)

      if (response.data.success) {
        const data = response.data

        // Store pending payment
        this.storePendingPayment({
          checkout_request_id: data.checkout_request_id,
          merchant_request_id: data.merchant_request_id,
          phone: formattedPhone,
          amount: data.amount,
          account_reference: payload.account_reference,
          timestamp: new Date().toISOString(),
          is_cart_payment: true,
        })

        return {
          success: true,
          message: data.message || "Cart payment initiated successfully",
          checkout_request_id: data.checkout_request_id,
          merchant_request_id: data.merchant_request_id,
          response_code: data.response_code,
          response_description: data.response_description,
          customer_message: data.customer_message,
          transaction_id: data.transaction_id,
          response: data,
        }
      } else {
        throw new Error(response.data.error || "Failed to initiate cart payment")
      }
    } catch (error: any) {
      console.error("Error initiating cart payment:", error)

      let errorMessage = "Failed to initiate cart payment"
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
        response: error.response?.data,
      }
    }
  }

  /**
   * Check M-PESA payment status
   */
  async checkPaymentStatus(params: MpesaStatusQueryRequest): Promise<MpesaStatusQueryResponse> {
    try {
      console.log("Checking M-PESA payment status:", params)

      const response = await api.post("/api/mpesa/query", {
        checkout_request_id: params.checkout_request_id,
      })

      console.log("Payment status API response:", response.data)

      if (response.data.success) {
        const data = response.data

        // If payment is successful, clear pending payment
        if (data.result_code === 0) {
          this.clearPendingPayment()

          // Record successful transaction
          this.recordSuccessfulTransaction({
            checkout_request_id: params.checkout_request_id,
            transaction_id: data.response?.TransactionId,
            mpesa_receipt_number: data.response?.MpesaReceiptNumber,
            result_code: data.result_code,
            result_desc: data.result_desc,
            status: "completed",
          })
        }

        return {
          success: true,
          response: {
            ResultCode: data.result_code,
            ResultDesc: data.result_desc,
            TransactionId: data.response?.TransactionId,
            MpesaReceiptNumber: data.response?.MpesaReceiptNumber,
            TransactionDate: data.response?.TransactionDate,
            PhoneNumber: data.response?.PhoneNumber,
            ...data.response,
          },
        }
      } else {
        throw new Error(response.data.error || "Failed to check payment status")
      }
    } catch (error: any) {
      console.error("Error checking payment status:", error)

      return {
        success: false,
        error: error.response?.data?.error || error.message || "Failed to check payment status",
        response: {
          ResultCode: -1,
          ResultDesc: "Network error or service unavailable",
        },
      }
    }
  }

  /**
   * Get user's M-PESA transaction history
   */
  async getTransactionHistory(
    page = 1,
    limit = 10,
  ): Promise<{
    success: boolean
    transactions: MpesaTransaction[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
    error?: string
  }> {
    try {
      console.log("Fetching M-PESA transaction history")

      const response = await api.get(`/api/mpesa/transactions?page=${page}&limit=${limit}`)

      console.log("Transaction history API response:", response.data)

      if (response.data.success) {
        return {
          success: true,
          transactions: response.data.transactions || [],
          pagination: response.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
          },
        }
      } else {
        throw new Error(response.data.error || "Failed to fetch transaction history")
      }
    } catch (error: any) {
      console.error("Error fetching transaction history:", error)

      return {
        success: false,
        transactions: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        error: error.response?.data?.error || error.message || "Failed to fetch transaction history",
      }
    }
  }

  /**
   * Verify payment by transaction ID
   */
  async verifyPayment(transactionId: string): Promise<{
    success: boolean
    transaction?: MpesaTransaction
    error?: string
  }> {
    try {
      console.log("Verifying M-PESA payment:", transactionId)

      const response = await api.get(`/api/mpesa/verify/${transactionId}`)

      console.log("Payment verification API response:", response.data)

      if (response.data.success) {
        return {
          success: true,
          transaction: response.data.transaction,
        }
      } else {
        throw new Error(response.data.error || "Failed to verify payment")
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error)

      return {
        success: false,
        error: error.response?.data?.error || error.message || "Failed to verify payment",
      }
    }
  }

  /**
   * Get M-PESA service health status
   */
  async getServiceHealth(): Promise<{
    success: boolean
    status: string
    timestamp: string
    error?: string
  }> {
    try {
      const response = await api.get("/api/mpesa/health")

      return {
        success: true,
        status: response.data.status || "unknown",
        timestamp: response.data.timestamp || new Date().toISOString(),
      }
    } catch (error: any) {
      console.error("Error getting service health:", error)

      return {
        success: false,
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message || "Failed to get service health",
      }
    }
  }

  /**
   * Simulate M-PESA payment (development only)
   */
  async simulatePayment(params: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    try {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Payment simulation is not available in production")
      }

      console.log("Simulating M-PESA payment:", params)

      const payload = {
        phone_number: this.formatPhoneNumber(params.phone),
        amount: Math.round(params.amount),
        reference: params.account_reference || "TEST",
      }

      const response = await api.post("/api/mpesa/simulate", payload)

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message || "Payment simulation successful",
          response: response.data.response,
        }
      } else {
        throw new Error(response.data.error || "Failed to simulate payment")
      }
    } catch (error: any) {
      console.error("Error simulating payment:", error)
      return {
        success: false,
        error: error.message || "Failed to simulate payment",
      }
    }
  }

  /**
   * Format phone number to international format (254XXXXXXXXX)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or non-numeric characters except +
    phone = phone.replace(/[\s\-$$$$]/g, "").replace(/[^\d+]/g, "")

    // Remove + if present
    if (phone.startsWith("+")) {
      phone = phone.substring(1)
    }

    // Check if it's already in the correct format (254XXXXXXXXX)
    if (/^254[17]\d{8}$/.test(phone)) {
      return phone
    }

    // Check if it starts with 0 (local format: 07XXXXXXXX or 01XXXXXXXX)
    if (/^0[17]\d{8}$/.test(phone)) {
      return "254" + phone.substring(1)
    }

    // Check if it's a 9-digit number starting with 7 or 1
    if (/^[17]\d{8}$/.test(phone)) {
      return "254" + phone
    }

    // If none of the above, return as is (might be invalid)
    return phone
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone)
    return /^254[17]\d{8}$/.test(formatted)
  }

  /**
   * Store pending payment in localStorage
   */
  private storePendingPayment(paymentData: any): void {
    try {
      localStorage.setItem("pendingMpesaPayment", JSON.stringify(paymentData))
      console.log("Pending payment stored:", paymentData)
    } catch (error) {
      console.error("Error storing pending payment:", error)
    }
  }

  /**
   * Get pending payment from localStorage
   */
  getPendingPayment(): any | null {
    try {
      const pendingPayment = localStorage.getItem("pendingMpesaPayment")
      if (!pendingPayment) return null

      const paymentData = JSON.parse(pendingPayment)

      // Check if the payment is still valid (less than 10 minutes old)
      const paymentTime = new Date(paymentData.timestamp).getTime()
      const currentTime = new Date().getTime()
      const timeDiff = (currentTime - paymentTime) / (1000 * 60) // in minutes

      if (timeDiff > 10) {
        // Payment is too old, remove it
        this.clearPendingPayment()
        return null
      }

      return paymentData
    } catch (error) {
      console.error("Error getting pending payment:", error)
      return null
    }
  }

  /**
   * Clear pending payment from localStorage
   */
  clearPendingPayment(): void {
    try {
      localStorage.removeItem("pendingMpesaPayment")
      console.log("Pending payment cleared")
    } catch (error) {
      console.error("Error clearing pending payment:", error)
    }
  }

  /**
   * Record successful transaction in localStorage
   */
  recordSuccessfulTransaction(transactionData: any): void {
    try {
      const existingTransactions = localStorage.getItem("mpesaTransactions")
      const transactions = existingTransactions ? JSON.parse(existingTransactions) : []

      transactions.unshift({
        ...transactionData,
        timestamp: new Date().toISOString(),
        status: "completed",
      })

      // Keep only the last 50 transactions
      if (transactions.length > 50) {
        transactions.splice(50)
      }

      localStorage.setItem("mpesaTransactions", JSON.stringify(transactions))
      console.log("Transaction recorded successfully:", transactionData)
    } catch (error) {
      console.error("Error recording transaction:", error)
    }
  }

  /**
   * Get local transaction history from localStorage
   */
  getLocalTransactionHistory(): any[] {
    try {
      const existingTransactions = localStorage.getItem("mpesaTransactions")
      return existingTransactions ? JSON.parse(existingTransactions) : []
    } catch (error) {
      console.error("Error getting local transaction history:", error)
      return []
    }
  }

  /**
   * Check for pending payment on app startup
   */
  async checkPendingPaymentOnStartup(): Promise<MpesaPaymentResponse | null> {
    try {
      const pendingPayment = this.getPendingPayment()
      if (!pendingPayment || !pendingPayment.checkout_request_id) {
        return null
      }

      console.log("Found pending payment, checking status:", pendingPayment)

      // Check the status of the pending payment
      const statusResponse = await this.checkPaymentStatus({
        checkout_request_id: pendingPayment.checkout_request_id,
      })

      if (statusResponse.success) {
        if (statusResponse.response?.ResultCode === 0) {
          // Payment was successful
          this.clearPendingPayment()
          return {
            success: true,
            message: "Previous payment was successful",
            checkout_request_id: pendingPayment.checkout_request_id,
            response: statusResponse.response,
          }
        } else if (statusResponse.response?.ResultCode === 1032) {
          // Payment was cancelled
          this.clearPendingPayment()
          return {
            success: false,
            error: "Previous payment was cancelled",
            response: statusResponse.response,
          }
        }
        // Payment is still pending, keep it
      }

      return null
    } catch (error) {
      console.error("Error checking pending payment on startup:", error)
      return null
    }
  }
}

// Create a singleton instance
const mpesaService = new MpesaService()

export default mpesaService
