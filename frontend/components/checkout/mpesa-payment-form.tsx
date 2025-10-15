"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Smartphone, CheckCircle, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { useMpesaPayment } from "@/hooks/use-mpesa-payment"
import { useRouter } from "next/navigation"

interface MpesaPaymentFormProps {
  amount: number
  orderId?: string | number
  onSuccess?: () => void
  onError?: (error: string) => void
  defaultPhone?: string
  redirectUrl?: string
}

export function MpesaPaymentForm({
  amount,
  orderId,
  onSuccess,
  onError,
  defaultPhone = "",
  redirectUrl = "/orders",
}: MpesaPaymentFormProps) {
  const [phone, setPhone] = useState(defaultPhone)
  const [showResendButton, setShowResendButton] = useState(false)
  const router = useRouter()

  const {
    loading,
    success,
    error,
    checkoutRequestId,
    checkingStatus,
    paymentComplete,
    initiatePayment,
    resendStkPush,
  } = useMpesaPayment({
    onSuccess: () => {
      if (onSuccess) {
        onSuccess()
      } else if (redirectUrl) {
        // Redirect after a short delay to allow the user to see the success message
        setTimeout(() => {
          router.push(redirectUrl)
        }, 2000)
      }
    },
    onError: (errorMsg) => {
      if (onError) {
        onError(errorMsg)
      }
      // Show resend button if payment failed
      setShowResendButton(true)
    },
  })

  // Show resend button after 30 seconds if payment is still pending
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (checkoutRequestId && !success && !error) {
      timer = setTimeout(() => {
        setShowResendButton(true)
      }, 30000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [checkoutRequestId, success, error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowResendButton(false)

    await initiatePayment({
      phone,
      amount,
      orderId,
      accountReference: orderId ? `ORDER-${orderId}` : undefined,
      transactionDesc: orderId ? `Payment for order #${orderId}` : "M-PESA Payment",
    })
  }

  const handleResend = async () => {
    setShowResendButton(false)
    await resendStkPush()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="mr-2 h-5 w-5" />
          M-PESA Payment
        </CardTitle>
        <CardDescription>
          Pay securely using M-PESA. You will receive a prompt on your phone to complete the payment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!checkoutRequestId ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Enter your M-PESA registered phone number. Format: 07XXXXXXXX or 254XXXXXXXXX
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Amount:</div>
              <div className="text-lg font-bold">KES {amount.toLocaleString()}</div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating Payment...
                </>
              ) : (
                "Pay with M-PESA"
              )}
            </Button>
          </form>
        ) : success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-700 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">
              Your payment has been processed successfully. Thank you for your purchase.
            </p>
            <Button onClick={() => router.push(redirectUrl)} className="mt-2">
              View Order Details
            </Button>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-red-700 mb-2">Payment Failed</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            {showResendButton && (
              <Button onClick={handleResend} variant="outline" className="mt-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend M-PESA Prompt
              </Button>
            )}
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-4">
              <Smartphone className="h-16 w-16 text-primary animate-pulse" />
              <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 animate-ping"></div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Waiting for M-PESA prompt...</h3>
            <p className="text-gray-600 mb-4">
              Please check your phone and enter your M-PESA PIN to complete the payment.
            </p>
            {checkingStatus && (
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking payment status...
              </div>
            )}
            {showResendButton && (
              <Button onClick={handleResend} variant="outline" className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend M-PESA Prompt
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 border-t pt-4">
        <div className="text-xs text-gray-500">
          <p>• You will receive a prompt on your phone to complete the payment.</p>
          <p>• Enter your M-PESA PIN when prompted to authorize the payment.</p>
          <p>• You will receive an M-PESA confirmation message once the payment is complete.</p>
        </div>
      </CardFooter>
    </Card>
  )
}

export default MpesaPaymentForm
