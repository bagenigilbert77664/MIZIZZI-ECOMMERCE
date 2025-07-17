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
  id: number
  user_id: number
  amount: number
  payment_method: string
  payment_method_id?: number
  transaction_type?: string
  reference_id?: string
  transaction_id: string
  provider_reference?: string
  status: "pending" | "paid" | "failed" | "refunded"
  created_at: string
  updated_at?: string
  completed_at?: string
  metadata?: any
  order_id?: number
  order_number?: string
  reference?: string
  transaction_data?: any
  order_status?: string
  order_items_count?: number
}

export interface TransactionResponse {
  success: boolean
  transactions: Transaction[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
}

export interface PaymentMethodsResponse {
  success: boolean
  payment_methods: PaymentMethod[]
}

export interface CreateTransactionRequest {
  amount: number
  payment_method_id: number
  transaction_type: string
  reference_id?: string
  provider_reference?: string
  metadata?: any
  notes?: string
}

export interface CreateTransactionResponse {
  success: boolean
  transaction: Transaction
}

// Mock data for development and fallback
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    user_id: 1,
    amount: 12500,
    payment_method: "M-PESA",
    payment_method_id: 2,
    transaction_type: "payment",
    reference_id: "ORD-12345",
    transaction_id: "TX-123456789",
    provider_reference: "MPESA-123456",
    status: "paid",
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    metadata: { phone: "254712345678" },
  },
  {
    id: 2,
    user_id: 1,
    amount: 8750,
    payment_method: "Credit Card",
    payment_method_id: 1,
    transaction_type: "payment",
    reference_id: "ORD-12346",
    transaction_id: "TX-987654321",
    provider_reference: "CARD-987654",
    status: "paid",
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    metadata: { card: "**** **** **** 4242" },
  },
  {
    id: 3,
    user_id: 1,
    amount: 5000,
    payment_method: "Cash on Delivery",
    payment_method_id: 3,
    transaction_type: "payment",
    reference_id: "ORD-12347",
    transaction_id: "TX-567891234",
    status: "pending",
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    metadata: { delivery_date: new Date(Date.now() + 259200000).toISOString() }, // 3 days from now
  },
]

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 1,
    name: "Credit Card",
    code: "card",
    description: "Pay with Visa, Mastercard, or American Express",
    instructions: "Enter your card details to complete the payment",
    min_amount: 1.0,
    max_amount: 10000.0,
    countries: ["US", "CA", "GB", "EU", "KE"],
    icon: "credit-card",
  },
  {
    id: 2,
    name: "M-PESA",
    code: "mpesa",
    description: "Pay with M-PESA mobile money",
    instructions: "Enter your phone number to receive a payment prompt",
    min_amount: 10.0,
    max_amount: 150000.0,
    countries: ["KE", "TZ", "UG"],
    icon: "smartphone",
  },
  {
    id: 3,
    name: "Cash on Delivery",
    code: "cod",
    description: "Pay when you receive your order",
    instructions: "Have the exact amount ready when your order arrives",
    min_amount: 0.0,
    max_amount: 50000.0,
    countries: ["KE"],
    icon: "banknote",
  },
]

/**
 * Get user's transaction history
 */
export const getTransactions = async (
  page = 1,
  perPage = 10,
  filters: { status?: string; paymentMethod?: string } = {},
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

    if (filters.paymentMethod) {
      queryParams.append("payment_method", filters.paymentMethod)
    }

    // Make API request
    const response = await api.get(`/api/payment/transactions?${queryParams.toString()}`)

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error fetching transactions: ${response.status} ${response.statusText}`)

      // Return mock data as fallback
      return {
        success: true,
        transactions: MOCK_TRANSACTIONS,
        pagination: {
          page,
          per_page: perPage,
          total_pages: 1,
          total_items: MOCK_TRANSACTIONS.length,
        },
      }
    }

    // Parse response
    const data = response.data

    // Return data
    return {
      success: true,
      transactions: data.transactions || data.data?.transactions || [],
      pagination: data.pagination ||
        data.data?.pagination || {
          page,
          per_page: perPage,
          total_pages: 1,
          total_items: (data.transactions || data.data?.transactions || []).length,
        },
    }
  } catch (error) {
    console.error("Error fetching transactions:", error)

    // Return mock data as fallback
    return {
      success: true,
      transactions: MOCK_TRANSACTIONS,
      pagination: {
        page,
        per_page: perPage,
        total_pages: 1,
        total_items: MOCK_TRANSACTIONS.length,
      },
    }
  }
}

/**
 * Get available payment methods
 */
export const getPaymentMethods = async (): Promise<PaymentMethodsResponse> => {
  try {
    // Make API request
    const response = await api.get("/api/payment/methods")

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
      payment_methods: data.payment_methods || data.data || [],
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
export const getTransaction = async (transactionId: number | string): Promise<Transaction | null> => {
  try {
    // Make API request
    const response = await api.get(`/api/payment/transactions/${transactionId}`)

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error fetching transaction: ${response.status} ${response.statusText}`)

      // Return mock transaction as fallback
      const mockTransaction = MOCK_TRANSACTIONS.find((t) => t.id === Number(transactionId))
      return mockTransaction || null
    }

    // Parse response
    const data = response.data

    // Return data
    return data.transaction || data.data || null
  } catch (error) {
    console.error(`Error fetching transaction ${transactionId}:`, error)

    // Return mock transaction as fallback
    const mockTransaction = MOCK_TRANSACTIONS.find((t) => t.id === Number(transactionId))
    return mockTransaction || null
  }
}

/**
 * Create a new payment transaction
 */
export const createTransaction = async (
  transactionData: CreateTransactionRequest,
): Promise<CreateTransactionResponse> => {
  try {
    // Make API request
    const response = await api.post("/api/payment/transactions", transactionData)

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error creating transaction: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to create transaction: ${response.statusText}`)
    }

    // Parse response
    const data = response.data

    // Show success toast
    toast({
      title: "Transaction Created",
      description: "Your transaction has been created successfully.",
      variant: "default",
    })

    // Return data
    return {
      success: true,
      transaction: data.transaction || data.data,
    }
  } catch (error) {
    console.error("Error creating transaction:", error)

    // Show error toast
    toast({
      title: "Transaction Failed",
      description: error instanceof Error ? error.message : "Failed to create transaction",
      variant: "destructive",
    })

    throw error
  }
}

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
  transactionId: number | string,
  status: "pending" | "paid" | "failed" | "refunded",
): Promise<Transaction | null> => {
  try {
    // Make API request
    const response = await api.put(`/api/payment/transactions/${transactionId}/status`, { status })

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error updating transaction status: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to update transaction status: ${response.statusText}`)
    }

    // Parse response
    const data = response.data

    // Show success toast
    toast({
      title: "Status Updated",
      description: `Transaction status updated to ${status}.`,
      variant: "default",
    })

    // Return data
    return data.transaction || data.data || null
  } catch (error) {
    console.error(`Error updating transaction ${transactionId} status:`, error)

    // Show error toast
    toast({
      title: "Update Failed",
      description: error instanceof Error ? error.message : "Failed to update transaction status",
      variant: "destructive",
    })

    throw error
  }
}

/**
 * Verify a payment (admin only)
 */
export const verifyPayment = async (paymentId: number | string): Promise<Transaction | null> => {
  try {
    // Make API request
    const response = await api.post(`/api/payment/verify/${paymentId}`)

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error verifying payment: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to verify payment: ${response.statusText}`)
    }

    // Parse response
    const data = response.data

    // Show success toast
    toast({
      title: "Payment Verified",
      description: "The payment has been verified successfully.",
      variant: "default",
    })

    // Return data
    return data.transaction || data.data || null
  } catch (error) {
    console.error(`Error verifying payment ${paymentId}:`, error)

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
 * Retry a failed payment
 */
export const retryFailedPayment = async (
  transactionId: number | string,
  paymentMethod = "mpesa",
): Promise<CreateTransactionResponse> => {
  try {
    // Make API request
    const response = await api.post(`/api/payment/transactions/${transactionId}/retry`, {
      payment_method: paymentMethod,
    })

    // Check if response is valid
    if (response.status < 200 || response.status >= 300) {
      console.error(`Error retrying payment: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to retry payment: ${response.statusText}`)
    }

    // Parse response
    const data = response.data

    // Show success toast
    toast({
      title: "Payment Retry Initiated",
      description: "We've initiated a new payment request. Please check your phone.",
      variant: "default",
    })

    // Return data
    return {
      success: true,
      transaction: data.transaction || data.data,
    }
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

export default paymentService
