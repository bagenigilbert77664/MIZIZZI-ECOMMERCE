"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart/cart-context"
import { useAuth } from "@/contexts/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, ArrowRight, CreditCard, Truck, ShieldCheck, RefreshCw, LockIcon } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

// Import checkout components
import { CheckoutDelivery } from "@/components/checkout/checkout-delivery"
import { PaymentMethods } from "@/components/checkout/payment-methods"
import { MpesaPayment } from "@/components/checkout/mpesa-payment"
import { AirtelPayment } from "@/components/checkout/airtel-payment"
import CardPayment from "@/components/checkout/card-payment"
import { CashDeliveryPayment } from "@/components/checkout/cash-delivery-payment"
import CheckoutConfirmation from "@/components/checkout/checkout-confirmation"
import { CheckoutProgress } from "@/components/checkout/checkout-progress"
import CheckoutSummary from "@/components/checkout/checkout-summary"

// Import services
import { orderService } from "@/services/orders"
import { addressService } from "@/services/address"
import type { Address } from "@/types/address"

// Define the steps in the checkout process
const STEPS = ["DELIVERY", "PAYMENT", "CONFIRMATION"]

export default function CheckoutPage() {
  const [activeStep, setActiveStep] = useState(1)
  const steps = ["Delivery", "Payment", "Confirmation"]
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("")
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
  } | null>(null)
  const [isValidatingCart, setIsValidatingCart] = useState(false)
  const [cartValidationIssues, setCartValidationIssues] = useState<{
    stockIssues: any[]
    priceChanges: any[]
  }>({ stockIssues: [], priceChanges: [] })

  const {
    items,
    shipping,
    total,
    isLoading: cartLoading,
    error: cartError,
    subtotal,
    refreshCart,
    validateCartItems,
  } = useCart()

  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Load user's addresses when component mounts
  useEffect(() => {
    const loadAddresses = async () => {
      if (!isAuthenticated || !user) return

      try {
        setIsLoadingAddresses(true)
        const addresses = await addressService.getAddresses()

        if (addresses.length > 0) {
          // Find default address or use the first one
          const defaultAddress = addresses.find((addr) => addr.is_default) || addresses[0]
          setSelectedAddress(defaultAddress)
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

    if (isAuthenticated && !authLoading) {
      loadAddresses()
    }
  }, [isAuthenticated, user, authLoading, toast])

  // Validate cart items when the page loads and before checkout
  const validateCart = useCallback(async () => {
    if (!isAuthenticated || items.length === 0) return true

    try {
      setIsValidatingCart(true)
      const validation = await validateCartItems()

      if (!validation.valid) {
        setCartValidationIssues({
          stockIssues: validation.stockIssues || [],
          priceChanges: validation.priceChanges || [],
        })

        // If there are stock issues or price changes, show a notification
        if (validation.stockIssues?.length > 0 || validation.priceChanges?.length > 0) {
          toast({
            title: "Cart Updated",
            description: "Some items in your cart have been updated due to stock or price changes.",
            variant: "default",
          })

          // Refresh the cart to get the latest data
          await refreshCart()
        }

        return validation.stockIssues?.length === 0 // Only proceed if there are no stock issues
      }

      return true
    } catch (error) {
      console.error("Error validating cart:", error)
      return true // Allow checkout to proceed even if validation fails
    } finally {
      setIsValidatingCart(false)
    }
  }, [isAuthenticated, items.length, validateCartItems, toast, refreshCart])

  // Validate cart when component mounts and when cart items change
  useEffect(() => {
    if (items.length > 0 && isAuthenticated && !cartLoading) {
      validateCart()
    }
  }, [items.length, isAuthenticated, cartLoading, validateCart])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      router.push("/auth/login?redirect=/checkout")
    }
  }, [authLoading, isAuthenticated, router, isRedirecting])

  // Validate the current step
  const validateStep = () => {
    if (activeStep === 1) {
      if (!selectedAddress) {
        toast({
          title: "Address Required",
          description: "Please select or add a delivery address to continue.",
          variant: "destructive",
        })
        return false
      }
    }

    if (activeStep === 2) {
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

  // Navigate to the next step
  const goToNextStep = async () => {
    if (validateStep()) {
      // If moving to payment step, validate cart first
      if (activeStep === 1) {
        const isValid = await validateCart()
        if (!isValid) {
          toast({
            title: "Cart Issues",
            description:
              "Some items in your cart are out of stock or unavailable. Please review your cart before proceeding.",
            variant: "destructive",
          })
          return
        }
      }

      setActiveStep((prev) => prev + 1)
      // Scroll to top on mobile
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Navigate to the previous step
  const goToPreviousStep = () => {
    setActiveStep((prev) => prev - 1)
    // Scroll to top on mobile
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!isAuthenticated) {
      // Show login prompt instead of automatic redirect
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with checkout.",
        variant: "destructive",
      })
      return
    }

    if (items.length === 0 && !orderPlaced) {
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

    // Validate cart one last time before placing order
    const isCartValid = await validateCart()
    if (!isCartValid) {
      toast({
        title: "Cart Issues",
        description:
          "Some items in your cart are out of stock or unavailable. Please review your cart before proceeding.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      setCheckoutError(null)

      if (!selectedAddress) {
        throw new Error("Please select a delivery address")
      }

      // Prepare shipping address from selected address
      const shippingAddress = {
        first_name: selectedAddress.first_name,
        last_name: selectedAddress.last_name,
        email: user?.email || "",
        phone: selectedAddress.phone || "",
        address_line1: selectedAddress.address_line1,
        address_line2: selectedAddress.address_line2 || "",
        city: selectedAddress.city,
        state: selectedAddress.state,
        postal_code: selectedAddress.postal_code,
        country: selectedAddress.country === "ke" ? "Kenya" : selectedAddress.country,
      }

      // Create order with cart items
      const orderData = {
        shipping_address: shippingAddress,
        billing_address: shippingAddress, // Same as shipping address
        payment_method: selectedPaymentMethod,
        shipping_method: "standard",
        notes: "",
        shipping_cost: shipping,
        subtotal: subtotal,
        total: total,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          variant_id: item.variant_id || null,
        })),
      }

      // Submit order to API using the order service
      const response = await orderService.createOrderWithCartItems(orderData)

      // Set order data
      setOrderData({
        id: response.id,
        order_number: response.order_number || String(response.id),
        status: response.status,
        total_amount: response.total,
        created_at: response.created_at,
        items: response.items,
      })

      // Mark order as placed to prevent empty cart redirects
      setOrderPlaced(true)

      // Handle successful order
      toast({
        title: "Order Placed Successfully",
        description: `Your order #${response.order_number || response.id} has been placed.`,
      })

      // Move to confirmation step instead of redirecting
      setActiveStep(3)
    } catch (error: any) {
      console.error("Checkout error:", error)

      // Handle specific error cases
      if (error.response?.data?.error) {
        setCheckoutError(error.response.data.error)
      } else {
        setCheckoutError(error.message || "An error occurred while processing your order. Please try again.")
      }

      toast({
        title: "Checkout Failed",
        description: error.message || "There was a problem processing your order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = authLoading || cartLoading || isLoadingAddresses

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
        <div className="bg-white p-8 shadow-md rounded-lg">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-6 rounded-full bg-cherry-50 p-6 shadow-sm">
              <CreditCard className="h-12 w-12 text-cherry-700" />
            </div>
            <h2 className="mb-3 text-xl font-bold text-gray-800">Authentication Required</h2>
            <p className="mb-8 max-w-md text-center text-gray-600 leading-relaxed">
              Please log in to your account to continue with your purchase. Your cart items will be saved.
            </p>
            <Button
              asChild
              size="lg"
              className="px-8 py-6 h-auto text-base font-medium bg-cherry-900 hover:bg-cherry-800 text-white"
            >
              <Link href="/auth/login?redirect=/checkout">LOG IN TO CONTINUE</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show empty cart message ONLY if we're not in confirmation step and order hasn't been placed
  if (items.length === 0 && activeStep !== 3 && !orderPlaced) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="bg-white p-8 shadow-md rounded-lg">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-6 rounded-full bg-gray-100 p-6 shadow-sm">
              <Truck className="h-12 w-12 text-gray-500" />
            </div>
            <h2 className="mb-3 text-xl font-bold text-gray-800">Your Cart is Empty</h2>
            <p className="mb-8 max-w-md text-center text-gray-600 leading-relaxed">
              Looks like you haven't added any items to your cart yet. Explore our collection to find something you'll
              love.
            </p>
            <Button
              asChild
              size="lg"
              className="px-8 py-6 h-auto text-base font-medium bg-cherry-900 hover:bg-cherry-800 text-white"
            >
              <Link href="/products">DISCOVER PRODUCTS</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Checkout</h1>
          <p className="text-gray-500">Complete your purchase securely</p>
        </div>

        {/* Checkout Steps */}
        <CheckoutProgress activeStep={activeStep} steps={steps} colorScheme="cherry" />

        {/* Cart Validation Issues */}
        {(cartValidationIssues.stockIssues.length > 0 || cartValidationIssues.priceChanges.length > 0) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800 rounded-lg shadow-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                {cartValidationIssues.stockIssues.length > 0 && (
                  <div className="mb-2">
                    Some items in your cart have stock issues:
                    <ul className="list-disc pl-5 mt-1 text-sm">
                      {cartValidationIssues.stockIssues.map((issue, index) => (
                        <li key={index}>
                          {issue.product_name}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {cartValidationIssues.priceChanges.length > 0 && (
                  <div>
                    Some prices have been updated:
                    <ul className="list-disc pl-5 mt-1 text-sm">
                      {cartValidationIssues.priceChanges.map((change, index) => (
                        <li key={index}>
                          {change.product_name}: Price updated from {change.old_price} to {change.new_price}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-2 flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 mt-1"
                    onClick={() => validateCart()}
                    disabled={isValidatingCart}
                  >
                    {isValidatingCart ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh Cart
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Error Messages */}
        {(cartError || checkoutError) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Alert variant="destructive" className="mb-6 border-none bg-red-50 text-red-800 rounded-lg shadow-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{cartError || checkoutError}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="grid gap-8 md:grid-cols-[1fr,400px] lg:gap-12">
          <div className="space-y-6">
            {/* Step 1: Shipping Information */}
            {activeStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white p-6 shadow-md rounded-lg border border-gray-100"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-6">Shipping Information</h2>
                <CheckoutDelivery selectedAddressId={selectedAddress?.id ?? null} onAddressSelect={setSelectedAddress} />
              </motion.div>
            )}

            {/* Step 2: Payment Method */}
            {activeStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white p-6 shadow-md rounded-lg border border-gray-100"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-6">Payment Method</h2>
                {!selectedPaymentMethod ? (
                  <PaymentMethods selectedMethod={selectedPaymentMethod} onSelectMethod={setSelectedPaymentMethod} />
                ) : selectedPaymentMethod === "mpesa" ? (
                  <MpesaPayment
                    amount={total}
                    onBack={() => setSelectedPaymentMethod("")}
                    onPaymentComplete={handleSubmit}
                  />
                ) : selectedPaymentMethod === "airtel" ? (
                  <AirtelPayment
                    amount={total}
                    onBack={() => setSelectedPaymentMethod("")}
                    onPaymentComplete={handleSubmit}
                  />
                ) : selectedPaymentMethod === "card" ? (
                  <CardPayment
                    amount={total}
                    onBack={() => setSelectedPaymentMethod("")}
                    onPaymentComplete={handleSubmit}
                  />
                ) : (
                  <CashDeliveryPayment
                    amount={total}
                    onBack={() => setSelectedPaymentMethod("")}
                    onPaymentComplete={handleSubmit}
                  />
                )}
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {activeStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white p-6 shadow-md rounded-lg border border-gray-100"
              >
                <CheckoutConfirmation
                  formData={{
                    firstName: selectedAddress?.first_name || "",
                    lastName: selectedAddress?.last_name || "",
                    email: user?.email || "",
                    phone: selectedAddress?.phone || "",
                    address: selectedAddress?.address_line1 || "",
                    city: selectedAddress?.city || "",
                    state: selectedAddress?.state || "",
                    zipCode: selectedAddress?.postal_code || "",
                    country: selectedAddress?.country || "",
                    paymentMethod: selectedPaymentMethod,
                  }}
                  orderId={orderData?.id?.toString()}
                />
              </motion.div>
            )}

            {/* Navigation Buttons */}
            {activeStep < 3 && activeStep !== 2 && (
              <div className="flex justify-between mt-8">
                {activeStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    className="flex h-12 items-center gap-2 text-base"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <Button type="button" variant="outline" asChild className="flex h-12 items-center gap-2 text-base">
                    <Link href="/cart" className="flex items-center">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Cart
                    </Link>
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="flex h-12 items-center gap-2 px-8 text-base font-semibold bg-cherry-900 hover:bg-cherry-800 text-white"
                  disabled={isValidatingCart}
                >
                  {isValidatingCart ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Trust Badges */}
            {activeStep < 3 && (
              <div className="bg-white p-6 shadow-sm rounded-lg border border-gray-100 mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                      <ShieldCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">Secure Payment</h3>
                    <p className="text-sm text-gray-500">Your payment information is encrypted and secure</p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                      <Truck className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">Fast Delivery</h3>
                    <p className="text-sm text-gray-500">Quick and reliable shipping to your doorstep</p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                      <LockIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">Privacy Protected</h3>
                    <p className="text-sm text-gray-500">Your personal information is never shared</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="md:sticky md:top-24 self-start">
            <CheckoutSummary
              isSubmitting={isSubmitting}
              activeStep={activeStep}
              handleSubmit={handleSubmit}
              orderPlaced={orderPlaced}
              isValidatingCart={isValidatingCart}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
