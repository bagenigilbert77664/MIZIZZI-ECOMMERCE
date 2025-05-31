"use client"

import { CardFooter } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
  Phone,
  Mail,
  Copy,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { websocketService } from "@/services/websocket"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import type { Order } from "@/types"

// Extend the OrderItem type to include the missing properties
interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product?: {
    name?: string
    thumbnail_url?: string
    image_urls?: string[]
  }
  product_name?: string
  name?: string
  thumbnail_url?: string
  image_url?: string
  returnable?: boolean
  original_price?: number
}

interface TrackingUpdate {
  id: string
  status: string
  location: string
  description: string
  timestamp: string
  updated_by: string
}

interface TrackingInfo {
  tracking_number: string
  carrier: string
  estimated_delivery: string
  current_location: string
  updates: TrackingUpdate[]
}

function TrackingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrderDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex justify-between pb-4 border-b last:border-0 last:pb-0">
                  <div>
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Separator className="mb-4" />
            <div className="w-full space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1 mb-4">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-4 w-40 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    console.log("OrderTrackingPage mounted with orderId:", params.orderId)
    fetchOrderAndTracking()
  }, [params.orderId])

  // WebSocket for real-time updates
  useEffect(() => {
    if (!websocketService.isEnabled() || !order) return

    const unsubscribeOrderUpdate = websocketService.on("order_updated", (data: any) => {
      if (data.order_id === order.id) {
        console.log("Received real-time order update:", data)
        setOrder((prev) => (prev ? { ...prev, status: data.status, tracking_number: data.tracking_number } : null))

        // Refresh tracking info to get latest updates
        fetchTrackingInfo(order.id)

        toast({
          title: "Order Updated",
          description: `Your order status has been updated to ${data.status}`,
        })
      }
    })

    const unsubscribeTrackingUpdate = websocketService.on("tracking_updated", (data: any) => {
      if (data.order_id === order.id) {
        console.log("Received real-time tracking update:", data)
        fetchTrackingInfo(order.id)

        toast({
          title: "Tracking Updated",
          description: "New tracking information is available",
        })
      }
    })

    return () => {
      unsubscribeOrderUpdate()
      unsubscribeTrackingUpdate()
    }
  }, [order, toast])

  const fetchOrderAndTracking = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching order with ID:", params.orderId)
      const orderData = await orderService.getOrderById(params.orderId)

      if (!orderData) {
        console.error("Order not found for ID:", params.orderId)
        setError(`Order with ID ${params.orderId} not found. This could be because:
        • The order doesn't exist
        • You don't have permission to view this order
        • The order ID is incorrect
        • The backend API is not running`)
        return
      }

      console.log("Order fetched successfully:", orderData)
      setOrder(orderData)
      await fetchTrackingInfo(orderData.id)
    } catch (err: any) {
      console.error("Failed to fetch order:", err)
      setError(err.message || "Failed to load order details. Please check if the backend API is running.")
    } finally {
      setLoading(false)
    }
  }

  const fetchTrackingInfo = async (orderId: string) => {
    try {
      console.log("Generating tracking info for order:", orderId)
      // Generate realistic tracking info based on order status
      const mockTrackingInfo: TrackingInfo = {
        tracking_number: order?.tracking_number || `TRK${Math.random().toString().substr(2, 7)}`,
        carrier: "DHL Express",
        estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: getCurrentLocation(order?.status || "pending"),
        updates: generateTrackingUpdates(order),
      }

      setTrackingInfo(mockTrackingInfo)
      console.log("Tracking info set:", mockTrackingInfo)
    } catch (error) {
      console.error("Failed to fetch tracking info:", error)
    }
  }

  const getCurrentLocation = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Order Processing Center"
      case "processing":
        return "Nairobi Warehouse"
      case "shipped":
        return "In Transit to Destination"
      case "delivered":
        return "Delivered"
      default:
        return "Processing Center"
    }
  }

  const generateTrackingUpdates = (order: Order | null): TrackingUpdate[] => {
    if (!order) return []

    const updates: TrackingUpdate[] = [
      {
        id: "1",
        status: "order_placed",
        location: "Nairobi, Kenya",
        description: "Your order has been received and is being processed.",
        timestamp: order.created_at,
        updated_by: "System",
      },
    ]

    const now = new Date()
    const orderDate = new Date(order.created_at)

    // Add processing update if status is processing or beyond
    if (["processing", "shipped", "delivered"].includes(order.status?.toLowerCase() || "")) {
      updates.push({
        id: "2",
        status: "processing",
        location: "Nairobi Warehouse",
        description: "Your order is being prepared for shipment.",
        timestamp: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        updated_by: "Warehouse Team",
      })
    }

    // Add shipped update if status is shipped or delivered
    if (["shipped", "delivered"].includes(order.status?.toLowerCase() || "")) {
      updates.push({
        id: "3",
        status: "shipped",
        location: "In Transit",
        description: "Your order has been shipped and is on its way.",
        timestamp: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 1 day later
        updated_by: "DHL Express",
      })

      updates.push({
        id: "4",
        status: "out_for_delivery",
        location: order.shipping_address?.city || "Delivery City",
        description: "Your package is out for delivery today.",
        timestamp: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days later
        updated_by: "Local Courier",
      })
    }

    // Add delivered update if status is delivered
    if (order.status?.toLowerCase() === "delivered") {
      updates.push({
        id: "5",
        status: "delivered",
        location: order.shipping_address?.city || "Delivery Address",
        description: "Your package has been delivered.",
        timestamp: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days later
        updated_by: "Delivery Agent",
      })
    }

    return updates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  const refreshTracking = async () => {
    setRefreshing(true)
    await fetchOrderAndTracking()
    setRefreshing(false)
    toast({
      title: "Tracking Refreshed",
      description: "Latest tracking information has been loaded",
    })
  }

  const copyTrackingNumber = () => {
    if (trackingInfo?.tracking_number) {
      navigator.clipboard.writeText(trackingInfo.tracking_number)
      toast({
        title: "Copied",
        description: "Tracking number copied to clipboard",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusProgress = (status: string): number => {
    switch (status.toLowerCase()) {
      case "pending":
        return 25
      case "processing":
        return 50
      case "shipped":
        return 75
      case "delivered":
        return 100
      default:
        return 0
    }
  }

  const getStatusIcon = (status: string, isActive = false) => {
    const iconClass = `h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`

    switch (status.toLowerCase()) {
      case "order_placed":
      case "pending":
        return <Package className={iconClass} />
      case "processing":
        return <RefreshCw className={iconClass} />
      case "shipped":
      case "out_for_delivery":
        return <Truck className={iconClass} />
      case "delivered":
        return <CheckCircle className={iconClass} />
      default:
        return <Clock className={iconClass} />
    }
  }

  const isStatusActive = (targetStatus: string, currentStatus: string): boolean => {
    const statusOrder = ["pending", "processing", "shipped", "delivered"]
    const currentIndex = statusOrder.indexOf(currentStatus.toLowerCase())
    const targetIndex = statusOrder.indexOf(targetStatus.toLowerCase())
    return targetIndex <= currentIndex
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-4">
          <p className="text-sm text-gray-600">Loading order {params.orderId}...</p>
        </div>
        <TrackingSkeleton />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
          <div className="text-gray-600 mb-4 max-w-md mx-auto">
            <p className="mb-2">
              Order ID: <code className="bg-gray-100 px-2 py-1 rounded">{params.orderId}</code>
            </p>
            <p className="text-sm whitespace-pre-line">
              {error || "The order you're looking for doesn't exist or you don't have permission to view it."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild variant="outline">
              <Link href="/orders">Back to Orders</Link>
            </Button>
            <Button onClick={fetchOrderAndTracking} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Try Again
            </Button>
            {process.env.NODE_ENV === "development" && (
              <Button asChild variant="secondary">
                <Link href="/orders/1/track">Try Mock Order</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orders/${order.id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Order
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shipment Tracking</h1>
              <p className="text-gray-600">
                Order #{order.order_number} • {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshTracking} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <OrderStatusBadge status={order.status || "pending"} />
          </div>
        </div>

        {/* Tracking Number */}
        {trackingInfo && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Tracking Number</h3>
                  <p className="text-2xl font-mono font-bold text-blue-600">{trackingInfo.tracking_number}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyTrackingNumber}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://www.dhl.com/en/express/tracking.html?AWB=${trackingInfo.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track on DHL
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Progress Bar */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {["pending", "processing", "shipped", "delivered"].map((status, index) => (
                    <div key={status} className="flex flex-col items-center relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isStatusActive(status, order.status || "pending")
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        {getStatusIcon(status, isStatusActive(status, order.status || "pending"))}
                      </div>
                      <span className="mt-2 text-sm font-medium capitalize text-center">
                        {status === "pending" ? "Order Placed" : status}
                      </span>
                      <span className="text-xs text-gray-500 text-center mt-1">
                        {status === "pending" && formatDate(order.created_at)}
                        {status === "processing" &&
                          (isStatusActive(status, order.status || "pending")
                            ? "In Progress"
                            : "Waiting to be processed")}
                        {status === "shipped" &&
                          (isStatusActive(status, order.status || "pending") ? "In Transit" : "Waiting to be shipped")}
                        {status === "delivered" &&
                          (isStatusActive(status, order.status || "pending") ? "Completed" : "Waiting to be delivered")}
                      </span>

                      {/* Progress Line */}
                      {index < 3 && (
                        <div
                          className={`absolute top-6 left-12 w-full h-0.5 transition-all duration-300 ${
                            isStatusActive(
                              ["pending", "processing", "shipped", "delivered"][index + 1],
                              order.status || "pending",
                            )
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                          style={{ width: "calc(100vw / 4 - 3rem)" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Detailed Timeline */}
              {trackingInfo && (
                <div>
                  <h3 className="font-medium mb-4">Detailed Tracking History</h3>
                  <div className="space-y-4">
                    {trackingInfo.updates
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((update, index) => (
                        <div key={update.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`p-2 rounded-full ${
                                index === 0 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {getStatusIcon(update.status)}
                            </div>
                            {index < trackingInfo.updates.length - 1 && <div className="w-px h-8 bg-gray-200 mt-2" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium capitalize">{update.status.replace("_", " ")}</h4>
                              <div className="text-right">
                                <div className="text-sm font-medium">{formatDate(update.timestamp)}</div>
                                <div className="text-xs text-gray-500">{formatTime(update.timestamp)}</div>
                              </div>
                            </div>
                            <p className="text-gray-600 mb-2">{update.description}</p>
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              {update.location}
                              <span className="mx-2">•</span>
                              <User className="h-3 w-3 mr-1" />
                              {update.updated_by}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Package Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.thumbnail_url || "/placeholder.svg?height=64&width=64"}
                        alt={item.product_name || "Product"}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name || "Product"}</h4>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.shipping_address ? (
                <div className="space-y-2">
                  <p className="font-medium">{order.shipping_address.name}</p>
                  <div className="text-sm text-gray-600">
                    <p>{order.shipping_address.street}</p>
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.state}
                    </p>
                    <p>{order.shipping_address.zipCode}</p>
                    <p>{order.shipping_address.country}</p>
                  </div>
                  {order.shipping_address.phone && (
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <Phone className="h-4 w-4 mr-2" />
                      {order.shipping_address.phone}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No delivery address available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-medium mb-2">Need Help with Your Shipment?</h3>
              <p className="text-gray-600 mb-4">
                If you have any questions about your order or delivery, we're here to help.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Us
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/help">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Help Center
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
