"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useCart } from "@/contexts/cart/cart-context"
import { CreditCard, Smartphone, Shield, Wallet, Loader2, CheckCircle2, Clock, MapPin, ArrowLeft } from "lucide-react"
import { pesapalAPI } from "@/lib/api/pesapal"
import Image from "next/image"

interface PesapalPaymentMethodsProps {
  onMethodSelect: (method: string) => void
  onBack?: () => void
  amount?: number // Keep as optional fallback
  selectedMethod?: string
  onSelectMethod?: (method: string) => void
  order?: any // Keep for backward compatibility
}

export function PesapalPaymentMethods({
  onMethodSelect,
  onBack,
  amount: fallbackAmount,
  selectedMethod: externalSelectedMethod,
  onSelectMethod,
  order,
}: PesapalPaymentMethodsProps) {
  const { items, subtotal, shipping, total, cartTotal } = useCart()

  const [internalSelectedMethod, setInternalSelectedMethod] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [showPaymentForm, setShowPaymentForm] = useState<boolean>(false)
  const [pesapalSubOption, setPesapalSubOption] = useState<string>("")
  const [pesapalDetails, setPesapalDetails] = useState({
    email: "",
    password: "",
    mvisaPhone: "",
    mvisaEmail: "",
    firstName: "",
    lastName: "",
    phone: "",
  })
  const [cardDetails, setCardDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    country: "Kenya",
    mobile: "",
    address: "",
    city: "",
    postalCode: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    acceptTerms: false,
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [transactionId, setTransactionId] = useState<string>("")

  // Use external selected method if provided, otherwise use internal state
  const selectedMethod = externalSelectedMethod || internalSelectedMethod

  const displaySubtotal = subtotal || cartTotal || order?.subtotal || fallbackAmount || 0
  const displayShipping = shipping || 0

  // Calculate tax as 16% of subtotal (not extracting from total)
  const vatAmount = displaySubtotal > 0 ? Math.round(displaySubtotal * 0.16 * 100) / 100 : 0

  // Calculate final total including tax and shipping
  const displayAmount = displaySubtotal + vatAmount + displayShipping

  console.log("[v0] PesapalPaymentMethods - Real cart data:", {
    items: items?.length || 0,
    subtotal: displaySubtotal,
    shipping: displayShipping,
    tax: vatAmount,
    total: displayAmount,
    fallbackAmount,
    cartTotal,
    orderTotal: order?.total_amount || order?.total,
    finalCalculatedAmount: displayAmount,
  })

  const handleMethodChange = (methodId: string) => {
    if (onSelectMethod) {
      onSelectMethod(methodId)
    } else {
      setInternalSelectedMethod(methodId)
    }
    setShowPaymentForm(true)
    setPesapalSubOption("")
    setError("")
  }

  const handleProceed = async () => {
    setIsLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("mizizzi_token")

      const paymentAmount = displayAmount

      if (!paymentAmount || paymentAmount <= 0) {
        throw new Error("Invalid payment amount. Please refresh and try again.")
      }

      console.log("[v0] PesapalPaymentMethods - Initiating payment with amount:", paymentAmount)
      console.log(
        "[v0] PesapalPaymentMethods - Breakdown: Subtotal:",
        displaySubtotal,
        "Tax:",
        vatAmount,
        "Shipping:",
        displayShipping,
        "Total:",
        paymentAmount,
      )

      if (!token) {
        throw new Error("Please log in to complete your purchase")
      }

      if (!items || items.length === 0) {
        throw new Error("Your cart is empty")
      }

      const cartItems =
        items?.map((item) => ({
          product_id: item.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })) || []

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
      console.log("[v0] Creating order with backend:", backendUrl)
      console.log("[v0] Order data:", {
        items: cartItems,
        subtotal: displaySubtotal,
        shipping_cost: displayShipping,
        tax_amount: vatAmount,
        total_amount: displayAmount,
        payment_method: selectedMethod,
      })

      try {
        const healthCheck = await fetch(`${backendUrl}/api/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (!healthCheck.ok) {
          throw new Error("Backend server is not responding")
        }
      } catch (healthError) {
        console.error("[v0] Backend health check failed:", healthError)
        throw new Error(
          "Cannot connect to the server. Please ensure the backend is running on " +
            backendUrl +
            " or contact support.",
        )
      }

      let addressResponse
      try {
        addressResponse = await fetch(`${backendUrl}/api/addresses/user/default`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })
      } catch (fetchError) {
        console.error("[v0] Address fetch failed:", fetchError)
        const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error occurred"
        throw new Error(`Failed to fetch user address. Please check your connection. ${errorMessage}`)
      }

      let shippingAddress = null
      if (addressResponse.ok) {
        const addressData = await addressResponse.json()
        shippingAddress = addressData.address
      }

      // If no default address, create a basic one from available data
      if (!shippingAddress) {
        shippingAddress = {
          first_name: cardDetails.firstName || pesapalDetails.firstName || "Customer",
          last_name: cardDetails.lastName || pesapalDetails.lastName || "User",
          line_1: cardDetails.address || "Nairobi",
          city: "Nairobi",
          country_code: "KE",
          postal_code: "00100",
          phone: cardDetails.mobile || pesapalDetails.phone || pesapalDetails.mvisaPhone || "254700000000",
        }
      }

      let orderResponse
      try {
        orderResponse = await fetch(`${backendUrl}/api/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: cartItems,
            subtotal: displaySubtotal,
            shipping_cost: displayShipping,
            tax_amount: vatAmount,
            total_amount: displayAmount,
            payment_method: selectedMethod,
            payment_status: "pending",
            shipping_address: shippingAddress,
            billing_address: shippingAddress,
            shipping_method: "standard",
            notes: `Payment via ${selectedMethod}`,
          }),
          signal: AbortSignal.timeout(15000), // 15 second timeout
        })
      } catch (fetchError) {
        console.error("[v0] Order creation request failed:", fetchError)
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          throw new Error("Order creation timed out. Please try again.")
        }
        const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error occurred"
        throw new Error(`Failed to create order. ${errorMessage}`)
      }

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}))
        console.log("[v0] Order creation failed:", orderResponse.status, errorData)

        if (orderResponse.status === 401) {
          throw new Error("Authentication failed. Please log in again.")
        } else if (orderResponse.status === 500) {
          throw new Error("Server error. Please check if the backend is running on " + backendUrl)
        } else if (orderResponse.status === 503) {
          throw new Error("Service temporarily unavailable. Please try again later.")
        } else {
          throw new Error(errorData.message || `Failed to create order (Status: ${orderResponse.status})`)
        }
      }

      const orderData = await orderResponse.json()
      console.log("[v0] Order response data:", orderData)

      let orderId
      if (orderData.data && orderData.data.id) {
        orderId = orderData.data.id
      } else if (orderData.order && orderData.order.id) {
        orderId = orderData.order.id
      } else if (orderData.id) {
        orderId = orderData.id
      } else if (orderData.orderId) {
        orderId = orderData.orderId
      } else {
        console.error("[v0] Unexpected order response structure:", orderData)
        throw new Error("Order created but ID not found in response")
      }

      console.log("[v0] Order created successfully:", orderId)

      const paymentData = {
        subtotal: displaySubtotal,
        shipping_cost: displayShipping,
        tax_amount: vatAmount,
        cart_items: cartItems,
      }

      if (selectedMethod === "mpesa") {
        const response = await pesapalAPI.initiateMpesaPayment({
          phone_number: `254${phoneNumber}`,
          amount: displayAmount,
          order_id: orderId,
          description: `MIZIZZI Order #${orderId} - ${items?.length || 0} items - KES ${displayAmount}`,
          customer_email: pesapalDetails.email,
          subtotal: paymentData.subtotal,
          shipping_cost: paymentData.shipping_cost,
          tax_amount: paymentData.tax_amount,
          cart_items: paymentData.cart_items,
        })

        if (response.status === "success" && response.transaction_id) {
          setTransactionId(response.transaction_id)
          onMethodSelect(selectedMethod)
        } else {
          setError(response.message || "Failed to initiate M-PESA payment")
        }
      } else if (selectedMethod === "airtel") {
        const response = await pesapalAPI.initiateCardPayment({
          order_id: orderId,
          amount: displayAmount,
          currency: "KES",
          customer_email: pesapalDetails.email,
          customer_phone: `254${phoneNumber}`,
          description: `MIZIZZI Order #${orderId} - ${items?.length || 0} items - KES ${displayAmount}`,
          billing_address: {
            first_name: "Airtel",
            last_name: "User",
            line_1: "Nairobi",
            city: "Nairobi",
            country_code: "KE",
            postal_code: "00100",
          },
          callback_url: `${window.location.origin}/payment-success`,
          subtotal: paymentData.subtotal,
          shipping_cost: paymentData.shipping_cost,
          tax_amount: paymentData.tax_amount,
          cart_items: paymentData.cart_items,
        })

        if (response.status === "success" && response.redirect_url) {
          if (response.transaction_id) {
            setTransactionId(response.transaction_id)
            localStorage.setItem("pesapal_transaction_id", response.transaction_id)
          }
          window.location.href = response.redirect_url
        } else {
          setError(response.message || "Failed to initiate Airtel Money payment")
        }
      } else if (selectedMethod === "cards") {
        const response = await pesapalAPI.initiateCardPayment({
          order_id: orderId,
          amount: displayAmount,
          currency: "KES",
          customer_email: cardDetails.email,
          customer_phone: `254${cardDetails.mobile}`,
          description: `MIZIZZI Order #${orderId} - ${items?.length || 0} items - KES ${displayAmount}`,
          billing_address: {
            first_name: cardDetails.firstName,
            last_name: cardDetails.lastName,
            line_1: cardDetails.address,
            city: cardDetails.city,
            country_code: "KE",
            postal_code: cardDetails.postalCode,
          },
          callback_url: `${window.location.origin}/payment-success`,
          ...paymentData,
        })

        if (response.status === "success" && response.redirect_url) {
          if (response.transaction_id) {
            setTransactionId(response.transaction_id)
            localStorage.setItem("pesapal_transaction_id", response.transaction_id)
          }
          window.location.href = response.redirect_url
        } else {
          setError(response.message || "Failed to initiate card payment")
        }
      } else if (selectedMethod === "visa-ewallet") {
        if (pesapalSubOption === "ewallet") {
          const response = await pesapalAPI.initiateCardPayment({
            order_id: orderId,
            amount: displayAmount,
            currency: "KES",
            customer_email: pesapalDetails.email,
            customer_phone: "254700000000",
            description: `MIZIZZI E-wallet Order #${orderId} - ${items?.length || 0} items - KES ${displayAmount}`,
            billing_address: {
              first_name: "E-wallet",
              last_name: "User",
              line_1: "Nairobi",
              city: "Nairobi",
              country_code: "KE",
              postal_code: "00100",
            },
            callback_url: `${window.location.origin}/payment-success`,
            ...paymentData,
          })

          if (response.status === "success" && response.redirect_url) {
            if (response.transaction_id) {
              setTransactionId(response.transaction_id)
              localStorage.setItem("pesapal_transaction_id", response.transaction_id)
            }
            window.location.href = response.redirect_url
          } else {
            setError(response.message || "Failed to initiate e-wallet payment")
          }
        } else if (pesapalSubOption === "mvisa") {
          const response = await pesapalAPI.initiateCardPayment({
            order_id: orderId,
            amount: displayAmount,
            currency: "KES",
            customer_email: pesapalDetails.mvisaEmail,
            customer_phone: `254${pesapalDetails.mvisaPhone}`,
            description: `MIZIZZI mVisa Order #${orderId} - ${items?.length || 0} items - KES ${displayAmount}`,
            billing_address: {
              first_name: "mVisa",
              last_name: "User",
              line_1: "Nairobi",
              city: "Nairobi",
              country_code: "KE",
              postal_code: "00100",
            },
            callback_url: `${window.location.origin}/payment-success`,
            ...paymentData,
          })

          if (response.status === "success" && response.redirect_url) {
            if (response.transaction_id) {
              setTransactionId(response.transaction_id)
              localStorage.setItem("pesapal_transaction_id", response.transaction_id)
            }
            window.location.href = response.redirect_url
          } else {
            setError(response.message || "Failed to initiate mVisa payment")
          }
        }
      } else if (selectedMethod === "cash-on-delivery") {
        onMethodSelect(selectedMethod)
      }
    } catch (err) {
      console.error("[v0] Payment initiation error:", err)
      let errorMessage = "An unexpected error occurred"

      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          errorMessage =
            "Cannot connect to server. Please check your internet connection and ensure the backend server is running."
        } else if (err.message.includes("timeout") || err.name === "AbortError") {
          errorMessage = "Request timed out. Please check your connection and try again."
        } else if (err.message.includes("Backend server is not responding")) {
          errorMessage = "Backend server is not responding. Please contact support or try again later."
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToMethods = () => {
    setShowPaymentForm(false)
    setInternalSelectedMethod("")
    setPhoneNumber("")
    setPesapalSubOption("")
    setPesapalDetails({
      email: "",
      password: "",
      mvisaPhone: "",
      mvisaEmail: "",
      firstName: "",
      lastName: "",
      phone: "",
    })
    setCardDetails({
      firstName: "",
      lastName: "",
      email: "",
      country: "Kenya",
      mobile: "",
      address: "",
      city: "",
      postalCode: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      acceptTerms: false,
    })
    setError("")
    setIsLoading(false)
  }

  const paymentMethods = [
    {
      id: "mpesa",
      name: "M-PESA",
      description: "Mobile Money",
      logo: "/m-pesa-logo-green.png",
      icon: Smartphone,
      badges: ["Instant", "Secure"],
      color: "green",
      gradient: "from-green-50/80 to-green-100/80",
      hoverGradient: "from-green-100/90 to-green-200/90",
    },
    {
      id: "airtel",
      name: "Airtel Money",
      description: "Mobile Money",
      logo: "/airtel-money-logo-red.png",
      icon: Smartphone,
      badges: ["Instant", "Secure"],
      color: "red",
      gradient: "from-red-50/80 to-red-100/80",
      hoverGradient: "from-red-100/90 to-red-200/90",
    },
    {
      id: "cards",
      name: "Credit/Debit Cards",
      description: "Visa, Mastercard, Amex",
      logos: ["/visa-logo-blue.png", "/mastercard-logo-red-yellow.png", "/american-express-logo-blue.png"],
      icon: CreditCard,
      badges: ["All Cards", "Secure"],
      color: "blue",
      gradient: "from-blue-50/80 to-blue-100/80",
      hoverGradient: "from-blue-100/90 to-blue-200/90",
    },
    {
      id: "visa-ewallet",
      name: "Visa e-wallet",
      description: "Pesapal Wallet",
      logo: "/visa-logo-blue.png",
      icon: Wallet,
      badges: ["Digital", "Fast"],
      color: "blue",
      gradient: "from-blue-50/80 to-blue-100/80",
      hoverGradient: "from-blue-100/90 to-blue-200/90",
    },
    {
      id: "cash-on-delivery",
      name: "Cash on Delivery",
      description: "Pay when you receive",
      icon: () => <Image src="/cash.png" alt="Cash on Delivery" width={20} height={20} className="object-contain" />,
      badges: ["Trusted", "Convenient"],
      color: "emerald",
      gradient: "from-emerald-50/80 to-emerald-100/80",
      hoverGradient: "from-emerald-100/90 to-emerald-200/90",
    },
  ]

  if (showPaymentForm && selectedMethod) {
    const method = paymentMethods.find((m) => m.id === selectedMethod)

    return (
      <div className="w-full max-w-4xl mx-auto bg-white">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackToMethods}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 p-2"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to payment methods
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 text-red-800">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">!</span>
                </div>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative flex items-center justify-between p-5 rounded-2xl border-2 shadow-lg",
              `bg-gradient-to-br ${method?.gradient} border-${method?.color}-200`,
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12">
                {method?.logo ? (
                  <img
                    src={method?.logo || "/placeholder.svg"}
                    alt={method?.name}
                    className="h-8 object-contain filter drop-shadow-sm"
                  />
                ) : (
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-md",
                      `bg-${method?.color}-500`,
                    )}
                  >
                    {method?.icon && <method.icon className="w-6 h-6 text-white" />}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{method?.name}</h3>
                <p className="text-sm text-gray-600">{method?.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {method?.badges.map((badge) => (
                <span
                  key={badge}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full",
                    `bg-${method?.color}-500 text-white shadow-md`,
                  )}
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-gray-50/80 to-gray-100/80 border-2 border-gray-200/60 rounded-2xl p-6 shadow-lg backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-gray-600 text-sm">Order Summary</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  KES {displayAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-gray-500">to MIZIZZI STORE</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items ({items?.length || 0})</span>
                  <span className="font-medium">
                    KES {displaySubtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {displayShipping > 0
                      ? `KES ${displayShipping.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                      : "Free"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT (16%)</span>
                  <span className="font-medium">
                    KES {vatAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>KES {displayAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {selectedMethod === "visa-ewallet" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-5"
            >
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Option</h4>

                <RadioGroup value={pesapalSubOption} onValueChange={setPesapalSubOption}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <RadioGroupItem value="ewallet" id="ewallet" className="peer sr-only" />
                      <Label
                        htmlFor="ewallet"
                        className={cn(
                          "flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
                          pesapalSubOption === "ewallet"
                            ? "border-blue-400 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            pesapalSubOption === "ewallet" ? "border-blue-500 bg-blue-500" : "border-gray-300",
                          )}
                        >
                          {pesapalSubOption === "ewallet" && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <img src="/pesapal-logo.png" alt="Pesapal" className="h-6" />
                          <span className="text-sm font-medium">e-wallet pesapal</span>
                        </div>
                      </Label>
                    </div>

                    <div className="relative">
                      <RadioGroupItem value="mvisa" id="mvisa" className="peer sr-only" />
                      <Label
                        htmlFor="mvisa"
                        className={cn(
                          "flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
                          pesapalSubOption === "mvisa"
                            ? "border-blue-400 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            pesapalSubOption === "mvisa" ? "border-blue-500 bg-blue-500" : "border-gray-300",
                          )}
                        >
                          {pesapalSubOption === "mvisa" && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <img src="/visa-logo-blue.png" alt="mVISA" className="h-6" />
                          <span className="text-sm font-medium">mVISA</span>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {pesapalSubOption === "ewallet" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg"
                >
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <p className="text-gray-800 text-sm">
                      PesaPal will automatically deduct{" "}
                      <strong>
                        KES{" "}
                        {displayAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>{" "}
                      from your PesaPal Credit balance.
                    </p>
                  </div>

                  <h5 className="text-lg font-medium text-gray-900 mb-6">Enter Your Login Details</h5>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Email / Username:</label>
                      <input
                        type="text"
                        value={pesapalDetails.email}
                        onChange={(e) => setPesapalDetails({ ...pesapalDetails, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        placeholder=""
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Password:</label>
                      <input
                        type="password"
                        value={pesapalDetails.password}
                        onChange={(e) => setPesapalDetails({ ...pesapalDetails, password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        placeholder=""
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={handleProceed}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 text-sm font-medium rounded-md shadow-sm"
                        disabled={!pesapalDetails.email.trim() || !pesapalDetails.password.trim()}
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {pesapalSubOption === "mvisa" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg"
                >
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <p className="text-gray-800 text-sm leading-relaxed">
                      Enter your details to generate a QR-Code for your <strong>mVisa App</strong> Use the QR-Code from
                      your app to pay{" "}
                      <strong>
                        Ksh.{" "}
                        {displayAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>{" "}
                      for this transaction. Click complete to confirm your details and generate the QR-Code.
                    </p>
                  </div>

                  <h5 className="text-lg font-medium text-gray-900 mb-6">Enter Payment Details</h5>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">mVisa mobile number:</label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 py-3 bg-gray-100 border border-gray-300 rounded-md">
                          <span className="text-sm font-medium text-gray-900">+254</span>
                        </div>
                        <input
                          type="tel"
                          value={pesapalDetails.mvisaPhone}
                          onChange={(e) => setPesapalDetails({ ...pesapalDetails, mvisaPhone: e.target.value })}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                          placeholder=""
                          maxLength={9}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Email Address</label>
                      <input
                        type="email"
                        value={pesapalDetails.mvisaEmail}
                        onChange={(e) => setPesapalDetails({ ...pesapalDetails, mvisaEmail: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        placeholder="test@mizizzi.com"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={handleProceed}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 text-sm font-medium rounded-md shadow-sm"
                        disabled={!pesapalDetails.mvisaPhone.trim() || !pesapalDetails.mvisaEmail.trim()}
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {pesapalSubOption && (
                <div className="bg-white border-t border-gray-200 pt-6">
                  <div className="flex flex-col lg:flex-row items-center justify-center gap-6 text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                      <span>100% secure payments processed by</span>
                      <img src="/pesapal-logo.png" alt="Pesapal" className="h-5" />
                      <span>and secured by</span>
                      <span className="text-blue-600 font-medium">Verisign SSL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-sgAY9WQuUqG1sOzL00WWuHQTiGsk2w.png"
                        alt="Norton Secured"
                        className="h-5"
                      />
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-500 mt-3 max-w-2xl mx-auto">
                    In order to protect your card from unauthorised use, PesaPal may request further proof of card
                    ownership.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {selectedMethod === "mpesa" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-5"
            >
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-green-800">M-PESA Payment Instructions</h4>
                </div>

                <ol className="space-y-3 text-green-700">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                      1
                    </span>
                    <span className="text-sm">Provide your M-PESA mobile number below</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                      2
                    </span>
                    <span className="text-sm">Click Proceed and a prompt will appear on your phone</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                      3
                    </span>
                    <span className="text-sm">Enter your M-PESA PIN to confirm the transaction</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                      4
                    </span>
                    <span className="text-sm">You'll receive a confirmation SMS</span>
                  </li>
                </ol>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-5">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900">Enter your M-PESA number</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-r-none sm:border-r-0 shadow-inner">
                    <span className="text-xl mr-2">🇰🇪</span>
                    <span className="text-lg font-semibold text-gray-900">+254</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="7XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl sm:rounded-l-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 text-lg font-medium shadow-inner bg-white"
                    maxLength={9}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {selectedMethod === "airtel" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-5"
            >
              <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-md">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-red-800">Airtel Money Payment Instructions</h4>
                </div>

                <ol className="space-y-3 text-red-700">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                      1
                    </span>
                    <span className="text-sm">Provide your Airtel Money mobile number below</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                      2
                    </span>
                    <span className="text-sm">
                      Click Proceed and a prompt will appear on your phone requesting you to confirm transaction by
                      providing your Airtel Money PIN
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                      3
                    </span>
                    <span className="text-sm">
                      Once completed, you will receive the confirmation SMS for this transaction
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-5">
                  <Shield className="w-5 h-5 text-red-600" />
                  <span className="text-lg font-semibold text-gray-900">
                    Provide your Airtel Money [KE] Mobile number
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-r-none sm:border-r-0 shadow-inner">
                    <span className="text-xl mr-2">🇰🇪</span>
                    <span className="text-lg font-semibold text-gray-900">+254</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="e.g 07XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl sm:rounded-l-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 text-lg font-medium shadow-inner bg-white"
                    maxLength={10}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {selectedMethod === "cards" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6 shadow-md">
                <div className="text-center space-y-1">
                  <h4 className="text-lg font-semibold text-blue-800">Pay "MIZIZZI STORE"</h4>
                  <p className="text-blue-700 text-sm">
                    Pesapal will charge KES{" "}
                    {displayAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to
                    your card.
                  </p>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900">Provide your Card's Billing details</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <p className="text-blue-800 text-xs leading-relaxed">
                    Your billing details must match the details registered at your bank. Please ensure to use the
                    correct billing address should it be different from your current address of residency.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">First Name</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-600">👤</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={cardDetails.firstName}
                        onChange={(e) => setCardDetails({ ...cardDetails, firstName: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                        placeholder="Test"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={cardDetails.lastName}
                      onChange={(e) => setCardDetails({ ...cardDetails, lastName: e.target.value })}
                      className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                      placeholder="Customer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Email</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">✉️</span>
                        </div>
                      </div>
                      <input
                        type="email"
                        value={cardDetails.email}
                        onChange={(e) => setCardDetails({ ...cardDetails, email: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                        placeholder="test@mizizzi.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Country</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-sm">🇰🇪</span>
                      </div>
                      <select
                        value={cardDetails.country}
                        onChange={(e) => setCardDetails({ ...cardDetails, country: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner appearance-none"
                      >
                        <option value="Kenya">Kenya</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Tanzania">Tanzania</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl shadow-inner">
                        <span className="text-sm mr-1">🇰🇪</span>
                        <span className="text-sm font-semibold text-gray-900">+254</span>
                      </div>
                      <input
                        type="tel"
                        value={cardDetails.mobile}
                        onChange={(e) => setCardDetails({ ...cardDetails, mobile: e.target.value })}
                        className="flex-1 px-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                        placeholder="Mobile Number e.g 7XX XXX XXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Address</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">📍</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={cardDetails.address}
                        onChange={(e) => setCardDetails({ ...cardDetails, address: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                        placeholder="123TESTSTREET"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">City</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">🏙️</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={cardDetails.city}
                        onChange={(e) => setCardDetails({ ...cardDetails, city: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                        placeholder="Nairobi"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Postal Code</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">📮</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={cardDetails.postalCode}
                        onChange={(e) => setCardDetails({ ...cardDetails, postalCode: e.target.value })}
                        className="w-full pl-11 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                        placeholder="00100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900">Provide your Card details</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Card Number</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                        className="w-full pl-11 pr-16 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                        placeholder="Card Number"
                        maxLength={19}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-sgAY9WQuUqG1sOzL00WWuHQTiGsk2w.png"
                          alt="Norton Secured"
                          className="h-6"
                        />
                        <img src="/pci-dss-logo.png" alt="PCI DSS" className="h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Expiry Month</label>
                      <select
                        value={cardDetails.expiryMonth}
                        onChange={(e) => setCardDetails({ ...cardDetails, expiryMonth: e.target.value })}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner appearance-none"
                      >
                        <option value="">MM</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                            {String(i + 1).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Expiry Year</label>
                      <select
                        value={cardDetails.expiryYear}
                        onChange={(e) => setCardDetails({ ...cardDetails, expiryYear: e.target.value })}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner appearance-none"
                      >
                        <option value="">YYYY</option>
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={new Date().getFullYear() + i}>
                            {new Date().getFullYear() + i}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">CVV</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-600">🔒</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                          className="w-full pl-11 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm bg-white shadow-inner"
                          placeholder="CVV"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-3">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={cardDetails.acceptTerms}
                      onChange={(e) => setCardDetails({ ...cardDetails, acceptTerms: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="acceptTerms" className="text-xs text-gray-700 leading-relaxed">
                      I accept Pesapal's{" "}
                      <a href="#" className="text-blue-600 hover:underline font-medium">
                        Privacy
                      </a>{" "}
                      &{" "}
                      <a href="#" className="text-blue-600 hover:underline font-medium">
                        Terms and conditions
                      </a>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {selectedMethod === "cash-on-delivery" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                    <Image src="/cash.png" alt="Cash on Delivery" width={20} height={20} className="object-contain" />
                  </div>
                  <h4 className="text-lg font-semibold text-emerald-800">Cash on Delivery - Pay at Your Doorstep</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-emerald-200">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">100% Secure</p>
                      <p className="text-xs text-emerald-600">No upfront payment</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-emerald-200">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Fast Delivery</p>
                      <p className="text-xs text-emerald-600">1-3 business days</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-emerald-200">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Inspect First</p>
                      <p className="text-xs text-emerald-600">Check before paying</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 border border-emerald-200 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-emerald-800 mb-3">How Cash on Delivery Works:</h5>
                  <ol className="space-y-2 text-emerald-700">
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                        1
                      </span>
                      <span className="text-sm">Place your order - no payment required now</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                        2
                      </span>
                      <span className="text-sm">We'll call to confirm your order and delivery details</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                        3
                      </span>
                      <span className="text-sm">Your order is carefully packed and dispatched</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                        4
                      </span>
                      <span className="text-sm">Inspect your items and pay cash to our delivery agent</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <span className="text-lg font-semibold text-gray-900">Delivery Information</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-800">Your order will be delivered to:</span>
                    </div>
                    <div className="text-sm text-emerald-700 ml-6">
                      <p className="font-medium">Gilbert Bageni</p>
                      <p>Ruiru</p>
                      <p>Nairobi, Nairobi 00100</p>
                      <p>+0746741718</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Preferred Delivery Time</label>
                      <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 text-sm bg-white shadow-inner">
                        <option value="morning">Morning (9AM - 12PM)</option>
                        <option value="afternoon">Afternoon (12PM - 5PM)</option>
                        <option value="evening">Evening (5PM - 8PM)</option>
                        <option value="anytime">Anytime (9AM - 8PM)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Special Instructions (Optional)</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 text-sm bg-white shadow-inner"
                        placeholder="e.g., Call when you arrive"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs text-white font-bold">ℹ</span>
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Why choose Cash on Delivery with Mizizzi Store?</p>
                        <ul className="space-y-1 text-xs">
                          <li>
                            • <strong>No risk:</strong> Pay only after you receive and inspect your items
                          </li>
                          <li>
                            • <strong>Trusted service:</strong> Over 10,000+ successful deliveries
                          </li>
                          <li>
                            • <strong>Quality guarantee:</strong> Return items if they don't meet expectations
                          </li>
                          <li>
                            • <strong>Secure delivery:</strong> All packages are insured during transit
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span className="text-lg font-semibold">Mizizzi Store Guarantee</span>
                  </div>
                  <p className="text-emerald-100 text-sm max-w-2xl mx-auto">
                    We stand behind every product we sell. If you're not completely satisfied with your purchase, our
                    delivery agent will arrange a return at no extra cost to you.
                  </p>
                  <div className="flex items-center justify-center gap-6 text-xs font-medium pt-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Licensed Business</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Insured Deliveries</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleProceed}
              size="lg"
              className={cn(
                "w-full sm:w-auto text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
                selectedMethod === "airtel"
                  ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  : selectedMethod === "cards"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    : selectedMethod === "cash-on-delivery"
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                      : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
              )}
              disabled={
                isLoading ||
                ((selectedMethod === "mpesa" || selectedMethod === "airtel") && !phoneNumber.trim()) ||
                (selectedMethod === "cards" &&
                  (!cardDetails.acceptTerms || !cardDetails.cardNumber.trim() || !cardDetails.firstName.trim())) ||
                (selectedMethod === "visa-ewallet" &&
                  (!pesapalSubOption ||
                    (pesapalSubOption === "ewallet" &&
                      (!pesapalDetails.email.trim() || !pesapalDetails.password.trim())) ||
                    (pesapalSubOption === "mvisa" &&
                      (!pesapalDetails.mvisaPhone.trim() || !pesapalDetails.mvisaEmail.trim()))))
              }
            >
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading
                  ? "Processing..."
                  : selectedMethod === "mpesa" || selectedMethod === "airtel"
                    ? "Proceed"
                    : selectedMethod === "visa-ewallet"
                      ? "Complete"
                      : selectedMethod === "cash-on-delivery"
                        ? "Confirm Order"
                        : "Complete Payment"}
              </motion.span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Choose Your Payment Method</h2>
            <p className="text-gray-600 text-base">Select your preferred way to pay securely</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/80 border-2 border-blue-200/60 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm text-gray-600">Order Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  KES {displayAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>
                  {items?.length || 0} item{(items?.length || 0) !== 1 ? "s" : ""}
                </p>
                <p>Subtotal: KES {displaySubtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
                <p>
                  Shipping:{" "}
                  {displayShipping > 0
                    ? `KES ${displayShipping.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                    : "Free"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-green-600 mt-3">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium">256-bit SSL Encrypted • PCI DSS Compliant</span>
          </div>
        </div>

        <RadioGroup value={selectedMethod} onValueChange={handleMethodChange}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {paymentMethods.map((method) => {
              const isSelected = selectedMethod === method.id
              const IconComponent = method.icon

              return (
                <motion.div
                  key={method.id}
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <RadioGroupItem value={method.id} id={method.id} className="peer sr-only" />
                  <Label
                    htmlFor={method.id}
                    className={cn(
                      "group relative flex flex-col items-center justify-center p-6 md:p-7 h-44 md:h-48 border-2 rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-sm shadow-md hover:shadow-lg",
                      isSelected
                        ? `border-${method.color}-400 bg-gradient-to-br ${method.gradient} shadow-lg shadow-${method.color}-200/50 ring-2 ring-${method.color}-100`
                        : `border-gray-200/60 bg-white/90 hover:border-gray-300 hover:bg-gradient-to-br ${method.hoverGradient}`,
                    )}
                  >
                    <div className="flex items-center justify-center h-16 md:h-18 mb-4">
                      {method.logos ? (
                        <div className="flex items-center gap-2 md:gap-3">
                          {method.logos.map((logo, index) => (
                            <img
                              key={index}
                              src={logo || "/placeholder.svg"}
                              alt={`Payment method ${index + 1}`}
                              className="h-8 md:h-10 object-contain filter drop-shadow-sm"
                            />
                          ))}
                        </div>
                      ) : method.logo ? (
                        <img
                          src={method.logo || "/placeholder.svg"}
                          alt={method.name}
                          className="h-12 md:h-14 object-contain filter drop-shadow-sm"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-md",
                            `bg-${method.color}-500`,
                          )}
                        >
                          <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="text-center space-y-2 mb-4">
                      <h3 className="font-semibold text-gray-900 text-base md:text-lg tracking-tight">{method.name}</h3>
                      <p className="text-sm md:text-base text-gray-600 font-medium">{method.description}</p>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      {method.badges.map((badge) => (
                        <span
                          key={badge}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 shadow-sm",
                            isSelected
                              ? `bg-${method.color}-500 text-white shadow-md`
                              : "bg-gray-100 text-gray-700 group-hover:bg-gray-200 group-hover:shadow-md",
                          )}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </Label>
                </motion.div>
              )
            })}
          </div>
        </RadioGroup>

        <motion.div
          className="text-center pt-6 border-t border-gray-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-green-600" />
              <span>
                Regulated by the <strong className="text-gray-900">Central Bank of Kenya</strong>
              </span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>PCI DSS Level 1 Certified</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default PesapalPaymentMethods
