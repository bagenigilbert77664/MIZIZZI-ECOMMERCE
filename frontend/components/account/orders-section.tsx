"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import { useSocket } from "@/contexts/socket-context"
import { AlertCircle, ShoppingBag, Loader2, Eye } from "lucide-react"
import type { Order } from "@/types"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const statusColors: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: {
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    icon: <Loader2 className="h-5 w-5" />,
  },
  confirmed: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <Eye className="h-5 w-5" />,
  },
  processing: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <Loader2 className="h-5 w-5" />,
  },
  shipped: {
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    icon: <Eye className="h-5 w-5" />,
  },
  delivered: {
    color: "text-green-600",
    bgColor: "bg-green-50",
    icon: <Eye className="h-5 w-5" />,
  },
  cancelled: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: <Eye className="h-5 w-5" />,
  },
  canceled: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: <Eye className="h-5 w-5" />,
  },
  returned: {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    icon: <Eye className="h-5 w-5" />,
  },
  refunded: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <Eye className="h-5 w-5" />,
  },
  default: {
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
}

const ORDERS_PER_PAGE = 10

export function OrdersSection() {
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const { subscribe } = useSocket()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"ongoing" | "canceled">("ongoing")
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    const unsubscribeOrderUpdated = subscribe("order_updated", (data: any) => {
      toast({
        title: "Order Updated",
        description: `Order #${data.order_number || data.orderId || ""} has been updated${data.status ? ` to ${data.status}` : ""}.`,
        duration: 5000,
      })
      fetchOrders()
    })

    const unsubscribeStatusChanged = subscribe("order_status_changed", (data: any) => {
      toast({
        title: "Order Status Changed",
        description: `Order #${data.order_number || data.orderId || ""} status changed to ${data.new_status || data.status || "updated"}.`,
        duration: 5000,
      })
      fetchOrders()
    })

    return () => {
      unsubscribeOrderUpdated()
      unsubscribeStatusChanged()
    }
  }, [isAuthenticated, subscribe, toast])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await orderService.getOrders({ limit: 1000 })
      if (Array.isArray(data)) {
        const validOrders = data.filter((order) => {
          const hasItems = Array.isArray(order.items) && order.items.length > 0
          const hasAmount = (order.total_amount || order.total || 0) > 0
          return hasItems || hasAmount
        })
        setOrders(validOrders)
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      setError("Failed to load your orders. Please try again later.")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return

    try {
      setCancelling(true)
      await orderService.cancelOrder(cancelOrderId, cancelReason || "Cancelled by customer")
      await fetchOrders()
      toast({
        title: "Order Cancelled",
        description: "Your order has been successfully cancelled.",
      })
    } catch (error) {
      console.error("Error cancelling order:", error)
      toast({
        title: "Cancellation Failed",
        description: "Could not cancel your order. Please try again or contact support.",
        variant: "destructive",
      })
    } finally {
      setCancelling(false)
      setCancelDialogOpen(false)
      setCancelOrderId(null)
      setCancelReason("")
    }
  }

  const ongoingOrders = orders.filter((order) => {
    const status = order.status?.toLowerCase() || ""
    return ["pending", "processing", "shipped", "delivered"].includes(status)
  })

  const canceledOrders = orders.filter((order) => {
    const status = order.status?.toLowerCase() || ""
    return ["cancelled", "canceled", "returned"].includes(status)
  })

  const getProductName = (item: any): string => {
    if (item.product?.name) return item.product.name
    if (item.product_name) return item.product_name
    if (item.name) return item.name
    if (item.product_id) return `Product #${item.product_id}`
    return "Unknown Product"
  }

  const getProductImage = (item: any): string => {
    if (item.product) {
      if (item.product.thumbnail_url) return item.product.thumbnail_url
      if (item.product.images && Array.isArray(item.product.images)) {
        const primaryImage = item.product.images.find((img: any) => img.is_primary)
        if (primaryImage?.url) return primaryImage.url
        if (item.product.images.length > 0 && item.product.images[0].url) return item.product.images[0].url
      }
      if (item.product.image_urls && Array.isArray(item.product.image_urls) && item.product.image_urls.length > 0) {
        return item.product.image_urls[0]
      }
      if (item.product.image_url) return item.product.image_url
    }
    if (item.product_image) return item.product_image
    if (item.thumbnail_url) return item.thumbnail_url
    if (item.image_url) return item.image_url
    const productName = getProductName(item)
    return `/placeholder.svg?height=60&width=60&text=${encodeURIComponent(productName)}`
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    let badgeClass = "px-2 py-0.5 rounded text-xs font-medium inline-block"
    let badgeText = status

    if (statusLower === "delivered") {
      badgeClass += " bg-green-100 text-green-700"
      badgeText = "DELIVERED"
    } else if (statusLower === "shipped") {
      badgeClass += " bg-blue-100 text-blue-700"
      badgeText = "SHIPPED"
    } else if (statusLower === "processing") {
      badgeClass += " bg-yellow-100 text-yellow-700"
      badgeText = "PROCESSING"
    } else if (statusLower === "pending") {
      badgeClass += " bg-orange-100 text-orange-700"
      badgeText = "PENDING"
    } else if (statusLower === "cancelled" || statusLower === "canceled") {
      badgeClass += " bg-red-100 text-red-700"
      badgeText = "CANCELLED"
    } else if (statusLower === "returned") {
      badgeClass += " bg-gray-100 text-gray-700"
      badgeText = "RETURNED"
    } else {
      badgeClass += " bg-gray-100 text-gray-700"
    }

    return <span className={badgeClass}>{badgeText}</span>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-sm text-gray-600">Loading your orders...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sign In Required</h2>
          <p className="text-sm text-gray-600 mb-6">Please sign in to view your order history.</p>
          <Button asChild>
            <Link href="/auth/login?redirect=/account?tab=orders">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
     
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && orders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-semibold mb-2">No Orders Yet</h3>
            <p className="text-sm text-gray-600 mb-6">You haven't placed any orders yet.</p>
            <Button asChild>
              <Link href="/">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {orders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("ongoing")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "ongoing"
                    ? "text-orange-600 border-b-2 border-orange-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ONGOING/DELIVERED ({ongoingOrders.length})
              </button>
              <button
                onClick={() => setActiveTab("canceled")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "canceled"
                    ? "text-orange-600 border-b-2 border-orange-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                CANCELED/RETURNED ({canceledOrders.length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {activeTab === "ongoing" && ongoingOrders.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">No ongoing or delivered orders</div>
            )}
            {activeTab === "canceled" && canceledOrders.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">No canceled or returned orders</div>
            )}

            {(activeTab === "ongoing" ? ongoingOrders : canceledOrders).map((order) => {
              const firstItem = order.items?.[0]
              if (!firstItem) return null

              return (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 relative rounded overflow-hidden border border-gray-200 bg-gray-50">
                      <Image
                        src={getProductImage(firstItem) || "/placeholder.svg"}
                        alt={getProductName(firstItem)}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{getProductName(firstItem)}</h3>
                      <p className="text-xs text-gray-500 mb-1">Order {order.order_number}</p>
                      <div className="flex items-center gap-2 mb-1">{getStatusBadge(order.status || "")}</div>
                      <p className="text-xs text-gray-500">On {formatDate(order.created_at)}</p>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end justify-between">
                      <Link
                        href={`/account?tab=order-details&id=${order.id}`}
                        className="text-xs text-[#8B1538] hover:text-[#6B0F2A] font-medium transition-colors"
                      >
                        See details
                      </Link>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        {formatCurrency(order.total_amount || order.total || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            <label htmlFor="cancelReason" className="text-sm font-medium mb-2 block">
              Reason for cancellation (optional)
            </label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling this order?"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
