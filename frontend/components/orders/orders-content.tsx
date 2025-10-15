"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import { useSocket } from "@/contexts/socket-context"
import { AlertCircle, Package, ShoppingBag, Loader2, RefreshCw } from "lucide-react"
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
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import Image from "next/image"

const ORDERS_PER_PAGE = 5

export function OrdersContent() {
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const { subscribe } = useSocket()

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
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
        description: `Order #${data.order_number || data.orderId || ""} has been updated.`,
        duration: 5000,
      })
      fetchOrders()
    })

    const unsubscribeStatusChanged = subscribe("order_status_changed", (data: any) => {
      toast({
        title: "Order Status Changed",
        description: `Order status changed to ${data.new_status || data.status || "updated"}.`,
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

  const refreshData = async () => {
    try {
      setRefreshing(true)
      await fetchOrders()
      toast({
        title: "Refreshed",
        description: "Your order data has been updated.",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Refresh failed",
        description: "Could not refresh your order data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return

    try {
      setCancelling(true)
      await orderService.cancelOrder(cancelOrderId, cancelReason || "Cancelled by customer")
      await refreshData()
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

  useEffect(() => {
    if (!Array.isArray(orders)) {
      setFilteredOrders([])
      return
    }

    let result = [...orders]

    if (activeTab !== "all") {
      result = result.filter((order) => {
        const orderStatus = order.status?.toLowerCase()
        return orderStatus === activeTab || (activeTab === "cancelled" && orderStatus === "canceled")
      })
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setFilteredOrders(result)
  }, [orders, activeTab])

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

  const canCancelOrder = (order: Order): boolean => {
    const status = order.status?.toLowerCase() || ""
    return status === "pending" || status === "processing"
  }

  const getOrderStats = () => {
    const stats = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    }

    orders.forEach((order) => {
      const status = order.status?.toLowerCase() || ""
      if (status === "pending") stats.pending++
      else if (status === "processing") stats.processing++
      else if (status === "shipped") stats.shipped++
      else if (status === "delivered") stats.delivered++
      else if (status === "cancelled" || status === "canceled") stats.cancelled++
      else if (status === "returned") stats.returned++
    })

    return stats
  }

  const stats = getOrderStats()
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-600 text-sm">Loading your orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="rounded-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardContent className="py-12 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
          <p className="text-gray-600 text-sm mb-6">You haven't placed any orders yet.</p>
          <Button asChild size="sm" className="bg-cherry-800 hover:bg-cherry-900">
            <Link href="/">Start Shopping</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={refreshing}
          className="h-8 px-3 text-xs border-gray-200 bg-transparent"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="pending" className="text-xs px-3 py-1.5 data-[state=active]:bg-white rounded-md">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="processing" className="text-xs px-3 py-1.5 data-[state=active]:bg-white rounded-md">
            Processing ({stats.processing})
          </TabsTrigger>
          <TabsTrigger value="shipped" className="text-xs px-3 py-1.5 data-[state=active]:bg-white rounded-md">
            Shipped ({stats.shipped})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="text-xs px-3 py-1.5 data-[state=active]:bg-white rounded-md">
            Delivered ({stats.delivered})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-3">
          {paginatedOrders.length === 0 ? (
            <Card className="shadow-sm border-gray-200">
              <CardContent className="py-8 text-center">
                <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No {activeTab} orders</p>
              </CardContent>
            </Card>
          ) : (
            paginatedOrders.map((order) => (
              <Card key={order.id} className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">Order #{order.order_number}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(order.total_amount || order.total || 0)}</p>
                      <p className="text-xs text-gray-500">{order.items?.length || 0} item(s)</p>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {order.items.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={getProductImage(item) || "/placeholder.svg"}
                              alt={getProductName(item)}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{getProductName(item)}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-500 pl-15">+{order.items.length - 2} more item(s)</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs bg-transparent">
                      <Link href={`/orders/${order.id}`}>View Details</Link>
                    </Button>
                    {canCancelOrder(order) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                        onClick={() => {
                          setCancelOrderId(order.id)
                          setCancelDialogOpen(true)
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 text-xs"
            >
              Previous
            </Button>
            <span className="text-xs text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </Tabs>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-md mx-auto rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Cancel Order</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            <label htmlFor="cancelReason" className="text-xs font-medium text-gray-700 mb-1.5 block">
              Reason for cancellation (optional)
            </label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling this order?"
              className="text-sm"
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel disabled={cancelling} className="text-sm">
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-sm"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
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
