"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, CheckCircle2, AlertCircle, Lock, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

interface PesapalPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentUrl: string
  orderId: string
  orderTotal: number
}

export function PesapalPaymentModal({ isOpen, onClose, paymentUrl, orderId, orderTotal }: PesapalPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending")
  const router = useRouter()

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Validate message origin
      if (!event.origin.includes("pesapal.com")) {
        return
      }

      try {
        // Filter out noise from external scripts
        const messageData = typeof event.data === "string" ? event.data : JSON.stringify(event.data)

        // Ignore profiling and internal Pesapal messages
        if (
          messageData.includes("tmx_profiling") ||
          messageData.includes("cardinal") ||
          messageData.includes("songbird")
        ) {
          return
        }

        // Only log meaningful payment status messages
        if (event.data?.status) {
          console.log("[v0] Payment status update:", event.data.status)
        }

        if (event.data.status === "success" || event.data.status === "completed" || event.data.status === "COMPLETED") {
          setPaymentStatus("success")

          clearCartAfterPayment()
        } else if (
          event.data.status === "failed" ||
          event.data.status === "cancelled" ||
          event.data.status === "FAILED"
        ) {
          setPaymentStatus("failed")
        }
      } catch (error) {
        // Silently handle parsing errors from external scripts
        console.error("[v0] Error processing payment message:", error)
      }
    },
    [orderId, router, onClose],
  )

  const clearCartAfterPayment = async () => {
    try {
      console.log("[v0] Payment successful! Clearing cart...")

      const authToken = localStorage.getItem("mizizzi_token")
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Clear the cart via API
      await fetch(`${backendUrl}/api/cart/clear`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      console.log("[v0] Cart cleared successfully")

      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push(`/order-confirmation?orderId=${orderId}`)
        onClose()
      }, 2000)
    } catch (error) {
      console.error("[v0] Error clearing cart after payment:", error)
      // Still redirect even if cart clear fails
      setTimeout(() => {
        router.push(`/order-confirmation?orderId=${orderId}`)
        onClose()
      }, 2000)
    }
  }

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Ignore errors from Pesapal's own scripts and third-party libraries
      if (
        event.filename?.includes("pesapal") ||
        event.filename?.includes("cardinal") ||
        event.filename?.includes("songbird") ||
        event.filename?.includes("jquery") ||
        event.message?.includes("instanceof")
      ) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || ""
      if (reason.includes("pesapal") || reason.includes("cardinal") || reason.includes("instanceof")) {
        event.preventDefault()
        return false
      }
    }

    window.addEventListener("error", handleError, true)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError, true)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setPaymentStatus("pending")

      window.addEventListener("message", handleMessage)

      return () => {
        window.removeEventListener("message", handleMessage)
      }
    }
  }, [isOpen, handleMessage])

  const handleIframeLoad = useCallback(() => {
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }, [])

  const handleClose = useCallback(() => {
    if (paymentStatus === "pending") {
      if (!window.confirm("Your payment is in progress. Are you sure you want to close?")) {
        return
      }
    }
    onClose()
  }, [paymentStatus, onClose])

  const handleRetry = useCallback(() => {
    setPaymentStatus("pending")
    setIsLoading(true)
    window.location.reload()
  }, [])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-3xl h-[92vh] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-2xl border border-gray-200/50 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] rounded-[20px] max-h-[95vh] sm:max-w-4xl md:max-w-5xl [&>button]:hidden">
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 h-16 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-[10px] shadow-sm">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-gray-900 tracking-tight leading-tight">Secure Payment</h1>
              <p className="text-[13px] text-gray-500 font-medium">KSh {orderTotal.toLocaleString()}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100/80 transition-all duration-200 hover:scale-105"
            aria-label="Close payment modal"
          >
            <X className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        <div className="relative flex-1 bg-gradient-to-b from-gray-50/50 to-white overflow-hidden min-h-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/98 backdrop-blur-xl z-10 transition-all duration-500">
              <div className="text-center space-y-8 p-8 animate-apple-fade-in">
                {/* Apple-style spinner */}
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 to-rose-600 opacity-20 animate-apple-pulse" />
                  <div className="absolute inset-2 rounded-full bg-white" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-[3px] border-gray-200 border-t-rose-600 animate-apple-spin" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[22px] font-semibold text-gray-900 tracking-tight">Securing Your Payment</h3>
                  <p className="text-[15px] text-gray-600 font-medium">Establishing encrypted connection</p>
                </div>

                {/* Apple-style loading dots */}
                <div className="flex items-center justify-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-apple-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-apple-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-apple-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          {paymentStatus === "success" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50/95 via-white/95 to-emerald-50/95 backdrop-blur-xl z-20 p-8 transition-all duration-700 animate-apple-scale-in">
              <div className="text-center space-y-8 animate-apple-fade-in-up">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-600 opacity-10 animate-apple-pulse-slow" />
                  <div className="absolute inset-2 rounded-full bg-white shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 className="h-14 w-14 text-emerald-600 animate-apple-check" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[28px] font-semibold text-gray-900 tracking-tight">Payment Complete</h3>
                  <p className="text-[17px] text-gray-600 font-medium max-w-sm mx-auto leading-relaxed">
                    Thank you for your purchase. Redirecting you now...
                  </p>
                </div>

                <div className="w-12 h-12 rounded-full border-[3px] border-gray-200 border-t-emerald-600 animate-apple-spin mx-auto" />
              </div>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-50/95 via-white/95 to-rose-50/95 backdrop-blur-xl z-20 p-8 transition-all duration-700 animate-apple-scale-in">
              <div className="text-center space-y-8 max-w-md mx-auto animate-apple-fade-in-up">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 to-rose-600 opacity-10 animate-apple-pulse-slow" />
                  <div className="absolute inset-2 rounded-full bg-white shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AlertCircle className="h-14 w-14 text-rose-600" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[26px] font-semibold text-gray-900 tracking-tight">Payment Interrupted</h3>
                  <p className="text-[17px] text-gray-600 font-medium leading-relaxed">
                    Something went wrong. No charges were applied to your account.
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full sm:flex-row sm:gap-4 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 h-12 px-6 rounded-[12px] border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 text-[15px] font-semibold bg-transparent"
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    onClick={handleRetry}
                    className="flex-1 h-12 px-6 rounded-[12px] bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-sm hover:shadow-md transition-all duration-200 text-[15px] font-semibold"
                  >
                    Try Again
                  </Button>
                </div>

                <p className="text-[13px] text-gray-500 font-medium pt-2">
                  Need help? Contact our support team anytime.
                </p>
              </div>
            </div>
          )}

          <iframe
            key={paymentUrl}
            src={paymentUrl}
            className="w-full h-full border-0 bg-white transition-opacity duration-500"
            onLoad={handleIframeLoad}
            onError={() => {
              console.error("[v0] Iframe failed to load")
              setIsLoading(false)
              setPaymentStatus("failed")
            }}
            title={`Pesapal Payment for Order ${orderId}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-modals"
            style={{ minHeight: "700px" }}
            loading="lazy"
          />
        </div>

        <div className="px-8 py-5 bg-white/80 backdrop-blur-xl border-t border-gray-200/50">
          <div className="flex flex-col items-center justify-center gap-4 text-[13px] text-gray-600 font-medium animate-apple-fade-in-delayed">
            <div className="flex items-center gap-4">
              <div className="p-1.5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-[8px] shadow-sm">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold">Powered by Pesapal</span>
              <span className="text-gray-400">•</span>
              <span>Regulated by CBK</span>
              <span className="text-gray-400">•</span>
              <span>256-bit SSL</span>
            </div>
          </div>
        </div>
      </DialogContent>

      <style jsx global>{`
        @keyframes apple-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes apple-fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes apple-fade-in-delayed {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes apple-scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes apple-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes apple-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        @keyframes apple-pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.1); }
        }
        @keyframes apple-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes apple-check {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-apple-fade-in { animation: apple-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-apple-fade-in-up { animation: apple-fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-apple-fade-in-delayed { animation: apple-fade-in-delayed 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
        .animate-apple-scale-in { animation: apple-scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-apple-spin { animation: apple-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .animate-apple-pulse { animation: apple-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-apple-pulse-slow { animation: apple-pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-apple-bounce { animation: apple-bounce 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .animate-apple-check { animation: apple-check 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </Dialog>
  )
}
