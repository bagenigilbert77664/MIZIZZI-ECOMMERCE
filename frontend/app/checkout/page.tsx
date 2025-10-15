"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { useCart } from "@/contexts/cart/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { CheckoutAddressForm } from "@/components/checkout/checkout-address-form"
import CheckoutSummary from "@/components/checkout/checkout-summary"
import PaymentSelection from "@/components/checkout/payment-selection"
import PesapalIntegration from "@/components/checkout/pesapal-integration"
import CashDeliveryPayment from "@/components/checkout/cash-delivery-payment"
import { CheckoutProgress } from "@/components/checkout/checkout-progress"
import { getAddressForCheckout } from "@/services/address"
import { CreditCard, ShieldCheck, AlertTriangle, CheckCircle2, MapPin } from "lucide-react"
import Link from "next/link"
import { createOrder } from "@/services/orders"
import { motion, AnimatePresence } from "framer-motion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PesapalPaymentModal } from "@/components/checkout/pesapal-payment-modal"

export default function CheckoutPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<"address" | "payment" | "confirmation">("address")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [shippingAddress, setShippingAddress] = useState<any>(null)
  const [selectedAddress, setSelectedAddress] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [order, setOrder] = useState<any>(null)

  const [showPesapalModal, setShowPesapalModal] = useState(false)
  const [pesapalPaymentUrl, setPesapalPaymentUrl] = useState("")
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const { items, shipping, total, isLoading: cartLoading, subtotal } = useCart()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/checkout")
      return
    }

    const loadAddress = async () => {
      try {
        const address = await getAddressForCheckout()
        if (address) {
          setShippingAddress(address)
          setSelectedAddress(address)
        }
      } catch (error) {
        console.error("Error loading address:", error)
      } finally {
        setIsLoadingAddresses(false)
      }
    }

    loadAddress()
  }, [isAuthenticated, router])

  const handleAddressSaved = (shippingAddr: any, billingAddr: any) => {
    setShippingAddress(shippingAddr)
    setSelectedAddress(shippingAddr)
    setActiveStep("payment")
  }

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method)
    if (method === "pesapal") {
      handlePesapalPayment()
    } else {
      setActiveStep("confirmation")
    }
  }

  const handlePesapalPayment = async () => {
    if (!isAuthenticated || !items || items.length === 0) {
      toast({
        title: "Invalid checkout",
        description: "Please ensure you're logged in and have items in your cart.",
        variant: "destructive",
      })
      return
    }

    if (!selectedAddress) {
      toast({
        title: "Address Required",
        description: "Please select a delivery address.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessingPayment(true)
      setIsSubmitting(true)
      setCheckoutError(null)

      console.log("[v0] Creating order with PENDING_PAYMENT status...")

      const realSubtotal = subtotal || 0
      const realShipping = shipping || 0
      const realTax = Math.round(realSubtotal * 0.16)
      const realTotal = total || realSubtotal + realShipping + realTax

      const orderPayload = {
        payment_method: "pesapal",
        shipping_address: selectedAddress,
        billing_address: selectedAddress,
        shipping_method: "standard",
        notes: "",
        cart_totals: {
          subtotal: realSubtotal,
          shipping: realShipping,
          tax: realTax,
          total: realTotal,
        },
      }

      console.log("[v0] Order payload:", orderPayload)
      console.log("[v0] Cart items count:", items.length)

      const response = await createOrder(orderPayload)

      if (response && response.success) {
        const orderData = response.data

        console.log("[v0] Order created with ID:", orderData.id)
        console.log("[v0] Order number:", orderData.order_number)

        const authToken = localStorage.getItem("mizizzi_token")

        if (!authToken) {
          throw new Error("Authentication token not found. Please log in again.")
        }

        const getCountryCode = (country: string): string => {
          const countryMap: Record<string, string> = {
            Kenya: "KE",
            Uganda: "UG",
            Tanzania: "TZ",
            Rwanda: "RW",
            Burundi: "BI",
            "South Sudan": "SS",
            Ethiopia: "ET",
            Somalia: "SO",
          }

          if (country && country.length === 2) {
            return country.toUpperCase()
          }

          return countryMap[country] || "KE"
        }

        const callbackUrl = `${window.location.origin}/payment-success`
        console.log("[v0] Using callback URL:", callbackUrl)

        const paymentData = {
          order_id: orderData.order_number || orderData.id,
          amount: realTotal,
          currency: "KES",
          description: `MIZIZZI Order #${orderData.order_number || orderData.id}`,
          customer_email: user?.email || selectedAddress.email,
          customer_phone: user?.phone || selectedAddress.phone,
          callback_url: callbackUrl,
          billing_address: {
            first_name: selectedAddress.first_name,
            last_name: selectedAddress.last_name,
            email_address: selectedAddress.email,
            phone_number: selectedAddress.phone,
            line_1: selectedAddress.address_line1,
            city: selectedAddress.city,
            country_code: getCountryCode(selectedAddress.country || "Kenya"),
            postal_code: selectedAddress.postal_code,
          },
        }

        console.log("[v0] Initiating Pesapal payment request:", paymentData)

        // Call backend to create Pesapal payment request
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

        const pesapalResponse = await fetch(`${backendUrl}/api/pesapal/card/initiate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(paymentData),
        })

        const pesapalResult = await pesapalResponse.json()

        console.log("[v0] Pesapal response:", pesapalResult)

        if (pesapalResult.status === "success" && pesapalResult.redirect_url) {
          // Save order data to localStorage for confirmation page
          try {
            const orderItems = items.map((item: any) => ({
              id: item.id,
              product_id: item.product_id || item.id,
              product_name: item.name || item.product_name,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              thumbnail_url: item.thumbnail_url || item.image_url || item.image,
              product: {
                name: item.name || item.product_name,
                thumbnail_url: item.thumbnail_url || item.image_url || item.image,
                image_urls: item.image_urls || [item.thumbnail_url || item.image_url || item.image],
              },
            }))

            localStorage.setItem("lastOrderItems", JSON.stringify(orderItems))
            localStorage.setItem(
              "lastOrderDetails",
              JSON.stringify({
                orderId: orderData.order_number || orderData.id,
                total: realTotal,
                date: new Date().toISOString(),
                shippingAddress: {
                  first_name: selectedAddress.first_name,
                  last_name: selectedAddress.last_name,
                  email: selectedAddress.email,
                  phone: selectedAddress.phone,
                  address_line1: selectedAddress.address_line1,
                  address_line2: selectedAddress.address_line2,
                  city: selectedAddress.city,
                  state: selectedAddress.state,
                  postal_code: selectedAddress.postal_code,
                  country: selectedAddress.country,
                },
                paymentMethod: "pesapal",
                pesapalTrackingId: pesapalResult.order_tracking_id,
              }),
            )

            console.log("[v0] Saved order data to localStorage")
          } catch (storageError) {
            console.error("[v0] Error saving order data to localStorage:", storageError)
          }

          setOrder({
            id: orderData.id,
            order_number: orderData.order_number || orderData.id,
            status: orderData.status || "pending",
            total_amount: realTotal,
            created_at: orderData.created_at || new Date().toISOString(),
          })

          setPesapalPaymentUrl(pesapalResult.redirect_url)
          setShowPesapalModal(true)

          toast({
            title: "Payment Ready",
            description: "Complete your payment in the secure payment window.",
          })
        } else {
          throw new Error(pesapalResult.message || pesapalResult.error || "Failed to create payment request")
        }
      } else {
        throw new Error(response?.error || "Failed to create order")
      }
    } catch (error: any) {
      console.error("[v0] Pesapal payment error:", error)

      let errorMessage = "An error occurred while processing your payment."
      let errorTitle = "Payment Failed"

      if (error.message && error.message.includes("Transaction amount exceeds limit")) {
        errorTitle = "Payment Amount Limit Exceeded"
        errorMessage =
          "The payment amount exceeds the current transaction limit for the Pesapal sandbox environment. " +
          "This is a temporary limitation during testing. Please try with a smaller amount (under KES 1,000) " +
          "or contact support to enable production payment processing for higher amounts."

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
          duration: 10000,
        })

        setCheckoutError(errorMessage)
        setIsProcessingPayment(false)
        setIsSubmitting(false)
        return
      }

      // Check for stock-related errors
      if (error.response?.data?.error) {
        const apiError = error.response.data.error

        if (apiError.includes("Insufficient stock") || apiError.includes("out of stock")) {
          errorTitle = "Stock Unavailable"
          errorMessage = apiError + ". Please remove the item from your cart or reduce the quantity."

          // Redirect to cart page after showing error
          setTimeout(() => {
            router.push("/cart")
          }, 3000)
        } else {
          errorMessage = apiError
        }
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      setCheckoutError(errorMessage)
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
      setIsProcessingPayment(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (paymentMethod?: string) => {
    const methodToUse = paymentMethod || selectedPaymentMethod

    if (!isAuthenticated || !items || items.length === 0) {
      toast({
        title: "Invalid checkout",
        description: "Please ensure you're logged in and have items in your cart.",
        variant: "destructive",
      })
      return
    }

    if (!selectedAddress) {
      toast({
        title: "Address Required",
        description: "Please select a delivery address.",
        variant: "destructive",
      })
      return
    }

    if (!methodToUse) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      setCheckoutError(null)

      const realSubtotal = subtotal || 0
      const realShipping = shipping || 0
      const realTax = Math.round(realSubtotal * 0.16)
      const realTotal = total || realSubtotal + realShipping + realTax

      const orderPayload = {
        payment_method: methodToUse === "pesapal" ? "pesapal" : "cash_on_delivery",
        shipping_address: selectedAddress,
        billing_address: selectedAddress,
        shipping_method: "standard",
        notes: "",
        cart_totals: {
          subtotal: realSubtotal,
          shipping: realShipping,
          tax: realTax,
          total: realTotal,
        },
      }

      console.log("[v0] Creating order:", orderPayload)

      const response = await createOrder(orderPayload)

      if (response && response.success) {
        const orderData = response.data

        setOrder({
          id: orderData.id,
          order_number: orderData.order_number || orderData.id,
          status: orderData.status || "pending",
          total_amount: realTotal,
          created_at: orderData.created_at || new Date().toISOString(),
        })

        try {
          // Format cart items for localStorage
          const orderItems = items.map((item: any) => ({
            id: item.id,
            product_id: item.product_id || item.id,
            product_name: item.name || item.product_name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            thumbnail_url: item.thumbnail_url || item.image_url || item.image,
            product: {
              name: item.name || item.product_name,
              thumbnail_url: item.thumbnail_url || item.image_url || item.image,
              image_urls: item.image_urls || [item.thumbnail_url || item.image_url || item.image],
            },
          }))

          localStorage.setItem("lastOrderItems", JSON.stringify(orderItems))
          localStorage.setItem(
            "lastOrderDetails",
            JSON.stringify({
              orderId: orderData.order_number || orderData.id,
              total: realTotal,
              date: new Date().toISOString(),
              shippingAddress: {
                first_name: selectedAddress.first_name,
                last_name: selectedAddress.last_name,
                email: selectedAddress.email,
                phone: selectedAddress.phone,
                address_line1: selectedAddress.address_line1,
                address_line2: selectedAddress.address_line2,
                city: selectedAddress.city,
                state: selectedAddress.state,
                postal_code: selectedAddress.postal_code,
                country: selectedAddress.country,
              },
              paymentMethod: methodToUse,
            }),
          )

          console.log("[v0] Saved order data to localStorage for confirmation page")
        } catch (storageError) {
          console.error("[v0] Error saving order data to localStorage:", storageError)
        }

        toast({
          title: "Order Created Successfully",
          description: `Please complete your payment of KES ${realTotal.toLocaleString()}.`,
        })
      } else {
        throw new Error(response?.error || "Failed to create order")
      }
    } catch (error: any) {
      console.error("[v0] Checkout error:", error)

      let errorMessage = "An error occurred while processing your order."
      let errorTitle = "Checkout Failed"

      // Check for stock-related errors
      if (error.response?.data?.error) {
        const apiError = error.response.data.error

        if (apiError.includes("Insufficient stock") || apiError.includes("out of stock")) {
          errorTitle = "Stock Unavailable"
          errorMessage = apiError + ". Please remove the item from your cart or reduce the quantity."

          // Redirect to cart page after showing error
          setTimeout(() => {
            router.push("/cart")
          }, 3000)
        } else {
          errorMessage = apiError
        }
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      setCheckoutError(errorMessage)
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = authLoading || isLoadingAddresses

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-cherry-600 border-t-transparent"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading your checkout experience...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="bg-white p-8 shadow-md rounded-xl">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-6 rounded-full bg-cherry-50 p-6 shadow-sm">
              <CreditCard className="h-12 w-12 text-cherry-600" />
            </div>
            <h2 className="mb-3 text-xl font-bold text-gray-800">Authentication Required</h2>
            <p className="mb-8 max-w-md text-center text-gray-600 leading-relaxed">
              Please log in to your account to continue with your purchase. Your cart items will be saved.
            </p>
            <Button
              asChild
              size="lg"
              className="px-8 py-6 h-auto text-base font-medium bg-cherry-600 hover:bg-cherry-700 text-white rounded-lg"
            >
              <Link href="/auth/login?redirect=/checkout">LOG IN TO CONTINUE</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some items to your cart before proceeding to checkout.</p>
            <Button onClick={() => router.push("/products")}>Continue Shopping</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
          <div className="flex items-center text-sm text-green-600">
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            <span>Secure Transaction</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CheckoutProgress
              activeStep={activeStep === "address" ? 1 : activeStep === "payment" ? 2 : 3}
              steps={["Delivery", "Payment", "Confirmation"]}
            />

            {checkoutError && (
              <Alert variant="destructive" className="mt-4 mb-2">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertDescription>{checkoutError}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeStep} className="mt-6">
              <TabsContent value="address">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="address-step"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b px-6 py-4">
                        <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
                          <MapPin className="mr-2 h-5 w-5 text-cherry-600" />
                          Shipping & Billing Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <CheckoutAddressForm initialData={shippingAddress} onAddressSaved={handleAddressSaved} />
                      </CardContent>
                    </Card>

                    <div className="mt-6 flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/cart")}
                        className="border-gray-300 text-gray-700"
                      >
                        Return to Cart
                      </Button>
                      <Button
                        onClick={() => setActiveStep("payment")}
                        disabled={!selectedAddress}
                        className="bg-cherry-600 hover:bg-cherry-700 text-white"
                      >
                        Continue to Payment
                      </Button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="payment">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="payment-step"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b px-6 py-4">
                        <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
                          <CreditCard className="mr-2 h-5 w-5 text-cherry-600" />
                          Choose Payment Method
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {selectedAddress && (
                          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium text-gray-700">Delivery Address</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveStep("address")}
                                className="h-8 text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50"
                              >
                                Change
                              </Button>
                            </div>
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-gray-600">
                                <p className="font-medium text-gray-700">
                                  {selectedAddress.first_name} {selectedAddress.last_name}
                                </p>
                                <p>{selectedAddress.address_line1}</p>
                                {selectedAddress.address_line2 && <p>{selectedAddress.address_line2}</p>}
                                <p>
                                  {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
                                </p>
                                <p className="mt-1">+{selectedAddress.phone}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <PaymentSelection
                          selectedMethod={selectedPaymentMethod || ""}
                          onMethodSelect={handlePaymentMethodSelect}
                          amount={total || 0}
                        />

                        <div className="flex justify-between mt-6">
                          <Button variant="outline" onClick={() => setActiveStep("address")}>
                            Back
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="confirmation">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="confirmation-step"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-0 shadow-md rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b px-6 py-4">
                        <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
                          <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
                          Complete Payment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {selectedPaymentMethod === "pesapal" && (
                          <PesapalIntegration
                            amount={total || 0}
                            orderId={order?.id || null}
                            customerEmail={user?.email || ""}
                            customerPhone={user?.phone || shippingAddress?.phone || ""}
                            onBack={() => setActiveStep("payment")}
                          />
                        )}

                        {selectedPaymentMethod === "cod" && (
                          <CashDeliveryPayment
                            amount={total || 0}
                            orderId={order?.id || null}
                            onBack={() => setActiveStep("payment")}
                            onCreateOrder={() => handleSubmit("cod")}
                            isCreatingOrder={isSubmitting}
                          />
                        )}

                        {!selectedPaymentMethod && (
                          <div className="text-center py-8">
                            <p className="text-gray-600 mb-4">No payment method selected</p>
                            <Button variant="outline" onClick={() => setActiveStep("payment")}>
                              Select Payment Method
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <CheckoutSummary
              isSubmitting={isSubmitting}
              activeStep={activeStep === "address" ? 1 : activeStep === "payment" ? 2 : 3}
              handleSubmit={() => handleSubmit()}
            />
          </div>
        </div>
      </motion.div>
      <PesapalPaymentModal
        isOpen={showPesapalModal}
        onClose={() => {
          setShowPesapalModal(false)
          setIsProcessingPayment(false)
        }}
        paymentUrl={pesapalPaymentUrl}
        orderId={order?.order_number || ""}
        orderTotal={total || 0}
      />
    </div>
  )
}
