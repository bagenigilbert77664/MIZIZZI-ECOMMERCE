"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { useCart } from "@/contexts/cart/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { CheckoutAddressForm } from "@/components/checkout/checkout-address-form"
import CheckoutSummary from "@/components/checkout/checkout-summary"
import PaymentMethods from "@/components/checkout/pesapal-payment-methods"
import PesapalPayment from "@/components/checkout/pesapal-payment"
import CashDeliveryPayment from "@/components/checkout/cash-delivery-payment"
import { CheckoutProgress } from "@/components/checkout/checkout-progress"
import { getAddressForCheckout } from "@/services/address"
import { Loader2, CreditCard, ShieldCheck, AlertTriangle, CheckCircle2, MapPin } from "lucide-react"
import Link from "next/link"
import { createOrder } from "@/services/orders"
import { motion, AnimatePresence } from "framer-motion"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Define the steps in the checkout process
const STEPS = ["DELIVERY", "PAYMENT", "CONFIRMATION"]

export default function CheckoutPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<"address" | "payment" | "confirmation">("address")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [selectedPesapalMethod, setSelectedPesapalMethod] = useState<string | null>(null)
  const [shippingAddress, setShippingAddress] = useState<any>(null)
  const [billingAddress, setBillingAddress] = useState<any>(null)
  const [sameAsShipping, setSameAsShipping] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [paymentRedirect, setPaymentRedirect] = useState<string | null>(null)
  const completeOrderButtonRef = useRef<HTMLButtonElement | null>(null)

  const [steps, setSteps] = useState(["Delivery", "Payment", "Confirmation"])
  const [selectedAddress, setSelectedAddress] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderData, setOrderData] = useState<{
    id: string | number
    order_number: string
    status: string
    total_amount: number
    created_at: string
    items: any[]
    subtotal?: number
    shipping_cost?: number
  } | null>(null)
  const [isValidatingCart, setIsValidatingCart] = useState(false)
  const [cartValidationIssues, setCartValidationIssues] = useState<{
    stockIssues: any[]
    priceChanges: any[]
  }>({ stockIssues: [], priceChanges: [] })

  // Store cart items before clearing
  const [preservedItems, setPreservedItems] = useState<any[]>([])
  const [preservedSubtotal, setPreservedSubtotal] = useState(0)
  const [preservedShipping, setPreservedShipping] = useState(0)
  const [preservedTotal, setPreservedTotal] = useState(0)
  const [preservedTax, setPreservedTax] = useState(0)

  const {
    items,
    shipping,
    total,
    isLoading: cartLoading,
    error: cartError,
    subtotal,
    refreshCart,
    clearCart: clearCartContext,
  } = useCart()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/checkout")
      return
    }

    // Load default address
    const loadAddress = async () => {
      try {
        const address = await getAddressForCheckout()
        if (address) {
          setShippingAddress(address)
          setSelectedAddress(address)
          if (sameAsShipping) {
            setBillingAddress(address)
          }
        }
      } catch (error) {
        console.error("Error loading address:", error)
      }
    }

    loadAddress()
  }, [isAuthenticated, router, sameAsShipping])

  const handleAddressSaved = (shippingAddr: any, billingAddr: any) => {
    setShippingAddress(shippingAddr)
    setSelectedAddress(shippingAddr)
    setBillingAddress(billingAddr)
    setActiveStep("payment")
  }

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method)
  }

  const handlePesapalMethodSelect = (method: string) => {
    setSelectedPesapalMethod(method)
  }

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with checkout.",
        variant: "destructive",
      })
      return
    }

    if (!items || (items.length === 0 && !orderPlaced)) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Add items before checking out.",
        variant: "destructive",
      })
      return
    }

    // Final validation before submission
    if (!validateStep()) {
      return
    }

    if (isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)
      setCheckoutError(null)

      if (!selectedAddress) {
        throw new Error("Please select a delivery address")
      }

      if (!selectedPaymentMethod) {
        throw new Error("Please select a payment method")
      }

      // Preserve cart data before clearing
      if (items) {
        setPreservedItems(
          items.map((item) => ({
            ...item,
            product: {
              ...item.product,
              name: item.product?.name || "Product",
              thumbnail_url: item.product?.thumbnail_url || item.product?.image_urls?.[0] || null,
            },
          })),
        )
      }
      setPreservedSubtotal(subtotal || 0)
      setPreservedShipping(shipping || 0)
      setPreservedTotal(total || 0)
      setPreservedTax(Math.round((subtotal || 0) * 0.16))

      const orderPayload = {
        payment_method: selectedPaymentMethod === "pesapal" ? "pesapal" : "cash_on_delivery",
        shipping_address: selectedAddress,
        billing_address: selectedAddress,
        shipping_method: "standard",
        notes: "",
      }

      console.log("[v0] Sending order payload to backend:", orderPayload)

      const response = await createOrder(orderPayload)

      console.log("[v0] Backend response:", response)

      if (response && response.success) {
        const orderData = response.data

        const correctTotalAmount = total || subtotal || 0

        setOrder({
          id: orderData.id,
          order_number: orderData.order_number || orderData.id,
          status: orderData.status || "pending",
          total_amount: correctTotalAmount, // Use cart total instead of potentially incorrect backend total
          created_at: orderData.created_at || new Date().toISOString(),
        })

        // Move to confirmation step
        setActiveStep("confirmation")

        toast({
          title: "Order Placed Successfully",
          description: `Your order has been placed. Please complete the payment.`,
        })
      } else {
        throw new Error(response?.error || "Failed to process order. Please try again.")
      }
    } catch (error: any) {
      console.error("[v0] Checkout error:", error)

      let errorMessage = "An error occurred while processing your order. Please try again."

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error.response) {
        const status = error.response.status
        const data = error.response.data

        if (status === 400) {
          errorMessage = "Invalid order data. Please check your information and try again."
          if (data?.error) errorMessage = data.error
          if (data?.message) errorMessage = data.message
          if (data?.detail) errorMessage = data.detail
        } else if (status === 401) {
          errorMessage = "Authentication failed. Please log in again."
        } else if (status === 403) {
          errorMessage = "Access denied. Please check your permissions."
        } else if (status === 404) {
          errorMessage = "Order service not found. Please contact support."
        } else if (status === 422) {
          errorMessage = "Invalid order information. Please check your details."
          if (data?.detail && Array.isArray(data.detail)) {
            errorMessage = data.detail.map((err: any) => err.msg).join(", ")
          }
        } else if (status === 500) {
          errorMessage = "Server error. Please try again in a few moments."
        } else if (status >= 500) {
          errorMessage = "Server is temporarily unavailable. Please try again later."
        }

        if (typeof data === "string") {
          errorMessage = data
        } else if (data?.error) {
          errorMessage = data.error
        } else if (data?.message) {
          errorMessage = data.message
        } else if (data?.detail) {
          errorMessage = data.detail
        }
      }

      setCheckoutError(errorMessage)

      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSuccess = () => {
    clearCartContext()
    router.push(`/order-confirmation/${order.id}`)
  }

  // Load user's addresses when component mounts
  useEffect(() => {
    const loadAddresses = async () => {
      if (!isAuthenticated || !user) return

      try {
        setIsLoadingAddresses(true)
        const address = await getAddressForCheckout()
        if (address) {
          setSelectedAddress(address)
          setShippingAddress(address)
        }
      } catch (error) {
        console.error("Failed to load addresses:", error)
        toast({
          title: "Error",
          description: "Failed to load your saved addresses. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingAddresses(false)
      }
    }

    if (isAuthenticated) {
      loadAddresses()
    } else {
      setIsLoadingAddresses(false)
    }
  }, [isAuthenticated, user])

  // Validate cart items when the page loads and before checkout
  const validateCart = async () => {
    if (!isAuthenticated || !items || items.length === 0) return true

    try {
      setIsValidatingCart(true)

      // Simple validation - check if all items have valid prices and quantities
      const invalidItems = items.filter(
        (item) => !item.price || item.price <= 0 || !item.quantity || item.quantity <= 0,
      )

      if (invalidItems.length > 0) {
        setCartValidationIssues({
          stockIssues: invalidItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product?.name,
            message: "Invalid price or quantity",
          })),
          priceChanges: [],
        })

        return false
      }

      return true
    } catch (error) {
      console.error("Error validating cart:", error)
      return true // Allow checkout to proceed even if validation fails
    } finally {
      setIsValidatingCart(false)
    }
  }

  // Validate cart when component mounts and when cart items change
  useEffect(() => {
    if (items && items.length > 0 && isAuthenticated && !cartLoading) {
      validateCart()
    }
  }, [items, isAuthenticated, cartLoading])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isRedirecting && !authLoading) {
      setIsRedirecting(true)
      router.push("/auth/login?redirect=/checkout")
    }
  }, [isAuthenticated, router, isRedirecting, authLoading])

  // If we're on the confirmation step but don't have order data, try to retrieve from localStorage
  useEffect(() => {
    if (activeStep === "confirmation" && (!orderData || !orderData.items || orderData.items.length === 0)) {
      const savedItems = localStorage.getItem("lastOrderItems")
      const savedDetails = localStorage.getItem("lastOrderDetails")

      if (savedItems && savedDetails) {
        try {
          const parsedItems = JSON.parse(savedItems)
          const parsedDetails = JSON.parse(savedDetails)

          setOrderData({
            id: parsedDetails.orderId || Math.floor(Math.random() * 1000000),
            order_number: parsedDetails.orderId || `ORD-${Math.floor(Math.random() * 1000000)}`,
            status: "pending",
            total_amount: parsedDetails.total || 0,
            created_at: new Date().toISOString(),
            items: parsedItems,
          })

          setOrderPlaced(true)
        } catch (e) {
          console.error("Error parsing saved order data:", e)
        }
      }
    }
  }, [activeStep, orderData])

  // Validate the current step
  const validateStep = () => {
    if (activeStep === "address") {
      if (!shippingAddress) {
        toast({
          title: "Address Required",
          description: "Please select or add a delivery address to continue.",
          variant: "destructive",
        })
        return false
      }
    }

    if (activeStep === "payment") {
      if (!selectedPaymentMethod) {
        toast({
          title: "Payment Method Required",
          description: "Please select a payment method to continue.",
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  // Add a helper function at the top of the component to handle proceeding to payment:
  const proceedToPayment = useCallback(() => {
    if (selectedPaymentMethod && validateStep()) {
      handleSubmit()
    } else if (!selectedPaymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method to continue.",
        variant: "destructive",
      })
    }
  }, [selectedPaymentMethod])

  // Handle address selection
  const handleAddressSelect = useCallback((address: any) => {
    setSelectedAddress(address)
    setShippingAddress(address)

    // Update the database to mark this as the selected address
    try {
      // api.post(`/api/addresses/${address.id}/set-default`).then(() => {
      //   console.log("Address set as default for delivery")
      // })
    } catch (error) {
      console.error("Failed to set address as default:", error)
    }
  }, [])

  // Store a reference to the complete order button
  useEffect(() => {
    if (activeStep === "payment") {
      // Find the complete order button after the component has rendered
      setTimeout(() => {
        const buttons = document.querySelectorAll("button")
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i]
          if (
            button.textContent &&
            (button.textContent.includes("Complete Order") || button.textContent.includes("Complete Order & Pay"))
          ) {
            completeOrderButtonRef.current = button
            break
          }
        }
      }, 100)
    }
  }, [activeStep])

  const isLoading = authLoading || isLoadingAddresses

  // Show loading state
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

  // Show login prompt if not authenticated
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

  // Show empty cart message ONLY if we're not in confirmation step and order hasn't been placed
  if (!items || (items.length === 0 && !orderPlaced)) {
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
                          Payment Method
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

                        <PaymentMethods
                          selectedMethod={selectedPaymentMethod || ""}
                          onSelectMethod={(method: string) => {
                            handlePaymentMethodSelect(method)
                            // If selecting the same method again, proceed to payment
                            if (method === selectedPaymentMethod) {
                              proceedToPayment()
                            }
                          }}
                        />

                        <Separator className="my-6" />

                        <div className="flex justify-between mt-6">
                          <Button variant="outline" onClick={() => setActiveStep("address")}>
                            Back
                          </Button>
                          <Button
                            onClick={handleSubmit}
                            disabled={isProcessing || !selectedPaymentMethod}
                            className="bg-cherry-600 hover:bg-cherry-700 text-white px-6 py-2 text-base font-medium"
                            ref={completeOrderButtonRef}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Complete Order & Pay"
                            )}
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
                        {selectedPaymentMethod === "pesapal" && order && (
                          <PesapalPayment
                            amount={total || order.total_amount} // Use cart total as primary source, fallback to order total
                            orderId={order.id}
                            onSuccess={handlePaymentSuccess}
                            customerEmail={user?.email || ""}
                            customerPhone={user?.phone || shippingAddress?.phone || ""}
                            onBack={() => setActiveStep("payment")}
                            selectedPaymentMethod={selectedPesapalMethod}
                            onPaymentMethodSelect={handlePesapalMethodSelect}
                          />
                        )}

                        {selectedPaymentMethod === "cod" && order && (
                          <CashDeliveryPayment
                            amount={total || order.total_amount} // Use cart total as primary source, fallback to order total
                            orderId={order.id}
                            onSuccess={handlePaymentSuccess}
                            onBack={() => setActiveStep("payment")}
                          />
                        )}

                        <div className="flex justify-between mt-6">
                          <Button variant="outline" onClick={() => setActiveStep("payment")}>
                            Back
                          </Button>
                        </div>
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
              handleSubmit={handleSubmit}
              orderPlaced={orderPlaced}
              isValidatingCart={isValidatingCart}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
