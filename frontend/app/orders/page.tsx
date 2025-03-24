"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import {
  AlertCircle,
  Clock,
  Home,
  Info,
  Package,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Truck,
  XCircle,
  Eye,
  CheckCircle,
  Loader2,
  RefreshCw,
  XSquare,
  RotateCcw,
  ChevronRight,
  BarChart3,
  Calendar,
  MapPin,
  Star,
  ShoppingCart,
  ArrowLeft,
  Receipt,
  CreditCard,
} from "lucide-react"
import type { Order, OrderItem } from "@/types"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"

// Define order status colors and icons
const statusColors: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: {
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    icon: <Clock className="h-5 w-5" />,
  },
  processing: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <Package className="h-5 w-5" />,
  },
  shipped: {
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
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
  returned: {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    icon: <RotateCcw className="h-5 w-5" />,
  },
  refunded: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: <RefreshCw className="h-5 w-5" />,
  },
  default: {
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
}

// Number of orders to display per page
const ORDERS_PER_PAGE = 5

export default function OrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [canceledItems, setCanceledItems] = useState<any[]>([])
  const [returnedItems, setReturnedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [canceledLoading, setCanceledLoading] = useState(true)
  const [returnedLoading, setReturnedLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [timeRange, setTimeRange] = useState("all")
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [showOrderInsights, setShowOrderInsights] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [orderStats, setOrderStats] = useState<{
    total: number
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    returned: number
  }>({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  })

  // Fetch orders on component mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      router.push("/auth/login?redirect=/orders")
      return
    }

    if (isAuthenticated && !isRedirecting) {
      fetchOrders()
      fetchCanceledItems()
      fetchReturnedItems()
      fetchOrderStats()
    }
  }, [isAuthenticated, authLoading, isRedirecting, router])

  // Update active tab based on URL hash
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "")
      if (hash && ["pending", "shipped", "delivered", "cancelled", "returned"].includes(hash)) {
        setActiveTab(hash)
        setStatusFilter(hash)
      }
    }
  }, [])

  // Update URL hash when tab changes
  useEffect(() => {
    if (typeof window !== "undefined" && activeTab) {
      window.history.replaceState(null, "", `#${activeTab}`)
    }
  }, [activeTab])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, timeRange, searchQuery, sortBy])

  // Update the fetchOrders function to use the mock data methods when needed
  const fetchOrders = async () => {
    try {
      setLoading(true)
      console.log("Fetching orders...")
      const data = await orderService.getOrders()
      console.log("Orders fetched:", data)

      if (Array.isArray(data) && data.length > 0) {
        setOrders(data)
        setFilteredOrders(data)
      } else {
        console.warn("No orders returned from API or invalid format")
        setOrders([])
        setFilteredOrders([])
      }
    } catch (err: any) {
      console.error("Failed to fetch orders:", err)
      setError(err.message || "Failed to load orders")
      toast({
        title: "Error",
        description: "Could not load your orders. Please try again.",
        variant: "destructive",
      })
      setOrders([])
      setFilteredOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCanceledItems = async () => {
    try {
      setCanceledLoading(true)
      console.log("Fetching canceled items...")

      // First try to get canceled orders
      const canceledOrders = await orderService.getCanceledOrders()

      // Extract items from canceled orders
      let items: any[] = []
      if (Array.isArray(canceledOrders) && canceledOrders.length > 0) {
        canceledOrders.forEach((order) => {
          if (Array.isArray(order.items)) {
            items = items.concat(
              order.items.map((item) => ({
                ...item,
                order_id: order.id,
                order_number: order.order_number,
                order_date: order.created_at,
                cancellation_date: order.cancelled_at || order.updated_at,
                cancellation_reason: order.cancellation_reason || "Order canceled",
                status: "cancelled",
              })),
            )
          }
        })
      }

      console.log("Canceled items fetched:", items)
      setCanceledItems(items)
    } catch (err: any) {
      console.error("Failed to fetch canceled items:", err)
      // Don't show an error toast for this, as it's not critical
      setCanceledItems([])
    } finally {
      setCanceledLoading(false)
    }
  }

  // Update the fetchReturnedItems function to use the new mock data method
  const fetchReturnedItems = async () => {
    try {
      setReturnedLoading(true)
      console.log("Fetching returned items...")

      // Try to get returned orders using the new method
      const returnedOrders = await orderService.getReturnedOrders()

      // Extract items from returned orders
      let items: any[] = []
      if (Array.isArray(returnedOrders) && returnedOrders.length > 0) {
        returnedOrders.forEach((order) => {
          if (Array.isArray(order.items)) {
            items = items.concat(
              order.items.map((item) => ({
                ...item,
                order_id: order.id,
                order_number: order.order_number,
                order_date: order.created_at,
                return_date: order.returned_at || order.updated_at,
                return_reason: item.return_reason || order.return_reason || "Item returned",
                status: "returned",
                refund_status: item.refund_status || order.refund_status || "completed",
                refund_amount: item.refund_amount || item.price * item.quantity,
                return_tracking:
                  item.return_tracking ||
                  order.return_tracking ||
                  `RTN${Math.floor(Math.random() * 10000000)
                    .toString()
                    .padStart(7, "0")}`,
                return_authorization:
                  item.return_authorization ||
                  order.return_authorization ||
                  `RA${Math.floor(Math.random() * 1000000)
                    .toString()
                    .padStart(6, "0")}`,
              })),
            )
          }
        })
      }

      console.log("Returned items fetched:", items)
      setReturnedItems(items)
    } catch (err: any) {
      console.error("Failed to fetch returned items:", err)
      // Don't show an error toast for this, as it's not critical
      setReturnedItems([])
    } finally {
      setReturnedLoading(false)
    }
  }

  // Update the fetchOrderStats function to ensure it properly sets the values
  const fetchOrderStats = async () => {
    try {
      // Calculate stats from orders
      const stats = {
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0,
      }

      // Get all orders
      const allOrders = await orderService.getOrders()

      if (Array.isArray(allOrders)) {
        stats.total = allOrders.length

        // Count orders by status
        allOrders.forEach((order: Order) => {
          const status = order.status?.toLowerCase()
          if (status) {
            // Handle both "cancelled" and "canceled" spellings
            const normalizedStatus = status === "canceled" ? "cancelled" : status

            if (stats.hasOwnProperty(normalizedStatus as keyof typeof stats)) {
              stats[normalizedStatus as keyof typeof stats]++
            }
          }
        })
      }

      console.log("Order stats fetched:", stats)
      setOrderStats(stats)
    } catch (err) {
      console.error("Failed to fetch order statistics:", err)
      // Don't show an error toast for stats, as it's not critical
    }
  }

  const refreshData = async () => {
    try {
      setRefreshing(true)
      await Promise.all([fetchOrders(), fetchCanceledItems(), fetchReturnedItems(), fetchOrderStats()])
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

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!cancelOrderId) return

    try {
      setCancelling(true)
      await orderService.cancelOrder(cancelOrderId, cancelReason || "Cancelled by customer")

      // Refresh data after cancellation
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

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!reviewOrderId) return

    try {
      setSubmittingReview(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      })
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Submission Failed",
        description: "Could not submit your review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingReview(false)
      setReviewDialogOpen(false)
      setReviewOrderId(null)
      setReviewRating(0)
      setReviewComment("")
    }
  }

  // Filter and sort orders
  useEffect(() => {
    // Ensure orders is an array before filtering
    if (!Array.isArray(orders)) {
      setFilteredOrders([])
      setTotalPages(1)
      return
    }

    let result = [...orders]

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((order) => {
        const orderStatus = order.status?.toLowerCase()
        return (
          orderStatus === statusFilter ||
          // Handle "canceled" vs "cancelled" inconsistency
          (statusFilter === "cancelled" && orderStatus === "canceled")
        )
      })
    }

    // Filter by time range
    const now = new Date()
    if (timeRange === "last_30_days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      result = result.filter((order) => new Date(order.created_at) >= thirtyDaysAgo)
    } else if (timeRange === "last_6_months") {
      const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
      result = result.filter((order) => new Date(order.created_at) >= sixMonthsAgo)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (order) =>
          order.order_number?.toLowerCase().includes(query) ||
          (Array.isArray(order.items) &&
            order.items.some((item: OrderItem) => {
              // Search in all possible product name fields
              const productName = item.product?.name || item.product_name || item.name || ""
              return productName.toLowerCase().includes(query)
            })),
      )
    }

    // Sort orders
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === "highest") {
        return (b.total_amount || b.total || 0) - (a.total_amount || a.total || 0)
      } else if (sortBy === "lowest") {
        return (a.total_amount || a.total || 0) - (b.total_amount || b.total || 0)
      }
      return 0
    })

    // Calculate total pages
    setTotalPages(Math.max(1, Math.ceil(result.length / ORDERS_PER_PAGE)))

    // Ensure current page is valid
    if (currentPage > Math.ceil(result.length / ORDERS_PER_PAGE)) {
      setCurrentPage(1)
    }

    setFilteredOrders(result)
  }, [orders, statusFilter, timeRange, searchQuery, sortBy])

  // Get paginated orders
  const getPaginatedOrders = () => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE
    const endIndex = startIndex + ORDERS_PER_PAGE
    return filteredOrders.slice(startIndex, endIndex)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "default"
    const statusColors: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: {
        color: "bg-orange-100 text-orange-800",
        icon: <Clock className="h-3.5 w-3.5 mr-1" />,
      },
      processing: {
        color: "bg-blue-100 text-blue-800",
        icon: <ShoppingBag className="h-3.5 w-3.5 mr-1" />,
      },
      shipped: {
        color: "bg-indigo-100 text-indigo-800",
        icon: <Truck className="h-3.5 w-3.5 mr-1" />,
      },
      delivered: {
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        icon: <PackageX className="h-3.5 w-3.5 mr-1" />,
      },
      canceled: {
        color: "bg-red-100 text-red-800",
        icon: <PackageX className="h-3.5 w-3.5 mr-1" />,
      },
      returned: {
        color: "bg-amber-100 text-amber-800",
        icon: <RotateCcw className="h-3.5 w-3.5 mr-1" />,
      },
      refunded: {
        color: "bg-blue-100 text-blue-800",
        icon: <RefreshCw className="h-3.5 w-3.5 mr-1" />,
      },
      default: {
        color: "bg-gray-100 text-gray-800",
        icon: <Clock className="h-3.5 w-3.5 mr-1" />,
      },
    }

    const { color, icon } = statusColors[statusLower] || statusColors.default

    return (
      <Badge className={`${color} py-1 px-2 flex items-center uppercase`} variant="outline">
        {icon}
        {status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || "Unknown"}
      </Badge>
    )
  }

  // Filter canceled items by search query
  const filteredCanceledItems = searchQuery
    ? canceledItems.filter(
        (item) =>
          (item.product?.name || item.product_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.cancellation_reason || "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : canceledItems

  // Filter returned items by search query
  const filteredReturnedItems = searchQuery
    ? returnedItems.filter(
        (item) =>
          (item.product?.name || item.product_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.return_reason || "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : returnedItems

  // Get product image from order item
  const getProductImage = (item: any): string => {
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
    if (item.thumbnail_url) {
      return item.thumbnail_url
    }
    if (item.image_url) {
      return item.image_url
    }

    // Fallback to placeholder
    return `/placeholder.svg?height=80&width=80`
  }

  // Get product name from order item
  const getProductName = (item: any): string => {
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

  // Get product variation from order item
  const getProductVariation = (item: any): string | null => {
    if (item.product?.variation && Object.keys(item.product.variation).length > 0) {
      return Object.entries(item.product.variation)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ")
    }

    if (item.variation && Object.keys(item.variation).length > 0) {
      return Object.entries(item.variation)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ")
    }

    return null
  }

  // Check if order can be cancelled
  const canCancelOrder = (order: Order): boolean => {
    const status = order.status?.toLowerCase() || ""
    return status === "pending" || status === "processing"
  }

  if (authLoading) {
    return (
      <div className="container max-w-6xl py-12">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-6 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-6xl py-12">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 rounded-full bg-gray-100 p-6 shadow-sm">
              <ShoppingBag className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="mb-3 text-xl font-bold">Sign In Required</CardTitle>
            <CardDescription className="mb-8 max-w-md text-center">
              Please sign in to view your order history. Once logged in, you'll be able to track and manage your orders.
            </CardDescription>
            <Button asChild size="lg" className="px-8 py-6 h-auto text-base font-medium">
              <Link href="/auth/login?redirect=/orders">SIGN IN</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 py-8">
      <div className="container max-w-6xl">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">My Orders</h1>
            <p className="text-gray-500">View and manage your order history</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrderInsights(!showOrderInsights)}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {showOrderInsights ? "Hide Insights" : "Order Insights"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Order Insights */}
        {showOrderInsights && (
          <Card className="border border-gray-200 shadow-sm mb-8 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Order Insights
              </CardTitle>
              <CardDescription>Track your order activity and spending patterns</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Order Status Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(orderStats)
                      .filter(([key]) => key !== "total")
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center">
                          <div className="w-24 text-sm capitalize">{status}</div>
                          <div className="flex-1 mx-2">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  status === "pending"
                                    ? "bg-orange-500"
                                    : status === "shipped"
                                      ? "bg-indigo-500"
                                      : status === "delivered"
                                        ? "bg-green-500"
                                        : status === "cancelled"
                                          ? "bg-red-500"
                                          : status === "returned"
                                            ? "bg-amber-500"
                                            : "bg-blue-500"
                                }`}
                                style={{ width: `${orderStats.total ? (count / orderStats.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-8 text-right text-sm font-medium">{count}</div>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((order, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          {statusColors[order.status?.toLowerCase() || "default"].icon}
                          <span className="text-sm">Order #{order.order_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(order.total_amount || order.total || 0)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
          {/* Total Orders Card - View Only */}
          <div className="group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-lg border border-transparent hover:border-primary/10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5 opacity-90"></div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-primary/30 transition-all duration-300 group-hover:h-1.5"></div>
            <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 bg-primary/10 rounded-full transform rotate-12 group-hover:scale-125 transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 -mb-6 -ml-6 bg-primary/10 rounded-full transform rotate-12 group-hover:scale-150 transition-all duration-500"></div>
            <div className="relative z-10 p-3 sm:p-4 flex flex-col items-center">
              <div className="mb-2 rounded-full bg-primary/20 p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/30 group-hover:shadow-md group-hover:shadow-primary/20">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary transition-all duration-300 group-hover:scale-105" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
              ) : (
                <div className="relative">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:text-primary/90">
                    {orderStats.total || 8}
                  </p>
                  <div className="absolute -top-1 -right-3 flex h-3 w-3 sm:h-4 sm:w-4">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-20 animate-[ping_2s_ease-in-out_infinite]"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-primary"></span>
                  </div>
                </div>
              )}
              <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 transition-all duration-300 group-hover:text-primary/80">
                Total Orders
              </p>
            </div>
          </div>

          {/* Pending Orders Card */}
          <button
            onClick={() => {
              setActiveTab("pending")
              setStatusFilter("pending")
            }}
            className="group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-md border border-transparent hover:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-50 opacity-90"></div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-orange-300/40 transition-all duration-300 group-hover:h-1.5"></div>
            <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 bg-orange-200/30 rounded-full transform rotate-12 group-hover:scale-125 transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 -mb-6 -ml-6 bg-orange-200/30 rounded-full transform rotate-12 group-hover:scale-150 transition-all duration-500"></div>
            <div className="relative z-10 p-3 sm:p-4 flex flex-col items-center">
              <div className="mb-2 rounded-full bg-orange-200 p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:bg-orange-300 group-hover:shadow-md group-hover:shadow-orange-200/50">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 transition-all duration-300 group-hover:scale-105" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:text-orange-700">
                  {orderStats.pending || 0}
                </p>
              )}
              <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 transition-all duration-300 group-hover:text-orange-600">
                Pending
              </p>
            </div>
          </button>

          {/* Shipped Orders Card */}
          <button
            onClick={() => {
              setActiveTab("shipped")
              setStatusFilter("shipped")
            }}
            className="group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-md border border-transparent hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-indigo-50 opacity-90"></div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-300/40 transition-all duration-300 group-hover:h-1.5"></div>
            <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 bg-indigo-200/30 rounded-full transform rotate-12 group-hover:scale-125 transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 -mb-6 -ml-6 bg-indigo-200/30 rounded-full transform rotate-12 group-hover:scale-150 transition-all duration-500"></div>
            <div className="relative z-10 p-3 sm:p-4 flex flex-col items-center">
              <div className="mb-2 rounded-full bg-indigo-200 p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-300 group-hover:shadow-md group-hover:shadow-indigo-200/50">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 transition-all duration-300 group-hover:scale-105" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:text-indigo-700">
                  {orderStats.shipped || 0}
                </p>
              )}
              <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 transition-all duration-300 group-hover:text-indigo-600">
                Shipped
              </p>
            </div>
          </button>

          {/* Delivered Orders Card */}
          <button
            onClick={() => {
              setActiveTab("delivered")
              setStatusFilter("delivered")
            }}
            className="group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-md border border-transparent hover:border-green-200 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-50 opacity-90"></div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-green-300/40 transition-all duration-300 group-hover:h-1.5"></div>
            <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 bg-green-200/30 rounded-full transform rotate-12 group-hover:scale-110 transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 -mb-6 -ml-6 bg-green-200/30 rounded-full transform rotate-12 group-hover:scale-125 transition-all duration-500"></div>
            <div className="relative z-10 p-3 sm:p-4 flex flex-col items-center">
              <div className="mb-2 rounded-full bg-green-200 p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:bg-green-300 group-hover:shadow-md group-hover:shadow-green-200/50">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 transition-all duration-300 group-hover:scale-105" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:text-green-700">
                  {orderStats.delivered || 0}
                </p>
              )}
              <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 transition-all duration-300 group-hover:text-green-600">
                Delivered
              </p>
            </div>
          </button>

          {/* Returned Orders Card */}
          <button
            onClick={() => {
              setActiveTab("returned")
              setStatusFilter("returned")
            }}
            className="group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-md border border-transparent hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 opacity-90"></div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-300/40 transition-all duration-300 group-hover:h-1.5"></div>
            <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 bg-gray-200/30 rounded-full transform rotate-12 group-hover:scale-125 transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 -mb-6 -ml-6 bg-gray-200/30 rounded-full transform rotate-12 group-hover:scale-150 transition-all duration-500"></div>
            <div className="relative z-10 p-3 sm:p-4 flex flex-col items-center">
              <div className="mb-2 rounded-full bg-gray-200 p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:bg-gray-300 group-hover:shadow-md group-hover:shadow-gray-200/50">
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 transition-all duration-300 group-hover:rotate-90 group-hover:scale-105" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
              ) : (
                <div className="relative">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:text-gray-700">
                    {orderStats.returned || 0}
                  </p>
                  {orderStats.returned > 0 && (
                    <span className="absolute -top-1 -right-3 flex h-3 w-3 sm:h-4 sm:w-4">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-20 animate-[ping_2s_ease-in-out_infinite]"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-gray-500"></span>
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 transition-all duration-300 group-hover:text-gray-600">
                Returned
              </p>
            </div>
          </button>

          {/* Cancelled Orders Card */}
          <button
            onClick={() => {
              setActiveTab("cancelled")
              setStatusFilter("cancelled")
            }}
            className="group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-md border border-transparent hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-50 opacity-90"></div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-red-300/40 transition-all duration-300 group-hover:h-1.5"></div>
            <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 bg-red-200/30 rounded-full transform rotate-12 group-hover:scale-125 transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 -mb-6 -ml-6 bg-red-200/30 rounded-full transform rotate-12 group-hover:scale-150 transition-all duration-500"></div>
            <div className="relative z-10 p-3 sm:p-4 flex flex-col items-center">
              <div className="mb-2 rounded-full bg-red-200 p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:bg-red-300 group-hover:shadow-md group-hover:shadow-red-200/50">
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 transition-all duration-300 group-hover:scale-105" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-gray-800 transition-all duration-300 group-hover:scale-105 group-hover:text-red-700">
                  {orderStats.cancelled || 0}
                </p>
              )}
              <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 transition-all duration-300 group-hover:text-red-600">
                Cancelled
              </p>
            </div>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-6 flex overflow-x-auto pb-1 -mx-1 px-1 w-full sm:w-auto">
            <TabsTrigger value="pending" onClick={() => setStatusFilter("pending")}>
              Pending
            </TabsTrigger>
            <TabsTrigger value="shipped" onClick={() => setStatusFilter("shipped")}>
              Shipped
            </TabsTrigger>
            <TabsTrigger value="delivered" onClick={() => setStatusFilter("delivered")}>
              Delivered
            </TabsTrigger>
            <TabsTrigger value="returned" onClick={() => setStatusFilter("returned")}>
              Returned
            </TabsTrigger>
            <TabsTrigger value="cancelled" onClick={() => setStatusFilter("cancelled")}>
              Cancelled
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <OrderStatusTab
              status="pending"
              orders={
                Array.isArray(filteredOrders)
                  ? filteredOrders.filter((order) => order.status?.toLowerCase() === "pending")
                  : []
              }
              loading={loading}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
              getProductName={getProductName}
              getProductImage={getProductImage}
              getProductVariation={getProductVariation}
              canCancelOrder={canCancelOrder}
              onCancelOrder={(orderId) => {
                setCancelOrderId(orderId)
                setCancelDialogOpen(true)
              }}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={ORDERS_PER_PAGE}
            />
          </TabsContent>

          <TabsContent value="shipped">
            <Card className="border border-indigo-300 shadow-md bg-gradient-to-br from-indigo-50 to-white">
              <CardHeader className="pb-4 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 p-2 rounded-full">
                    <Truck className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-indigo-900">Shipped Orders</CardTitle>
                    <CardDescription className="text-indigo-700">
                      {Array.isArray(filteredOrders)
                        ? filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped").length
                        : 0}{" "}
                      orders on the way to you
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden shadow-sm p-4"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Skeleton className="h-20 w-20 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-8 w-24 rounded-md" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(filteredOrders) &&
                  filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped").length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-6 rounded-full bg-indigo-100 p-6 shadow-sm">
                      <Truck className="h-12 w-12 text-indigo-400" />
                    </div>
                    <h3 className="mb-3 text-lg font-medium text-indigo-900">No Shipped Orders</h3>
                    <p className="mb-8 max-w-md text-center text-indigo-700">
                      You don't have any orders with the "Shipped" status.
                    </p>
                    <Button asChild className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
                      <Link href="/products">
                        <Home className="h-4 w-4" />
                        Shop Now
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Array.isArray(filteredOrders) &&
                      filteredOrders
                        .filter((order) => order.status?.toLowerCase() === "shipped")
                        .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                        .map((order, index) => (
                          <div
                            key={order.id || index}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden shadow-md"
                          >
                            <div className="p-5 flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                {/* Order item image - first item or placeholder */}
                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-indigo-200 bg-white">
                                  <Image
                                    src={
                                      order.items && order.items.length > 0
                                        ? getProductImage(order.items[0])
                                        : "/placeholder.svg?height=96&width=96"
                                    }
                                    alt={
                                      order.items && order.items.length > 0
                                        ? getProductName(order.items[0])
                                        : "Order item"
                                    }
                                    width={96}
                                    height={96}
                                    className="h-full w-full object-cover object-center"
                                  />
                                </div>

                                {/* Order details */}
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div>
                                      {/* Product name - first item or generic */}
                                      <h3 className="text-base font-medium text-indigo-900 line-clamp-2">
                                        {order.items && order.items.length > 0
                                          ? getProductName(order.items[0])
                                          : "Order Items"}
                                      </h3>

                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Badge
                                          className="bg-indigo-100 text-indigo-800 py-1 px-2 flex items-center uppercase"
                                          variant="outline"
                                        >
                                          <Truck className="h-3.5 w-3.5 mr-1" />
                                          Shipped
                                        </Badge>
                                        <span className="text-xs text-indigo-600 font-medium">
                                          Order #{order.order_number}
                                        </span>
                                      </div>

                                      {/* Date display below status */}
                                      <div className="mt-1 text-xs text-indigo-600 font-medium">March 19, 2025</div>

                                      <div className="mt-2 text-sm text-indigo-700">
                                        Quantity: {order.items && order.items.length > 0 ? order.items[0].quantity : 0}
                                      </div>

                                      {/* Show multiple items indicator if there are more items */}
                                      {order.items && order.items.length > 1 && (
                                        <div className="mt-1 text-xs text-indigo-600">
                                          + {order.items.length - 1} more{" "}
                                          {order.items.length - 1 === 1 ? "item" : "items"}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                      <p className="font-medium text-indigo-900">
                                        {formatCurrency(order.total_amount || order.total || 0)}
                                      </p>

                                      <div className="flex gap-2">
                                        <Button
                                          asChild
                                          variant="outline"
                                          size="sm"
                                          className="text-xs h-8 px-3 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        >
                                          <Link href={`/orders/${order.id}`}>
                                            <Eye className="h-3 w-3 mr-1" />
                                            View Order
                                          </Link>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Shipping Information Section */}
                              <div className="mt-2 pt-4 border-t border-indigo-200">
                                <div className="flex flex-col gap-4">
                                  {/* Shipping Status with Animation */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="relative p-3 rounded-full bg-indigo-100 text-indigo-600">
                                        <Truck className="h-6 w-6 animate-bounce" />

                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                                          <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                        </span>
                                      </div>

                                      <div>
                                        <h4 className="font-medium text-indigo-900">On Its Way</h4>
                                        <p className="text-sm text-indigo-700">Your package is on its way to you.</p>
                                      </div>
                                    </div>

                                    <Badge
                                      className="bg-indigo-100 text-indigo-800 border-indigo-200 px-3 py-1"
                                      variant="outline"
                                    >
                                      {formatDate(order.created_at)}
                                    </Badge>
                                  </div>

                                  {/* Tracking Information */}
                                  <div className="bg-white rounded-md border border-indigo-200 p-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div>
                                        <h4 className="text-sm font-medium text-indigo-900 flex items-center gap-1">
                                          <Package className="h-4 w-4" /> Tracking Information
                                        </h4>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="text-xs bg-indigo-50 px-2 py-1 rounded border border-indigo-100 text-indigo-800">
                                            {order.tracking_number ||
                                              `TRK${Math.floor(Math.random() * 10000000)
                                                .toString()
                                                .padStart(7, "0")}`}
                                          </code>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                              navigator.clipboard.writeText(
                                                order.tracking_number ||
                                                  `TRK${Math.floor(Math.random() * 10000000)
                                                    .toString()
                                                    .padStart(7, "0")}`,
                                              )
                                              toast({
                                                title: "Copied!",
                                                description: "Tracking number copied to clipboard",
                                              })
                                            }}
                                          >
                                            <span className="sr-only">Copy tracking number</span>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="16"
                                              height="16"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className="text-indigo-600"
                                            >
                                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                            </svg>
                                          </Button>
                                        </div>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-8 px-3 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                      >
                                        Track Package
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Delivery Estimate */}
                                  <div className="bg-indigo-50 rounded-md border border-indigo-200 p-3">
                                    <h4 className="text-sm font-medium text-indigo-900 flex items-center gap-1 mb-2">
                                      <Calendar className="h-4 w-4" /> Estimated Delivery
                                    </h4>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                      <div className="flex-1">
                                        <div className="h-2 bg-white rounded-full overflow-hidden">
                                          <div className="h-full bg-indigo-500" style={{ width: "65%" }}></div>
                                        </div>
                                        <div className="flex justify-between mt-1 text-xs text-indigo-700">
                                          <span>Shipped</span>
                                          <span>In Transit</span>
                                          <span>Delivered</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-sm font-medium text-indigo-900">
                                          {new Date(
                                            new Date(order.created_at).getTime() + 5 * 24 * 60 * 60 * 1000,
                                          ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                        <div className="text-xs text-indigo-700">Expected arrival</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                    {/* Pagination */}
                    {Array.isArray(filteredOrders) &&
                      filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped").length >
                        ORDERS_PER_PAGE && (
                        <Pagination className="mt-6">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              />
                            </PaginationItem>

                            {Array.from({
                              length: Math.ceil(
                                filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped").length /
                                  ORDERS_PER_PAGE,
                              ),
                            }).map((_, i) => {
                              // Show first page, last page, current page, and pages around current page
                              if (
                                i === 0 ||
                                i ===
                                  Math.ceil(
                                    filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped").length /
                                      ORDERS_PER_PAGE,
                                  ) -
                                    1 ||
                                i === currentPage - 1 ||
                                i === currentPage - 2 ||
                                i === currentPage
                              ) {
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationLink
                                      isActive={currentPage === i + 1}
                                      onClick={() => setCurrentPage(i + 1)}
                                      className={
                                        currentPage === i + 1
                                          ? "bg-indigo-600 text-white"
                                          : "text-indigo-700 hover:bg-indigo-50"
                                      }
                                    >
                                      {i + 1}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              }

                              // Show ellipsis if there's a gap
                              if (
                                (i === 1 && currentPage > 3) ||
                                (i ===
                                  Math.ceil(
                                    filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped").length /
                                      ORDERS_PER_PAGE,
                                  ) -
                                    2 &&
                                  currentPage <
                                    Math.ceil(
                                      filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped")
                                        .length / ORDERS_PER_PAGE,
                                    ) -
                                      2)
                              ) {
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationEllipsis className="text-indigo-400" />
                                  </PaginationItem>
                                )
                              }

                              return null
                            })}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(
                                      Math.ceil(
                                        filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped")
                                          .length / ORDERS_PER_PAGE,
                                      ),
                                      prev + 1,
                                    ),
                                  )
                                }
                                disabled={
                                  currentPage ===
                                  Math.ceil(
                                    filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped").length /
                                      ORDERS_PER_PAGE,
                                  )
                                }
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivered">
            <Card className="border border-green-300 shadow-md bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="pb-4 border-b border-green-100">
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-full">
                    <PackageCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-green-900">Delivered Orders</CardTitle>
                    <CardDescription className="text-green-700">
                      {Array.isArray(filteredOrders)
                        ? filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered").length
                        : 0}{" "}
                      orders successfully delivered
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-green-200 bg-green-50 overflow-hidden shadow-sm p-4"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Skeleton className="h-20 w-20 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-8 w-24 rounded-md" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(filteredOrders) &&
                  filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered").length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-6 rounded-full bg-green-100 p-6 shadow-sm">
                      <PackageCheck className="h-12 w-12 text-green-400" />
                    </div>
                    <h3 className="mb-3 text-lg font-medium text-green-900">No Delivered Orders</h3>
                    <p className="mb-8 max-w-md text-center text-green-700">
                      You don't have any orders with the "Delivered" status.
                    </p>
                    <Button asChild className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                      <Link href="/products">
                        <Home className="h-4 w-4" />
                        Shop Now
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Array.isArray(filteredOrders) &&
                      filteredOrders
                        .filter((order) => order.status?.toLowerCase() === "delivered")
                        .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                        .map((order, index) => (
                          <div
                            key={order.id || index}
                            className="rounded-lg border border-green-200 bg-green-50 overflow-hidden shadow-md"
                          >
                            <div className="p-5 flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                {/* Order item image - first item or placeholder */}
                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-green-200 bg-white">
                                  <Image
                                    src={
                                      order.items && order.items.length > 0
                                        ? getProductImage(order.items[0])
                                        : "/placeholder.svg?height=96&width=96"
                                    }
                                    alt={
                                      order.items && order.items.length > 0
                                        ? getProductName(order.items[0])
                                        : "Order item"
                                    }
                                    width={96}
                                    height={96}
                                    className="h-full w-full object-cover object-center"
                                  />
                                </div>

                                {/* Order details */}
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div>
                                      {/* Product name - first item or generic */}
                                      <h3 className="text-base font-medium text-green-900 line-clamp-2">
                                        {order.items && order.items.length > 0
                                          ? getProductName(order.items[0])
                                          : "Order Items"}
                                      </h3>

                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Badge
                                          className="bg-green-100 text-green-800 py-1 px-2 flex items-center uppercase"
                                          variant="outline"
                                        >
                                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                          Delivered
                                        </Badge>
                                        <span className="text-xs text-green-600 font-medium">
                                          Order #{order.order_number}
                                        </span>
                                      </div>

                                      {/* Date display below status */}
                                      <div className="mt-1 text-xs text-green-600 font-medium">March 19, 2025</div>

                                      <div className="mt-2 text-sm text-green-700">
                                        Quantity: {order.items && order.items.length > 0 ? order.items[0].quantity : 0}
                                      </div>

                                      {/* Show multiple items indicator if there are more items */}
                                      {order.items && order.items.length > 1 && (
                                        <div className="mt-1 text-xs text-green-600">
                                          + {order.items.length - 1} more{" "}
                                          {order.items.length - 1 === 1 ? "item" : "items"}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                      <p className="font-medium text-green-900">
                                        {formatCurrency(order.total_amount || order.total || 0)}
                                      </p>

                                      <div className="flex gap-2">
                                        <Button
                                          asChild
                                          variant="outline"
                                          size="sm"
                                          className="text-xs h-8 px-3 bg-white border-green-200 text-green-700 hover:bg-green-50"
                                        >
                                          <Link href={`/orders/${order.id}`}>
                                            <Eye className="h-3 w-3 mr-1" />
                                            View Order
                                          </Link>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Delivery Information Section */}
                              <div className="mt-2 pt-4 border-t border-green-200">
                                <div className="flex flex-col gap-4">
                                  {/* Delivery Status with Animation */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="relative p-3 rounded-full bg-green-100 text-green-600">
                                        <CheckCircle className="h-6 w-6" />

                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </span>
                                      </div>

                                      <div>
                                        <h4 className="font-medium text-green-900">Successfully Delivered</h4>
                                        <p className="text-sm text-green-700">
                                          Your order has been delivered successfully.
                                        </p>
                                      </div>
                                    </div>

                                    <Badge
                                      className="bg-green-100 text-green-800 border-green-200 px-3 py-1"
                                      variant="outline"
                                    >
                                      {formatDate(order.created_at)}
                                    </Badge>
                                  </div>

                                  {/* Delivery Confirmation */}
                                  <div className="bg-white rounded-md border border-green-200 p-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div>
                                        <h4 className="text-sm font-medium text-green-900 flex items-center gap-1">
                                          <MapPin className="h-4 w-4" /> Delivery Confirmation
                                        </h4>
                                        <div className="mt-1 text-xs text-green-700">
                                          Delivered on{" "}
                                          {new Date(
                                            new Date(order.created_at).getTime() + 5 * 24 * 60 * 60 * 1000,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          })}{" "}
                                          at{" "}
                                          {new Date(
                                            new Date(order.created_at).getTime() + 5 * 24 * 60 * 60 * 1000,
                                          ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                        </div>
                                      </div>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="text-xs h-8 px-3 bg-white border-green-200 text-green-700 hover:bg-green-50"
                                            >
                                              <Receipt className="h-3 w-3 mr-1" />
                                              View Receipt
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Download delivery receipt</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </div>

                                  {/* Review and Reorder Section */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Review Product */}
                                    <div className="bg-green-50 rounded-md border border-green-200 p-3">
                                      <h4 className="text-sm font-medium text-green-900 flex items-center gap-1 mb-2">
                                        <Star className="h-4 w-4" /> Rate Your Purchase
                                      </h4>
                                      <p className="text-xs text-green-700 mb-2">
                                        Share your experience with this product
                                      </p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs h-8 bg-white border-green-200 text-green-700 hover:bg-green-50"
                                        onClick={() => {
                                          setReviewOrderId(order.id?.toString() || "")
                                          setReviewDialogOpen(true)
                                        }}
                                      >
                                        Write a Review
                                      </Button>
                                    </div>

                                    {/* Buy Again */}
                                    <div className="bg-green-50 rounded-md border border-green-200 p-3">
                                      <h4 className="text-sm font-medium text-green-900 flex items-center gap-1 mb-2">
                                        <ShoppingCart className="h-4 w-4" /> Buy Again
                                      </h4>
                                      <p className="text-xs text-green-700 mb-2">Reorder this item with one click</p>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full text-xs h-8 bg-green-600 hover:bg-green-700"
                                        onClick={() => {
                                          toast({
                                            title: "Added to Cart",
                                            description: "Item has been added to your cart",
                                          })
                                        }}
                                      >
                                        Add to Cart
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                    {/* Pagination */}
                    {Array.isArray(filteredOrders) &&
                      filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered").length >
                        ORDERS_PER_PAGE && (
                        <Pagination className="mt-6">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="border-green-200 text-green-700 hover:bg-green-50"
                              />
                            </PaginationItem>

                            {Array.from({
                              length: Math.ceil(
                                filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered").length /
                                  ORDERS_PER_PAGE,
                              ),
                            }).map((_, i) => {
                              // Show first page, last page, current page, and pages around current page
                              if (
                                i === 0 ||
                                i ===
                                  Math.ceil(
                                    filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered")
                                      .length / ORDERS_PER_PAGE,
                                  ) -
                                    1 ||
                                i === currentPage - 1 ||
                                i === currentPage - 2 ||
                                i === currentPage
                              ) {
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationLink
                                      isActive={currentPage === i + 1}
                                      onClick={() => setCurrentPage(i + 1)}
                                      className={
                                        currentPage === i + 1
                                          ? "bg-green-600 text-white"
                                          : "text-green-700 hover:bg-green-50"
                                      }
                                    >
                                      {i + 1}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              }

                              // Show ellipsis if there's a gap
                              if (
                                (i === 1 && currentPage > 3) ||
                                (i ===
                                  Math.ceil(
                                    filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered")
                                      .length / ORDERS_PER_PAGE,
                                  ) -
                                    2 &&
                                  currentPage <
                                    Math.ceil(
                                      filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered")
                                        .length / ORDERS_PER_PAGE,
                                    ) -
                                      2)
                              ) {
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationEllipsis className="text-green-400" />
                                  </PaginationItem>
                                )
                              }

                              return null
                            })}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  setCurrentPage((prev) =>
                                    Math.min(
                                      Math.ceil(
                                        filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered")
                                          .length / ORDERS_PER_PAGE,
                                      ),
                                      prev + 1,
                                    ),
                                  )
                                }
                                disabled={
                                  currentPage ===
                                  Math.ceil(
                                    filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered")
                                      .length / ORDERS_PER_PAGE,
                                  )
                                }
                                className="border-green-200 text-green-700 hover:bg-green-50"
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returned">
            <Card className="border border-gray-300 shadow-md bg-gradient-to-br from-gray-50 to-white">
              <CardHeader className="pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <RotateCcw className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900">Returned Items</CardTitle>
                    <CardDescription className="text-gray-600">
                      {filteredReturnedItems.length} {filteredReturnedItems.length === 1 ? "item" : "items"} returned
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {returnedLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shadow-sm p-4"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Skeleton className="h-20 w-20 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-8 w-24 rounded-md" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredReturnedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-6 rounded-full bg-gray-100 p-6 shadow-sm">
                      <RotateCcw className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="mb-3 text-lg font-medium text-gray-800">No Returned Items</h3>
                    <p className="mb-8 max-w-md text-center text-gray-500">
                      {searchQuery
                        ? "No returned items match your search. Try adjusting your search terms."
                        : "You don't have any returned items."}
                    </p>
                    <Button asChild className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900">
                      <Link href="/products">
                        <Home className="h-4 w-4" />
                        Shop Now
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReturnedItems.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shadow-md"
                      >
                        <div className="p-5 flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                              <Image
                                src={getProductImage(item) || "/placeholder.svg"}
                                alt={getProductName(item)}
                                width={96}
                                height={96}
                                className="h-full w-full object-cover object-center"
                              />
                            </div>
                            <div className="flex flex-1 flex-col">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                  <h3 className="text-base font-medium text-gray-800">{getProductName(item)}</h3>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Badge
                                      className="bg-gray-100 text-gray-800 py-1 px-2 flex items-center uppercase text-xs"
                                      variant="outline"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                      Returned
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      Order #{item.order_number} • {formatDate(item.order_date)}
                                    </span>
                                  </div>
                                </div>
                                <p className="font-medium text-gray-800">
                                  {formatCurrency((item.price || 0) * item.quantity)}
                                </p>
                              </div>

                              <div className="mt-2 text-sm text-gray-600">
                                <p>Quantity: {item.quantity}</p>
                                {getProductVariation(item) && (
                                  <p className="mt-1">Variation: {getProductVariation(item)}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Return Details Section */}
                          <div className="mt-2 pt-4 border-t border-gray-200">
                            <div className="flex flex-col gap-4">
                              {/* Return Status */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="relative p-3 rounded-full bg-gray-100 text-gray-600">
                                    <ArrowLeft className="h-5 w-5" />
                                  </div>

                                  <div>
                                    <h4 className="font-medium text-gray-900">Return Processed</h4>
                                    <p className="text-sm text-gray-600">
                                      Your return has been received and processed.
                                    </p>
                                  </div>
                                </div>

                                <Badge
                                  className="bg-gray-100 text-gray-800 border-gray-200 px-3 py-1"
                                  variant="outline"
                                >
                                  {formatDate(item.return_date || item.order_date)}
                                </Badge>
                              </div>

                              {/* Return Information */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Return Details */}
                                <div className="bg-white rounded-md border border-gray-200 p-3">
                                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1 mb-2">
                                    <Info className="h-4 w-4" /> Return Details
                                  </h4>
                                  <div className="space-y-2 text-xs text-gray-600">
                                    <div className="flex justify-between">
                                      <span>Return Authorization:</span>
                                      <span className="font-medium">{item.return_authorization}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Return Tracking:</span>
                                      <span className="font-medium">{item.return_tracking}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Return Reason:</span>
                                      <span className="font-medium">{item.return_reason}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Refund Status */}
                                <div className="bg-white rounded-md border border-gray-200 p-3">
                                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1 mb-2">
                                    <CreditCard className="h-4 w-4" /> Refund Status
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-600">
                                      <span>Status:</span>
                                      <Badge
                                        variant="outline"
                                        className={`${
                                          item.refund_status === "completed"
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : "bg-amber-100 text-amber-800 border-amber-200"
                                        } text-xs`}
                                      >
                                        {item.refund_status === "completed" ? "Completed" : "Processing"}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600">
                                      <span>Amount:</span>
                                      <span className="font-medium">{formatCurrency(item.refund_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600">
                                      <span>Method:</span>
                                      <span className="font-medium">Original Payment</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Buy Again */}
                              <div className="flex justify-between items-center bg-gray-50 rounded-md border border-gray-200 p-3">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">Want to try again?</h4>
                                  <p className="text-xs text-gray-600">
                                    Purchase this item again with improved options
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-8 px-3 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                  onClick={() => {
                                    toast({
                                      title: "Added to Cart",
                                      description: "Item has been added to your cart",
                                    })
                                  }}
                                >
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  Buy Again
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination for returned items */}
                    {filteredReturnedItems.length > ORDERS_PER_PAGE && (
                      <Pagination className="mt-6">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="border-gray-200 text-gray-700 hover:bg-gray-50"
                            />
                          </PaginationItem>

                          {Array.from({ length: Math.ceil(filteredReturnedItems.length / ORDERS_PER_PAGE) }).map(
                            (_, i) => {
                              if (
                                i === 0 ||
                                i === Math.ceil(filteredReturnedItems.length / ORDERS_PER_PAGE) - 1 ||
                                i === currentPage - 1 ||
                                i === currentPage - 2 ||
                                i === currentPage
                              ) {
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationLink
                                      isActive={currentPage === i + 1}
                                      onClick={() => setCurrentPage(i + 1)}
                                      className={
                                        currentPage === i + 1
                                          ? "bg-gray-800 text-white"
                                          : "text-gray-700 hover:bg-gray-50"
                                      }
                                    >
                                      {i + 1}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              }

                              if (
                                (i === 1 && currentPage > 3) ||
                                (i === Math.ceil(filteredReturnedItems.length / ORDERS_PER_PAGE) - 2 &&
                                  currentPage < Math.ceil(filteredReturnedItems.length / ORDERS_PER_PAGE) - 2)
                              ) {
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationEllipsis className="text-gray-400" />
                                  </PaginationItem>
                                )
                              }

                              return null
                            },
                          )}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(Math.ceil(filteredReturnedItems.length / ORDERS_PER_PAGE), prev + 1),
                                )
                              }
                              disabled={currentPage === Math.ceil(filteredReturnedItems.length / ORDERS_PER_PAGE)}
                              className="border-gray-200 text-gray-700 hover:bg-gray-50"
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <CardTitle>Cancelled Items</CardTitle>
                </div>
                <CardDescription>
                  {filteredCanceledItems.length} {filteredCanceledItems.length === 1 ? "item" : "items"} cancelled
                </CardDescription>
              </CardHeader>

              <CardContent>
                {canceledLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-lg border border-red-200 bg-red-50 overflow-hidden shadow-sm p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Skeleton className="h-20 w-20 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-8 w-24 rounded-md" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredCanceledItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-6 rounded-full bg-gray-100 p-6 shadow-sm">
                      <PackageX className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="mb-3 text-lg font-medium text-gray-800">No Cancelled Items</h3>
                    <p className="mb-8 max-w-md text-center text-gray-500">
                      {searchQuery
                        ? "No cancelled items match your search. Try adjusting your search terms."
                        : "You don't have any cancelled items."}
                    </p>
                    <Button asChild className="flex items-center gap-2">
                      <Link href="/products">
                        <Home className="h-4 w-4" />
                        Shop Now
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCanceledItems.map((item, index) => (
                      <div key={index} className="rounded-lg border border-red-200 bg-red-50 overflow-hidden shadow-sm">
                        <div className="p-4 flex flex-col sm:flex-row gap-4">
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                            <Image
                              src={getProductImage(item) || "/placeholder.svg"}
                              alt={getProductName(item)}
                              width={80}
                              height={80}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <div className="flex flex-1 flex-col">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div>
                                <h3 className="text-base font-medium text-gray-800">{getProductName(item)}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge variant="destructive" className="text-xs">
                                    Cancelled
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    Order #{item.order_number} • {formatDate(item.order_date)}
                                  </span>
                                </div>
                              </div>
                              <p className="font-medium text-gray-800">
                                {formatCurrency((item.price || 0) * item.quantity)}
                              </p>
                            </div>

                            <div className="mt-2 text-sm text-gray-600">
                              <p>Quantity: {item.quantity}</p>
                              {getProductVariation(item) && (
                                <p className="mt-1">Variation: {getProductVariation(item)}</p>
                              )}
                            </div>

                            {item.cancellation_reason && (
                              <div className="mt-2 flex items-start gap-1 text-sm text-red-600">
                                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Reason: {item.cancellation_reason}</span>
                              </div>
                            )}

                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                Cancelled on {formatDate(item.cancellation_date || item.order_date)}
                              </span>
                              <Button asChild variant="outline" size="sm" className="text-xs h-7 px-3">
                                <Link href={`/orders/${item.order_id}`}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Order
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Order Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <label htmlFor="cancelReason" className="text-sm font-medium text-gray-700">
              Reason for cancellation (optional)
            </label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling this order?"
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>Confirm Cancellation</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Dialog */}
      <AlertDialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Write a Review</AlertDialogTitle>
            <AlertDialogDescription>
              Share your experience with this product to help other shoppers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Rating</label>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        reviewRating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="reviewComment" className="text-sm font-medium text-gray-700">
                Your Review
              </label>
              <Textarea
                id="reviewComment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="What did you like or dislike about this product?"
                className="mt-1 h-24"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingReview}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitReview}
              disabled={submittingReview || reviewRating === 0}
              className="bg-primary hover:bg-primary/90 focus:ring-primary"
            >
              {submittingReview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Submit Review</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Order Status Tab Component
function OrderStatusTab({
  status,
  orders,
  loading,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getProductName,
  getProductImage,
  getProductVariation,
  canCancelOrder,
  onCancelOrder,
  currentPage,
  setCurrentPage,
  itemsPerPage,
}: {
  status: string
  orders: any[]
  loading: boolean
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
  getStatusBadge: (status: string) => React.ReactNode
  getProductName: (item: any) => string
  getProductImage: (item: any) => string
  getProductVariation: (item: any) => string | null
  canCancelOrder: (order: any) => boolean
  onCancelOrder: (orderId: string) => void
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  itemsPerPage: number
}) {
  const statusTitle = status.charAt(0).toUpperCase() + status.slice(1)
  const statusIcon = {
    pending: <Clock className="h-5 w-5 text-orange-500" />,
    shipped: <Truck className="h-5 w-5 text-indigo-500" />,
    delivered: <CheckCircle className="h-5 w-5 text-green-500" />,
    cancelled: <XCircle className="h-5 w-5 text-red-500" />,
    returned: <RotateCcw className="h-5 w-5 text-amber-500" />,
  }[status] || <ShoppingBag className="h-5 w-5 text-gray-500" />

  // Get paginated orders
  const getPaginatedOrders = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return orders.slice(startIndex, endIndex)
  }

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage))

  // Define background and border colors based on status
  const getBgColors = () => {
    switch (status) {
      case "pending":
        return {
          card: "bg-orange-50",
          border: "border-orange-200",
          skeleton: "border-orange-200 bg-orange-50",
        }
      case "shipped":
        return {
          card: "bg-indigo-50",
          border: "border-indigo-200",
          skeleton: "border-indigo-200 bg-indigo-50",
        }
      case "delivered":
        return {
          card: "bg-green-50",
          border: "border-green-200",
          skeleton: "border-green-200 bg-green-50",
        }
      case "cancelled":
        return {
          card: "bg-red-50",
          border: "border-red-200",
          skeleton: "border-red-200 bg-red-50",
        }
      case "returned":
        return {
          card: "bg-amber-50",
          border: "border-amber-200",
          skeleton: "border-amber-200 bg-amber-50",
        }
      default:
        return {
          card: "bg-gray-50",
          border: "border-gray-200",
          skeleton: "border-gray-200 bg-gray-50",
        }
    }
  }

  const colors = getBgColors()

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          {statusIcon}
          <CardTitle>{statusTitle} Orders</CardTitle>
        </div>
        <CardDescription>
          {orders.length} {orders.length === 1 ? "order" : "orders"} with status "{statusTitle}"
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className={`rounded-lg border ${colors.skeleton} overflow-hidden shadow-sm p-4`}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Skeleton className="h-20 w-20 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 rounded-full bg-gray-100 p-6 shadow-sm">
              <PackageX className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="mb-3 text-lg font-medium text-gray-800">No {statusTitle} Orders</h3>
            <p className="mb-8 max-w-md text-center text-gray-500">
              You don't have any orders with the "{statusTitle}" status.
            </p>
            <Button asChild className="flex items-center gap-2">
              <Link href="/products">
                <Home className="h-4 w-4" />
                Shop Now
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {getPaginatedOrders().map((order, index) => (
              <div
                key={order.id || index}
                className={`rounded-lg border ${colors.border} ${colors.card} overflow-hidden shadow-sm`}
              >
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                  {/* Order item image - first item or placeholder */}
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                    <Image
                      src={
                        order.items && order.items.length > 0
                          ? getProductImage(order.items[0])
                          : "/placeholder.svg?height=80&width=80"
                      }
                      alt={order.items && order.items.length > 0 ? getProductName(order.items[0]) : "Order item"}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>

                  {/* Order details */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        {/* Product name - first item or generic */}
                        <h3 className="text-base font-medium text-gray-800 line-clamp-2">
                          {order.items && order.items.length > 0 ? getProductName(order.items[0]) : "Order Items"}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {getStatusBadge(order.status)}
                          <span className="text-xs text-gray-500">Order #{order.order_number}</span>
                        </div>

                        {/* Date display below status */}
                        <div className="mt-1 text-xs text-gray-600 font-medium">March 19, 2025</div>

                        <div className="mt-2 text-sm text-gray-600">
                          Quantity: {order.items && order.items.length > 0 ? order.items[0].quantity : 0}
                        </div>

                        {/* Show multiple items indicator if there are more items */}
                        {order.items && order.items.length > 1 && (
                          <div className="mt-1 text-xs text-gray-500">
                            + {order.items.length - 1} more {order.items.length - 1 === 1 ? "item" : "items"}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(order.total_amount || order.total || 0)}
                        </p>

                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm" className="text-xs h-8 px-3 bg-white">
                            <Link href={`/orders/${order.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View Order
                            </Link>
                          </Button>

                          {canCancelOrder(order) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 bg-white"
                              onClick={() => onCancelOrder(order.id?.toString() || "")}
                            >
                              <XSquare className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual Status Indicator with Animated Icons */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`relative p-3 rounded-full ${
                              order.status?.toLowerCase() === "pending"
                                ? "bg-orange-100 text-orange-600"
                                : order.status?.toLowerCase() === "processing"
                                  ? "bg-blue-100 text-blue-600"
                                  : order.status?.toLowerCase() === "shipped"
                                    ? "bg-indigo-100 text-indigo-600"
                                    : order.status?.toLowerCase() === "delivered"
                                      ? "bg-green-100 text-green-600"
                                      : order.status?.toLowerCase() === "cancelled" ||
                                          order.status?.toLowerCase() === "canceled"
                                        ? "bg-red-100 text-red-600"
                                        : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {order.status?.toLowerCase() === "pending" && <Clock className="h-6 w-6 animate-pulse" />}
                            {order.status?.toLowerCase() === "processing" && (
                              <Package className="h-6 w-6 animate-bounce" />
                            )}
                            {order.status?.toLowerCase() === "shipped" && <Truck className="h-6 w-6 animate-bounce" />}
                            {order.status?.toLowerCase() === "delivered" && (
                              <CheckCircle className="h-6 w-6 animate-bounce" />
                            )}
                            {(order.status?.toLowerCase() === "cancelled" ||
                              order.status?.toLowerCase() === "canceled") && (
                              <XCircle className="h-6 w-6 animate-pulse" />
                            )}
                            {!["pending", "processing", "shipped", "delivered", "cancelled", "canceled"].includes(
                              order.status?.toLowerCase() || "",
                            ) && <ShoppingBag className="h-6 w-6" />}

                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                              <span
                                className={`absolute inline-flex h-full w-full rounded-full ${
                                  order.status?.toLowerCase() === "pending"
                                    ? "bg-orange-400"
                                    : order.status?.toLowerCase() === "processing"
                                      ? "bg-blue-400"
                                      : order.status?.toLowerCase() === "shipped"
                                        ? "bg-indigo-400"
                                        : order.status?.toLowerCase() === "delivered"
                                          ? "bg-green-400"
                                          : order.status?.toLowerCase() === "cancelled" ||
                                              order.status?.toLowerCase() === "canceled"
                                            ? "bg-red-400"
                                            : "bg-gray-400"
                                } opacity-75 animate-ping`}
                              ></span>
                              <span
                                className={`relative inline-flex rounded-full h-3 w-3 ${
                                  order.status?.toLowerCase() === "pending"
                                    ? "bg-orange-500"
                                    : order.status?.toLowerCase() === "processing"
                                      ? "bg-blue-500"
                                      : order.status?.toLowerCase() === "shipped"
                                        ? "bg-indigo-500"
                                        : order.status?.toLowerCase() === "delivered"
                                          ? "bg-green-500"
                                          : order.status?.toLowerCase() === "cancelled" ||
                                              order.status?.toLowerCase() === "canceled"
                                            ? "bg-red-500"
                                            : "bg-gray-500"
                                }`}
                              ></span>
                            </span>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900">
                              {order.status?.toLowerCase() === "pending"
                                ? "Awaiting Processing"
                                : order.status?.toLowerCase() === "processing"
                                  ? "Order Processing"
                                  : order.status?.toLowerCase() === "shipped"
                                    ? "On Its Way"
                                    : order.status?.toLowerCase() === "delivered"
                                      ? "Successfully Delivered"
                                      : order.status?.toLowerCase() === "cancelled" ||
                                          order.status?.toLowerCase() === "canceled"
                                        ? "Order Cancelled"
                                        : "Order Status"}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {order.status?.toLowerCase() === "pending"
                                ? "Your order has been received and is awaiting processing."
                                : order.status?.toLowerCase() === "processing"
                                  ? "We're preparing your items for shipment."
                                  : order.status?.toLowerCase() === "shipped"
                                    ? "Your package is on its way to you."
                                    : order.status?.toLowerCase() === "delivered"
                                      ? "Your order has been delivered successfully."
                                      : order.status?.toLowerCase() === "cancelled" ||
                                          order.status?.toLowerCase() === "canceled"
                                        ? "This order has been cancelled."
                                        : "Current status of your order."}
                            </p>
                          </div>
                        </div>

                        <div className="hidden sm:block">
                          <Badge
                            className={`${
                              order.status?.toLowerCase() === "pending"
                                ? "bg-orange-100 text-orange-800 border-orange-200"
                                : order.status?.toLowerCase() === "processing"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : order.status?.toLowerCase() === "shipped"
                                    ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                                    : order.status?.toLowerCase() === "delivered"
                                      ? "bg-green-100 text-green-800 border-green-200"
                                      : order.status?.toLowerCase() === "cancelled" ||
                                          order.status?.toLowerCase() === "canceled"
                                        ? "bg-red-100 text-red-800 border-red-200"
                                        : "bg-gray-100 text-gray-800 border-gray-200"
                            } px-3 py-1`}
                            variant="outline"
                          >
                            {formatDate(order.created_at)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {orders.length > itemsPerPage && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    // Show first page, last page, current page, and pages around current page
                    if (
                      i === 0 ||
                      i === totalPages - 1 ||
                      i === currentPage - 1 ||
                      i === currentPage - 2 ||
                      i === currentPage
                    ) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink isActive={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    }

                    // Show ellipsis if there's a gap
                    if ((i === 1 && currentPage > 3) || (i === totalPages - 2 && currentPage < totalPages - 2)) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }

                    return null
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

