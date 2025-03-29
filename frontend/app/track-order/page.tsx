"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth/auth-context"
import { orderService } from "@/services/order"
import { Button } from "@/components/ui/button"
import {
  ShoppingBag,
  AlertCircle,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  CalendarDays,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Order } from "@/types"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("ongoing")
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>("newest")
  const [showFilters, setShowFilters] = useState(false)
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Fetch orders when component mounts
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/orders")
      return
    }

    if (isAuthenticated && !authLoading) {
      fetchOrders()
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await orderService.getOrders()
      console.log("Orders response:", data) // Debug log
      setOrders(data)
      setFilteredOrders(data)
    } catch (error) {
      console.error("Error fetching orders:", error)
      setError("Failed to load orders. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh orders
  const refreshOrders = async () => {
    if (isRefreshing) return

    try {
      setIsRefreshing(true)
      const data = await orderService.getOrders()
      setOrders(data)
      toast({
        title: "Orders Refreshed",
        description: "Your order list has been updated.",
      })
    } catch (error) {
      console.error("Error refreshing orders:", error)
      toast({
        title: "Refresh Failed",
        description: "Could not refresh orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter and sort orders
  useEffect(() => {
    let result = [...orders]

    // Filter by status
    switch (activeTab) {
      case "ongoing":
        result = result.filter((order) => ["pending", "processing", "shipped"].includes(order.status.toLowerCase()))
        break
      case "delivered":
        result = result.filter((order) => order.status.toLowerCase() === "delivered")
        break
      case "canceled":
        result = result.filter((order) => ["cancelled", "refunded"].includes(order.status.toLowerCase()))
        break
      case "returned":
        result = result.filter((order) => order.status.toLowerCase() === "returned")
        break
    }

    // Filter by date
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filterDate.setHours(0, 0, 0, 0)

      result = result.filter((order) => {
        const orderDate = new Date(order.created_at)
        orderDate.setHours(0, 0, 0, 0)
        return orderDate.getTime() === filterDate.getTime()
      })
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          order.items?.some((item) => item.product?.name?.toLowerCase().includes(query)),
      )
    }

    // Sort orders
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "highest":
        result.sort((a, b) => b.total_amount - a.total_amount)
        break
      case "lowest":
        result.sort((a, b) => a.total_amount - b.total_amount)
        break
    }

    setFilteredOrders(result)
  }, [orders, searchQuery, activeTab, dateFilter, sortBy])

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    let className = ""
    let icon = null

    switch (status.toLowerCase()) {
      case "pending":
        className = "bg-amber-50 text-amber-700 border-amber-200"
        icon = <Clock className="h-3.5 w-3.5 mr-1.5" />
        break
      case "processing":
        className = "bg-blue-50 text-blue-700 border-blue-200"
        icon = <Package className="h-3.5 w-3.5 mr-1.5" />
        break
      case "shipped":
        className = "bg-indigo-50 text-indigo-700 border-indigo-200"
        icon = <Truck className="h-3.5 w-3.5 mr-1.5" />
        break
      case "delivered":
        className = "bg-green-50 text-green-700 border-green-200"
        icon = <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
        break
      case "cancelled":
        className = "bg-red-50 text-red-700 border-red-200"
        icon = <XCircle className="h-3.5 w-3.5 mr-1.5" />
        break
      case "returned":
        className = "bg-purple-50 text-purple-700 border-purple-200"
        icon = <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
        break
      case "refunded":
        className = "bg-teal-50 text-teal-700 border-teal-200"
        icon = <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        break
      default:
        className = "bg-gray-50 text-gray-700 border-gray-200"
        icon = <Package className="h-3.5 w-3.5 mr-1.5" />
    }

    return (
      <Badge variant="outline" className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${className}`}>
        {icon}
        {status === "cancelled" ? "CANCELLED" : status.toUpperCase()}
      </Badge>
    )
  }

  // Count orders by status type
  const countOrdersByType = (type: string) => {
    switch (type) {
      case "ongoing":
        return orders.filter((order) => ["pending", "processing", "shipped"].includes(order.status.toLowerCase()))
          .length
      case "delivered":
        return orders.filter((order) => order.status.toLowerCase() === "delivered").length
      case "canceled":
        return orders.filter((order) => ["cancelled", "refunded"].includes(order.status.toLowerCase())).length
      case "returned":
        return orders.filter((order) => order.status.toLowerCase() === "returned").length
      default:
        return 0
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setDateFilter(undefined)
    setSortBy("newest")
    setShowFilters(false)
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container max-w-6xl py-12">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
            </div>
            <p className="mt-8 text-lg text-gray-600 font-medium">Loading your orders...</p>
            <p className="mt-2 text-gray-500">Please wait while we fetch your order information</p>
          </div>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container max-w-6xl py-12">
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="bg-primary/5 p-8 flex flex-col justify-center">
                <div className="mb-6 rounded-full bg-primary/10 p-6 w-fit">
                  <ShoppingBag className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Track Your Orders</h2>
                <p className="text-gray-600 mb-6">
                  Sign in to your account to view and track all your orders in one place.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-gray-600">
                    <div className="rounded-full bg-primary/10 p-1 mr-3">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    View order history and status
                  </li>
                  <li className="flex items-center text-gray-600">
                    <div className="rounded-full bg-primary/10 p-1 mr-3">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    Track shipments in real-time
                  </li>
                  <li className="flex items-center text-gray-600">
                    <div className="rounded-full bg-primary/10 p-1 mr-3">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    Manage returns and cancellations
                  </li>
                </ul>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <h3 className="text-xl font-semibold mb-6">Authentication Required</h3>
                <p className="mb-8 text-gray-600">
                  Please log in to your account to view your order history and track your packages.
                </p>
                <Button asChild size="lg" className="w-full">
                  <Link href="/auth/login?redirect=/orders">LOG IN TO CONTINUE</Link>
                </Button>
                <p className="mt-4 text-sm text-center text-gray-500">
                  Don't have an account?{" "}
                  <Link href="/auth/register" className="text-primary font-medium hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container max-w-6xl py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Orders</h1>
          <p className="text-gray-600">View and track all your orders in one place</p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-3 text-red-500" />
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-8 border-0 shadow-md overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  placeholder="Search by product name or order number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </Button>

                <Button
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
                  onClick={refreshOrders}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal border-gray-200 bg-white hover:bg-gray-50"
                            >
                              <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                              {dateFilter ? format(dateFilter, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateFilter}
                              onSelect={setDateFilter}
                              initialFocus
                              className="rounded-md border border-gray-200"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-full border-gray-200 bg-white">
                            <SelectValue placeholder="Sort orders" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="highest">Highest Amount</SelectItem>
                            <SelectItem value="lowest">Lowest Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          className="text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
                          onClick={clearFilters}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-8">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="flex overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab("ongoing")}
                className={`py-4 px-6 text-center font-medium whitespace-nowrap transition-all duration-200 relative ${
                  activeTab === "ongoing" ? "text-primary" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ONGOING ({countOrdersByType("ongoing")})
                {activeTab === "ongoing" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    initial={false}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("delivered")}
                className={`py-4 px-6 text-center font-medium whitespace-nowrap transition-all duration-200 relative ${
                  activeTab === "delivered" ? "text-primary" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                DELIVERED ({countOrdersByType("delivered")})
                {activeTab === "delivered" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    initial={false}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("canceled")}
                className={`py-4 px-6 text-center font-medium whitespace-nowrap transition-all duration-200 relative ${
                  activeTab === "canceled" ? "text-primary" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                CANCELED ({countOrdersByType("canceled")})
                {activeTab === "canceled" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    initial={false}
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("returned")}
                className={`py-4 px-6 text-center font-medium whitespace-nowrap transition-all duration-200 relative ${
                  activeTab === "returned" ? "text-primary" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                RETURNED ({countOrdersByType("returned")})
                {activeTab === "returned" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    initial={false}
                  />
                )}
              </button>
            </div>
          </Card>
        </div>

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-0">
                    <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="w-20 h-20 flex-shrink-0 bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
                        {order.items && order.items[0]?.product?.thumbnail_url ? (
                          <img
                            src={order.items[0].product.thumbnail_url || "/placeholder.svg"}
                            alt={order.items[0].product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : order.items &&
                          order.items[0]?.product?.image_urls &&
                          order.items[0].product.image_urls.length > 0 ? (
                          <img
                            src={order.items[0].product.image_urls[0] || "/placeholder.svg"}
                            alt={order.items[0].product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-400">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                          <div>
                            <h3 className="font-medium text-lg line-clamp-1">
                              {order.items && order.items[0]?.product?.name ? order.items[0].product.name : "Product"}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-500">Order {order.order_number}</p>
                              <Separator orientation="vertical" className="h-4" />
                              <p className="text-sm text-gray-500 flex items-center">
                                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                          </div>
                          <div>{getStatusBadge(order.status)}</div>
                        </div>

                        {order.items && order.items.length > 1 && (
                          <p className="text-sm text-gray-500 mb-3">
                            + {order.items.length - 1} more {order.items.length - 1 === 1 ? "item" : "items"}
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                            <p className="text-sm font-medium">
                              {order.status === "pending"
                                ? "Awaiting processing"
                                : order.status === "processing"
                                  ? "Processing order"
                                  : order.status === "shipped"
                                    ? "In transit"
                                    : order.status === "delivered"
                                      ? "Delivered"
                                      : order.status === "cancelled"
                                        ? "Cancelled"
                                        : "Order placed"}
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            className="border-gray-200 text-primary hover:text-primary-foreground hover:bg-primary"
                          >
                            <Link href={`/orders/${order.id}`}>
                              View details
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar for ongoing orders */}
                    {["pending", "processing", "shipped"].includes(order.status.toLowerCase()) && (
                      <div className="px-6 pb-6">
                        <div className="mt-2 mb-4">
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width:
                                  order.status.toLowerCase() === "pending"
                                    ? "25%"
                                    : order.status.toLowerCase() === "processing"
                                      ? "50%"
                                      : order.status.toLowerCase() === "shipped"
                                  ? "75%" \,
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>Order Placed</span>
                            <span>Processing</span>
                            <span>Shipped</span>
                            <span>Delivered</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="mb-6 rounded-full bg-gray-100 p-6">
                  <ShoppingBag className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold">No Orders Found</h2>
                <p className="mb-6 max-w-md text-gray-600">
                  {searchQuery || dateFilter
                    ? "No orders match your search criteria. Try different filters."
                    : activeTab === "ongoing"
                      ? "You don't have any ongoing orders."
                      : activeTab === "delivered"
                        ? "You don't have any delivered orders."
                        : activeTab === "canceled"
                          ? "You don't have any canceled orders."
                          : activeTab === "returned"
                            ? "You don't have any returned orders."
                            : "You haven't placed any orders yet."}
                </p>
                <div className="flex gap-3">
                  {(searchQuery || dateFilter) && (
                    <Button variant="outline" onClick={clearFilters} className="border-gray-200">
                      Clear Filters
                    </Button>
                  )}
                  <Button asChild>
                    <Link href="/products">Continue Shopping</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

