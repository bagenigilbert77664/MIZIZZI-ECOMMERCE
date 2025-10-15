"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, XCircle, Package, ArrowRight, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading")
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const retryCountRef = useRef(0)
  const maxRetries = 10
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const orderTrackingId = searchParams?.get("OrderTrackingId")
        const merchantReference = searchParams?.get("OrderMerchantReference")

        console.log("[v0] Payment callback received:", { orderTrackingId, merchantReference })

        if (!orderTrackingId) {
          console.error("[v0] No OrderTrackingId in URL")
          setStatus("failed")
          setErrorMessage("Missing payment tracking information")
          return
        }

        const savedOrderDetails = localStorage.getItem("lastOrderDetails")
        if (savedOrderDetails) {
          const details = JSON.parse(savedOrderDetails)
          setOrderDetails(details)
          console.log("[v0] Retrieved order details:", details)
        }

        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

        console.log("[v0] Verifying payment with backend:", `${backendUrl}/api/pesapal/card/status/${orderTrackingId}`)

        const response = await fetch(`${backendUrl}/api/pesapal/card/status/${orderTrackingId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("mizizzi_token")}`,
          },
        })

        if (!response.ok) {
          console.error("[v0] Backend verification failed:", response.status, response.statusText)
          throw new Error(`Backend verification failed: ${response.status}`)
        }

        const result = await response.json()

        console.log("[v0] Full payment verification result:", JSON.stringify(result, null, 2))
        console.log("[v0] result.status:", result.status)
        console.log("[v0] result.transaction_status:", result.transaction_status)
        console.log("[v0] result.transaction_data:", result.transaction_data)

        const transactionStatus = result.transaction_status?.toLowerCase()
        const pesapalStatus = result.transaction_data?.payment_status_description?.toLowerCase()
        const statusCode = result.transaction_data?.status_code

        console.log(
          "[v0] Parsed statuses - transaction:",
          transactionStatus,
          "pesapal:",
          pesapalStatus,
          "code:",
          statusCode,
        )

        const isCompleted =
          transactionStatus === "completed" ||
          pesapalStatus === "completed" ||
          pesapalStatus === "complete" ||
          statusCode === 1

        const isFailed = transactionStatus === "failed" || pesapalStatus === "failed" || statusCode === -1

        const isCancelled = transactionStatus === "cancelled" || pesapalStatus === "cancelled"

        if (isCompleted) {
          console.log("[v0] ✅ Payment verified as completed")
          setStatus("success")
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current)
            retryIntervalRef.current = null
          }
          localStorage.removeItem("lastOrderDetails")
        } else if (isFailed) {
          console.log("[v0] ❌ Payment failed")
          setStatus("failed")
          setErrorMessage(result.transaction_data?.error_message || "Payment was not successful")
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current)
            retryIntervalRef.current = null
          }
        } else if (isCancelled) {
          console.log("[v0] ❌ Payment cancelled")
          setStatus("failed")
          setErrorMessage("Payment was cancelled")
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current)
            retryIntervalRef.current = null
          }
        } else {
          console.log("[v0] ⏳ Payment still pending, retry count:", retryCountRef.current)
          setStatus("pending")

          if (retryCountRef.current < maxRetries) {
            retryCountRef.current += 1
            if (!retryIntervalRef.current) {
              retryIntervalRef.current = setTimeout(() => {
                retryIntervalRef.current = null
                verifyPayment()
              }, 5000)
            }
          } else {
            console.log("[v0] ⚠️ Max retries reached, payment still pending")
            setErrorMessage(
              "Payment verification is taking longer than expected. Please check your orders page or contact support.",
            )
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current)
              retryIntervalRef.current = null
            }
          }
        }
      } catch (error) {
        console.error("[v0] Payment verification error:", error)
        setStatus("failed")
        setErrorMessage(error instanceof Error ? error.message : "Failed to verify payment")
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current)
          retryIntervalRef.current = null
        }
      }
    }

    verifyPayment()

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
      }
    }
  }, [searchParams])

  if (status === "loading") {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "pending") {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-yellow-50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-yellow-900">Payment Pending</CardTitle>
                  <p className="text-yellow-700 mt-1">Your payment is being processed</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-8">
              <div className="flex items-center gap-3 mb-6">
                <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                <p className="text-gray-600">
                  {retryCountRef.current < maxRetries
                    ? "Checking payment status... This may take a few moments."
                    : errorMessage ||
                      "Payment verification is taking longer than expected. Please check your orders page or refresh to try again."}
                </p>
              </div>
              {retryCountRef.current > 0 && retryCountRef.current < maxRetries && (
                <p className="text-sm text-gray-500 mb-4">
                  Verification attempt {retryCountRef.current} of {maxRetries}
                </p>
              )}
              <div className="flex gap-4">
                <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                  Refresh Status
                </Button>
                <Button onClick={() => router.push("/orders")} className="flex-1">
                  View Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-red-50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-red-900">Payment Failed</CardTitle>
                  <p className="text-red-700 mt-1">We couldn't process your payment</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-8">
              <p className="text-gray-600 mb-2">
                {errorMessage ||
                  "Your payment was not successful. Please try again or contact support if the problem persists."}
              </p>
              {orderDetails && (
                <div className="bg-gray-50 rounded-lg p-4 my-4">
                  <p className="text-sm text-gray-600">
                    <strong>Order:</strong> {orderDetails.orderId}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Amount:</strong> KES {orderDetails.total?.toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex gap-4 mt-6">
                <Button onClick={() => router.push("/checkout")} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={() => router.push("/orders")} variant="outline" className="flex-1">
                  View Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="p-3 bg-green-100 rounded-full"
              >
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </motion.div>
              <div>
                <CardTitle className="text-2xl text-green-900">Payment Successful!</CardTitle>
                <p className="text-green-700 mt-1">Your order has been confirmed</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-8 space-y-6">
            {orderDetails && (
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-semibold text-gray-900">{orderDetails.orderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold text-gray-900">KES {orderDetails.total?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-semibold text-gray-900">Pesapal</span>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">What's Next?</p>
                <p className="text-sm text-blue-700 mt-1">
                  We'll send you an email confirmation and tracking details once your order is shipped.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={() => router.push("/orders")} className="flex-1 h-12">
                <Package className="h-4 w-4 mr-2" />
                View Order Details
              </Button>
              <Button onClick={() => router.push("/products")} variant="outline" className="flex-1 h-12">
                Continue Shopping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
