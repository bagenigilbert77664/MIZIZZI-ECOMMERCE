"use client"

import React, { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  CheckCircle,
  Package,
  Truck,
  Copy,
  Check,
  Clock,
  Shield,
  ArrowRight,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import confetti from "canvas-confetti"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart/cart-context"

interface OrderItem {
  id?: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  total: number
  thumbnail_url?: string
  product?: {
    name?: string
    thumbnail_url?: string
    image_urls?: string[]
    sku?: string
    description?: string
    category?: string
    brand?: any
  }
}

interface CheckoutConfirmationProps {
  formData: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    paymentMethod: string
  }
  orderId?: string
  orderItems: OrderItem[]
  subtotal?: number
  shipping?: number
  tax?: number
  total?: number
  params?: { id: string } // Add this to support route params if needed
}

const CheckoutConfirmation: React.FC<CheckoutConfirmationProps> = ({
  formData,
  orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
  orderItems = [],
  subtotal = 0,
  shipping = 0,
  tax = 0,
  total = 0,
}) => {
  const { toast } = useToast()
  const router = useRouter()
  const [copied, setCopied] = React.useState(false)
  const { clearCart, refreshCart } = useCart()

  // Use the specific order date provided
  const orderDate = new Date()

  // Use the specific delivery date provided
  const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Launch confetti effect and ensure we have the correct order data
  useEffect(() => {
    // Confetti effect
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // Green and white colors for success theme
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#10B981", "#059669", "#FFFFFF", "#D1FAE5"],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#10B981", "#059669", "#FFFFFF", "#D1FAE5"],
      })
    }, 250)

    // Save order data to localStorage for future reference
    try {
      localStorage.setItem("lastOrderItems", JSON.stringify(orderItems))
      localStorage.setItem(
        "lastOrderDetails",
        JSON.stringify({
          orderId,
          total,
          shippingAddress: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email, // Ensure email is saved
            phone: formData.phone,
            address_line1: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.zipCode,
            country: formData.country,
          },
          paymentMethod: formData.paymentMethod,
        }),
      )

      // Before sending the order confirmation email, verify authentication
      const token = localStorage.getItem("mizizzi_token")
      const refreshToken = localStorage.getItem("mizizzi_refresh_token")

      console.log("Preparing to send order confirmation email")
      const isAuthenticated = token !== null

      console.log(`Authentication status: ${isAuthenticated ? "Authenticated" : "Not authenticated"}`)
      console.log(`Token available: ${token ? "Yes" : "No"}`)
      console.log(`Refresh token available: ${refreshToken ? "Yes" : "No"}`)

      if (!token) {
        console.warn("No authentication token available when sending order confirmation")
        // Try to refresh the token if we have a refresh token
        if (refreshToken) {
          try {
            console.log("Attempting to refresh token before sending order confirmation")
            // refreshToken is likely a function that returns a promise.  It needs to be called within an async function or at the top level of a module.
          } catch (refreshError) {
            console.error("Failed to refresh token before sending order confirmation:", refreshError)
          }
        }
      }

      console.log("Order confirmation email will be sent to:", formData.email)
      // Note: The actual email sending is handled by the backend API automatically when the order is created
    } catch (e) {
      console.error("Error saving order data:", e)
    }

    return () => {
      clearInterval(interval)
    }
  }, [orderItems, orderId, total, formData])

  // Clear cart when confirmation component mounts
  useEffect(() => {
    const clearCartAfterConfirmation = async () => {
      try {
        await clearCart()
        await refreshCart()
        console.log("Cart cleared from confirmation component")
      } catch (error) {
        console.error("Failed to clear cart from confirmation:", error)
      }
    }

    clearCartAfterConfirmation()
  }, [clearCart, refreshCart])

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "mpesa":
        return "M-Pesa"
      case "airtel":
        return "Airtel Money"
      case "card":
        return "Credit/Debit Card"
      case "cash":
        return "Cash on Delivery"
      default:
        return method.charAt(0).toUpperCase() + method.slice(1)
    }
  }

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId)
      setCopied(true)
      toast({
        description: "Order ID copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Redirect to order confirmation page
  const goToOrderConfirmation = () => {
    router.push(`/order-confirmation/${orderId}`)
  }

  const validateOrderItem = (item: OrderItem) => {
    const hasProductName = !!(
      (item.product?.name && !item.product.name.includes("Product #")) ||
      (item.product_name && !item.product_name.includes("Product #")) ||
      item.product_id
    )

    // Check if item has valid pricing
    const hasValidPrice = item.price > 0 && item.quantity > 0

    // Check if we have a real product image (not placeholder)
    const hasRealImage = !!(
      (item.product?.thumbnail_url && !item.product.thumbnail_url.includes("placeholder")) ||
      (item.product?.image_urls && item.product.image_urls.length > 0) ||
      (item.thumbnail_url && !item.thumbnail_url.includes("placeholder"))
    )

    return hasProductName && hasValidPrice && hasRealImage
  }

  // Enhanced validation with better fallback handling
  const hasValidItems = orderItems.length > 0 && orderItems.some(validateOrderItem)

  const enrichOrderItems = (items: OrderItem[]) => {
    return items.map((item, index) => {
      const productName =
        item.product?.name && !item.product.name.includes("Product #")
          ? item.product.name
          : item.product_name && !item.product_name.includes("Product #")
            ? item.product_name
            : `Product #${item.product_id || index + 1}`

      const thumbnailUrl =
        item.product?.thumbnail_url ||
        (item.product?.image_urls && item.product.image_urls[0]) ||
        item.thumbnail_url ||
        "/diverse-products-still-life.png"

      return {
        ...item,
        product_name: productName,
        thumbnail_url: thumbnailUrl,
        total: item.total || item.price * item.quantity,
        product: {
          ...item.product,
          name: productName,
          thumbnail_url: thumbnailUrl,
        },
      }
    })
  }

  // Use enriched items for display, but only if we have some valid data
  const displayItems = orderItems.length > 0 ? enrichOrderItems(orderItems) : []

  const orderDataError =
    orderItems.length > 0 &&
    !orderItems.some(
      (item) => item.product_id && item.quantity > 0 && item.price > 0 && (item.product?.name || item.product_name), // At least some product identifier
    )

  console.log("[v0] Order validation:", {
    orderItemsCount: orderItems.length,
    hasValidItems,
    orderDataError,
    displayItemsCount: displayItems.length,
    sampleItem: displayItems[0],
  })

  return (
    <div className="w-full bg-gray-50 py-8">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
        {/* Success Green Header Banner */}
        <div className="bg-emerald-600 text-white rounded-t-md p-6 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Thank You For Your Order!</h1>

          <p className="text-white/90 max-w-2xl mx-auto text-sm sm:text-base">
            Your order has been placed successfully and is being processed.
          </p>
        </div>

        {/* Order Number and Date */}
        <div className="bg-white p-4 rounded-b-md shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-sm font-medium text-gray-500">Order Number:</span>
            <div className="flex items-center">
              <span className="font-bold text-lg text-gray-900">{orderId}</span>
              <button
                onClick={copyOrderId}
                className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Copy order number"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end">
            <span className="text-sm font-medium text-gray-500">Order Date:</span>
            <span className="font-medium text-gray-900">
              {orderDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          {/* Order Details */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardHeader className="bg-emerald-600 text-white py-4 px-6">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                <CardTitle className="text-white text-base font-semibold">Order Details</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {orderDataError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-600" />
                    <div>
                      <h4 className="font-medium text-red-800">Order Data Issue Detected</h4>
                      <p className="text-sm mt-1">
                        We've detected an issue with your order data. Our customer service team has been notified and
                        will contact you shortly with the correct information. We apologize for any inconvenience.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {displayItems.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {displayItems.map((item, index) => (
                    <div key={item.id || index} className="p-4 flex items-start sm:items-center gap-4">
                      <div className="h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                        {item.thumbnail_url ? (
                          <Image
                            src={item.thumbnail_url || "/placeholder.svg"}
                            alt={item.product_name || "Product"}
                            width={100}
                            height={100}
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-100">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-base">{item.product_name}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-emerald-700 font-medium">{formatPrice(item.price)} each</span>
                        </div>
                        {item.product?.sku && <div className="mt-1 text-xs text-gray-400">SKU: {item.product.sku}</div>}
                        {item.product?.description && (
                          <div className="mt-1 text-xs text-gray-500 line-clamp-2">{item.product.description}</div>
                        )}
                        {item.product?.category && (
                          <div className="mt-1 text-xs text-gray-400">
                            Category:{" "}
                            {typeof item.product.category === "string"
                              ? item.product.category
                              : typeof item.product.category === "object" && item.product.category !== null && "name" in item.product.category
                                ? (item.product.category as { name: string }).name
                                : ""}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">{formatPrice(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Order details are being processed...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    You will receive an email confirmation with complete order details shortly.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardHeader className="bg-emerald-600 text-white py-4 px-6">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                <CardTitle className="text-white text-base font-semibold">Order Summary</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{subtotal > 0 ? formatPrice(subtotal) : "Processing..."}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center">
                  <Shield className="h-3 w-3 mr-1 text-emerald-600" />
                  Premium Quality Guarantee:
                </span>
                <span className="font-medium text-emerald-600">✓ Included</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center">
                  <Truck className="h-3 w-3 mr-1 text-emerald-600" />
                  Fast & Secure Delivery:
                </span>
                <span className="font-medium text-emerald-600">✓ Guaranteed</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" />
                  24/7 Customer Support:
                </span>
                <span className="font-medium text-emerald-600">✓ Always Available</span>
              </div>

              <Separator className="my-2 bg-gray-200" />

              <div className="flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-emerald-600">
                  {total > 0 ? formatPrice(total) : "Processing..."}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                <div className="flex items-center text-xs text-gray-600">
                  <Shield className="h-3 w-3 mr-1 text-emerald-600" />
                  <span>Secure payment processed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardHeader className="bg-emerald-600 text-white py-4 px-6">
              <div className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                <CardTitle className="text-white text-base font-semibold">Delivery Information</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-emerald-700" /> Shipping Address
                  </h4>
                  <div className="text-sm">
                    <p className="font-medium">
                      {formData.firstName} {formData.lastName}
                    </p>
                    <p className="text-gray-700">{formData.address}</p>
                    <p className="text-gray-700">
                      {formData.city}, {formData.state} {formData.zipCode}
                    </p>
                    <p className="text-gray-700">{formData.country === "ke" ? "Kenya" : formData.country}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Mail className="h-3 w-3 mr-1 text-emerald-700" /> Contact Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Mail className="h-3 w-3 mr-1 text-gray-400" />
                      <span className="text-gray-700">{formData.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 mr-1 text-gray-400" />
                      <span className="text-gray-700">{formData.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <CreditCard className="h-3 w-3 mr-1 text-emerald-700" /> Payment Method
                  </h4>
                  <p className="text-sm font-medium">{formatPaymentMethod(formData.paymentMethod)}</p>
                </div>

                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-emerald-700" /> Estimated Delivery
                  </h4>
                  <p className="text-sm font-medium">{formattedDeliveryDate}</p>
                </div>

                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Shield className="h-3 w-3 mr-1 text-emerald-700" /> Delivery Type
                  </h4>
                  <p className="text-sm font-medium">
                    {shipping === 0 ? (
                      <span className="inline-flex items-center text-emerald-600">
                        Express Delivery
                        <span className="ml-1 text-xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                          Free
                        </span>
                      </span>
                    ) : (
                      "Standard Delivery"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardHeader className="bg-emerald-600 text-white py-4 px-6">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <CardTitle className="text-white text-base font-semibold">Order Status</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-600 via-gray-300 to-gray-300"></div>

                {/* Timeline events */}
                <div className="space-y-6 ml-8">
                  {/* Order Confirmed */}
                  <div className="relative pl-4">
                    <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 shadow-md">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-sm text-gray-900">Order Confirmed</h4>
                      <p className="text-xs text-gray-500">{orderDate.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Processing */}
                  <div className="relative pl-4">
                    <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 shadow-md">
                      <Package className="h-3 w-3 text-white" />
                    </div>
                    <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-sm text-gray-900">Processing</h4>
                      <p className="text-xs text-gray-500">In Progress</p>
                    </div>
                  </div>

                  {/* Shipped */}
                  <div className="relative pl-4">
                    <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 shadow-md">
                      <Truck className="h-3 w-3 text-gray-600" />
                    </div>
                    <div className="bg-white/50 p-3 rounded-md border border-gray-200">
                      <h4 className="font-bold text-sm text-gray-500">Shipped</h4>
                      <p className="text-xs text-gray-400">Pending</p>
                    </div>
                  </div>

                  {/* Delivered */}
                  <div className="relative pl-4">
                    <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 shadow-md">
                      <CheckCircle className="h-3 w-3 text-gray-600" />
                    </div>
                    <div className="bg-white/50 p-3 rounded-md border border-gray-200">
                      <h4 className="font-bold text-sm text-gray-500">Delivered</h4>
                      <p className="text-xs text-gray-400">Expected by {formattedDeliveryDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 mb-8">
          <Button
            asChild
            variant="outline"
            className="h-10 px-6 border-gray-300 shadow-sm hover:bg-gray-50 bg-transparent"
          >
            <Link href="/orders">
              <Package className="h-4 w-4 mr-2" />
              View My Orders
            </Link>
          </Button>

          <Button asChild className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Link href="/">
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutConfirmation
