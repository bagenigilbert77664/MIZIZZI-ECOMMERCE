"use client"
import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Truck,
  ShoppingBag,
  RefreshCw,
  Package,
  Download,
  Share2,
  ArrowLeft,
  XCircle,
  Calendar,
  MapPin,
  CreditCard,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { useSocket } from "@/contexts/socket-context"
import type { Order } from "@/types"
import { Suspense } from "react"
import { OrderStatusTimeline } from "@/components/order/order-status-timeline"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  product?: {
    name?: string
    thumbnail_url?: string
    images?: { url: string; is_primary: boolean }[]
    image_urls?: string[]
    image_url?: string
  }
  product_name?: string
  name?: string
  product_image?: string
  thumbnail_url?: string
  image_url?: string
  returnable?: boolean
  original_price?: number
  total?: number
}

function parseOrderId(rawOrderId: string): string {
  if (rawOrderId.startsWith("order-")) {
    return rawOrderId.replace(/^order-/, "")
  }
  return rawOrderId
}

function OrderDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}

function OrderPageContent({ orderId }: { orderId: string }) {
  const cleanOrderId = parseOrderId(orderId)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { isConnected, subscribe } = useSocket()

  useEffect(() => {
    if (!isConnected || !order) return

    const unsubscribe = subscribe<any>("order_updated", (data) => {
      if (data.order_id === order.id || data.order_id === cleanOrderId) {
        setOrder((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            status: data.status || prev.status,
            tracking_number: data.tracking_number || prev.tracking_number,
            updated_at: data.timestamp || new Date().toISOString(),
          }
        })

        toast({
          title: "Order Updated",
          description: `Your order status has been updated to ${data.status}`,
        })
      }
    })

    return () => unsubscribe()
  }, [isConnected, order, cleanOrderId, subscribe, toast])

  useEffect(() => {
    const fetchOrder = async () => {
      if (!cleanOrderId) {
        console.error("[v0] OrderPage: orderId is falsy:", cleanOrderId)
        setError("Invalid order ID")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("[v0] OrderPage: Fetching order with ID:", cleanOrderId)
        const data = await orderService.getOrderById(cleanOrderId)

        console.log("[v0] OrderPage: Raw API response:", data)
        console.log("[v0] OrderPage: Order number:", data?.order_number)
        console.log("[v0] OrderPage: Order items:", data?.items)

        if (!data) {
          console.error("[v0] OrderPage: API returned null")
          setError("Order not found")
          return
        }

        setOrder(data)
      } catch (err: any) {
        console.error("[v0] OrderPage: Failed to fetch order:", err)
        setError(err.message || "Failed to load order details")
        toast({
          title: "Error",
          description: "Could not load order details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [cleanOrderId, toast])

  const handleCancelOrder = async () => {
    if (!order) return

    try {
      setCancelling(true)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setOrder({
        ...order,
        status: "cancelled",
      })

      toast({
        title: "Order Cancelled",
        description: `Order #${order.order_number} has been cancelled successfully.`,
      })

      setCancelDialogOpen(false)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again or contact support.",
        variant: "destructive",
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleDownloadInvoice = useCallback(() => {
    if (!order) return
    toast({
      title: "Downloading Invoice",
      description: "Your invoice is being prepared...",
    })
  }, [order, toast])

  const handleShareOrder = useCallback(async () => {
    if (!order) return

    const shareData = {
      title: `Order #${order.order_number}`,
      text: `Check out my order from Mizizzi Store`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log("Share cancelled")
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link Copied",
        description: "Order link copied to clipboard.",
      })
    }
  }, [order, toast])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getProductImage = (item: OrderItem): string => {
    if (item.product?.thumbnail_url) return item.product.thumbnail_url
    if (item.product?.images?.[0]?.url) return item.product.images[0].url
    if (item.product?.image_url) return item.product.image_url
    if (item.product_image) return item.product_image
    if (item.thumbnail_url) return item.thumbnail_url
    if (item.image_url) return item.image_url

    const productName = getProductName(item)
    return `/placeholder.svg?height=96&width=96&text=${encodeURIComponent(productName)}`
  }

  const getProductName = (item: OrderItem): string => {
    if (item.product?.name) return item.product.name
    if (item.product_name) return item.product_name
    if (item.name) return item.name
    if (item.product_id) return `Product #${item.product_id}`
    return "Unknown Product"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "delivered"
      case "shipped":
        return "shipped"
      case "processing":
        return "processing"
      case "pending":
        return "pending"
      case "cancelled":
        return "cancelled"
      default:
        return "pending"
    }
  }

  const canCancelOrder = () => {
    if (!order) return false
    const cancellableStatuses = ["pending", "processing"]
    return cancellableStatuses.includes(order.status?.toLowerCase() || "")
  }

  if (loading) {
    return <OrderDetailsSkeleton />
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="order-card p-12 text-center max-w-md"
        >
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Order Not Found</h3>
          <p className="text-sm text-gray-600 mb-8">
            {error || "The order you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button asChild>
              <Link href="/orders">Back to Orders</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/orders")}
              className="h-9 w-9 p-0 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleDownloadInvoice} className="h-9 text-sm">
                <Download className="h-4 w-4 mr-2" />
                Invoice
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShareOrder} className="h-9 text-sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Order Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
              Order #{order.order_number || order.id}
            </h1>
            <Badge className={`order-status-badge ${getStatusColor(order.status)}`}>
              {order.status?.toUpperCase() || "PENDING"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              Placed on {formatDate(order.created_at)} at {formatTime(order.created_at)}
            </span>
          </div>
        </motion.div>

        {/* Order Status Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="order-card p-8 mb-8"
        >
          <h2 className="order-section-title mb-6">Order Status</h2>
          <OrderStatusTimeline
            currentStatus={order.status}
            orderDate={formatDate(order.created_at)}
            confirmedDate={order.status !== "pending" ? formatDate(order.updated_at) : undefined}
            processingDate={
              ["processing", "shipped", "delivered"].includes(order.status?.toLowerCase() || "")
                ? formatDate(order.updated_at)
                : undefined
            }
            shippedDate={
              ["shipped", "delivered"].includes(order.status?.toLowerCase() || "")
                ? formatDate(order.updated_at)
                : undefined
            }
            deliveredDate={order.status?.toLowerCase() === "delivered" ? formatDate(order.updated_at) : undefined}
            cancelledDate={order.status?.toLowerCase() === "cancelled" ? formatDate(order.updated_at) : undefined}
          />
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="order-card p-8 mb-8"
        >
          <h2 className="order-section-title mb-6">
            Items ({order.items && Array.isArray(order.items) ? order.items.length : 0})
          </h2>

          {!order.items || !Array.isArray(order.items) || order.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No items found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(order.items as OrderItem[]).map((item, index) => {
                const productName = getProductName(item)
                const productImage = getProductImage(item)
                const itemTotal = item.total || item.price * item.quantity

                return (
                  <motion.div
                    key={item.id || `item-${index}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-4 pb-6 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={productImage || "/placeholder.svg"}
                        alt={productName}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover object-center"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `/placeholder.svg?height=96&width=96&text=${encodeURIComponent(productName)}`
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.product_id}`}
                        className="font-medium text-gray-900 hover:text-gray-700 block mb-1"
                      >
                        {productName}
                      </Link>
                      <p className="text-sm text-gray-600 mb-2">Quantity: {item.quantity}</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(itemTotal)}</p>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/product/${item.product_id}`)}>
                        Buy Again
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Delivery Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="order-card p-8"
          >
            <h2 className="order-section-title mb-6 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Method</p>
                <p className="text-sm font-medium text-gray-900">{order.shipping_method || "Standard Delivery"}</p>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-gray-500 mb-2">Address</p>
                {order.shipping_address ? (
                  <div className="text-sm text-gray-700 space-y-0.5">
                    <p className="font-medium text-gray-900">
                      {order.shipping_address.first_name} {order.shipping_address.last_name}
                    </p>
                    <p>{order.shipping_address.address_line1}</p>
                    {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                    </p>
                    <p>{order.shipping_address.country}</p>
                    {order.shipping_address.phone && <p className="mt-2">{order.shipping_address.phone}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No address available</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Payment Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="order-card p-8"
          >
            <h2 className="order-section-title mb-6 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Method</p>
                <p className="text-sm font-medium text-gray-900">{order.payment_method || "Credit Card"}</p>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(order.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-gray-900">
                    {(order.shipping || 0) === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      formatCurrency(order.shipping || 0)
                    )}
                  </span>
                </div>
                {(order.tax || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">{formatCurrency(order.tax || 0)}</span>
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-gray-900">{formatCurrency(order.total || 0)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <Button asChild variant="outline" size="lg">
            <Link href={`/orders/${cleanOrderId}/track`}>
              <Truck className="h-4 w-4 mr-2" />
Track Order
            </Link>
          </Button>

          {canCancelOrder() && (
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Order #{order.order_number}</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel this order? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                    Keep Order
                  </Button>
                  <Button variant="destructive" onClick={handleCancelOrder} disabled={cancelling}>
                    {cancelling ? "Processing..." : "Cancel Order"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function OrderPage({ params }: { params: Promise<{ id: string; orderId: string }> }) {
  const resolvedParams = use(params)
  const orderId = resolvedParams.id || resolvedParams.orderId

  return (
    <Suspense fallback={<OrderDetailsSkeleton />}>
      <OrderPageContent orderId={orderId} />
    </Suspense>
  )
}
