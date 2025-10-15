import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export interface PaymentMethod {
  id: number
  name: string
  code: string
  description: string
  instructions?: string
  min_amount?: number
  max_amount?: number
  countries?: string[]
  icon?: string
}

export interface Transaction {
  id: string
  user_id: number
  order_id: string
  merchant_reference: string
  amount: number
  currency: string
  email: string
  phone_number?: string
  status: "pending" | "completed" | "failed" | "cancelled" | "expired"
  description: string
  payment_method?: string
  card_type?: string
  last_four_digits?: string
  receipt_number?: string
  transaction_date?: string
  created_at: string
  expires_at?: string
  status_message?: string
}

export interface TransactionResponse {
  status: string
  transactions: Transaction[]
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

export interface PaymentMethodsResponse {
  success: boolean
  payment_methods: PaymentMethod[]
}

export interface CreateTransactionRequest {
  order_id: string
  amount: number
  currency: string
  customer_email: string
  customer_phone: string
  description: string
  billing_address?: {
    first_name?: string
    last_name?: string
    country_code?: string
  }
  callback_url?: string
}

export interface CreateTransactionResponse {
  status: string
  transaction_id: string
  order_tracking_id: string
  redirect_url: string
  merchant_reference: string
  expires_at: string
  payment_method: string
}

// Mock data for development and fallback
const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 1,
    name: "Credit Card",
    code: "credit_card",
    description: "Pay with Visa, Mastercard, or American Express",
    instructions: "Enter your card details to complete the payment",
    min_amount: 1.0,
    max_amount: 10000.0,
    countries: ["US", "CA", "GB", "EU", "KE"],
    icon: "credit-card",
  },
  {
    id: 2,
    name: "PesaPal",
    code: "pesapal",
    description: "Pay with PesaPal card payment",
    instructions: "You will be redirected to PesaPal to complete your payment",
    min_amount: 1.0,
    max_amount: 1000000.0,
    countries: ["KE", "TZ", "UG"],
    icon: "credit-card",
  },
]

/**
 * Get user's transaction history from PesaPal
 */
export const getTransactions = async (
  page = 1,
  perPage = 10,
  filters: { status?: string; from_date?: string; to_date?: string; order_id?: string } = {},
): Promise<TransactionResponse> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    })

    if (filters.status) {
      queryParams.append("status", filters.status)
    }

    if (filters.from_date) {
      queryParams.append("from_date", filters.from_date)
    }

    if (filters.to_date) {
      queryParams.append("to_date", filters.to_date)
    }

    if (filters.order_id) {
      queryParams.append("order_id", filters.order_id)
    }

    const response = await api.get(`/api/pesapal/transactions?${queryParams.toString()}`)

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error fetching transactions: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch transactions: ${response.statusText}`)
    }

    // Parse response
    const data = response.data

    // Return data
    return {
      status: data.status || "success",
      transactions: data.transactions || [],
      pagination: data.pagination || {
        page,
        per_page: perPage,
        pages: 1,
        total: (data.transactions || []).length,
        has_next: false,
        has_prev: false,
      },
      summary: data.summary || {
        total_amount: 0,
        completed_count: 0,
        pending_count: 0,
        failed_count: 0,
        cancelled_count: 0,
      },
    }
  } catch (error) {
    console.error("Error fetching transactions:", error)
    throw error
  }
}

/**
 * Get available payment methods
 */
export const getPaymentMethods = async (): Promise<PaymentMethodsResponse> => {
  try {
    const response = await api.get("/api/pesapal/config")

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error fetching payment methods: ${response.status} ${response.statusText}`)

      // Return mock data as fallback
      return {
        success: true,
        payment_methods: MOCK_PAYMENT_METHODS,
      }
    }

    // Parse response
    const data = response.data

    // Return data
    return {
      success: true,
      payment_methods: MOCK_PAYMENT_METHODS, // Use mock for now since config doesn't return payment methods
    }
  } catch (error) {
    console.error("Error fetching payment methods:", error)

    // Return mock data as fallback
    return {
      success: true,
      payment_methods: MOCK_PAYMENT_METHODS,
    }
  }
}

/**
 * Get details of a specific transaction
 */
export const getTransaction = async (transactionId: string): Promise<Transaction | null> => {
  try {
    const response = await api.get(`/api/pesapal/card/status/${transactionId}`)

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error fetching transaction: ${response.status} ${response.statusText}`)
      return null
    }

    // Parse response
    const data = response.data

    // Return data
    return data.transaction_data || null
  } catch (error) {
    console.error(`Error fetching transaction ${transactionId}:`, error)
    return null
  }
}

/**
 * Create a new payment transaction with PesaPal
 */
export const createTransaction = async (
  transactionData: CreateTransactionRequest,
): Promise<CreateTransactionResponse> => {
  try {
    const response = await api.post("/api/pesapal/card/initiate", transactionData)

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error creating transaction: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to create transaction: ${response.statusText}`)
    }

    // Parse response
    const data = response.data

    // Show success toast
    toast({
      title: "Payment Initiated",
      description: "Redirecting to payment page...",
      variant: "default",
    })

    // Return data
    return {
      status: data.status,
      transaction_id: data.transaction_id,
      order_tracking_id: data.order_tracking_id,
      redirect_url: data.redirect_url,
      merchant_reference: data.merchant_reference,
      expires_at: data.expires_at,
      payment_method: data.payment_method || "card",
    }
  } catch (error) {
    console.error("Error creating transaction:", error)

    // Show error toast
    toast({
      title: "Payment Failed",
      description: error instanceof Error ? error.message : "Failed to initiate payment",
      variant: "destructive",
    })

    throw error
  }
}

/**
 * Update transaction status (not supported by PesaPal - status is updated via callbacks)
 */
export const updateTransactionStatus = async (
  transactionId: string,
  status: "pending" | "completed" | "failed" | "cancelled",
): Promise<Transaction | null> => {
  console.warn("updateTransactionStatus is not supported for PesaPal transactions")
  throw new Error("Transaction status is automatically updated by PesaPal")
}

/**
 * Verify a payment (check status)
 */
export const verifyPayment = async (transactionId: string): Promise<Transaction | null> => {
  try {
    return await getTransaction(transactionId)
  } catch (error) {
    console.error(`Error verifying payment ${transactionId}:`, error)

    // Show error toast
    toast({
      title: "Verification Failed",
      description: error instanceof Error ? error.message : "Failed to verify payment",
      variant: "destructive",
    })

    throw error
  }
}

/**
 * Retry a failed payment (create new transaction)
 */
export const retryFailedPayment = async (
  transactionId: string,
  paymentData: CreateTransactionRequest,
): Promise<CreateTransactionResponse> => {
  try {
    return await createTransaction(paymentData)
  } catch (error: any) {
    console.error("Error retrying payment:", error)

    // Show error toast
    toast({
      title: "Retry Failed",
      description: error instanceof Error ? error.message : "Failed to retry payment",
      variant: "destructive",
    })

    throw error
  }
}

// Create a default export for the payment service
const paymentService = {
  getTransactions,
  getPaymentMethods,
  getTransaction,
  createTransaction,
  updateTransactionStatus,
  verifyPayment,
  retryFailedPayment,
}

export { paymentService }
export default paymentService
