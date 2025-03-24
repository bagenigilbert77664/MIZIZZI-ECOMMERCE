"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  File,
  Home,
  Info,
  Loader2,
  Package,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Truck,
  User,
  XCircle,
  RefreshCw,
} from "lucide-react"
import type { Order, OrderItem } from "@/types"
import { useMediaQuery } from "@/hooks/use-media-query"

// Define order status colors and icons
const statusColors: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    icon: <Clock className="h-5 w-5" />,
  },
  processing: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <Package className="h-5 w-5" />,
  },
  shipped: {
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    icon: <Truck className="h-5 w-5" />,
  },
  delivered: {
    color: "text-green-600",
    bgColor: "bg-green-50",
    icon: <PackageCheck className="h-5 w-5" />,
  },
  cancelled: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: <PackageX className="h-5 w-5" />,
  },
  canceled: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: <PackageX className="h-5 w-5" />,
  },
  default: {
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
}

// Item status colors
const itemStatusColors: Record<string, string> = {
  cancelled: "border-red-200 bg-red-50",
  canceled: "border-red-200 bg-red-50",
  returned: "border-orange-200 bg-orange-50",
  refunded: "border-blue-200 bg-blue-50",
  default: "border-gray-200 bg-white",
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const isMobile = useMediaQuery("(max-width: 640px)")

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [timeoutError, setTimeoutError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const orderId = params.id as string

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/orders")
      return
    }

    if (isAuthenticated && orderId) {
      console.log("Fetching order details for ID:", orderId)
      fetchOrderDetails()

      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (loading) {
          console.log("Loading timeout reached")
          setTimeoutError(true)
          setLoading(false)
          setError("Request timed out. Please try refreshing the page.")
        }
      }, 15000) // 15 seconds timeout

      return () => clearTimeout(timeoutId)
    }
  }, [isAuthenticated, authLoading, orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      console.log("Making API call to fetch order:", orderId)

      // Use the fallback method instead of the regular getOrderById
      const data = await orderService.getOrderByIdWithFallback(orderId)

      console.log("Order details fetched successfully:", data)

      if (!data) {
        throw new Error("No order data returned from API")
      }

      // Process order data to ensure it has all required fields
      const processedOrder = {
        ...data,
        // Ensure order has items array
        items: data.items || [],
        // Ensure order has total_amount (fallback to total if needed)
        total_amount: data.total_amount || data.total || 0,
        // Ensure order has order_number
        order_number: data.order_number || `ORD-${data.id}`,
        // Ensure shipping and billing addresses exist
        shipping_address: data.shipping_address || {},
        billing_address: data.billing_address || {},
      }

      setOrder(processedOrder)
    } catch (err: any) {
      console.error("Failed to fetch order details:", err)
      setError(err.message || "Failed to load order details")
      toast({
        title: "Error",
        description: "Could not load the order details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshOrderDetails = async () => {
    try {
      setRefreshing(true)
      await fetchOrderDetails()
      toast({
        title: "Refreshed",
        description: "Order details have been updated.",
      })
    } catch (error) {
      console.error("Error refreshing order details:", error)
      toast({
        title: "Refresh failed",
        description: "Could not refresh order details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Get status step indicator
  const getOrderTimeline = () => {
    const steps = [
      { id: "pending", label: "Order Placed", date: order?.created_at },
      { id: "processing", label: "Processing", date: order?.processing_date || order?.processed_at },
      { id: "shipped", label: "Shipped", date: order?.shipped_date || order?.shipped_at },
      { id: "delivered", label: "Delivered", date: order?.delivered_date || order?.delivered_at },
    ]

    // Find the current step index based on order status
    const currentStepIndex = steps.findIndex((step) => {
      const orderStatus = order?.status.toLowerCase()
      return (
        step.id === orderStatus ||
        // Handle "canceled" vs "cancelled" inconsistency
        (step.id === "cancelled" && orderStatus === "canceled")
      )
    })

    const activeIndex =
      currentStepIndex === -1
        ? order?.status.toLowerCase() === "cancelled" || order?.status.toLowerCase() === "canceled"
          ? -1
          : 0
        : currentStepIndex

    return (
      <div className="relative mt-8 mb-4">
        <div className="absolute left-0 top-[15px] w-full h-1 bg-gray-200"></div>
        <div className="flex justify-between relative">
          {steps.map((step, index) => {
            const isActive =
              index <= activeIndex &&
              order?.status.toLowerCase() !== "cancelled" &&
              order?.status.toLowerCase() !== "canceled"
            const isCurrent =
              index === activeIndex &&
              order?.status.toLowerCase() !== "cancelled" &&
              order?.status.toLowerCase() !== "canceled"

            return (
              <div key={step.id} className="flex flex-col items-center relative z-10 w-1/4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-2
                  ${isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}
                  ${isCurrent ? "ring-4 ring-primary/20" : ""}
                `}
                >
                  {isActive ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <div className="text-xs font-medium text-center">{step.label}</div>
                {step.date && isActive && <div className="text-xs text-gray-500 mt-1">{formatDate(step.date)}</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Get the best available product name
  const getProductName = (item: OrderItem): string => {
    if (item.product?.name) {
      return item.product.name
    }
    if (item.product_name) {
      return item.product_name
    }
    if (item.name) {
      return item.name
    }
    return "Product"
  }

  // Get the best available product image
  const getProductImage = (item: OrderItem): string => {
    // Try to get image from product object
    if (item.product) {
      if (item.product.thumbnail_url) {
        return item.product.thumbnail_url
      }
      if (item.product.image_urls && item.product.image_urls.length > 0) {
        return item.product.image_urls[0]
      }
    }

    // Try other possible image properties
    if (item.product_image) {
      return item.product_image
    }
    if (item.image_url) {
      return item.image_url
    }

    // Fallback to placeholder
    return `/placeholder.svg?height=80&width=80`
  }

  // Get the product variation details
  const getVariationDetails = (item: OrderItem): Record<string, string> => {
    if (item.variation_details) {
      return item.variation_details
    }
    if (item.product?.variation) {
      return item.product.variation
    }
    return {}
  }

  // Get the product SKU
  const getProductSku = (item: OrderItem): string | undefined => {
    return item.product?.sku || item.product_sku
  }

  // Get the product URL
  const getProductUrl = (item: OrderItem): string => {
    const id = item.product?.id || item.product_id
    const slug = item.product?.slug
    return `/product/${slug || id}`
  }

  // Get item status styling
  const getItemStatusStyle = (item: OrderItem): string => {
    const status = item.status?.toLowerCase()
    return itemStatusColors[status || "default"] || itemStatusColors.default
  }

  if (loading || authLoading) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-6 text-gray-600">Loading your order details...</p>
          {timeoutError && (
            <div className="mt-4 text-center">
              <p className="text-red-500">Taking longer than expected...</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container max-w-4xl py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "We couldn't find the order you're looking for. Please check the order ID and try again."}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button asChild variant="outline">
            <Link href="/orders">Return to Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  const {
    order_number,
    status,
    created_at,
    items,
    shipping_address,
    billing_address,
    payment_method,
    shipping_method,
    subtotal_amount,
    shipping_amount,
    tax_amount,
    total_amount,
    discount_amount,
    notes,
    cancellation_reason,
    cancelled_at,
    refund_status,
    refund_amount,
  } = order

  // Get status styling
  const getStatusStyle = () => {
    const statusLower = status.toLowerCase()
    // Handle "canceled" vs "cancelled" inconsistency
    const lookupStatus = statusLower === "canceled" ? "cancelled" : statusLower
    return statusColors[lookupStatus] || statusColors.default
  }

  const { color, bgColor, icon } = getStatusStyle()

  return (
    <div className="bg-gray-50 py-8">
      <div className="container max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center mb-4 text-sm overflow-x-auto whitespace-nowrap pb-1">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 mx-1 text-gray-400 flex-shrink-0" />
          <Link href="/orders" className="text-gray-500 hover:text-gray-700">
            Orders
          </Link>
          <ChevronRight className="h-4 w-4 mx-1 text-gray-400 flex-shrink-0" />
          <span className="text-gray-900 font-medium">Order #{order_number}</span>
        </div>

        {/* Header with Back Button */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Order #{order_number}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Placed on {formatDate(created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshOrderDetails} disabled={refreshing} className="h-9">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Orders
              </Link>
            </Button>
          </div>
        </div>

        {/* Order Status */}
        <div className={`flex items-center ${bgColor} ${color} p-4 rounded-lg mb-6`}>
          {icon}
          <div className="ml-3">
            <h2 className="font-medium">{status}</h2>
            <p className="text-sm opacity-80">
              {status.toLowerCase() === "pending" && "Your order has been placed and is awaiting processing."}
              {status.toLowerCase() === "processing" && "Your order is being processed and prepared for shipping."}
              {status.toLowerCase() === "shipped" && "Your order has been shipped and is on its way."}
              {status.toLowerCase() === "delivered" && "Your order has been delivered successfully."}
              {(status.toLowerCase() === "cancelled" || status.toLowerCase() === "canceled") &&
                "Your order has been cancelled."}
            </p>
          </div>
        </div>

        {/* Cancellation Information (if applicable) */}
        {(status.toLowerCase() === "cancelled" || status.toLowerCase() === "canceled") && (
          <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Order Cancelled</AlertTitle>
            <AlertDescription className="mt-2">
              <p>This order was cancelled on {formatDate(cancelled_at || created_at)}.</p>
              {cancellation_reason && <p className="mt-1">Reason: {cancellation_reason}</p>}
              {refund_status && (
                <p className="mt-1">
                  Refund Status: <span className="font-medium">{refund_status}</span>
                  {refund_amount ? ` (${formatCurrency(refund_amount)})` : ""}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Order Timeline */}
        {status.toLowerCase() !== "cancelled" && status.toLowerCase() !== "canceled" && getOrderTimeline()}

        {/* Order Details Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="shipping">Shipping Info</TabsTrigger>
            <TabsTrigger value="payment">Payment Info</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card className="border border-gray-200 shadow-sm mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items && items.length > 0 ? (
                    items.map((item: OrderItem, index: number) => (
                      <div
                        key={index}
                        className={`flex flex-col sm:flex-row gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0 rounded-md p-2 ${getItemStatusStyle(item)}`}
                      >
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                          <Image
                            src={getProductImage(item) || "/placeholder.svg?height=80&width=80"}
                            alt={getProductName(item)}
                            width={80}
                            height={80}
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between mb-1">
                            <div>
                              <h4 className="font-medium text-gray-800">{getProductName(item)}</h4>
                              {item.status && item.status.toLowerCase() !== "active" && (
                                <Badge
                                  variant={
                                    item.status.toLowerCase() === "cancelled" ||
                                    item.status.toLowerCase() === "canceled"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="mt-1"
                                >
                                  {item.status}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-gray-800 text-right">
                              {formatCurrency((item.price || 0) * item.quantity)}
                            </p>
                          </div>

                          {/* Variation Details */}
                          {Object.keys(getVariationDetails(item)).length > 0 && (
                            <p className="text-sm text-gray-500 mb-1">
                              {Object.entries(getVariationDetails(item))
                                .map(([key, value]) => `${key}: ${String(value)}`)
                                .join(", ")}
                            </p>
                          )}

                          {/* SKU */}
                          {getProductSku(item) && (
                            <p className="text-xs text-gray-400 mb-1">SKU: {getProductSku(item)}</p>
                          )}

                          {/* Cancellation Info */}
                          {(item.status?.toLowerCase() === "cancelled" || item.status?.toLowerCase() === "canceled") &&
                            item.cancellation_reason && (
                              <div className="text-xs text-red-600 mt-1 flex items-start gap-1">
                                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Cancellation reason: {item.cancellation_reason}</span>
                              </div>
                            )}

                          <div className="flex items-center justify-between mt-auto">
                            <p className="text-sm text-gray-500">
                              {formatCurrency(item.price || 0)} x {item.quantity}
                            </p>
                            <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2 text-primary">
                              <Link href={getProductUrl(item)}>View Product</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-gray-500">No items found in this order.</div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Order Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(subtotal_amount || 0)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">Shipping</p>
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(shipping_amount || 0)}</p>
                  </div>
                  {(tax_amount || 0) > 0 && (
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Tax</p>
                      <p className="text-sm font-medium text-gray-800">{formatCurrency(tax_amount || 0)}</p>
                    </div>
                  )}
                  {(discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <p className="text-sm">Discount</p>
                      <p className="text-sm font-medium">-{formatCurrency(discount_amount || 0)}</p>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <p className="font-medium text-gray-800">Total</p>
                    <p className="font-bold text-primary">{formatCurrency(total_amount || 0)}</p>
                  </div>

                  {/* Refund Information */}
                  {(refund_amount || 0) > 0 && (
                    <div className="flex justify-between text-blue-600 mt-2">
                      <p className="text-sm">Refunded</p>
                      <p className="text-sm font-medium">-{formatCurrency(refund_amount || 0)}</p>
                    </div>
                  )}
                </div>

                {notes && (
                  <div className="mt-6 bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Order Notes:</h4>
                    <p className="text-sm text-gray-600">{notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
                <Link href="/orders">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Orders
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
                <Link href={`/orders/${orderId}/invoice`}>
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Link>
              </Button>
              <Button size="sm" className="flex items-center gap-2" asChild>
                <Link href="/products">
                  <ShoppingBag className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="shipping">
            <Card className="border border-gray-200 shadow-sm mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Contact Information
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="font-medium text-gray-800">
                        {shipping_address.first_name} {shipping_address.last_name}
                      </p>
                      <p className="text-gray-600">{shipping_address.email}</p>
                      <p className="text-gray-600">{shipping_address.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                      <Truck className="h-4 w-4 mr-2" />
                      Shipping Method
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="font-medium text-gray-800">
                        {shipping_method === "standard"
                          ? "Standard Shipping"
                          : shipping_method === "express"
                            ? "Express Shipping"
                            : shipping_method}
                      </p>
                      <p className="text-gray-600">
                        Estimated Delivery:{" "}
                        {new Date(new Date(created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </p>
                      <p className="text-gray-600 font-medium mt-2">{formatCurrency(shipping_amount || 0)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      Shipping Address
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="font-medium text-gray-800">
                        {shipping_address.first_name} {shipping_address.last_name}
                      </p>
                      <p className="text-gray-600">{shipping_address.address_line1}</p>
                      {shipping_address.address_line2 && (
                        <p className="text-gray-600">{shipping_address.address_line2}</p>
                      )}
                      <p className="text-gray-600">
                        {shipping_address.city}, {shipping_address.state} {shipping_address.postal_code}
                      </p>
                      <p className="text-gray-600">{shipping_address.country}</p>
                    </div>
                  </div>

                  {/* Tracking Info - only if available and shipped/delivered */}
                  {(status.toLowerCase() === "shipped" || status.toLowerCase() === "delivered") &&
                    order.tracking_number && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Tracking Information
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="font-medium text-gray-800">Tracking Number: {order.tracking_number}</p>
                          <p className="text-gray-600">Carrier: {order.shipping_carrier || "Standard Shipping"}</p>
                          <Button variant="outline" size="sm" className="mt-2 text-xs h-8" asChild>
                            <Link href={order.tracking_url || "#"} target="_blank" rel="noopener noreferrer">
                              Track Package
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card className="border border-gray-200 shadow-sm mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                      <File className="h-4 w-4 mr-2" />
                      Payment Method
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="font-medium text-gray-800">
                        {payment_method === "cash_on_delivery"
                          ? "Cash on Delivery"
                          : payment_method === "credit-card"
                            ? "Credit Card"
                            : payment_method}
                      </p>
                      <p className="text-gray-600">
                        Status:{" "}
                        <span
                          className={
                            status.toLowerCase() === "cancelled" || status.toLowerCase() === "canceled"
                              ? "text-red-600 font-medium"
                              : "text-green-600 font-medium"
                          }
                        >
                          {status.toLowerCase() === "cancelled" || status.toLowerCase() === "canceled"
                            ? "Cancelled"
                            : "Paid"}
                        </span>
                      </p>
                      <p className="text-gray-600">Date: {formatDate(created_at)}</p>

                      {/* Refund Information */}
                      {refund_status && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-blue-600 font-medium">Refund Status: {refund_status}</p>
                          {(refund_amount || 0) > 0 && (
                            <p className="text-gray-600">Amount: {formatCurrency(refund_amount || 0)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      Billing Address
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="font-medium text-gray-800">
                        {billing_address.first_name} {billing_address.last_name}
                      </p>
                      <p className="text-gray-600">{billing_address.address_line1}</p>
                      {billing_address.address_line2 && (
                        <p className="text-gray-600">{billing_address.address_line2}</p>
                      )}
                      <p className="text-gray-600">
                        {billing_address.city}, {billing_address.state} {billing_address.postal_code}
                      </p>
                      <p className="text-gray-600">{billing_address.country}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Payment Summary</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-600">Subtotal</p>
                        <p className="text-sm font-medium text-gray-800">{formatCurrency(subtotal_amount || 0)}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-600">Shipping</p>
                        <p className="text-sm font-medium text-gray-800">{formatCurrency(shipping_amount || 0)}</p>
                      </div>
                      {(tax_amount || 0) > 0 && (
                        <div className="flex justify-between">
                          <p className="text-sm text-gray-600">Tax</p>
                          <p className="text-sm font-medium text-gray-800">{formatCurrency(tax_amount || 0)}</p>
                        </div>
                      )}
                      {(discount_amount || 0) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <p className="text-sm">Discount</p>
                          <p className="text-sm font-medium">-{formatCurrency(discount_amount || 0)}</p>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between">
                        <p className="font-medium text-gray-800">Total</p>
                        <p className="font-bold text-primary">{formatCurrency(total_amount || 0)}</p>
                      </div>

                      {/* Refund Information */}
                      {(refund_amount || 0) > 0 && (
                        <div className="flex justify-between text-blue-600 mt-2">
                          <p className="text-sm">Refunded</p>
                          <p className="text-sm font-medium">-{formatCurrency(refund_amount || 0)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Download Button */}
            <div className="flex justify-center mt-6">
              <Button variant="outline" className="flex items-center gap-2" asChild>
                <Link href={`/orders/${orderId}/invoice`}>
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

