"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import {
  AlertCircle,
  Clock,
  Package,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Truck,
  Loader2,
  RefreshCw,
  BarChart3,
  RotateCcw,
} from "lucide-react"
import type { Order, OrderItem } from "@/types"
import { Input } from "@/components/ui/input"
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
import { OrderStatusCard } from "@/components/orders/order-status-card"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { OrderStatusTab } from "@/components/orders/order-status-tab"
import { OrderInsights } from "@/components/orders/order-insights"

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

// Increased number of orders to display per page
const ORDERS_PER_PAGE = 5 // Increased from 5 to 20

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
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Fetch orders on component mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isRedirecting) {
      setIsRedirecting(true)
      router.push("/auth/login?redirect=/orders")
      return
    }

    if (isAuthenticated && !isRedirecting) {
      fetchOrders()
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

  // Calculate order stats directly from orders array
  // This ensures stats always match exactly what's in the orders
  useEffect(() => {
    if (!Array.isArray(orders)) return

    console.log("Calculating stats from orders array...")

    // Count orders by status
    const stats = {
      total: orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    }

    // Count each status type
    orders.forEach((order) => {
      const status = order.status?.toLowerCase() || ""

      if (status === "pending") {
        stats.pending++
      } else if (status === "processing") {
        stats.processing++
      } else if (status === "shipped") {
        stats.shipped++
      } else if (status === "delivered") {
        stats.delivered++
      } else if (status === "cancelled" || status === "canceled") {
        stats.cancelled++
      } else if (status === "returned") {
        stats.returned++
      }
    })

    console.log("Calculated stats:", stats)
    setOrderStats(stats)
  }, [orders])

  // Fetch orders from API
  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      console.log("Fetching all orders...")
      // Remove any limit parameter to get all orders
      const data = await orderService.getOrders({ limit: 1000 }) // Set a very high limit
      console.log("Orders fetched:", data)

      if (Array.isArray(data)) {
        setOrders(data)

        // Fetch canceled and returned items separately for detailed views
        await Promise.all([fetchCanceledItems(), fetchReturnedItems()])
      } else {
        console.warn("No orders returned from API or invalid format")
        setOrders([])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      setError("Failed to load your orders. Please try again later.")
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch canceled orders
  const fetchCanceledItems = async () => {
    try {
      setCanceledLoading(true)
      console.log("Fetching canceled items...")
      // Remove any limit parameter to get all canceled orders
      const canceledOrders = await orderService.getCanceledOrders()
      console.log("Canceled orders fetched:", canceledOrders)
      setCanceledItems(canceledOrders)
    } catch (err: any) {
      console.error("Failed to fetch canceled items:", err)
      // Don't show an error toast for this, as it's not critical
      setCanceledItems([])
    } finally {
      setCanceledLoading(false)
    }
  }

  // Fetch returned orders
  const fetchReturnedItems = async () => {
    try {
      setReturnedLoading(true)
      console.log("Fetching returned items...")
      // Remove any limit parameter to get all returned orders
      const returnedOrders = await orderService.getReturnedOrders()
      console.log("Returned orders fetched:", returnedOrders)
      setReturnedItems(returnedOrders)
    } catch (err: any) {
      console.error("Failed to fetch returned items:", err)
      // Don't show an error toast for this, as it's not critical
      setReturnedItems([])
    } finally {
      setReturnedLoading(false)
    }
  }

  // Refresh all data
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
  }, [orders, statusFilter, timeRange, searchQuery, sortBy, currentPage])

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

    if (item.variant) {
      const variant: Record<string, any> = {}
      if (item.variant.color) variant.color = item.variant.color
      if (item.variant.size) variant.size = item.variant.size

      if (Object.keys(variant).length > 0) {
        return Object.entries(variant)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(", ")
      }
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
      <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-6 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 rounded-full bg-gray-100 p-6 shadow-sm">
              <ShoppingBag className="h-12 w-12 text-primary" />
            </div>
            <h2 className="mb-3 text-xl font-bold">Sign In Required</h2>
            <p className="mb-8 max-w-md text-center text-gray-500">
              Please sign in to view your order history. Once logged in, you&apos;ll be able to track and manage your
              orders.
            </p>
            <Button asChild size="lg" className="px-8 py-6 h-auto text-base font-medium">
              <Link href="/auth/login?redirect=/orders">SIGN IN</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 py-6 sm:py-8">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">My Orders</h1>
            <p className="text-gray-500">View and manage your order history</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrderInsights(!showOrderInsights)}
              className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{showOrderInsights ? "Hide Insights" : "Order Insights"}</span>
              <span className="sm:hidden">{showOrderInsights ? "Hide" : "Insights"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Refresh</span>
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
        {showOrderInsights && <OrderInsights orders={orders} orderStats={orderStats} statusColors={statusColors} />}

        {/* Order Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {/* Total Orders Card - View Only */}
          <OrderStatusCard status="total" count={orderStats.total || 0} loading={isLoading} />

          {/* Pending Orders Card */}
          <OrderStatusCard
            status="pending"
            count={orderStats.pending || 0}
            loading={isLoading}
            onClick={() => {
              setActiveTab("pending")
              setStatusFilter("pending")
            }}
          />

          {/* Shipped Orders Card */}
          <OrderStatusCard
            status="shipped"
            count={orderStats.shipped || 0}
            loading={isLoading}
            onClick={() => {
              setActiveTab("shipped")
              setStatusFilter("shipped")
            }}
          />

          {/* Delivered Orders Card */}
          <OrderStatusCard
            status="delivered"
            count={orderStats.delivered || 0}
            loading={isLoading}
            onClick={() => {
              setActiveTab("delivered")
              setStatusFilter("delivered")
            }}
          />

          {/* Returned Orders Card */}
          <OrderStatusCard
            status="returned"
            count={orderStats.returned || 0}
            loading={isLoading}
            onClick={() => {
              setActiveTab("returned")
              setStatusFilter("returned")
            }}
          />

          {/* Cancelled Orders Card */}
          <OrderStatusCard
            status="cancelled"
            count={orderStats.cancelled || 0}
            loading={isLoading}
            onClick={() => {
              setActiveTab("cancelled")
              setStatusFilter("cancelled")
            }}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
            <TabsList className="flex w-full justify-start h-auto bg-transparent p-0">
              <TabsTrigger
                value="pending"
                onClick={() => setStatusFilter("pending")}
                className="text-sm sm:text-base font-medium data-[state=active]:text-orange-600 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-50/50 border-b-2 border-transparent data-[state=active]:border-b-2 rounded-none px-3 sm:px-4 py-2 sm:py-3 h-auto hover:bg-orange-50/30 hover:text-orange-600 transition-colors whitespace-nowrap"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="shipped"
                onClick={() => setStatusFilter("shipped")}
                className="text-sm sm:text-base font-medium data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50/50 border-b-2 border-transparent data-[state=active]:border-b-2 rounded-none px-3 sm:px-4 py-2 sm:py-3 h-auto hover:bg-blue-50/30 hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Shipped
              </TabsTrigger>
              <TabsTrigger
                value="delivered"
                onClick={() => setStatusFilter("delivered")}
                className="text-sm sm:text-base font-medium data-[state=active]:text-green-600 data-[state=active]:border-green-600 data-[state=active]:bg-green-50/50 border-b-2 border-transparent data-[state=active]:border-b-2 rounded-none px-3 sm:px-4 py-2 sm:py-3 h-auto hover:bg-green-50/30 hover:text-green-600 transition-colors whitespace-nowrap"
              >
                Delivered
              </TabsTrigger>
              <TabsTrigger
                value="returned"
                onClick={() => setStatusFilter("returned")}
                className="text-sm sm:text-base font-medium data-[state=active]:text-gray-600 data-[state=active]:border-gray-600 data-[state=active]:bg-gray-50/50 border-b-2 border-transparent data-[state=active]:border-b-2 rounded-none px-3 sm:px-4 py-2 sm:py-3 h-auto hover:bg-gray-50/30 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                Returned
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                onClick={() => setStatusFilter("cancelled")}
                className="text-sm sm:text-base font-medium data-[state=active]:text-red-600 data-[state=active]:border-red-600 data-[state=active]:bg-red-50/50 border-b-2 border-transparent data-[state=active]:border-b-2 rounded-none px-3 sm:px-4 py-2 sm:py-3 h-auto hover:bg-red-50/30 hover:text-red-600 transition-colors whitespace-nowrap"
              >
                Cancelled
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending">
            <OrderStatusTab
              status="pending"
              orders={
                Array.isArray(filteredOrders)
                  ? filteredOrders.filter((order) => order.status?.toLowerCase() === "pending")
                  : []
              }
              loading={isLoading}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={(status: string) => <OrderStatusBadge status={status} />}
              getProductName={getProductName}
              getProductImage={getProductImage}
              getProductVariation={getProductVariation}
              canCancelOrder={canCancelOrder}
              onCancelOrder={(orderId: string) => {
                setCancelOrderId(orderId)
                setCancelDialogOpen(true)
              }}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={ORDERS_PER_PAGE}
            />
          </TabsContent>

          <TabsContent value="shipped">
            <OrderStatusTab
              status="shipped"
              orders={
                Array.isArray(filteredOrders)
                  ? filteredOrders.filter((order) => order.status?.toLowerCase() === "shipped")
                  : []
              }
              loading={isLoading}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={(status: string) => <OrderStatusBadge status={status} />}
              getProductName={getProductName}
              getProductImage={getProductImage}
              getProductVariation={getProductVariation}
              canCancelOrder={canCancelOrder}
              onCancelOrder={(orderId: string) => {
                setCancelOrderId(orderId)
                setCancelDialogOpen(true)
              }}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={ORDERS_PER_PAGE}
            />
          </TabsContent>

          <TabsContent value="delivered">
            <OrderStatusTab
              status="delivered"
              orders={
                Array.isArray(filteredOrders)
                  ? filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered")
                  : []
              }
              loading={isLoading}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={(status: string) => <OrderStatusBadge status={status} />}
              getProductName={getProductName}
              getProductImage={getProductImage}
              getProductVariation={getProductVariation}
              canCancelOrder={canCancelOrder}
              onCancelOrder={(orderId: string) => {
                setCancelOrderId(orderId)
                setCancelDialogOpen(true)
              }}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={ORDERS_PER_PAGE}
            />
          </TabsContent>

          <TabsContent value="returned">
            <OrderStatusTab
              status="returned"
              orders={
                Array.isArray(filteredOrders)
                  ? filteredOrders.filter((order) => order.status?.toLowerCase() === "returned")
                  : []
              }
              loading={isLoading}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={(status: string) => <OrderStatusBadge status={status} />}
              getProductName={getProductName}
              getProductImage={getProductImage}
              getProductVariation={getProductVariation}
              canCancelOrder={canCancelOrder}
              onCancelOrder={(orderId: string) => {
                setCancelOrderId(orderId)
                setCancelDialogOpen(true)
              }}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={ORDERS_PER_PAGE}
            />
          </TabsContent>

          <TabsContent value="cancelled">
            <OrderStatusTab
              status="cancelled"
              orders={
                Array.isArray(filteredOrders)
                  ? filteredOrders.filter(
                      (order) =>
                        order.status?.toLowerCase() === "cancelled" || order.status?.toLowerCase() === "canceled",
                    )
                  : []
              }
              loading={isLoading}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={(status: string) => <OrderStatusBadge status={status} />}
              getProductName={getProductName}
              getProductImage={getProductImage}
              getProductVariation={getProductVariation}
              canCancelOrder={canCancelOrder}
              onCancelOrder={(orderId: string) => {
                setCancelOrderId(orderId)
                setCancelDialogOpen(true)
              }}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={ORDERS_PER_PAGE}
            />
          </TabsContent>
        </Tabs>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent className="max-w-md mx-auto">
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
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel disabled={cancelling} className="mt-2 sm:mt-0">
                Cancel
              </AlertDialogCancel>
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
      </div>
    </div>
  )
}
