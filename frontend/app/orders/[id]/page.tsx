"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { use } from "react"
import {
  ArrowLeft,
  Truck,
  FileText,
  Calendar,
  ShoppingBag,
  CheckCircle,
  RefreshCw,
  ShieldCheck,
  Award,
  MessageSquare,
  HelpCircle,
  Phone,
  Mail,
  AlertTriangle,
  XCircle,
  CreditCard,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

export default function OrderPage({ params }: { params: { orderId: string } }) {
  // Get orderId from params directly
  const orderId = params.orderId

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const data = await orderService.getOrderById(orderId)
        setOrder(data)
      } catch (err: any) {
        console.error("Failed to fetch order:", err)
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
  }, [orderId, toast])

  const handleCancelOrder = async () => {
    if (!order) return

    try {
      setCancelling(true)
      // Simulate API call to cancel order
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update local state
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <OrderDetailsSkeleton />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-1">Order not found</h3>
          <p className="text-muted-foreground mb-4">
            The order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Format date function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Format time function
  const formatTime = (dateString?: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get product image from order item
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
    if (item.thumbnail_url) {
      return item.thumbnail_url
    }
    if (item.image_url) {
      return item.image_url
    }

    // Fallback to placeholder
    return `/placeholder.svg?height=96&width=96`
  }

  // Get product name from order item
  const getProductName = (item: OrderItem): string => {
    // Try all possible name fields
    if (item.product?.name) {
      return item.product.name
    }
    if (item.product_name) {
      return item.product_name
    }
    if (item.name) {
      return item.name
    }

    // If we have a product_id but no name, create a generic name
    if (item.product_id) {
      return `Product #${item.product_id}`
    }

    return "Product"
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Get status badge color based on status
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500 text-white hover:bg-green-600"
      case "pending":
        return "bg-amber-500 text-white hover:bg-amber-600"
      case "processing":
        return "bg-blue-500 text-white hover:bg-blue-600"
      case "cancelled":
        return "bg-red-500 text-white hover:bg-red-600"
      default:
        return "bg-gray-500 text-white hover:bg-gray-600"
    }
  }

  // Check if order can be cancelled
  const canCancelOrder = () => {
    if (!order) return false

    // Orders can only be cancelled if they are pending or processing
    const cancellableStatuses = ["pending", "processing"]
    return cancellableStatuses.includes(order.status?.toLowerCase() || "")
  }

  // Format date for return period
  const formatReturnDate = () => {
    const returnDate = new Date()
    returnDate.setDate(returnDate.getDate() - 14)
    return formatDate(returnDate.toISOString())
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="space-y-5">
        {/* Header with clean styling */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="h-6 w-6 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <p className="text-sm">
                  Placed on {formatDate(order.created_at)} at {formatTime(order.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              <Button variant="outline" size="sm" asChild className="border-gray-300">
                <Link href="/orders">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  All Orders
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/orders/${order.id}/track`}>
                  <Truck className="h-4 w-4 mr-2" />
                  Track Order
                </Link>
              </Button>
              {canCancelOrder() && (
                <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive">
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
                    <div className="py-4">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                          Cancelling this order will immediately stop processing. If payment has been made, a refund
                          will be initiated according to our refund policy.
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                        Keep Order
                      </Button>
                      <Button variant="destructive" onClick={handleCancelOrder} disabled={cancelling}>
                        {cancelling ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>Cancel Order</>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-5">
            <TabsTrigger value="details" className="text-sm">
              Order Details
            </TabsTrigger>
            <TabsTrigger value="support" className="text-sm">
              Customer Support
            </TabsTrigger>
          </TabsList>

          {/* Order Details Tab */}
          <TabsContent value="details" className="space-y-5">
            {/* Order Items Card - Clean styling */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-white border-b border-gray-100 py-4">
                <CardTitle className="flex items-center text-base text-gray-900">
                  <ShoppingBag className="h-4 w-4 mr-2 text-gray-700" />
                  Items in Your Order
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {(order.items as OrderItem[]).map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Status badges */}
                        <div className="sm:hidden flex gap-2 mb-2">
                          <Badge className={getStatusBadgeColor(order.status || "pending")}>
                            {order.status?.toUpperCase() || "PENDING"}
                          </Badge>
                          {item.returnable === false && (
                            <Badge className="bg-orange-500 text-white hover:bg-orange-600">NON-RETURNABLE</Badge>
                          )}
                        </div>

                        <div className="flex-1">
                          {/* Desktop status badges */}
                          <div className="hidden sm:flex gap-2 mb-2">
                            <Badge className={getStatusBadgeColor(order.status || "pending")}>
                              {order.status?.toUpperCase() || "PENDING"}
                            </Badge>
                            {item.returnable === false && (
                              <Badge className="bg-orange-500 text-white hover:bg-orange-600">NON-RETURNABLE</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">On {formatDate(order.created_at)}</p>

                          <div className="flex gap-4">
                            {/* Product image */}
                            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                              <Image
                                src={getProductImage(item) || "/placeholder.svg"}
                                alt={getProductName(item)}
                                width={96}
                                height={96}
                                className="h-full w-full object-cover object-center"
                              />
                            </div>

                            {/* Product details */}
                            <div className="flex-1">
                              <Link
                                href={`/product/${item.product_id}`}
                                className="font-medium text-gray-900 hover:text-gray-700 hover:underline"
                              >
                                {getProductName(item)}
                              </Link>

                              <p className="text-sm text-gray-600 mt-1">QTY: {item.quantity}</p>

                              <div className="mt-2">
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(item.price * item.quantity)}
                                </span>
                                {item.original_price && item.original_price > item.price && (
                                  <span className="ml-2 text-gray-500 line-through">
                                    {formatCurrency(item.original_price * item.quantity)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col gap-2 items-end justify-between">
                              <Button
                                className="w-full sm:w-auto"
                                onClick={() => router.push(`/product/${item.product_id}`)}
                              >
                                Buy Again
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Return policy info */}
                      {item.returnable === false && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                          <RefreshCw className="h-4 w-4 mt-0.5 text-gray-500" />
                          <p>
                            The return period ended on {formatReturnDate()}{" "}
                            <Link href="/return-policy" className="text-blue-600 hover:underline">
                              Access our Return Policy
                            </Link>
                            .
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Information Cards - Side by side - Clean styling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delivery Information Card - Clean styling */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-white border-b border-gray-100 py-4">
                  <CardTitle className="flex items-center text-base text-gray-900">
                    <Truck className="h-4 w-4 mr-2 text-gray-700" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">Delivery Method</h3>
                      <p className="text-sm text-gray-700">{order.shipping_method || "Door Delivery"}</p>
                    </div>

                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">Shipping Address</h3>
                      <p className="text-sm text-gray-800">{order.shipping_address.name}</p>
                      <p className="text-xs text-gray-700">{order.shipping_address.street}</p>
                      <p className="text-xs text-gray-700">
                        {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zipCode}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information Card - Clean styling */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-white border-b border-gray-100 py-4">
                  <CardTitle className="flex items-center text-base text-gray-900">
                    <FileText className="h-4 w-4 mr-2 text-gray-700" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">Payment Method</h3>
                      <div className="flex items-center gap-2">
                        {order.payment_method?.toLowerCase().includes("mpesa") ? (
                          <>
                            <div className="h-6 w-6 rounded-full bg-[#4CAF50] flex items-center justify-center">
                              <CreditCard className="h-3 w-3 text-white" />
                            </div>
                            <p className="text-sm text-[#4CAF50] font-medium">M-Pesa</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-700">{order.payment_method}</p>
                        )}
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">Payment Details</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Items total:</span>
                          <span className="text-gray-800 font-medium">{formatCurrency(order.subtotal || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Delivery:</span>
                          <span className="text-gray-800 font-medium">
                            {order.shipping === 0 ? (
                              <span className="text-green-600">Free</span>
                            ) : (
                              formatCurrency(order.shipping || 0)
                            )}
                          </span>
                        </div>
                        {(order.tax || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">Tax:</span>
                            <span className="text-gray-800 font-medium">{formatCurrency(order.tax || 0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium pt-2 mt-1 border-t border-gray-100">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900 font-bold">
                            {formatCurrency(order.total_amount || order.total || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Timeline */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-white border-b border-gray-100 py-4">
                <CardTitle className="flex items-center text-base text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-700" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-0 before:h-full before:w-[1px] before:bg-gray-200">
                  <div className="relative">
                    <div className="absolute left-[-30px] top-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Order Placed</p>
                      <p className="text-xs text-gray-600">
                        {formatDate(order.created_at)} at {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>

                  {order.status !== "cancelled" && (
                    <>
                      <div className="relative">
                        <div className="absolute left-[-30px] top-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                          {order.status === "processing" || order.status === "delivered" ? (
                            <CheckCircle className="h-3 w-3 text-blue-600" />
                          ) : (
                            <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Processing</p>
                          <p className="text-xs text-gray-600">
                            {order.status === "processing" || order.status === "delivered"
                              ? "Your order is being processed"
                              : "Waiting to be processed"}
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute left-[-30px] top-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                          {order.status === "delivered" ? (
                            <CheckCircle className="h-3 w-3 text-blue-600" />
                          ) : (
                            <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Delivered</p>
                          <p className="text-xs text-gray-600">
                            {order.status === "delivered" ? "Your order has been delivered" : "Waiting to be delivered"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {order.status === "cancelled" && (
                    <div className="relative">
                      <div className="absolute left-[-30px] top-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-3 w-3 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Order Cancelled</p>
                        <p className="text-xs text-gray-600">Your order has been cancelled</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Support Tab - Clean styling */}
          <TabsContent value="support" className="space-y-5">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-white border-b border-gray-100 py-4">
                <CardTitle className="flex items-center text-base text-gray-900">
                  <MessageSquare className="h-4 w-4 mr-2 text-gray-700" />
                  Customer Support
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <HelpCircle className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Need Help With Your Order?</h3>
                        <p className="text-sm text-gray-700">
                          Our customer support team is ready to assist you with any questions or concerns.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-5 w-5 text-gray-700" />
                        <h3 className="font-medium text-gray-900">Contact Support</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Phone className="h-4 w-4 text-gray-700" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Live Chat</p>
                            <p className="text-xs text-gray-600">Available 24/7</p>
                          </div>
                          <Button size="sm" className="ml-auto">
                            Chat Now
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Mail className="h-4 w-4 text-gray-700" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Email Support</p>
                            <p className="text-xs text-gray-600">Response within 24 hours</p>
                          </div>
                          <Button variant="outline" size="sm" className="ml-auto">
                            Email Us
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="h-5 w-5 text-gray-700" />
                        <h3 className="font-medium text-gray-900">Order Actions</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="h-4 w-4 text-gray-700" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Return or Exchange</p>
                            <p className="text-xs text-gray-600">Initiate a return or exchange</p>
                          </div>
                          <Button variant="outline" size="sm" className="ml-auto">
                            Start Return
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-gray-700" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Report an Issue</p>
                            <p className="text-xs text-gray-600">Report a problem with your order</p>
                          </div>
                          <Button variant="outline" size="sm" className="ml-auto">
                            Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-2">Frequently Asked Questions</h3>
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="font-medium text-sm text-gray-900">How can I track my order?</p>
                        <p className="text-xs text-gray-600 mt-1">
                          You can track your order by clicking the "Track Order" button at the top of this page.
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="font-medium text-sm text-gray-900">What is your return policy?</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Most items can be returned within 14 days of delivery. Some products may have different return
                          policies.
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="font-medium text-sm text-gray-900">When will I receive my refund?</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Refunds are typically processed within 5-7 business days after we receive your returned item.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Need Help Section - Clean styling */}
        <div className="border-t border-gray-200 pt-5 mt-6">
          <div className="text-center">
            <h3 className="text-base font-medium text-gray-900 mb-3">Need Help?</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Return Policy
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Exchange Options
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-5 mt-4">
              <div className="flex items-center gap-2 text-gray-600">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs">Secure Shopping</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Truck className="h-4 w-4" />
                <span className="text-xs">Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Award className="h-4 w-4" />
                <span className="text-xs">Quality Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
