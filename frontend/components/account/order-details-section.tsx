"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { imageBatchService } from "@/services/image-batch-service"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Order, ProductImage } from "@/types"
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  PackageCheck,
  RotateCcw,
} from "lucide-react"

interface OrderDetailsSectionProps {
  orderId: string
}

export function OrderDetailsSection({ orderId }: OrderDetailsSectionProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({})

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    }
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const orderData = await orderService.getOrderById(orderId)

      if (!orderData) {
        setError("Order not found")
        return
      }

      setOrder(orderData)

      if (orderData.items && orderData.items.length > 0) {
        const imagesMap: Record<string, ProductImage[]> = {}

        for (const item of orderData.items) {
          if (item.product_id) {
            try {
              const cachedImages = imageBatchService.getCachedImages(String(item.product_id))
              if (cachedImages && cachedImages.length > 0) {
                imagesMap[item.product_id] = cachedImages
              } else {
                const images = await imageBatchService.fetchProductImages(String(item.product_id))
                if (images && images.length > 0) {
                  imagesMap[item.product_id] = images
                }
              }
            } catch (imgError) {
              console.error("Error fetching images:", imgError)
            }
          }
        }

        setProductImages(imagesMap)
      }
    } catch (err: any) {
      console.error("Error fetching order details:", err)
      setError(err.message || "Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statusLower = status?.toLowerCase() || ""

    switch (statusLower) {
      case "pending":
        return {
          color: "bg-amber-50 text-amber-700 border-amber-100",
          icon: <Clock className="h-3.5 w-3.5" />,
          label: "Pending",
          dotColor: "bg-amber-500",
        }
      case "processing":
        return {
          color: "bg-blue-50 text-blue-700 border-blue-100",
          icon: <Package className="h-3.5 w-3.5" />,
          label: "Processing",
          dotColor: "bg-blue-500",
        }
      case "shipped":
        return {
          color: "bg-indigo-50 text-indigo-700 border-indigo-100",
          icon: <Truck className="h-3.5 w-3.5" />,
          label: "Shipped",
          dotColor: "bg-indigo-500",
        }
      case "delivered":
        return {
          color: "bg-green-50 text-green-700 border-green-100",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: "Delivered",
          dotColor: "bg-green-500",
        }
      case "cancelled":
      case "canceled":
        return {
          color: "bg-red-50 text-red-700 border-red-100",
          icon: <XCircle className="h-3.5 w-3.5" />,
          label: "Cancelled",
          dotColor: "bg-red-500",
        }
      case "returned":
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <RotateCcw className="h-3.5 w-3.5" />,
          label: "Returned",
          dotColor: "bg-gray-500",
        }
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <Package className="h-3.5 w-3.5" />,
          label: status || "Unknown",
          dotColor: "bg-gray-500",
        }
    }
  }

  const getOrderTimeline = (status: string) => {
    const statusLower = status?.toLowerCase() || ""

    const timeline = [
      {
        label: "Order Placed",
        status: "completed",
        icon: <CheckCircle2 className="h-4 w-4" />,
        date: order?.created_at,
        description: "Your order has been successfully placed and is being prepared for processing.",
      },
      {
        label: "Processing",
        status: statusLower === "pending" ? "current" : statusLower === "pending" ? "pending" : "completed",
        icon: <Package className="h-4 w-4" />,
        date: statusLower !== "pending" ? order?.updated_at : undefined,
        description:
          statusLower !== "pending"
            ? "Your order is currently being processed, and we will notify you once the item has been shipped."
            : undefined,
      },
      {
        label: "Shipped",
        status: ["shipped", "delivered"].includes(statusLower) ? "completed" : "pending",
        icon: <Truck className="h-4 w-4" />,
        date: ["shipped", "delivered"].includes(statusLower) ? order?.updated_at : undefined,
        description: ["shipped", "delivered"].includes(statusLower)
          ? "Your order has been dispatched and is on its way to the delivery location."
          : undefined,
      },
      {
        label: "Delivered",
        status: statusLower === "delivered" ? "completed" : "pending",
        icon: <PackageCheck className="h-4 w-4" />,
        date: statusLower === "delivered" ? order?.updated_at : undefined,
        description:
          statusLower === "delivered"
            ? "Your order has been successfully delivered to the specified address."
            : undefined,
      },
    ]

    if (statusLower === "cancelled" || statusLower === "canceled") {
      return [
        {
          label: "Order Placed",
          status: "completed",
          icon: <CheckCircle2 className="h-4 w-4" />,
          date: order?.created_at,
          description: "Your order was successfully placed.",
        },
        {
          label: "Cancelled",
          status: "cancelled",
          icon: <XCircle className="h-4 w-4" />,
          date: order?.updated_at,
          description: "This order has been cancelled and will not be processed further.",
        },
      ]
    }

    if (statusLower === "returned") {
      return [
        ...timeline,
        {
          label: "Returned",
          status: "returned",
          icon: <RotateCcw className="h-4 w-4" />,
          date: order?.updated_at,
          description: "The order has been returned and a refund is being processed.",
        },
      ]
    }

    return timeline
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-sm text-gray-600">Loading order details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || "Order not found"}</AlertDescription>
      </Alert>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const timeline = getOrderTimeline(order.status)

  const orderItems = order.items || []
  const itemCount = orderItems.length
  const subtotal = order.subtotal || 0
  const shipping = order.shipping || order.shipping_cost || 0
  const tax = order.tax || 0
  const total = order.total || order.total_amount || 0

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Order nº {order.order_number}</h2>
            <p className="text-sm text-gray-600">
              {itemCount} {itemCount === 1 ? "item" : "items"} • Placed on {formatDate(order.created_at)}
            </p>
            <p className="text-base font-semibold text-gray-900">Total: {formatCurrency(total)}</p>
          </div>

          <Badge className={`${statusInfo.color} border px-4 py-2 font-medium flex items-center gap-2 text-sm`}>
            <span className={`h-2 w-2 rounded-full ${statusInfo.dotColor}`} />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Items in Order */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Items in Your Order</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {orderItems.map((item, index) => {
            const itemName = item.product_name || item.name || "Product"
            const productId = item.product_id
            const images = productId ? productImages[productId] : null
            const itemImage =
              images && images.length > 0
                ? images[0].url
                : item.thumbnail_url || item.image_url || "/placeholder.svg?height=80&width=80"
            const itemPrice = item.price || 0
            const itemQuantity = item.quantity || 1
            const itemTotal = item.total || itemPrice * itemQuantity

            return (
              <div key={item.id || index} className="p-6">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <Image
                      src={itemImage || "/placeholder.svg"}
                      alt={itemName}
                      fill
                      className="object-cover"
                      sizes="96px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=96&width=96"
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-base leading-snug mb-2">{itemName}</h4>
                    <p className="text-sm text-gray-600 mb-3">QTY: {itemQuantity}</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(itemTotal)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Order Tracking Timeline Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-6 uppercase tracking-wide">Order Tracking</h3>
        <div className="relative max-w-2xl">
          {timeline.map((step, index) => {
            const isCompleted = step.status === "completed"
            const isCurrent = step.status === "current"
            const isCancelled = step.status === "cancelled"
            const isReturned = step.status === "returned"
            const isPending = step.status === "pending"
            const isLast = index === timeline.length - 1

            return (
              <div key={index} className="relative flex gap-6 pb-10 last:pb-0">
                {/* Timeline Line */}
                {!isLast && (
                  <div
                    className={`absolute left-[19px] top-10 w-0.5 h-full transition-colors ${
                      isCompleted
                        ? "bg-gradient-to-b from-green-500 to-green-400"
                        : isCancelled || isReturned
                          ? "bg-gradient-to-b from-red-500 to-red-400"
                          : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Icon */}
                <div
                  className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
                    isCompleted
                      ? "bg-gradient-to-br from-green-500 to-green-600 text-white ring-4 ring-green-100"
                      : isCurrent
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-4 ring-blue-100"
                        : isCancelled || isReturned
                          ? "bg-gradient-to-br from-red-500 to-red-600 text-white ring-4 ring-red-100"
                          : "bg-white border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <p
                    className={`font-semibold text-base mb-1 ${
                      isCompleted || isCurrent
                        ? "text-gray-900"
                        : isCancelled || isReturned
                          ? "text-red-600"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.date && <p className="text-sm text-gray-600 mb-2">{formatDate(step.date)}</p>}
                  {step.description && (
                    <p
                      className={`text-sm leading-relaxed ${
                        isCompleted || isCurrent
                          ? "text-gray-600"
                          : isCancelled || isReturned
                            ? "text-red-600"
                            : "text-gray-400"
                      }`}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Payment Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Payment Method</p>
              <p className="text-sm text-gray-900 font-medium">
                {order.payment_method || "Pay on delivery with Mobile Money and Bank Cards"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Payment Details</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items total:</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fees:</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(shipping)}</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Delivery Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Delivery Method</p>
              <p className="text-sm text-gray-900 font-medium">Door Delivery</p>
            </div>
            <Separator />
            {order.shipping_address && (
              <div>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Shipping Address</p>
                <div className="text-sm text-gray-900 space-y-1">
                  <p className="font-semibold">
                    {order.shipping_address.first_name || order.shipping_address.name}{" "}
                    {order.shipping_address.last_name || ""}
                  </p>
                  <p className="text-gray-700">
                    {order.shipping_address.address_line1 || order.shipping_address.street}
                  </p>
                  {order.shipping_address.address_line2 && (
                    <p className="text-gray-700">{order.shipping_address.address_line2}</p>
                  )}
                  <p className="text-gray-700">
                    {order.shipping_address.city}, {order.shipping_address.state}
                  </p>
                </div>
              </div>
            )}
            <Separator />
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Shipping Details</p>
              <p className="text-sm text-gray-900 font-medium">
                {statusInfo.label === "Delivered" ? "Delivered successfully" : "Delivery in progress"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
