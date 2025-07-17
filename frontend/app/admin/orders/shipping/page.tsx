"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Truck, Package, MapPin, Clock, Search, Download, RefreshCw, Eye, Edit, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ShippingManagementPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchShippingOrders()
    }
  }, [isAuthenticated, searchQuery, statusFilter])

  const fetchShippingOrders = async () => {
    try {
      setIsLoading(true)
      const params: any = {
        per_page: 50,
      }

      // Filter for orders that need shipping attention
      if (statusFilter) {
        params.status = statusFilter
      } else {
        // Default to orders that are processing, shipped, or ready to ship
        params.status = "processing,shipped"
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      const response = await adminService.getOrders(params)
      setOrders(response.items || [])
    } catch (error) {
      console.error("Failed to fetch shipping orders:", error)
      toast({
        title: "Error",
        description: "Failed to load shipping orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchShippingOrders()
    setIsRefreshing(false)
    toast({
      title: "Success",
      description: "Shipping data refreshed successfully",
    })
  }

  const handleMarkAsShipped = async (orderId: number) => {
    try {
      await adminService.updateOrderStatus(orderId, {
        status: "shipped",
      })

      toast({
        title: "Success",
        description: "Order marked as shipped",
      })

      fetchShippingOrders()
    } catch (error) {
      console.error("Failed to update order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getShippingPriority = (order: any) => {
    const orderDate = new Date(order.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 48) return { level: "high", label: "Urgent", color: "text-red-600" }
    if (hoursDiff > 24) return { level: "medium", label: "High", color: "text-orange-600" }
    return { level: "low", label: "Normal", color: "text-green-600" }
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
          <h1 className="text-3xl font-bold tracking-tight">Shipping Management</h1>
          <p className="text-muted-foreground">Track and manage order shipments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Shipping Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter((o) => o.status === "processing").length}</div>
            <p className="text-xs text-muted-foreground">Orders awaiting shipment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter((o) => o.status === "shipped").length}</div>
            <p className="text-xs text-muted-foreground">Orders currently shipping</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {orders.filter((o) => getShippingPriority(o).level === "high").length}
            </div>
            <p className="text-xs text-muted-foreground">Orders over 48 hours old</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                orders.filter(
                  (o) =>
                    o.status === "delivered" && new Date(o.updated_at).toDateString() === new Date().toDateString(),
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search by order number, customer, or tracking..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="processing">Ready to Ship</SelectItem>
                <SelectItem value="shipped">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Orders</CardTitle>
          <CardDescription>Manage order shipments and tracking information</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No shipping orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => {
                      const priority = getShippingPriority(order)
                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">#{order.order_number}</div>
                              <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                              {order.tracking_number && (
                                <div className="text-xs text-blue-600 font-mono">{order.tracking_number}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.user?.name || "Guest"}</div>
                              <div className="text-xs text-muted-foreground">{order.user?.email || "No email"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={priority.color}>
                              {priority.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)} variant="outline">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {order.shipping_address && (
                                <div className="text-xs">
                                  {typeof order.shipping_address === "string" ? (
                                    order.shipping_address
                                  ) : (
                                    <>
                                      <div>
                                        {order.shipping_address.city}, {order.shipping_address.state}
                                      </div>
                                      <div>{order.shipping_address.country}</div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Package className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Shipping Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}/shipping`)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Update Shipping
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {order.status === "processing" && (
                                  <DropdownMenuItem onClick={() => handleMarkAsShipped(order.id)}>
                                    <Truck className="mr-2 h-4 w-4" />
                                    Mark as Shipped
                                  </DropdownMenuItem>
                                )}
                                {order.status === "shipped" && (
                                  <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}/tracking`)}>
                                    <MapPin className="mr-2 h-4 w-4" />
                                    Track Package
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
