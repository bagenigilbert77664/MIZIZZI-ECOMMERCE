"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import confetti from "canvas-confetti"

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
}

export default function CheckoutConfirmation({
  formData,
  orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000),
}: CheckoutConfirmationProps) {
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(true)
  const [activeTab, setActiveTab] = useState("details")

  // Estimated delivery date (5-7 business days from now)
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + 5 + Math.floor(Math.random() * 3))
  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Add this near the other useEffect hooks
  useEffect(() => {
    // This prevents any automatic redirects that might be happening
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent unintentional navigation, not user-clicked links
      const target = e.target as any
      if (!target || !target.activeElement || target.activeElement.tagName !== "A") {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    // Add the event listener
    window.addEventListener("beforeunload", handleBeforeUnload)

    // Clean up
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Header Section with Animation */}
      <motion.div
        className="text-center relative"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-gradient-to-r from-amber-200 via-cherry-300 to-amber-200"></div>
        </div>

        <motion.div
          className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-amber-50 to-cherry-50 mb-6 relative overflow-hidden shadow-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-cherry-200/20 animate-pulse"></div>
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="h-12 w-12 text-gradient-to-r from-amber-600 to-cherry-600" />
          </motion.div>
        </motion.div>

        <motion.h2
          className="text-3xl font-bold mb-3 bg-gradient-to-r from-amber-700 via-cherry-800 to-amber-700 text-transparent bg-clip-text"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Order Confirmed!
        </motion.h2>

        <motion.p
          className="text-gray-600 max-w-lg mx-auto text-lg"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Thank you for your order. We've received your payment and will begin processing your order right away.
        </motion.p>

        {orderId && (
          <motion.div
            className="mt-6 inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-cherry-50 border border-amber-100 shadow-md"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-sm font-medium text-gray-500">Order ID:</span>
            <span className="ml-2 font-bold text-gray-900">{orderId}</span>
            <motion.button
              onClick={copyOrderId}
              className="ml-2 p-1 rounded-full hover:bg-white/80 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-2">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "details" ? "bg-white shadow-sm text-cherry-900" : "text-gray-600 hover:text-cherry-700"
            }`}
          >
            Order Details
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "timeline" ? "bg-white shadow-sm text-cherry-900" : "text-gray-600 hover:text-cherry-700"
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Content Sections */}
      <AnimatePresence mode="wait">
        {activeTab === "details" ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Order Details Card */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-2 bg-gradient-to-r from-amber-400 via-cherry-600 to-amber-400"></div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="mr-2 h-5 w-5 text-cherry-700" />
                  Order Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1 text-cherry-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Shipping Address
                      </h4>
                      <div className="text-gray-900">
                        <p className="font-medium text-base">
                          {formData.firstName} {formData.lastName}
                        </p>
                        <p className="mt-1">{formData.address}</p>
                        <p>
                          {formData.city}, {formData.state} {formData.zipCode}
                        </p>
                        <p>{formData.country === "ke" ? "Kenya" : formData.country}</p>
                        {formData.phone && (
                          <p className="mt-2 flex items-center text-cherry-800">
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            {formData.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1 text-cherry-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        Payment Method
                      </h4>
                      <p className="text-gray-900 font-medium flex items-center">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-100 to-cherry-100 mr-2 flex items-center justify-center">
                          <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-cherry-600 text-transparent bg-clip-text">
                            {getPaymentMethodName(formData.paymentMethod).charAt(0)}
                          </span>
                        </span>
                        {getPaymentMethodName(formData.paymentMethod)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-cherry-700" />
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

                    <div className="bg-gradient-to-r from-amber-50 to-cherry-50 p-4 rounded-lg border border-amber-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Gift className="w-4 h-4 mr-1 text-amber-600" />
                        Special Offers
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Star className="h-3 w-3 text-amber-700" />
                          </div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">10% off</span> your next purchase. Use code:{" "}
                            <span className="font-bold text-cherry-800">THANKYOU10</span>
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-r from-cherry-200 to-cherry-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Gift className="h-3 w-3 text-cherry-700" />
                          </div>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Free gift</span> with your next order over $100
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Next Card */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-2 bg-gradient-to-r from-amber-400 via-cherry-600 to-amber-400"></div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ChevronRight className="mr-2 h-5 w-5 text-cherry-700" />
                  What's Next?
                </h3>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-100 to-cherry-100 flex items-center justify-center shadow-md">
                        <Package className="h-5 w-5 text-gradient-to-r from-amber-600 to-cherry-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">Order Processing</h4>
                      <p className="text-gray-600 mt-1">
                        We're preparing your items for shipment. You'll receive an email once your order is ready.
                      </p>
                      <div className="mt-2 flex items-center text-sm">
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-gradient-to-r from-amber-400 to-cherry-600 h-1.5 rounded-full w-1/4"></div>
                        </div>
                        <span className="ml-2 text-xs font-medium text-gray-500">25%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-100 to-cherry-100 flex items-center justify-center shadow-md">
                        <Truck className="h-5 w-5 text-gradient-to-r from-amber-600 to-cherry-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">Shipping</h4>
                      <p className="text-gray-600 mt-1">
                        Your order will be shipped within 1-2 business days. You'll receive tracking information via
                        email.
                      </p>
                      <div className="mt-2 flex items-center text-sm">
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-gradient-to-r from-amber-400 to-cherry-600 h-1.5 rounded-full w-0"></div>
                        </div>
                        <span className="ml-2 text-xs font-medium text-gray-500">0%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-2 bg-gradient-to-r from-amber-400 via-cherry-600 to-amber-400"></div>
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
                      <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-cherry-600 to-cherry-700 shadow-lg">
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
                      <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-gradient-to-r from-amber-50 to-cherry-50 border border-amber-100 shadow-sm hover:shadow-md transition-all"
            onClick={() => window.print()}
          >
            <Printer className="h-5 w-5 text-cherry-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">Print Receipt</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-gradient-to-r from-amber-50 to-cherry-50 border border-amber-100 shadow-sm hover:shadow-md transition-all"
            onClick={addToCalendar}
          >
            <Calendar className="h-5 w-5 text-cherry-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">Add to Calendar</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-gradient-to-r from-amber-50 to-cherry-50 border border-amber-100 shadow-sm hover:shadow-md transition-all"
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
            <Share2 className="h-5 w-5 text-cherry-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">Share Order</span>
          </motion.button>

          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-gradient-to-r from-amber-50 to-cherry-50 border border-amber-100 shadow-sm hover:shadow-md transition-all"
          >
            <MessageCircle className="h-5 w-5 text-cherry-700 mb-2" />
            <span className="text-sm font-medium text-gray-700">Contact Support</span>
          </motion.a>
        </div>
      </div>

      {/* Static Page Instructions - No Automatic Redirects */}
      <div className="mt-8 text-center bg-amber-50 p-6 rounded-xl border-2 border-amber-200">
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
            className="h-14 px-8 text-base font-medium border-amber-200 hover:bg-amber-50 hover:text-amber-800 transition-all duration-300"
          >
            <Link href="/orders">
              <motion.span
                className="flex items-center"
                initial={{ x: -5, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                View My Orders
              </motion.span>
            </Link>
          </Button>

          <Button
            asChild
            className="h-14 px-8 text-base font-medium bg-gradient-to-r from-cherry-800 to-cherry-900 hover:from-cherry-700 hover:to-cherry-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Link href="/">
              <motion.span
                className="flex items-center"
                initial={{ x: 5, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Continue Shopping
              </motion.span>
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

