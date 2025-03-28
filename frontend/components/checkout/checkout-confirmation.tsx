"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle,
  Package,
  Truck,
  Calendar,
  Share2,
  Printer,
  Copy,
  MessageCircle,
  ChevronRight,
  Star,
  Gift,
  ShoppingBag,
  MapPin,
  Phone,
  Clock,
  CreditCard,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import confetti from "canvas-confetti"
import { useCart } from "@/contexts/cart/cart-context"
import Image from "next/image"
import { formatPrice } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

interface CheckoutConfirmationProps {
  formData: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    paymentMethod: string
  }
  orderId?: string
  orderItems?: any[]
  orderTotals?: {
    subtotal: number
    shipping: number
    tax: number
    total: number
  }
}

export default function CheckoutConfirmation({
  formData,
  orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000),
  orderItems,
  orderTotals,
}: CheckoutConfirmationProps) {
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(true)
  const [activeTab, setActiveTab] = useState("details")
  const { items, subtotal, shipping, total } = useCart()

  // Use provided order items or fall back to cart items
  const displayItems = orderItems || items
  const displayTotals = orderTotals || {
    subtotal,
    shipping,
    tax: subtotal * 0.16, // 16% VAT for Kenya
    total: total,
  }

  // Estimated delivery date (5-7 business days from now)
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + 5 + Math.floor(Math.random() * 3))
  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  // Prevent automatic redirects
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const target = e.target as any
      if (!target || !target.activeElement || target.activeElement.tagName !== "A") {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  // Confetti effect
  useEffect(() => {
    if (showConfetti) {
      const duration = 3 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)

        // Gold and cherry colors
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#8B0000", "#D4AF37", "#800020", "#FFD700"],
        })
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#8B0000", "#D4AF37", "#800020", "#FFD700"],
        })
      }, 250)

      return () => {
        clearInterval(interval)
      }
    }
  }, [showConfetti])

  const getPaymentMethodName = (method: string) => {
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
        return method
    }
  }

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const addToCalendar = () => {
    const text = `Your order ${orderId} delivery`
    const dates = `${deliveryDate.toISOString().replace(/-|:|\.\d+/g, "")}`
    window.open(
      `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}/${dates}&details=Expected delivery of your order ${orderId}`,
      "_blank",
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="mb-6 relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-100 to-cherry-100 opacity-50 animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-cherry-700" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 text-cherry-800">Order Confirmed!</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Thank you for your order. We've received your payment and will begin processing your order right away.
        </p>

        {orderId && (
          <div className="mt-6 inline-flex items-center px-6 py-3 rounded-xl bg-amber-50 border border-amber-100">
            <span className="text-sm font-medium text-gray-500">Order ID:</span>
            <span className="ml-2 font-bold text-gray-900">{orderId}</span>
            <button
              onClick={copyOrderId}
              className="ml-2 p-1 rounded-full hover:bg-white/80 transition-colors"
              aria-label="Copy order ID"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="details" className="mb-8">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="details">Order Details</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Order Items Card */}
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="h-2 bg-cherry-700"></div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5 text-cherry-700" />
                Order Items ({displayItems.length})
              </h3>

              {displayItems.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center text-gray-500">
                  <Clock className="h-12 w-12 mb-3 text-gray-300" />
                  <p>No items in this order</p>
                  <p className="text-sm mt-2">Order has been placed successfully</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Order Items */}
                  <div className="divide-y divide-gray-100">
                    {displayItems.map((item, index) => (
                      <div key={index} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-16 h-16 rounded-md border border-gray-200 overflow-hidden flex-shrink-0">
                          {item.product?.thumbnail_url || item.product?.image_urls?.[0] ? (
                            <Image
                              src={item.product.thumbnail_url || item.product.image_urls[0]}
                              alt={item.product.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{item.product.name}</h4>
                          {item.product.sku && <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>}
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span>Qty: {item.quantity}</span>
                            {item.variant_id && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                Variant: {item.variant_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <span className="font-medium text-gray-900">{formatPrice(item.price)}</span>
                          <p className="text-sm text-gray-500">Total: {formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-4">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(displayTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>{formatPrice(displayTotals.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (16%)</span>
                    <span>{formatPrice(displayTotals.tax)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="text-cherry-800">{formatPrice(displayTotals.total)}</span>
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="mt-6 flex gap-2">
                  <Input type="text" placeholder="Enter coupon code" className="max-w-xs" />
                  <Button variant="outline" size="sm">
                    Apply
                  </Button>
                </div>

                <div className="mt-4 flex items-center text-sm text-green-600">
                  <Info className="h-4 w-4 mr-1" />
                  <span>Secure checkout</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details Card */}
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="h-2 bg-cherry-700"></div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="mr-2 h-5 w-5 text-cherry-700" />
                Order Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping Address */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-cherry-700" />
                    Shipping Address
                  </h4>
                  <div className="text-gray-900">
                    <p className="font-medium">
                      {formData.firstName} {formData.lastName}
                    </p>
                    <p className="mt-1">{formData.address}</p>
                    <p>
                      {formData.city}, {formData.state} {formData.zipCode}
                    </p>
                    <p>{formData.country === "ke" ? "Kenya" : formData.country}</p>
                    {formData.phone && (
                      <p className="mt-2 flex items-center text-cherry-800">
                        <Phone className="w-4 h-4 mr-1" />
                        {formData.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-cherry-700" />
                    Delivery Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Estimated Delivery:</span>
                      <span className="font-medium text-gray-900">{formattedDeliveryDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Shipping Method:</span>
                      <span className="font-medium text-gray-900">Express Delivery</span>
                    </div>
                    <button
                      onClick={addToCalendar}
                      className="mt-2 text-sm text-cherry-700 hover:text-cherry-800 font-medium flex items-center"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Add to Calendar
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <CreditCard className="w-4 h-4 mr-1 text-cherry-700" />
                    Payment Method
                  </h4>
                  <p className="text-gray-900 font-medium flex items-center">
                    <span className="w-8 h-8 rounded-full bg-amber-100 mr-2 flex items-center justify-center text-cherry-800 font-bold">
                      {getPaymentMethodName(formData.paymentMethod).charAt(0)}
                    </span>
                    {getPaymentMethodName(formData.paymentMethod)}
                  </p>
                </div>

                {/* Special Offers */}
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Gift className="w-4 h-4 mr-1 text-amber-600" />
                    Special Offers
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="h-3 w-3 text-amber-700" />
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">10% off</span> your next purchase. Use code:{" "}
                        <span className="font-bold text-cherry-800">THANKYOU10</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-cherry-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Gift className="h-3 w-3 text-cherry-700" />
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Free gift</span> with your next order over $100
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What's Next Card */}
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="h-2 bg-cherry-700"></div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ChevronRight className="mr-2 h-5 w-5 text-cherry-700" />
                What's Next?
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-cherry-700" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Order Processing</h4>
                    <p className="text-gray-600 mt-1">
                      We're preparing your items for shipment. You'll receive an email once your order is ready.
                    </p>
                    <div className="mt-2 flex items-center text-sm">
                      <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-cherry-600 h-1.5 rounded-full w-1/4"></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-gray-500">25%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-400">Shipping</h4>
                    <p className="text-gray-400 mt-1">
                      Your order will be shipped within 1-2 business days. You'll receive tracking information via
                      email.
                    </p>
                    <div className="mt-2 flex items-center text-sm">
                      <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-gray-200 h-1.5 rounded-full w-0"></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-gray-400">0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="h-2 bg-cherry-700"></div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-cherry-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Order Timeline
              </h3>

              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cherry-600 via-amber-400 to-gray-200"></div>

                {/* Timeline events */}
                <div className="space-y-8">
                  {/* Order Placed */}
                  <div className="relative pl-14">
                    <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-cherry-700 shadow-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Order Placed</h4>
                      <p className="text-sm text-gray-500">{new Date().toLocaleString()}</p>
                      <p className="mt-1 text-gray-600">Your order has been received and is being processed.</p>
                    </div>
                  </div>

                  {/* Payment Confirmed */}
                  <div className="relative pl-14">
                    <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 shadow-lg">
                      <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Payment Confirmed</h4>
                      <p className="text-sm text-gray-500">{new Date().toLocaleString()}</p>
                      <p className="mt-1 text-gray-600">Your payment has been successfully processed.</p>
                    </div>
                  </div>

                  {/* Processing */}
                  <div className="relative pl-14">
                    <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 shadow-md">
                      <Package className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-400">Processing Order</h4>
                      <p className="text-sm text-gray-400">Pending</p>
                      <p className="mt-1 text-gray-400">Your items are being prepared for shipment.</p>
                    </div>
                  </div>

                  {/* Shipped */}
                  <div className="relative pl-14">
                    <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 shadow-md">
                      <Truck className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-400">Order Shipped</h4>
                      <p className="text-sm text-gray-400">Pending</p>
                      <p className="mt-1 text-gray-400">Your order is on its way to you.</p>
                    </div>
                  </div>

                  {/* Delivered */}
                  <div className="relative pl-14">
                    <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 shadow-md">
                      <svg
                        className="h-5 w-5 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-400">Delivered</h4>
                      <p className="text-sm text-gray-400">Expected by {formattedDeliveryDate}</p>
                      <p className="mt-1 text-gray-400">Your order will be delivered to your shipping address.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
            onClick={() => window.print()}
          >
            <Printer className="h-5 w-5 text-cherry-700 mb-1" />
            <span className="text-xs font-medium text-gray-700">Print Receipt</span>
          </button>

          <button
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
            onClick={addToCalendar}
          >
            <Calendar className="h-5 w-5 text-cherry-700 mb-1" />
            <span className="text-xs font-medium text-gray-700">Add to Calendar</span>
          </button>

          <button
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "My Order Confirmation",
                  text: `I've just placed an order #${orderId}!`,
                  url: window.location.href,
                })
              }
            }}
          >
            <Share2 className="h-5 w-5 text-cherry-700 mb-1" />
            <span className="text-xs font-medium text-gray-700">Share Order</span>
          </button>

          <a
            href="#"
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
          >
            <MessageCircle className="h-5 w-5 text-cherry-700 mb-1" />
            <span className="text-xs font-medium text-gray-700">Contact Support</span>
          </a>
        </div>
      </div>

      {/* Continue Shopping */}
      <div className="mt-8 text-center bg-amber-50 p-6 rounded-xl border border-amber-100">
        <div className="mb-4 inline-flex items-center justify-center p-2 rounded-full bg-amber-100">
          <svg
            className="h-6 w-6 text-amber-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">This Page Will Not Redirect Automatically</h3>
        <p className="text-gray-700 mb-4 max-w-2xl mx-auto">
          Your order has been successfully placed. You can stay on this confirmation page as long as you need. When
          you're ready, please use one of the buttons below to continue.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <Button
            asChild
            variant="outline"
            className="h-12 px-6 text-base font-medium border-amber-200 hover:bg-amber-50 hover:text-amber-800 transition-all"
          >
            <Link href="/orders">View My Orders</Link>
          </Button>

          <Button
            asChild
            className="h-12 px-6 text-base font-medium bg-cherry-700 hover:bg-cherry-800 text-white shadow-md hover:shadow-lg transition-all"
          >
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
