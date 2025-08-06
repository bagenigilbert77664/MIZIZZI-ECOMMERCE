"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { useCart } from "@/contexts/cart/cart-context"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, ArrowRight, CreditCard, Truck, ShieldCheck, RefreshCw, LockIcon } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

// Import checkout components
import { CheckoutDelivery } from "@/components/checkout/checkout-delivery"
import { PaymentMethods } from "@/components/checkout/payment-methods"
import MpesaPaymentV2 from "@/components/checkout/mpesa-payment-v2"
import { AirtelPayment } from "@/components/checkout/airtel-payment"
import CardPayment from "@/components/checkout/card-payment"
import { CashDeliveryPayment } from "@/components/checkout/cash-delivery-payment"
import CheckoutConfirmation from "@/components/checkout/checkout-confirmation"
import { CheckoutProgress } from "@/components/checkout/checkout-progress"
import CheckoutSummary from "@/components/checkout/checkout-summary"
import { addressService } from "@/services/address"
import { orderService } from "@/services/orders"
import type { Address } from "@/types/address"
import AnimationErrorBoundary from "@/components/animation/animation-error-boundary"
import axios from "axios"

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
    subtotal?: number
    shipping_cost?: number
  } | null>({
    id: 0,
    order_number: "",
    status: "",
    total_amount: 0,
    created_at: "",
    items: [],
  })
  const [addresses, setAddresses] = useState<Address[]>([])
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
    clearCart,
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
        const addresses = await addressService.getAddresses().catch((error) => {
          console.error("Error fetching addresses:", error)
          return []
        })

        if (addresses && addresses.length > 0) {
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
    } else {
      setIsLoadingAddresses(false)
    }
  }, [isAuthenticated, user, authLoading, toast])

  // Fetch addresses from the API
  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || sessionStorage.getItem("token")}`,
        },
      })

      setAddresses(response.data.items || [])
    } catch (err) {
      console.error("Error fetching addresses:", err)
      toast({
        title: "Error",
        description: "Failed to load your saved addresses. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Validate cart items when the page loads and before checkout
  const validateCart = async () => {
    if (!isAuthenticated || items.length === 0) return true

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
            product_name: item.product.name,
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
    if (items.length > 0 && isAuthenticated && !cartLoading) {
      validateCart()
    }
  }, [items.length, isAuthenticated, cartLoading])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      router.push("/auth/login?redirect=/checkout")
    }
  }, [authLoading, isAuthenticated, router, isRedirecting])

  // If we're on the confirmation step but don't have order data, try to retrieve from localStorage
  useEffect(() => {
    if (activeStep === 3 && (!orderData || !orderData.items || orderData.items.length === 0)) {
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
    // Scroll to top on mobile
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Update the handleSubmit function to handle the payment-first approach
  const handleSubmit = async (paymentData?: any) => {
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

      // Preserve cart data before clearing with complete product information
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
      setPreservedSubtotal(subtotal)
      setPreservedShipping(shipping)
      setPreservedTotal(total)
      setPreservedTax(Math.round(subtotal * 0.16)) // Calculate tax

      // Also save detailed order information to localStorage for recovery if needed
      localStorage.setItem(
        "lastOrderItems",
        JSON.stringify(
          items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product?.name || "Product",
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            thumbnail_url: item.product?.thumbnail_url || item.product?.image_urls?.[0] || null,
            product: {
              name: item.product?.name || "Product",
              thumbnail_url: item.product?.thumbnail_url || item.product?.image_urls || [],
              image_urls: item.product?.image_urls || [],
            },
          })),
        ),
      )

      // Prepare shipping address from selected address
      // Make sure to include email in the shipping address
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

      // Map frontend payment method IDs to backend expected values
      const paymentMethodMapping = {
        mpesa: "mpesa",
        card: "card",
        cash_on_delivery: "cash_on_delivery",
        cod: "cash_on_delivery", // Add this line to map 'cod' to 'cash_on_delivery'
        airtel: "airtel",
      }

      // If we have payment data, include it in the order
      const paymentDetails = paymentData
        ? {
            transaction_id: paymentData.transaction_id,
            checkout_request_id: paymentData.checkout_request_id,
            merchant_request_id: paymentData.merchant_request_id,
            payment_phone: paymentData.phone,
            payment_amount: paymentData.amount,
            payment_status: "completed",
            payment_date: new Date().toISOString(),
          }
        : {}

      // Create order with cart items
      const orderPayload = {
        user_id: user?.id,
        shipping_address: shippingAddress, // Will be stringified in the service
        billing_address: shippingAddress, // Will be stringified in the service
        payment_method:
          paymentMethodMapping[selectedPaymentMethod as keyof typeof paymentMethodMapping] || selectedPaymentMethod,
        shipping_method: "standard",
        notes: "",
        shipping_cost: shipping,
        subtotal: subtotal,
        total_amount: total,
        status: "pending",
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          variant_id: item.variant_id || null,
        })),
        // Add additional fields that might be required by your backend
        tax: Math.round(subtotal * 0.16),
        currency: "KES",
        customer_email: user?.email, // Ensure email is included
        customer_name: `${selectedAddress.first_name} ${selectedAddress.last_name}`,
        customer_phone: selectedAddress.phone || "",
        same_as_shipping: true,
        // Add payment details if available
        ...paymentDetails,
        // Add a timestamp to ensure the cart is not considered empty
        timestamp: new Date().toISOString(),
      }

      console.log("Sending order payload to API:", orderPayload)

      // Try to create the order in the database
      try {
        // Make API call to create order using the orderService
        const orderResponse = await orderService.createOrder(orderPayload)
        console.log("Order creation response:", orderResponse)

        // If API call succeeded, use the response
        if (orderResponse) {
          // Set order data using the response
          // Check if the response has the expected structure
          const orderData = orderResponse.order || orderResponse

          setOrderData({
            id: orderData.id,
            order_number: orderData.order_number || orderData.id,
            status: orderData.status || "pending",
            total_amount: orderData.total_amount || total,
            created_at: orderData.created_at || new Date().toISOString(),
            items: orderData.items || [],
          })

          // Mark order as placed to prevent empty cart redirects
          setOrderPlaced(true)

          // Store the order details in localStorage as a backup
          localStorage.setItem(
            "lastOrderDetails",
            JSON.stringify({
              orderId: orderData.order_number || orderData.id,
              total: total,
              paymentMethod: selectedPaymentMethod,
              shippingAddress: shippingAddress,
            }),
          )

          // If we have payment data, record the transaction
          if (paymentData) {
            try {
              const mpesaService = await import("@/services/mpesa-service").then((mod) => mod.default)
              mpesaService.recordSuccessfulTransaction({
                order_id: orderData.id,
                order_number: orderData.order_number,
                transaction_id: paymentData.transaction_id,
                checkout_request_id: paymentData.checkout_request_id,
                merchant_request_id: paymentData.merchant_request_id,
                amount: paymentData.amount,
                phone: paymentData.phone,
              })

              // Clear any pending payment
              mpesaService.clearPendingPayment()
            } catch (error) {
              console.error("Error recording transaction:", error)
            }
          }

          // Move to confirmation step
          setActiveStep(3)

          // AFTER setting the active step, then attempt to clear the cart
          // Clear the cart after successful order and AFTER moving to confirmation
          setTimeout(async () => {
            try {
              // Get current cart items and remove them one by one
              const cartItems = [...items] // Make a copy of the items array

              if (cartItems.length > 0) {
                console.log(`Clearing ${cartItems.length} items from cart after confirmation...`)

                // Clear the cart
                await clearCart()

                // Force refresh the cart
                await refreshCart()

                console.log("Cart cleared successfully after order confirmation")
              }
            } catch (clearError) {
              // Silently handle cart clearing errors
              console.error("Note: Cart couldn't be cleared automatically:", clearError)
            }
          }, 1000) // Add a slight delay to ensure the confirmation page is fully loaded

          // Handle successful order
          toast({
            title: "Order Placed Successfully",
            description: `Your order #${orderData.order_number || orderData.id} has been placed.`,
          })
        }
      } catch (apiError: any) {
        // Log detailed error information
        console.error("Order creation failed:", apiError.message || "Unknown error")

        if (apiError.response?.data) {
          console.error("API error details:", apiError.response.data)

          // Extract validation errors if available
          const validationErrors = apiError.response?.data?.errors || {}
          console.log("Validation errors:", validationErrors)

          // Check if the error is about empty cart
          if (apiError.response?.data?.error === "Cart is empty") {
            setCheckoutError("Your cart appears to be empty. Please add items to your cart before checking out.")

            toast({
              title: "Empty Cart",
              description: "Your cart appears to be empty. Please add items to your cart before checking out.",
              variant: "destructive",
            })
            return
          }

          // Check if payment_method is an array or object
          let paymentMethodError = ""
          if (validationErrors.payment_method) {
            if (Array.isArray(validationErrors.payment_method)) {
              paymentMethodError = validationErrors.payment_method.join(", ")
            } else if (typeof validationErrors.payment_method === "object") {
              paymentMethodError = "Invalid payment method format"
            } else {
              paymentMethodError = validationErrors.payment_method.toString()
            }
          }

          const errorMessages = Object.entries(validationErrors)
            .map(([field, message]) => {
              if (field === "payment_method") {
                return `payment_method: ${paymentMethodError}`
              }
              return `${field}: ${message}`
            })
            .join(", ")

          const errorMessage = errorMessages
            ? `Validation errors: ${errorMessages}`
            : apiError.response?.data?.error || "There was a problem processing your order."

          setCheckoutError(errorMessage)

          toast({
            title: "Error Creating Order",
            description: errorMessage,
            variant: "destructive",
          })
        } else {
          setCheckoutError("There was a problem connecting to the server. Please try again.")

          toast({
            title: "Connection Error",
            description: "There was a problem connecting to the server. Please try again.",
            variant: "destructive",
          })
        }
      }
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

  // Add a useEffect to check for pending M-PESA payments on component mount
  useEffect(() => {
    const checkPendingMpesaPayment = async () => {
      try {
        const mpesaService = await import("@/services/mpesa-service").then((mod) => mod.default)
        const pendingPayment = await mpesaService.checkPendingPaymentOnStartup()

        if (pendingPayment && pendingPayment.success) {
          // We have a successful payment that hasn't been processed yet
          toast({
            title: "Payment Found",
            description: "We found a successful payment. Creating your order now.",
          })

          // Create the order with this payment
          await handleSubmit({
            transaction_id: pendingPayment.response?.MpesaReceiptNumber || "MP" + Date.now(),
            checkout_request_id: pendingPayment.checkout_request_id,
            merchant_request_id: pendingPayment.merchant_request_id,
            amount: pendingPayment.response?.amount || 0,
            phone: pendingPayment.response?.phone || "",
          })
        } else if (pendingPayment) {
          // We have a pending payment
          toast({
            title: "Pending Payment",
            description: "You have a pending M-PESA payment. Please complete it or start a new one.",
          })
        }
      } catch (error) {
        console.error("Error checking pending M-PESA payment:", error)
      }
    }

    if (isAuthenticated && !authLoading) {
      checkPendingMpesaPayment()
    }
  }, [isAuthenticated, authLoading])

  const isLoading = authLoading || isLoadingAddresses

  // Show loading state
  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
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
            <div className="mb-6 rounded-full bg-red-50 p-6 shadow-sm">
              <CreditCard className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="mb-3 text-xl font-bold text-gray-800">Authentication Required</h2>
            <p className="mb-8 max-w-md text-center text-gray-600 leading-relaxed">
              Please log in to your account to continue with your purchase. Your cart items will be saved.
            </p>
            <Button
              asChild
              size="lg"
              className="px-8 py-6 h-auto text-base font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg"
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
        <div className="bg-white p-8 shadow-md rounded-xl">
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
              className="px-8 py-6 h-auto text-base font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <Link href="/products">DISCOVER PRODUCTS</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header with improved styling */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Checkout</h1>
          <p className="text-gray-500">Complete your purchase securely</p>
        </div>

        {/* Checkout Steps with improved spacing */}
        <AnimationErrorBoundary>
          <CheckoutProgress activeStep={activeStep} steps={steps} variant="elegant" colorScheme="cherry" />
        </AnimationErrorBoundary>

        {/* Cart Validation Issues with improved styling */}
        {(cartValidationIssues.stockIssues.length > 0 || cartValidationIssues.priceChanges.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 rounded-xl shadow-sm">
              <AlertCircle className="h-5 w-5" />
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
                <div className="mt-3 flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9 font-medium rounded-lg"
                    onClick={() => validateCart()}
                    disabled={isValidatingCart}
                  >
                    {isValidatingCart ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Refresh Cart
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Error Messages with improved styling */}
        {(cartError || checkoutError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Alert variant="destructive" className="border-none bg-red-50 text-red-800 rounded-xl shadow-sm">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="font-medium">{cartError || checkoutError}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className={`grid gap-8 ${activeStep === 3 ? "grid-cols-1" : "md:grid-cols-[1fr,400px]"} lg:gap-12`}>
          <div className="space-y-8">
            {/* Step 1: Shipping Information with improved styling */}
            <AnimatePresence mode="wait">
              {activeStep === 1 && (
                <motion.div
                  key="delivery"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white p-8 shadow-md rounded-xl border border-gray-100"
                >
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Truck className="h-6 w-6 mr-3 text-cherry-700" />
                    Shipping Information
                  </h2>
                  <CheckoutDelivery
                    selectedAddress={selectedAddress}
                    onAddressSelect={setSelectedAddress}
                    // Remove the onContinue prop to disable the internal button
                  />
                </motion.div>
              )}

              {/* Step 2: Payment Method with improved styling */}
              {activeStep === 2 && (
                <AnimationErrorBoundary>
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white p-8 shadow-md rounded-xl border border-gray-100"
                  >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                      <CreditCard className="h-6 w-6 mr-3 text-cherry-700" />
                      Payment Options
                    </h2>
                    {!selectedPaymentMethod ? (
                      <PaymentMethods
                        selectedMethod={selectedPaymentMethod}
                        onSelectMethod={setSelectedPaymentMethod}
                      />
                    ) : selectedPaymentMethod === "mpesa" ? (
                      <MpesaPaymentV2 amount={total} onPaymentComplete={handleSubmit} />
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
                </AnimationErrorBoundary>
              )}

              {/* Step 3: Confirmation with improved styling */}
              {activeStep === 3 && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="bg-transparent p-0 w-full col-span-full"
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
                    orderId={orderData?.order_number}
                    orderItems={
                      preservedItems.length > 0
                        ? preservedItems.map((item) => ({
                            product_id: item.product_id,
                            product_name: item.product?.name || "Product",
                            quantity: item.quantity,
                            price: item.price,
                            total: item.price * item.quantity,
                            thumbnail_url: item.product?.thumbnail_url || item.product?.image_urls?.[0] || null,
                            product: item.product,
                          }))
                        : orderData?.items || []
                    }
                    subtotal={preservedSubtotal || orderData?.subtotal || 0}
                    shipping={preservedShipping || orderData?.shipping_cost || 0}
                    tax={preservedTax || (orderData?.subtotal ? Math.round(orderData.subtotal * 0.16) : 0)}
                    total={preservedTotal || orderData?.total_amount || 0}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons with improved styling */}
            {activeStep < 3 && (
              <div className="flex justify-between mt-8">
                {activeStep > 1 ? (
                  <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToPreviousStep}
                      className="flex h-12 items-center gap-2 text-sm px-6 border rounded-md"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="flex h-12 items-center gap-2 text-sm px-6 border rounded-md"
                    >
                      <Link href="/cart" className="flex items-center">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Cart
                      </Link>
                    </Button>
                  </motion.div>
                )}

                {activeStep === 1 && (
                  <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="button"
                      onClick={goToNextStep}
                      className="flex h-12 items-center gap-2 px-8 text-sm font-medium bg-cherry-600 hover:bg-cherry-700 text-white shadow-md transition-all duration-200 rounded-md"
                      disabled={isValidatingCart}
                    >
                      {isValidatingCart ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Validating...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}

                {activeStep === 2 && (
                  <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="flex h-12 items-center gap-2 px-8 text-sm font-medium bg-cherry-600 hover:bg-cherry-700 text-white shadow-md transition-all duration-200 rounded-md"
                      disabled={isSubmitting || !selectedPaymentMethod}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Complete Order
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Trust Badges with improved styling */}
            {activeStep < 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white p-8 shadow-sm rounded-xl border border-gray-100 mt-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4 shadow-sm">
                      <ShieldCheck className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Secure Payment</h3>
                    <p className="text-sm text-gray-500">Your payment information is encrypted and secure</p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 shadow-sm">
                      <Truck className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Fast Delivery</h3>
                    <p className="text-sm text-gray-500">Quick and reliable shipping to your doorstep</p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4 shadow-sm">
                      <LockIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Privacy Protected</h3>
                    <p className="text-sm text-gray-500">Your personal information is never shared</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary with improved styling - Only show in steps 1 and 2, not in confirmation step */}
          {activeStep < 3 && (
            <div className="md:sticky md:top-24 self-start">
              <CheckoutSummary
                isSubmitting={isSubmitting}
                activeStep={activeStep}
                handleSubmit={handleSubmit}
                orderPlaced={orderPlaced}
                isValidatingCart={isValidatingCart}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
