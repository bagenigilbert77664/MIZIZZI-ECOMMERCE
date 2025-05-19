"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, AlertCircle, PhoneCall, AlertTriangle } from "lucide-react"
import { useMpesaPayment } from "@/hooks/use-mpesa-payment"
import { useToast } from "@/hooks/use-toast"

interface MpesaPaymentV2Props {
  amount: number
  orderId?: string | number
  onPaymentComplete?: () => void
  onCancel?: () => void
}

export function MpesaPaymentV2({ amount, orderId, onPaymentComplete, onCancel }: MpesaPaymentV2Props) {
  const [phone, setPhone] = useState("")
  const [isValidPhone, setIsValidPhone] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [showErrorScreen, setShowErrorScreen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const { toast } = useToast()

  // Initialize the M-PESA payment hook
  const {
    loading,
    success,
    error,
    checkoutRequestId,
    checkingStatus,
    paymentComplete,
    serverErrors,
    initiatePayment,
    resetPayment,
    simulateSuccessfulPayment,
  } = useMpesaPayment({
    onSuccess: () => {
      setShowSuccessScreen(true)
    },
    onError: (error) => {
      setErrorMessage(error)
      setShowErrorScreen(true)
    },
    onComplete: async () => {
      if (onPaymentComplete) {
        onPaymentComplete()
      }
    },
  })

  // Validate phone number format
  useEffect(() => {
    // Check if phone is a valid Kenyan number
    // Should be 254XXXXXXXXX format (12 digits total)
    const isValid = /^254\d{9}$/.test(phone)
    setIsValidPhone(isValid)
  }, [phone])

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "") // Remove non-digits

    // If the input starts with 0, replace it with 254
    if (value.startsWith("0")) {
      value = "254" + value.substring(1)
    }

    // If the input starts with 7 or 1, add 254 prefix
    if ((value.startsWith("7") || value.startsWith("1")) && value.length <= 9) {
      value = "254" + value
    }

    // Limit to 12 digits (254 + 9 digits)
    if (value.length > 12) {
      value = value.substring(0, 12)
    }

    setPhone(value)
  }

  // Handle payment initiation
  const handlePayment = async () => {
    if (!isValidPhone) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid Kenyan phone number",
      })
      return
    }

    const result = await initiatePayment({
      phone,
      amount,
      orderId,
    })

    if (!result) {
      setRetryCount((prev) => prev + 1)
    }
  }

  // Handle payment retry
  const handleRetry = () => {
    resetPayment()
    setShowErrorScreen(false)
    setErrorMessage("")
  }

  // Handle payment simulation (for testing)
  const handleSimulatePayment = async () => {
    if (process.env.NODE_ENV === "production") {
      toast({
        variant: "destructive",
        title: "Not available",
        description: "Payment simulation is not available in production",
      })
      return
    }

    await simulateSuccessfulPayment()
  }

  // Handle manual completion (for when server verification fails)
  const handleManualComplete = () => {
    if (onPaymentComplete) {
      onPaymentComplete()
    }
  }

  // Render success screen
  if (showSuccessScreen || success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">Payment Successful</CardTitle>
          <CardDescription>Your M-PESA payment has been processed successfully</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-center text-gray-600 mb-4">
            Thank you for your payment. Your order is now being processed.
          </p>
          {checkoutRequestId && <p className="text-xs text-gray-500 mt-2">Transaction ID: {checkoutRequestId}</p>}
        </CardContent>
        <CardFooter>
          <Button onClick={onPaymentComplete} className="w-full">
            Continue
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Render error screen
  if (showErrorScreen) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">Payment Failed</CardTitle>
          <CardDescription>We encountered an issue with your payment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-center text-gray-600 mb-4">{errorMessage || "Your payment could not be processed."}</p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={handleRetry} className="w-full">
            Try Again
          </Button>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel Payment
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Render payment form or processing screen
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <PhoneCall className="mr-2 h-5 w-5" />
          M-PESA Payment
        </CardTitle>
        <CardDescription>Pay KES {amount.toFixed(2)} via M-PESA</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || checkingStatus ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-center font-medium mb-2">
              {checkingStatus ? "Checking payment status..." : "Processing payment..."}
            </p>
            <p className="text-center text-sm text-gray-500">
              {checkingStatus
                ? "Please wait while we verify your payment."
                : "Please check your phone and enter your M-PESA PIN when prompted."}
            </p>

            {serverErrors > 0 && checkingStatus && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    We're experiencing some issues verifying your payment. If you completed the payment on your phone,
                    don't worry - it will be processed automatically.
                  </p>
                </div>
              </div>
            )}

            {serverErrors >= 3 && checkingStatus && (
              <div className="mt-4">
                <Button onClick={handleManualComplete} variant="outline" className="w-full mt-2">
                  I've completed the payment, continue
                </Button>
              </div>
            )}

            {checkoutRequestId && <p className="text-xs text-gray-500 mt-4">Transaction ID: {checkoutRequestId}</p>}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  M-PESA Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="254XXXXXXXXX"
                  value={phone}
                  onChange={handlePhoneChange}
                  className={`${!isValidPhone && phone.length > 0 ? "border-red-500" : ""}`}
                />
                {!isValidPhone && phone.length > 0 && (
                  <p className="text-xs text-red-500">Please enter a valid Kenyan phone number (254XXXXXXXXX)</p>
                )}
                <p className="text-xs text-gray-500">
                  Enter the phone number registered with M-PESA that you wish to use for this payment.
                </p>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

            {retryCount > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  Having trouble with the payment? Make sure your phone number is correct and you have sufficient funds
                  in your M-PESA account.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {!loading && !checkingStatus && (
          <>
            <Button onClick={handlePayment} className="w-full" disabled={!isValidPhone || loading || checkingStatus}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay with M-PESA"
              )}
            </Button>
            <Button onClick={onCancel} variant="outline" className="w-full">
              Cancel
            </Button>
            {process.env.NODE_ENV !== "production" && (
              <Button
                onClick={handleSimulatePayment}
                variant="outline"
                className="w-full mt-2 text-xs bg-gray-100 hover:bg-gray-200"
              >
                Simulate Successful Payment (Testing Only)
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}

export default MpesaPaymentV2
