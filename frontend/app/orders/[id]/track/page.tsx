"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Phone,
  Mail,
  ShoppingCart,
  CreditCard,
  PackageCheck,
  Plane,
  Home,
  Star,
  MessageCircle,
  Download,
  Share2,
  Timer,
  Shield,
} from "lucide-react"
import { orderService } from "@/services/orders"
import type { Order } from "@/types"
import { motion } from "framer-motion"

interface OrderStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: "completed" | "current" | "pending" | "cancelled"
  timestamp?: string
  location?: string
  details?: string
  estimatedTime?: string
}

interface TrackingInfo {
  tracking_number: string
  carrier: string
  status: string
  estimated_delivery: string
  current_location?: string
  delivery_attempts?: number
  special_instructions?: string
}

export default function OrderTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  // Extract order ID from params
  const orderId = React.useMemo(() => {
    if (!params) return null
    const possibleIds = [params.orderId, params.id, params.orderNumber]
    for (const id of possibleIds) {
      if (id && typeof id === "string" && id.trim() !== "") {
        return id.trim()
      }
    }
    return null
  }, [params])

  const generateOrderSteps = (orderData: Order): OrderStep[] => {
    const orderDate = new Date(orderData.created_at)
    const status = orderData.status.toLowerCase()

    const steps: OrderStep[] = [
      {
        id: "order-placed",
        title: "Order Placed",
        description: "Your order has been successfully placed",
        icon: <ShoppingCart className="h-5 w-5" />,
        status: "completed",
        timestamp: orderDate.toISOString(),
        location: "Mizizzi Online Store",
        details: `Order #${orderData.order_number} confirmed`,
        estimatedTime: "Immediate",
      },
      {
        id: "payment-confirmed",
        title: "Payment Confirmed",
        description: "Payment has been processed successfully",
        icon: <CreditCard className="h-5 w-5" />,
        status: "completed",
        timestamp: new Date(orderDate.getTime() + 5 * 60 * 1000).toISOString(), // 5 minutes later
        location: "Payment Gateway",
        details: `${orderData.payment_method} payment verified`,
        estimatedTime: "Within 5 minutes",
      },
      {
        id: "order-confirmed",
        title: "Order Confirmed",
        description: "Your order has been confirmed and is being prepared",
        icon: <PackageCheck className="h-5 w-5" />,
        status: ["pending"].includes(status)
          ? "current"
          : ["processing", "shipped", "delivered"].includes(status)
            ? "completed"
            : "pending",
        timestamp: ["processing", "shipped", "delivered"].includes(status)
          ? new Date(orderDate.getTime() + 30 * 60 * 1000).toISOString()
          : undefined,
        location: "Fulfillment Center",
        details: "Order details verified and inventory allocated",
        estimatedTime: "Within 30 minutes",
      },
      {
        id: "processing",
        title: "Processing",
        description: "Your items are being picked and packed",
        icon: <Package className="h-5 w-5" />,
        status:
          status === "processing" ? "current" : ["shipped", "delivered"].includes(status) ? "completed" : "pending",
        timestamp: ["shipped", "delivered"].includes(status)
          ? new Date(orderDate.getTime() + 4 * 60 * 60 * 1000).toISOString()
          : undefined,
        location: "Warehouse",
        details: "Items being carefully packed for shipment",
        estimatedTime: "2-4 hours",
      },
      {
        id: "quality-check",
        title: "Quality Check",
        description: "Final quality inspection before shipment",
        icon: <Shield className="h-5 w-5" />,
        status: ["shipped", "delivered"].includes(status)
          ? "completed"
          : status === "processing"
            ? "current"
            : "pending",
        timestamp: ["shipped", "delivered"].includes(status)
          ? new Date(orderDate.getTime() + 6 * 60 * 60 * 1000).toISOString()
          : undefined,
        location: "Quality Control",
        details: "Ensuring all items meet our quality standards",
        estimatedTime: "1-2 hours",
      },
      {
        id: "shipped",
        title: "Shipped",
        description: "Your order is on its way to you",
        icon: <Truck className="h-5 w-5" />,
        status: status === "shipped" ? "current" : status === "delivered" ? "completed" : "pending",
        timestamp:
          status === "delivered" ? new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined,
        location: "In Transit",
        details: orderData.tracking_number
          ? `Tracking: ${orderData.tracking_number}`
          : "Tracking number will be provided soon",
        estimatedTime: "1-2 business days",
      },
      {
        id: "out-for-delivery",
        title: "Out for Delivery",
        description: "Your package is out for delivery",
        icon: <Plane className="h-5 w-5" />,
        status: status === "delivered" ? "completed" : "pending",
        timestamp:
          status === "delivered" ? new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        location: "Local Delivery Hub",
        details: "Package loaded for final delivery",
        estimatedTime: "Same day",
      },
      {
        id: "delivered",
        title: "Delivered",
        description: "Your order has been successfully delivered",
        icon: <Home className="h-5 w-5" />,
        status: status === "delivered" ? "completed" : "pending",
        timestamp:
          status === "delivered"
            ? new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString()
            : undefined,
        location: orderData.shipping_address?.city || "Delivery Address",
        details: "Package delivered successfully",
        estimatedTime: "Completed",
      },
    ]

    // Handle cancelled orders
    if (status === "cancelled") {
      return steps.map((step, index) => {
        if (index <= 2) return { ...step, status: "completed" as const }
        return { ...step, status: "cancelled" as const }
      })
    }

    return steps
  }

  const fetchOrderAndTracking = async (id: string, showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      if (!id || id.trim() === "") {
        throw new Error("Invalid order ID provided")
      }

      const orderData = await orderService.getOrderById(id)
      if (!orderData) {
        throw new Error(`Order not found for ID: ${id}`)
      }

      setOrder(orderData)

      // Generate tracking info
      const estimatedDelivery = new Date(orderData.created_at)
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 5)

      setTrackingInfo({
        tracking_number: orderData.tracking_number || `TRK${orderData.order_number}`,
        carrier: orderData.shipping_method || "Standard Delivery",
        status: orderData.status,
        estimated_delivery: estimatedDelivery.toISOString(),
        current_location: orderData.status === "shipped" ? "In Transit" : "Fulfillment Center",
        delivery_attempts: 0,
        special_instructions: "Please ring doorbell",
      })

      // Set active step based on status
      const steps = generateOrderSteps(orderData)
      const currentStepIndex = steps.findIndex((step) => step.status === "current")
      setActiveStep(
        currentStepIndex >= 0 ? currentStepIndex : steps.findLastIndex((step) => step.status === "completed"),
      )
    } catch (err: any) {
      console.error("Error fetching order and tracking:", err)
      setError(err.message || "Failed to load order tracking information")
      setOrder(null)
      setTrackingInfo(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-cherry-700 border-cherry-700 text-white"
      case "current":
        return "bg-cherry-600 border-cherry-600 text-white animate-pulse"
      case "cancelled":
        return "bg-red-600 border-red-600 text-white"
      default:
        return "bg-gray-200 border-gray-300 text-gray-500"
    }
  }

  const getStepLineColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-cherry-700"
      case "current":
        return "bg-gradient-to-b from-cherry-700 to-cherry-500"
      case "cancelled":
        return "bg-red-600"
      default:
        return "bg-gray-200"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Invalid date"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleRefresh = () => {
    if (orderId) {
      fetchOrderAndTracking(orderId, true)
    }
  }

  const handleBackToOrders = () => {
    router.push("/orders")
  }

  useEffect(() => {
    if (orderId) {
      fetchOrderAndTracking(orderId)
    } else {
      setError("No order ID provided in URL")
      setLoading(false)
    }
  }, [orderId])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cherry-950/30 via-black/10 to-cherry-900/20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-96 w-full rounded-xl" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cherry-950/30 via-black/10 to-cherry-900/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBackToOrders} className="flex items-center gap-2 text-cherry-700">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-cherry-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-12 w-12 text-cherry-700" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We couldn't find the order you're looking for. Please check the order ID and try again.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleBackToOrders}
                  variant="outline"
                  size="lg"
                  className="border-cherry-700 text-cherry-700"
                >
                  View All Orders
                </Button>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  size="lg"
                  className="bg-cherry-700 hover:bg-cherry-800 text-white"
                >
                  {refreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Try Again
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  const steps = order ? generateOrderSteps(order) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-cherry-950/30 via-black/10 to-cherry-900/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                onClick={handleBackToOrders}
                className="flex items-center gap-2 hover:bg-white/10 text-cherry-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Orders
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cherry-700 to-cherry-900 bg-clip-text text-transparent">
                  Track Your Order
                </h1>
                <p className="text-gray-600 text-lg">Order #{order?.order_number}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/50 backdrop-blur-sm border-cherry-700 text-cherry-700"
              >
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-cherry-700 text-cherry-700">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-cherry-700 text-cherry-700">
                <Download className="h-4 w-4 mr-2" />
                Invoice
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Order Progress - Main Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Order Status Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-cherry-700 to-cherry-900 rounded-xl text-white">
                          <Package className="h-6 w-6" />
                        </div>
                        Order Progress
                      </CardTitle>
                      <Badge
                        className={`px-4 py-2 text-sm font-semibold ${
                          order?.status === "delivered"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : order?.status === "shipped"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : order?.status === "processing"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : order?.status === "cancelled"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-gray-100 text-gray-800 border-gray-200"
                        }`}
                      >
                        {order?.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Progress Steps */}
                    <div className="relative">
                      {steps.map((step, index) => (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex gap-6 pb-8 last:pb-0"
                        >
                          {/* Step Line */}
                          {index < steps.length - 1 && (
                            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200">
                              <motion.div
                                className={`w-full ${getStepLineColor(step.status)} origin-top`}
                                initial={{ scaleY: 0 }}
                                animate={{
                                  scaleY: step.status === "completed" ? 1 : step.status === "current" ? 0.5 : 0,
                                }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                              />
                            </div>
                          )}

                          {/* Step Icon */}
                          <motion.div
                            className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${getStepStatusColor(step.status)}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {step.status === "completed" ? (
                              <CheckCircle className="h-6 w-6" />
                            ) : step.status === "current" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                              >
                                {step.icon}
                              </motion.div>
                            ) : (
                              step.icon
                            )}
                          </motion.div>

                          {/* Step Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3
                                className={`text-lg font-semibold ${
                                  step.status === "completed"
                                    ? "text-cherry-700"
                                    : step.status === "current"
                                      ? "text-cherry-600"
                                      : step.status === "cancelled"
                                        ? "text-red-600"
                                        : "text-gray-500"
                                }`}
                              >
                                {step.title}
                              </h3>
                              {step.timestamp && (
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(step.timestamp)}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mb-2">{step.description}</p>
                            {step.details && <p className="text-sm text-gray-500 mb-2">{step.details}</p>}
                            <div className="flex items-center gap-4 text-sm">
                              {step.location && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  {step.location}
                                </span>
                              )}
                              {step.estimatedTime && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Timer className="h-3 w-3" />
                                  {step.estimatedTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Order Items */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-cherry-700 to-cherry-900 rounded-lg text-white">
                        <Package className="h-5 w-5" />
                      </div>
                      Order Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order?.items?.map((item, index) => (
                        <motion.div
                          key={item.id || index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex gap-4 p-4 bg-white/50 rounded-xl border border-gray-100"
                        >
                          <div className="h-20 w-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                            {item.image_url ? (
                              <img
                                src={item.image_url || "/placeholder.svg"}
                                alt={item.product_name || "Product"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {item.product_name || item.name || "Product"}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Quantity: {item.quantity} × {formatCurrency(item.price || 0)}
                            </p>
                            <p className="text-lg font-bold text-gray-900 mt-2">{formatCurrency(item.total || 0)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tracking Info */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-cherry-700 to-cherry-900 rounded-lg text-white">
                        <Truck className="h-4 w-4" />
                      </div>
                      Tracking Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-mono font-semibold text-gray-900">{trackingInfo?.tracking_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carrier</p>
                      <p className="font-semibold text-gray-900">{trackingInfo?.carrier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estimated Delivery</p>
                      <p className="font-semibold text-gray-900">
                        {trackingInfo?.estimated_delivery ? formatDate(trackingInfo.estimated_delivery) : "TBD"}
                      </p>
                    </div>
                    {trackingInfo?.current_location && (
                      <div>
                        <p className="text-sm text-gray-600">Current Location</p>
                        <p className="font-semibold text-gray-900 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trackingInfo.current_location}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Shipping Address */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-cherry-700 to-cherry-900 rounded-lg text-white">
                        <Home className="h-4 w-4" />
                      </div>
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order?.shipping_address ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-900">
                          {order.shipping_address.first_name} {order.shipping_address.last_name}
                        </p>
                        <p className="text-gray-700">{order.shipping_address.address_line_1}</p>
                        {order.shipping_address.address_line_2 && (
                          <p className="text-gray-700">{order.shipping_address.address_line_2}</p>
                        )}
                        <p className="text-gray-700">
                          {order.shipping_address.city}, {order.shipping_address.state}{" "}
                          {order.shipping_address.postal_code}
                        </p>
                        <p className="text-gray-700">{order.shipping_address.country}</p>
                        {order.shipping_address.phone && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            {order.shipping_address.phone}
                          </div>
                        )}
                        {order.shipping_address.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            {order.shipping_address.email}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">No shipping address available</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Order Summary */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-cherry-700 to-cherry-900 rounded-lg text-white">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(order?.subtotal || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping</span>
                        <span className="font-semibold">
                          {order?.shipping_cost === 0 ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            formatCurrency(order?.shipping_cost || 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-semibold">{formatCurrency(order?.tax || 0)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-gray-900">{formatCurrency(order?.total || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full bg-gradient-to-r from-cherry-700 to-cherry-900 hover:from-cherry-800 hover:to-cherry-950 text-white">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button variant="outline" className="w-full border-cherry-700 text-cherry-700">
                      <Star className="h-4 w-4 mr-2" />
                      Rate Order
                    </Button>
                    <Button variant="outline" className="w-full border-cherry-700 text-cherry-700">
                      <Package className="h-4 w-4 mr-2" />
                      Reorder Items
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
