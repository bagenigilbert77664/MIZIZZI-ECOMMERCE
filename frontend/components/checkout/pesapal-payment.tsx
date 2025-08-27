"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, CreditCard, Loader2, Shield, Lock, ArrowRight, Star, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import PesapalPaymentMethods from "./pesapal-payment-methods"
import { useCart } from "@/contexts/cart/cart-context" // Fixed import path from context to contexts

export interface PesapalPaymentProps {
  orderId?: string | number
  amount?: number
  order?: any
  onSuccess?: () => void
  onPaymentComplete?: () => Promise<void>
  onBack?: () => void
  redirectUrl?: string
  customerEmail?: string
  customerPhone?: string
  selectedPaymentMethod?: string | null
  onPaymentMethodSelect?: (method: string) => void
}

export function PesapalPayment({
  orderId,
  amount,
  order,
  onSuccess,
  onPaymentComplete,
  onBack,
  redirectUrl,
  customerEmail,
  customerPhone,
  selectedPaymentMethod: externalSelectedMethod,
  onPaymentMethodSelect,
}: PesapalPaymentProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState(customerEmail || "")
  const [phone, setPhone] = useState(customerPhone || "")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState(0)
  const [currentStep, setCurrentStep] = useState<"method-selection" | "customer-details" | "processing">(
    "method-selection",
  )
  const [internalSelectedMethod, setInternalSelectedMethod] = useState<string>("")

  const selectedPaymentMethod = externalSelectedMethod || internalSelectedMethod

  const { toast } = useToast()
  const router = useRouter()
  const { items: cartItems, subtotal: cartSubtotal, shipping: cartShipping, total: cartTotal } = useCart() // Get real cart data for payment calculation

  const paymentAmount = amount || (order ? order.total_amount : 0)
  const orderIdToUse = orderId || (order ? order.id : null)

  console.log("[v0] PesapalPayment - amount prop:", amount)
  console.log("[v0] PesapalPayment - order:", order)
  console.log("[v0] PesapalPayment - calculated paymentAmount:", paymentAmount)
  console.log("[v0] PesapalPayment - cart data:", {
    items: cartItems?.length || 0,
    subtotal: cartSubtotal,
    shipping: cartShipping,
    total: cartTotal,
    finalAmount: paymentAmount,
  })

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  }

  const stepVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "backOut",
      },
    },
  }

  const sparkleVariants = {
    animate: {
      scale: [1, 1.2, 1],
      rotate: [0, 180, 360],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      },
    },
  }

  useEffect(() => {
    if (loading) {
      const steps = [
        "Validating payment details...",
        "Connecting to Pesapal...",
        "Generating secure payment link...",
        "Redirecting to payment gateway...",
      ]

      let currentStep = 0
      const interval = setInterval(() => {
        if (currentStep < steps.length - 1) {
          currentStep++
          setProcessingStep(currentStep)
        } else {
          clearInterval(interval)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [loading])

  const formatPhoneNumber = (phoneNumber: string) => {
    let cleaned = phoneNumber.replace(/\D/g, "")

    if (cleaned.startsWith("0")) {
      cleaned = "254" + cleaned.substring(1)
    } else if (!cleaned.startsWith("254") && cleaned.length > 0) {
      cleaned = "254" + cleaned
    }

    return cleaned
  }

  const validateForm = () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return false
    }

    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number")
      return false
    }

    if (!firstName.trim()) {
      setError("Please enter your first name")
      return false
    }

    if (!lastName.trim()) {
      setError("Please enter your last name")
      return false
    }

    return true
  }

  const handlePaymentMethodSelect = (method: string) => {
    setInternalSelectedMethod(method)
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(method)
    }
    setCurrentStep("customer-details")
  }

  const handleBackToMethodSelection = () => {
    setCurrentStep("method-selection")
    setInternalSelectedMethod("")
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect("")
    }
  }

  const handlePayment = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)
    setProcessingStep(0)
    setCurrentStep("processing")

    try {
      const realSubtotal = cartSubtotal || 0 // Calculate real cart totals for payment
      const realShipping = cartShipping || 0
      const realTax = Math.round(realSubtotal * 0.16) // 16% VAT
      const realTotal = paymentAmount || realSubtotal + realShipping + realTax

      const cartItemsData =
        cartItems?.map((item) => ({
          // Prepare cart items data for backend validation
          product_id: item.product_id,
          name: item.product?.name || `Product ${item.product_id}`,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })) || []

      const paymentData = {
        amount: realTotal, // Use calculated real total
        currency: "KES",
        description: `MIZIZZI Order Payment - ${orderIdToUse || "Direct Payment"}`,
        customer_email: email,
        customer_phone: formatPhoneNumber(phone),
        preferred_payment_method: selectedPaymentMethod,
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          email_address: email,
          phone_number: formatPhoneNumber(phone),
          line_1: "Nairobi",
          city: "Nairobi",
          country_code: "KE",
          postal_code: "00100",
        },
        merchant_reference: orderIdToUse ? `ORDER_${orderIdToUse}` : undefined,
        cart_items: cartItemsData, // Add real cart data for backend validation
        subtotal: realSubtotal,
        shipping_cost: realShipping,
        tax_amount: realTax,
        discount_amount: 0, // TODO: Add discount calculation if needed
      }

      console.log("[v0] Sending Pesapal payment request with real cart data:", paymentData)

      const response = await api.post("/api/pesapal/payment", paymentData)

      console.log("[v0] Pesapal payment response:", response.data)

      if (response.data.success && response.data.redirect_url) {
        setPaymentUrl(response.data.redirect_url)

        toast({
          title: "Payment link generated!",
          description: "Redirecting to secure payment gateway...",
        })

        setTimeout(() => {
          if (response.data.redirect_url) {
            window.location.href = response.data.redirect_url
          }
        }, 2000)
      } else {
        throw new Error(response.data.message || response.data.error || "Failed to create payment request")
      }
    } catch (err: any) {
      console.error("[v0] Pesapal payment error:", err)

      let errorMessage = "An error occurred while processing your payment"

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: errorMessage,
      })
      setCurrentStep("customer-details")
    } finally {
      setLoading(false)
    }
  }

  const processingSteps = [
    "Validating payment details...",
    "Connecting to Pesapal...",
    "Generating secure payment link...",
    "Redirecting to payment gateway...",
  ]

  if (currentStep === "method-selection") {
    return (
      <PesapalPaymentMethods
        onMethodSelect={handlePaymentMethodSelect}
        onBack={onBack}
        amount={paymentAmount}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={handlePaymentMethodSelect}
      />
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full max-w-lg mx-auto">
      <Card className="overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 border-0 shadow-2xl shadow-blue-500/10">
        <CardHeader className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-indigo-400/20"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />

          <div className="relative z-10">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <motion.div
                className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <CreditCard className="h-6 w-6" />
              </motion.div>
              <span>
                {selectedPaymentMethod === "mpesa"
                  ? "M-PESA Payment"
                  : selectedPaymentMethod === "airtel"
                    ? "Airtel Money Payment"
                    : selectedPaymentMethod === "visa"
                      ? "Visa Payment"
                      : selectedPaymentMethod === "mastercard"
                        ? "Mastercard Payment"
                        : selectedPaymentMethod === "amex"
                          ? "American Express Payment"
                          : "Pesapal Payment"}
              </span>
              <motion.div variants={sparkleVariants} animate="animate" className="ml-auto">
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </motion.div>
            </CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              Secure payment powered by Pesapal - Kenya's trusted payment gateway
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Payment Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {success ? (
            <motion.div variants={stepVariants} initial="hidden" animate="visible" className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <CheckCircle className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-6">Your payment has been processed successfully.</p>
              <Button
                onClick={() => {
                  if (onSuccess) onSuccess()
                  else if (redirectUrl) router.push(redirectUrl)
                  else if (orderIdToUse) router.push(`/order-confirmation/${orderIdToUse}`)
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Continue to Order Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ) : loading ? (
            <motion.div variants={stepVariants} initial="hidden" animate="visible" className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </motion.div>

              <h3 className="text-xl font-semibold text-gray-800 mb-4">Processing Payment</h3>

              <div className="space-y-3">
                {processingSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: index <= processingStep ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ delay: index * 0.2 }}
                    className={cn(
                      "flex items-center gap-3 text-sm",
                      index <= processingStep ? "text-blue-600" : "text-gray-400",
                    )}
                  >
                    <motion.div
                      animate={index === processingStep ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                      className={cn("w-2 h-2 rounded-full", index <= processingStep ? "bg-blue-500" : "bg-gray-300")}
                    />
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div variants={stepVariants} initial="hidden" animate="visible" className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Amount to Pay</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    KES {Number(paymentAmount).toLocaleString()}
                  </span>
                </div>
                {cartSubtotal && (
                  <div className="mt-4 pt-4 border-t border-blue-200 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({cartItems?.length || 0} items)</span>
                      <span>KES {cartSubtotal.toLocaleString()}</span>
                    </div>
                    {cartShipping > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span>KES {cartShipping.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>VAT (16%)</span>
                      <span>KES {Math.round(cartSubtotal * 0.16).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                  <span className="text-sm text-gray-500">Payment Method</span>
                  <span className="text-sm font-medium text-blue-600 capitalize">
                    {selectedPaymentMethod === "mpesa"
                      ? "M-PESA"
                      : selectedPaymentMethod === "airtel"
                        ? "Airtel Money"
                        : selectedPaymentMethod === "visa"
                          ? "Visa"
                          : selectedPaymentMethod === "mastercard"
                            ? "Mastercard"
                            : selectedPaymentMethod === "amex"
                              ? "American Express"
                              : selectedPaymentMethod}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Enter your phone number for payment notifications</p>
              </div>
            </motion.div>
          )}
        </CardContent>

        {!success && !loading && (
          <CardFooter className="px-8 pb-8 pt-0">
            <div className="w-full space-y-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />
                  <span className="relative z-10 flex items-center gap-3">
                    <Lock className="h-5 w-5" />
                    Pay with{" "}
                    {selectedPaymentMethod === "mpesa"
                      ? "M-PESA"
                      : selectedPaymentMethod === "airtel"
                        ? "Airtel Money"
                        : selectedPaymentMethod === "visa"
                          ? "Visa"
                          : selectedPaymentMethod === "mastercard"
                            ? "Mastercard"
                            : selectedPaymentMethod === "amex"
                              ? "American Express"
                              : "Pesapal"}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>

              <Button
                variant="outline"
                onClick={handleBackToMethodSelection}
                disabled={loading}
                className="w-full h-12 border-gray-200 hover:bg-gray-50 rounded-xl bg-transparent"
              >
                Back to Payment Methods
              </Button>

              <div className="flex items-center justify-center gap-6 pt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="h-4 w-4 text-blue-500" />
                  <span>PCI Compliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Trusted by 1M+</span>
                </div>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  )
}

export default PesapalPayment
