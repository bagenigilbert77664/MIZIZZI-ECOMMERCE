"use client"

import { useState, useEffect, useCallback } from "react"
import mpesaService from "@/services/mpesa-service"
import { useToast } from "@/hooks/use-toast"

interface UseMpesaPaymentProps {
  onSuccess?: (data: PaymentSuccessData) => void
  onError?: (error: string) => void
  onComplete?: (data: PaymentSuccessData) => Promise<void>
}

interface MpesaPaymentParams {
  phone: string
  amount: number
  orderId?: string | number
  accountReference?: string
  transactionDesc?: string
}

interface MpesaCartPaymentParams {
  phone: string
  accountReference?: string
  transactionDesc?: string
}

interface PaymentSuccessData {
  success: boolean
  transaction_id?: string
  checkout_request_id?: string
  merchant_request_id?: string
  mpesa_receipt_number?: string
  amount: number
  phone: string
  result_code?: number
  result_desc?: string
}

export function useMpesaPayment({ onSuccess, onError, onComplete }: UseMpesaPaymentProps = {}) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [merchantRequestId, setMerchantRequestId] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [statusChecks, setStatusChecks] = useState(0)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [lastPaymentParams, setLastPaymentParams] = useState<MpesaPaymentParams | null>(null)
  const [transactionData, setTransactionData] = useState<PaymentSuccessData | null>(null)

  const { toast } = useToast()

  // Check for pending payments on mount
  useEffect(() => {
    checkPendingPaymentOnStartup()
  }, [])

  const checkPendingPaymentOnStartup = async () => {
    try {
      const pendingPayment = await mpesaService.checkPendingPaymentOnStartup()
      if (pendingPayment?.success) {
        handlePaymentSuccess({
          success: true,
          transaction_id: pendingPayment.response?.TransactionId,
          checkout_request_id: pendingPayment.checkout_request_id,
          mpesa_receipt_number: pendingPayment.response?.MpesaReceiptNumber,
          amount: 0, // Will be updated from pending payment data
          phone: "",
          result_code: pendingPayment.response?.ResultCode,
          result_desc: pendingPayment.response?.ResultDesc,
        })
      }
    } catch (error) {
      console.error("Error checking pending payment:", error)
    }
  }

  // Initiate M-PESA STK Push payment
  const initiatePayment = async (params: MpesaPaymentParams): Promise<boolean> => {
    if (!mpesaService.validatePhoneNumber(params.phone)) {
      const errorMsg = "Please enter a valid Kenyan phone number (e.g., 0712345678)"
      setError(errorMsg)
      if (onError) onError(errorMsg)

      toast({
        variant: "destructive",
        title: "Invalid Phone Number",
        description: errorMsg,
      })

      return false
    }

    setLastPaymentParams(params)
    setLoading(true)
    setError(null)
    setSuccess(false)
    setPaymentComplete(false)
    setStatusChecks(0)

    try {
      const response = await mpesaService.initiateDirectPayment({
        phone: params.phone,
        amount: params.amount,
        order_id: params.orderId,
        account_reference: params.accountReference,
        transaction_desc: params.transactionDesc,
      })

      if (response.success && response.checkout_request_id) {
        setCheckoutRequestId(response.checkout_request_id)
        setMerchantRequestId(response.merchant_request_id || null)

        toast({
          title: "Payment Request Sent",
          description: "Please check your phone for the M-PESA prompt and enter your PIN.",
          variant: "default",
        })

        // Start checking payment status after 5 seconds
        setTimeout(() => {
          startStatusChecking(response.checkout_request_id!)
        }, 5000)

        return true
      } else {
        const errorMsg = response.error || "Failed to initiate payment"
        setError(errorMsg)
        if (onError) onError(errorMsg)

        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: errorMsg,
        })

        return false
      }
    } catch (err: any) {
      console.error("Error initiating payment:", err)
      const errorMsg = err.message || "An error occurred while initiating payment"
      setError(errorMsg)
      if (onError) onError(errorMsg)

      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: errorMsg,
      })

      return false
    } finally {
      setLoading(false)
    }
  }

  // Initiate M-PESA cart payment
  const initiateCartPayment = async (params: MpesaCartPaymentParams): Promise<boolean> => {
    if (!mpesaService.validatePhoneNumber(params.phone)) {
      const errorMsg = "Please enter a valid Kenyan phone number"
      setError(errorMsg)
      if (onError) onError(errorMsg)

      toast({
        variant: "destructive",
        title: "Invalid Phone Number",
        description: errorMsg,
      })

      return false
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    setPaymentComplete(false)
    setStatusChecks(0)

    try {
      const response = await mpesaService.initiateCartPayment({
        phone: params.phone,
        account_reference: params.accountReference,
        transaction_desc: params.transactionDesc,
      })

      if (response.success && response.checkout_request_id) {
        setCheckoutRequestId(response.checkout_request_id)
        setMerchantRequestId(response.merchant_request_id || null)

        toast({
          title: "Cart Payment Initiated",
          description: "Please check your phone for the M-PESA prompt.",
          variant: "default",
        })

        // Start checking payment status
        setTimeout(() => {
          startStatusChecking(response.checkout_request_id!)
        }, 5000)

        return true
      } else {
        const errorMsg = response.error || "Failed to initiate cart payment"
        setError(errorMsg)
        if (onError) onError(errorMsg)

        toast({
          variant: "destructive",
          title: "Cart Payment Failed",
          description: errorMsg,
        })

        return false
      }
    } catch (err: any) {
      console.error("Error initiating cart payment:", err)
      const errorMsg = err.message || "An error occurred while initiating cart payment"
      setError(errorMsg)
      if (onError) onError(errorMsg)

      toast({
        variant: "destructive",
        title: "Cart Payment Failed",
        description: errorMsg,
      })

      return false
    } finally {
      setLoading(false)
    }
  }

  // Start checking payment status
  const startStatusChecking = useCallback(
    (requestId: string) => {
      setCheckingStatus(true)

      const checkStatus = async () => {
        if (statusChecks >= 12 || paymentComplete) {
          // Check for 1 minute (12 * 5 seconds)
          setCheckingStatus(false)
          return
        }

        try {
          const response = await mpesaService.checkPaymentStatus({
            checkout_request_id: requestId,
          })

          if (response.success && response.response) {
            const resultCode = response.response.ResultCode

            if (resultCode === 0) {
              // Payment successful
              handlePaymentSuccess({
                success: true,
                transaction_id: response.response.TransactionId,
                checkout_request_id: requestId,
                merchant_request_id: merchantRequestId ?? undefined,
                mpesa_receipt_number: response.response.MpesaReceiptNumber,
                amount: lastPaymentParams?.amount || 0,
                phone: lastPaymentParams?.phone || "",
                result_code: resultCode,
                result_desc: response.response.ResultDesc,
              })
              return
            } else if (resultCode === 1032) {
              // Payment cancelled by user
              const errorMsg = "Payment was cancelled by user"
              setError(errorMsg)
              setCheckingStatus(false)
              if (onError) onError(errorMsg)

              toast({
                variant: "destructive",
                title: "Payment Cancelled",
                description: "You cancelled the payment request",
              })
              return
            } else if (resultCode === 1037) {
              // Payment timeout
              const errorMsg = "Payment request timed out"
              setError(errorMsg)
              setCheckingStatus(false)
              if (onError) onError(errorMsg)

              toast({
                variant: "destructive",
                title: "Payment Timeout",
                description: "The payment request timed out. Please try again.",
              })
              return
            } else if (resultCode === 1) {
              // Still processing
              console.log("Payment still processing...")
            } else {
              // Other error codes
              console.log(`Payment status: ${resultCode} - ${response.response.ResultDesc}`)
            }
          }

          // Continue checking
          setStatusChecks((prev) => prev + 1)
          setTimeout(checkStatus, 5000) // Check again in 5 seconds
        } catch (error) {
          console.error("Error checking payment status:", error)
          setStatusChecks((prev) => prev + 1)
          setTimeout(checkStatus, 5000) // Retry in 5 seconds
        }
      }

      // Start the first check
      checkStatus()
    },
    [statusChecks, paymentComplete, merchantRequestId, lastPaymentParams, onError],
  )

  // Handle successful payment
  const handlePaymentSuccess = async (data: PaymentSuccessData) => {
    setSuccess(true)
    setPaymentComplete(true)
    setCheckingStatus(false)
    setTransactionData(data)

    // Clear pending payment
    mpesaService.clearPendingPayment()

    toast({
      title: "Payment Successful!",
      description: `Your M-PESA payment has been confirmed. Receipt: ${data.mpesa_receipt_number || "N/A"}`,
      variant: "default",
    })

    // Call completion callbacks
    try {
      if (onComplete) {
        await onComplete(data)
      } else if (onSuccess) {
        onSuccess(data)
      }
    } catch (error) {
      console.error("Error in payment completion callback:", error)
    }
  }

  // Resend STK push
  const resendStkPush = async (): Promise<boolean> => {
    if (!lastPaymentParams) {
      setError("Cannot resend payment request. Please try again from the beginning.")
      return false
    }

    // Reset states
    setCheckingStatus(false)
    setStatusChecks(0)
    setError(null)

    toast({
      title: "Resending Payment Request",
      description: "We're sending a new M-PESA prompt to your phone.",
      variant: "default",
    })

    return await initiatePayment(lastPaymentParams)
  }

  // Reset payment state
  const resetPayment = () => {
    setLoading(false)
    setSuccess(false)
    setError(null)
    setCheckoutRequestId(null)
    setMerchantRequestId(null)
    setCheckingStatus(false)
    setStatusChecks(0)
    setPaymentComplete(false)
    setLastPaymentParams(null)
    setTransactionData(null)
    mpesaService.clearPendingPayment()
  }

  // Manual verification (for when user claims to have paid)
  const verifyPayment = async (transactionId?: string): Promise<boolean> => {
    if (!transactionId && !checkoutRequestId) {
      setError("No transaction to verify")
      return false
    }

    setLoading(true)

    try {
      if (transactionId) {
        // Verify by transaction ID
        const response = await mpesaService.verifyPayment(transactionId)
        if (response.success && response.transaction) {
          handlePaymentSuccess({
            success: true,
            transaction_id: response.transaction.transaction_id,
            checkout_request_id: response.transaction.checkout_request_id,
            mpesa_receipt_number: response.transaction.mpesa_receipt_number,
            amount: response.transaction.amount,
            phone: response.transaction.phone_number,
            result_code: response.transaction.result_code,
            result_desc: response.transaction.result_desc,
          })
          return true
        }
      } else if (checkoutRequestId) {
        // Check status by checkout request ID
        const response = await mpesaService.checkPaymentStatus({
          checkout_request_id: checkoutRequestId,
        })

        if (response.success && response.response?.ResultCode === 0) {
          handlePaymentSuccess({
            success: true,
            transaction_id: response.response.TransactionId,
            checkout_request_id: checkoutRequestId,
            merchant_request_id: merchantRequestId ?? undefined,
            mpesa_receipt_number: response.response.MpesaReceiptNumber,
            amount: lastPaymentParams?.amount || 0,
            phone: lastPaymentParams?.phone || "",
            result_code: response.response.ResultCode,
            result_desc: response.response.ResultDesc,
          })
          return true
        }
      }

      toast({
        title: "Payment Not Found",
        description: "We couldn't verify your payment. Please ensure the transaction was completed.",
        variant: "destructive",
      })

      return false
    } catch (error: any) {
      console.error("Error verifying payment:", error)
      setError(error.message || "Failed to verify payment")

      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Failed to verify your payment. Please try again.",
      })

      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    // State
    loading,
    success,
    error,
    checkoutRequestId,
    merchantRequestId,
    checkingStatus,
    paymentComplete,
    transactionData,
    statusChecks,

    // Actions
    initiatePayment,
    initiateCartPayment,
    resendStkPush,
    resetPayment,
    verifyPayment,

    // Utilities
    validatePhoneNumber: mpesaService.validatePhoneNumber.bind(mpesaService),
    getPendingPayment: mpesaService.getPendingPayment.bind(mpesaService),
    clearPendingPayment: mpesaService.clearPendingPayment.bind(mpesaService),
  }
}

export default useMpesaPayment
