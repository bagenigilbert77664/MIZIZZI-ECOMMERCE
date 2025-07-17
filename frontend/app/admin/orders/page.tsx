"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, FileText, Truck, Download, Filter, RefreshCw, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface OrderFilters {
  status: string
  payment_status: string
  date_from: string
  date_to: string
  search: string
  min_amount: string
  max_amount: string
}

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [filters, setFilters] = useState<OrderFilters>({
    status: "",
    payment_status: "",
    date_from: "",
    date_to: "",
    search: "",
    min_amount: "",
    max_amount: "",
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: any = {
        page: currentPage,
        per_page: 15,
      }

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          params[key] = value
        }
      })

      const response = await adminService.getOrders(params)
      setOrders(response.items || [])
      setTotalPages(response.pagination?.total_pages || 1)
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, filters])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated, fetchOrders])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchOrders()
    setIsRefreshing(false)
    toast({
      title: "Success",
      description: "Orders refreshed successfully",
    })
  }

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setFilters({
      status: "",
      payment_status: "",
      date_from: "",
      date_to: "",
      search: "",
      min_amount: "",
      max_amount: "",
    })
    setCurrentPage(1)
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map((order) => order.id.toString()))
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select orders to update",
        variant: "destructive",
      })
      return
    }

    try {
      // Update each selected order
      await Promise.all(
        selectedOrders.map((orderId) =>
          adminService.updateOrderStatus(Number.parseInt(orderId), { status: newStatus }),
        ),
      )

      toast({
        title: "Success",
        description: `Updated ${selectedOrders.length} orders to ${newStatus}`,
      })

      setSelectedOrders([])
      fetchOrders()
    } catch (error) {
      console.error("Failed to update orders:", error)
      toast({
        title: "Error",
        description: "Failed to update orders. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportOrders = async () => {
    try {
      const params: any = { ...filters }
      // Add export flag or use a different endpoint
      toast({
        title: "Export Started",
        description: "Your order export is being prepared...",
      })
      // Implement export functionality
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export orders. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "processing":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "shipped":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200"
      case "delivered":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "cancelled":
      case "canceled":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">Manage and track all customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={exportOrders}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={!filters.status ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("status", "")}
            >
              All Orders
            </Button>
            <Button
              variant={filters.status === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => router.push("/admin/orders/pending")}
            >
              Pending
              <Badge variant="secondary" className="ml-2">
                5
              </Badge>
            </Button>
            <Button
              variant={filters.status === "processing" ? "default" : "outline"}
              size="sm"
              onClick={() => router.push("/admin/orders/processing")}
            >
              Processing
              <Badge variant="secondary" className="ml-2">
                3
              </Badge>
            </Button>
            <Button
              variant={filters.status === "delivered" ? "default" : "outline"}
              size="sm"
              onClick={() => router.push("/admin/orders/completed")}
            >
              Completed
            </Button>
            <Button
              variant={filters.status === "cancelled" ? "default" : "outline"}
              size="sm"
              onClick={() => router.push("/admin/orders/cancelled")}
            >
              Cancelled
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders/returns")}>
              Returns
              <Badge variant="secondary" className="ml-2">
                2
              </Badge>
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders/invoices")}>
              Invoices
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders/tracking")}>
              Order Tracking
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  placeholder="Order number, customer..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Status</label>
                <Select
                  value={filters.payment_status}
                  onValueChange={(value) => handleFilterChange("payment_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All payment statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date From</label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange("date_from", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date To</label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange("date_to", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Min Amount</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.min_amount}
                  onChange={(e) => handleFilterChange("min_amount", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Amount</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={filters.max_amount}
                  onChange={(e) => handleFilterChange("max_amount", e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{selectedOrders.length} order(s) selected</span>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleBulkStatusUpdate}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Mark as Processing</SelectItem>
                    <SelectItem value="shipped">Mark as Shipped</SelectItem>
                    <SelectItem value="delivered">Mark as Delivered</SelectItem>
                    <SelectItem value="cancelled">Mark as Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrders([])}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.includes(order.id.toString())}
                              onCheckedChange={() => handleSelectOrder(order.id.toString())}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">#{order.order_number}</div>
                              {order.tracking_number && (
                                <div className="text-xs text-muted-foreground">Tracking: {order.tracking_number}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.user?.name || "Guest"}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {order.user?.email || "No email"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(order.created_at)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)} variant="outline">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPaymentStatusColor(order.payment_status)} variant="outline">
                              {order.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}/invoice`)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Invoice
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/orders/${order.id}/update-status`)}
                                >
                                  <Truck className="mr-2 h-4 w-4" />
                                  Update Status
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (currentPage !== 1) {
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                        }}
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNumber =
                        currentPage <= 3
                          ? i + 1
                          : currentPage >= totalPages - 2
                            ? totalPages - 4 + i
                            : currentPage - 2 + i

                      if (pageNumber <= 0 || pageNumber > totalPages) return null

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            isActive={currentPage === pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          if (currentPage !== totalPages) {
                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                          }
                        }}
                        aria-disabled={currentPage === totalPages}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
