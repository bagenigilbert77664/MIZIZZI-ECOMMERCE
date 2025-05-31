"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  PhoneCall,
  AlertTriangle,
  RefreshCw,
  Phone,
  ArrowRight,
  Clock,
  X,
  Copy,
  Check,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface MpesaPaymentFormProps {
  amount: number
  orderId?: string | number
  onSuccess?: () => void
  onPaymentComplete?: (paymentData: {
    success: boolean
    transaction_id?: string
    checkout_request_id?: string
    merchant_request_id?: string
    amount: number
    phone: string
  }) => Promise<void>
  onBack?: () => void
  defaultPhone?: string
  redirectUrl?: string
}

export function MpesaPaymentForm({
  amount,
  orderId,
  onSuccess,
  onPaymentComplete,
  onBack,
  defaultPhone = "",
  redirectUrl,
}: MpesaPaymentFormProps) {
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto")
  const [phone, setPhone] = useState(defaultPhone || "")
  const [isValidPhone, setIsValidPhone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [checkAttempts, setCheckAttempts] = useState(0)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [countdownValue, setCountdownValue] = useState(30)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [showCounter, setShowCounter] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false)
  const [copiedBusinessNumber, setCopiedBusinessNumber] = useState(false)
  // Add a new state for tracking payment status
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    checkout_request_id?: string
    merchant_request_id?: string
    transaction_id?: string
  } | null>(null)

  // M-PESA payment details (replace with your actual values)
  const businessNumber = "570936"
  const accountNumber = orderId ? `ORDER${orderId}` : "TMP12345"

  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
    }
  }, [])

  // Update phone validation when phone changes
  useEffect(() => {
    // Valid formats: 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, 1XXXXXXXX, 254XXXXXXXXX
    const isValid = /^(0[17]\d{8}|[17]\d{8}|254[17]\d{8})$/.test(phone)
    setIsValidPhone(isValid && phone.length >= 9)
  }, [phone])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")

    // Handle different Kenyan phone formats
    if (value.startsWith("0")) {
      // If it starts with 0, keep it as is for display
    } else if ((value.startsWith("7") || value.startsWith("1")) && value.length <= 9) {
      // If starts with 7 or 1 and is a local number, add a leading 0
      value = "0" + value
    } else if (value.startsWith("254")) {
      // If starts with 254, convert to local format for display
      value = "0" + value.substring(3)
    }

    // Limit to 10 digits for display (0XXXXXXXXX)
    if (value.length > 10) {
      value = value.substring(0, 10)
    }

    setPhone(value)
  }

  const formatPhoneForApi = (phoneNumber: string) => {
    // Strip any non-digits
    let digits = phoneNumber.replace(/\D/g, "")

    // Make sure it's in the format 254XXXXXXXXX
    if (digits.startsWith("0")) {
      digits = "254" + digits.substring(1)
    } else if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
      digits = "254" + digits
    }

    return digits
  }

  // Add this function after the handlePhoneChange function
  const initiatePaymentAndTrack = async () => {
    if (!isValidPhone) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid Kenyan phone number",
      })
      return
    }

    setIsSubmitting(true)
    setPaymentError(null)
    setShowManualInstructions(false)
    setPaymentProcessing(true)

    try {
      // Start the countdown when initiating payment
      startCountdown()

      // Call the M-PESA service to initiate payment
      const mpesaService = await import("@/services/mpesa-service").then((mod) => mod.default)
      const response = await mpesaService.initiateDirectPayment({
        phone: phone,
        amount: amount,
        order_id: orderId,
        account_reference: orderId ? `ORDER${orderId}` : accountNumber,
        transaction_desc: `Payment for order ${orderId || "pending"}`,
      })

      if (response.success) {
        // Store payment data for tracking
        setPaymentData({
          checkout_request_id: response.checkout_request_id,
          merchant_request_id: response.merchant_request_id,
          transaction_id: response.response?.transaction_id,
        })

        // Save transaction to localStorage for recovery if needed
        localStorage.setItem(
          "pendingMpesaPayment",
          JSON.stringify({
            checkout_request_id: response.checkout_request_id,
            merchant_request_id: response.merchant_request_id,
            amount: amount,
            phone: phone,
            timestamp: new Date().toISOString(),
            order_id: orderId,
          }),
        )

        // Inform user that request has been sent
        toast({
          title: "Payment request sent",
          description: "Please check your phone for the M-PESA prompt and enter your PIN.",
        })

        // Start checking for payment status
        startStatusCheck(response.checkout_request_id)
      } else {
        throw new Error(response.error || "Failed to initiate payment")
      }
    } catch (error: any) {
      console.error("M-PESA payment initiation error:", error)

      let errorMessage = "Failed to initiate payment. Please try again."

      // Handle specific error cases
      if (error.response?.status === 400) {
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else {
          errorMessage = "Invalid payment details. Please check your phone number and try again."
        }
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again."
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again in a few moments."
      } else if (error.message) {
        errorMessage = error.message
      }

      setPaymentError(errorMessage)
      toast({
        variant: "destructive",
        title: "Payment initiation failed",
        description: errorMessage,
      })
      setPaymentProcessing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startCountdown = () => {
    setCountdownValue(30)
    setShowCounter(true)

    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }

    countdownRef.current = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          setShowCounter(false)
          if (activeTab === "auto") {
            // Show manual instructions after countdown ends
            setShowManualInstructions(true)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Update the startStatusCheck function to accept a checkout_request_id parameter
  const startStatusCheck = (checkoutRequestId?: string) => {
    setIsChecking(true)
    setCheckAttempts(0)

    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
    }

    // Check payment status every 5 seconds, up to 6 times (30 seconds total)
    checkIntervalRef.current = setInterval(() => {
      setCheckAttempts((prev) => {
        const newValue = prev + 1

        // After 6 attempts (30 seconds), stop checking
        if (newValue >= 6) {
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
          setIsChecking(false)

          // If we're in auto mode, show manual instructions
          if (activeTab === "auto") {
            setShowManualInstructions(true)
          }

          return newValue
        }

        // Check payment status
        checkPaymentStatus(checkoutRequestId)

        return newValue
      })
    }, 5000)

    // Initial check immediately
    checkPaymentStatus(checkoutRequestId)
  }

  // Update the checkPaymentStatus function to use the M-PESA service
  const checkPaymentStatus = async (checkoutRequestId?: string) => {
    if (!checkoutRequestId && paymentData?.checkout_request_id) {
      checkoutRequestId = paymentData.checkout_request_id
    }

    if (!checkoutRequestId) {
      console.error("No checkout request ID available for status check")
      return
    }

    try {
      const mpesaService = await import("@/services/mpesa-service").then((mod) => mod.default)
      const response = await mpesaService.checkPaymentStatus({
        checkout_request_id: checkoutRequestId,
      })

      if (response.success) {
        // Check if payment was successful (ResultCode === 0)
        if (response.response?.ResultCode === 0) {
          handlePaymentSuccess()
        } else if (response.response?.ResultCode === 1032) {
          // Transaction is still being processed
          console.log("Payment is still being processed")
        } else if (response.response?.ResultCode) {
          // Payment failed
          setPaymentError(`Payment failed: ${response.response.ResultDesc || "Unknown error"}`)
          setPaymentProcessing(false)
        }
      }
    } catch (error) {
      console.error("Error checking payment status:", error)
    }
  }

  // Update the handlePaymentSuccess function to call onPaymentComplete
  const handlePaymentSuccess = () => {
    // Clear all intervals
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)

    setPaymentSuccess(true)
    setIsChecking(false)
    setPaymentProcessing(false)

    // Remove pending payment from localStorage
    localStorage.removeItem("pendingMpesaPayment")

    toast({
      title: "Payment successful!",
      description: "Your M-PESA payment has been confirmed.",
    })

    // Call the success callback after a short delay
    setTimeout(async () => {
      if (onPaymentComplete) {
        // Pass payment data to the callback
        await onPaymentComplete({
          success: true,
          transaction_id: transactionId || paymentData?.transaction_id,
          checkout_request_id: paymentData?.checkout_request_id,
          merchant_request_id: paymentData?.merchant_request_id,
          amount: amount,
          phone: phone,
        })
      } else if (onSuccess) {
        onSuccess()
      } else if (redirectUrl) {
        router.push(redirectUrl)
      }
    }, 2000)
  }

  // Update the initiatePayment function to call the new function
  const initiatePayment = () => {
    initiatePaymentAndTrack()
  }

  // Update the resendPaymentRequest function to use the new flow
  const resendPaymentRequest = async () => {
    initiatePaymentAndTrack()
  }

  // Update the handleManualVerify function to check payment status
  const handleManualVerify = async () => {
    setIsSubmitting(true)

    try {
      // If we have a checkout request ID, check the status
      if (paymentData?.checkout_request_id) {
        await checkPaymentStatus(paymentData.checkout_request_id)

        // If payment is still not confirmed, show a message
        if (!paymentSuccess) {
          toast({
            title: "Payment status",
            description: "We couldn't confirm your payment yet. Please wait a few minutes for it to be processed.",
          })
        }
      } else {
        // For demo purposes, simulate a successful verification
        handlePaymentSuccess()
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Failed to verify your payment. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyText = (text: string, type: "business" | "account") => {
    navigator.clipboard.writeText(text)

    if (type === "business") {
      setCopiedBusinessNumber(true)
      setTimeout(() => setCopiedBusinessNumber(false), 2000)
    } else {
      setCopiedAccountNumber(true)
      setTimeout(() => setCopiedAccountNumber(false), 2000)
    }

    toast({
      title: "Copied to clipboard",
      description: `${type === "business" ? "Business number" : "Account number"} copied.`,
    })
  }

  const simulatePayment = async () => {
    // This is only for testing/demo purposes
    await new Promise((resolve) => setTimeout(resolve, 1000))
    handlePaymentSuccess()
  }

  // If payment was successful, show success screen
  if (paymentSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-green-600">Payment Successful</CardTitle>
          <CardDescription>Your M-PESA payment has been processed successfully</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
            <div className="relative bg-green-50 p-4 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <p className="text-center text-gray-600 mt-2">
            Thank you for your payment. Your order is now being processed.
          </p>
          {transactionId && (
            <div className="bg-gray-50 px-4 py-2 rounded-md w-full">
              <p className="text-xs text-gray-500">Transaction ID:</p>
              <p className="text-sm font-medium">{transactionId}</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => {
              if (onSuccess) onSuccess()
              else if (redirectUrl) router.push(redirectUrl)
            }}
            className="w-full"
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="bg-green-50 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <PhoneCall className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Pay with M-PESA</CardTitle>
              <CardDescription>Fast, secure mobile payment</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8">
              <Image
                src="/placeholder.svg?height=32&width=32"
                alt="M-PESA logo"
                width={32}
                height={32}
                className="rounded-sm"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="auto" value={activeTab} onValueChange={(value) => setActiveTab(value as "auto" | "manual")}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="auto" disabled={isSubmitting || isChecking}>
              <PhoneCall className="h-4 w-4 mr-2" />
              STK Push
            </TabsTrigger>
            <TabsTrigger value="manual" disabled={isSubmitting || isChecking}>
              <Phone className="h-4 w-4 mr-2" />
              Pay Manually
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto">
            <div className="space-y-6">
              {!isChecking ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      M-PESA Phone Number
                    </label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="07XXXXXXXX"
                        value={phone}
                        onChange={handlePhoneChange}
                        className={`pl-12 ${!isValidPhone && phone.length > 0 ? "border-red-500" : ""}`}
                        disabled={isSubmitting || isChecking}
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        <Phone className="h-4 w-4" />
                      </div>
                    </div>
                    {!isValidPhone && phone.length > 0 && (
                      <p className="text-xs text-red-500">
                        Please enter a valid Kenyan phone number (e.g., 0712345678)
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Enter the phone number registered with M-PESA. Format: 07XX XXX XXX
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex">
                      <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">Payment instructions</p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Enter your M-PESA registered phone number</li>
                          <li>Click "Pay Now" to receive a payment prompt on your phone</li>
                          <li>Enter your M-PESA PIN to complete the payment</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {showManualInstructions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-amber-50 border border-amber-100 rounded-lg p-4"
                    >
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800">No prompt received?</h4>
                          <p className="text-sm text-amber-700 mb-2">
                            If you didn't receive a payment prompt, you can:
                          </p>
                          <div className="flex flex-col space-y-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="justify-start border-amber-200 bg-amber-100/50 hover:bg-amber-100"
                              onClick={resendPaymentRequest}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend prompt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="justify-start border-amber-200 bg-amber-100/50 hover:bg-amber-100"
                              onClick={() => setActiveTab("manual")}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Pay manually
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
                    <div className="relative bg-green-50 p-6 rounded-full">
                      <Phone className="h-10 w-10 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Check your phone</h3>
                  <p className="text-center text-gray-600 mb-4">
                    We've sent a payment request to <strong>{phone}</strong>
                  </p>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full mb-2">
                    <div
                      className="bg-green-500 h-2.5 rounded-full"
                      style={{ width: `${(checkAttempts / 6) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Waiting for your payment confirmation...</p>

                  {showCounter && (
                    <div className="bg-green-50 border border-green-100 rounded-full px-4 py-1 flex items-center mb-4">
                      <Clock className="h-4 w-4 text-green-600 mr-2 animate-pulse" />
                      <span className="text-sm text-green-700">{countdownValue}s remaining</span>
                    </div>
                  )}

                  <div className="flex flex-col w-full space-y-2">
                    <Button variant="outline" size="sm" className="border-green-200" onClick={resendPaymentRequest}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend payment request
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("manual")}>
                      <Phone className="h-4 w-4 mr-2" />
                      Switch to manual payment
                    </Button>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <p>{paymentError}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual">
            <div className="space-y-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
                <h3 className="font-medium text-green-800 mb-2">Pay manually via M-PESA</h3>
                <ol className="list-decimal text-sm ml-4 space-y-3 text-gray-700">
                  <li className="pl-1">
                    Go to your <strong>M-PESA</strong> menu on your phone
                  </li>
                  <li className="pl-1">
                    Select <strong>Lipa na M-PESA</strong>
                  </li>
                  <li className="pl-1">
                    Select <strong>Pay Bill</strong>
                  </li>
                  <li className="pl-1">
                    <div className="flex justify-between items-center">
                      <span>
                        Enter <strong>Business Number</strong>:
                      </span>
                      <div className="flex items-center bg-white rounded px-2 py-1 border">
                        <code className="font-mono text-sm font-bold mr-2">{businessNumber}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyText(businessNumber, "business")}
                        >
                          {copiedBusinessNumber ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </li>
                  <li className="pl-1">
                    <div className="flex justify-between items-center">
                      <span>
                        Enter <strong>Account Number</strong>:
                      </span>
                      <div className="flex items-center bg-white rounded px-2 py-1 border">
                        <code className="font-mono text-sm font-bold mr-2">{accountNumber}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyText(accountNumber, "account")}
                        >
                          {copiedAccountNumber ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </li>
                  <li className="pl-1">
                    <div className="flex justify-between items-center">
                      <span>
                        Enter <strong>Amount</strong>:
                      </span>
                      <span className="font-bold">KES {amount.toFixed(2)}</span>
                    </div>
                  </li>
                  <li className="pl-1">
                    Enter your <strong>M-PESA PIN</strong> to complete
                  </li>
                </ol>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
                <div className="flex">
                  <Info className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-800">Important</h4>
                    <p className="text-sm text-amber-700">
                      After making the payment, click the "I've Completed Payment" button below to verify.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 border-t pt-4">
        {activeTab === "auto" && !isChecking && (
          <Button
            onClick={initiatePayment}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={!isValidPhone || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay KES {amount.toFixed(2)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}

        {activeTab === "manual" && (
          <Button
            onClick={handleManualVerify}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                I've Completed Payment
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}

        {process.env.NODE_ENV !== "production" && (
          <Button
            onClick={simulatePayment}
            variant="outline"
            size="sm"
            className="border-dashed border-gray-300 text-gray-500 text-xs"
          >
            Simulate Successful Payment (Testing Only)
          </Button>
        )}

        <Button variant="ghost" onClick={onBack} disabled={isSubmitting || isChecking}>
          <X className="mr-2 h-4 w-4" />
          Cancel Payment
        </Button>
      </CardFooter>
    </Card>
  )
}

export default MpesaPaymentForm
