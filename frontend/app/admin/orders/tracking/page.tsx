"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { websocketService } from "@/services/websocket"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Loader } from "@/components/ui/loader"
import {
  Search,
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  RefreshCw,
  Plus,
  Download,
  User,
  Phone,
  Mail,
  MoreHorizontal,
  Eye,
  AlertCircle,
  Filter,
  ArrowLeft,
  ExternalLink,
  Copy,
  Bell,
  Navigation,
  Package2,
  Zap,
  TrendingUp,
  Activity,
} from "lucide-react"
import type { Order } from "@/types"
import { formatDate, formatCurrency } from "@/lib/utils"

interface TrackingUpdate {
  id: string
  order_id: string
  status: string
  location: string
  description: string
  timestamp: string
  updated_by: string
  latitude?: number
  longitude?: number
  carrier_status?: string
  estimated_delivery?: string
  proof_of_delivery?: string
  recipient_name?: string
  signature_url?: string
}

interface TrackingInfo {
  tracking_number: string
  carrier: string
  carrier_service: string
  estimated_delivery: string
  actual_delivery?: string
  current_location: string
  current_status: string
  progress_percentage: number
  updates: TrackingUpdate[]
  delivery_instructions?: string
  special_handling?: string[]
  insurance_value?: number
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
}

interface TrackingStats {
  total_shipments: number
  in_transit: number
  delivered: number
  delayed: number
  exceptions: number
  on_time_delivery_rate: number
  average_delivery_time: number
}

const CARRIERS = [
  { value: "dhl", label: "DHL Express", logo: "🚚" },
  { value: "fedex", label: "FedEx", logo: "📦" },
  { value: "ups", label: "UPS", logo: "🚛" },
  { value: "posta", label: "Posta Kenya", logo: "📮" },
  { value: "courier", label: "Local Courier", logo: "🏍️" },
  { value: "aramex", label: "Aramex", logo: "✈️" },
  { value: "skynet", label: "SkyNet Worldwide", logo: "🌐" },
]

const TRACKING_STATUSES = [
  { value: "order_placed", label: "Order Placed", color: "bg-blue-100 text-blue-800" },
  { value: "processing", label: "Processing", color: "bg-yellow-100 text-yellow-800" },
  { value: "picked_up", label: "Picked Up", color: "bg-purple-100 text-purple-800" },
  { value: "in_transit", label: "In Transit", color: "bg-orange-100 text-orange-800" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-green-100 text-green-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "exception", label: "Exception", color: "bg-red-100 text-red-800" },
  { value: "returned", label: "Returned", color: "bg-gray-100 text-gray-800" },
]

export default function AdminTrackingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [carrierFilter, setCarrierFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [trackingStats, setTrackingStats] = useState<TrackingStats | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(10)

  // Form states
  const [newTrackingNumber, setNewTrackingNumber] = useState("")
  const [newCarrier, setNewCarrier] = useState("")
  const [newCarrierService, setNewCarrierService] = useState("")
  const [newLocation, setNewLocation] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [estimatedDelivery, setEstimatedDelivery] = useState("")
  const [deliveryInstructions, setDeliveryInstructions] = useState("")
  const [updating, setUpdating] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const { toast } = useToast()

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadOrders()
      loadTrackingStats()
    }
  }, [isAuthenticated, currentPage])

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadOrders()
        if (selectedOrder) {
          loadTrackingInfo(selectedOrder.id)
        }
      }, 30000) // Refresh every 30 seconds
      setRefreshInterval(interval)
    } else if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [autoRefresh, selectedOrder])

  // Filter orders
  useEffect(() => {
    let filtered = orders

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toString().includes(searchQuery) ||
          order.shipping_address?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.shipping_address?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status?.toLowerCase() === statusFilter)
    }

    if (carrierFilter !== "all") {
      // Filter by carrier if tracking info is available
      filtered = filtered.filter((order) => {
        // This would need to be implemented based on your tracking data structure
        return true // Placeholder
      })
    }

    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          break
      }

      if (dateFilter !== "all") {
        filtered = filtered.filter((order) => new Date(order.created_at) >= filterDate)
      }
    }

    setFilteredOrders(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }, [orders, searchQuery, statusFilter, carrierFilter, dateFilter, itemsPerPage])

  // WebSocket for real-time updates
  useEffect(() => {
    if (!websocketService.isEnabled()) return

    const unsubscribeOrderUpdate = websocketService.on("order_updated", (data: any) => {
      console.log("Received order update:", data)

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === data.order_id ? { ...order, status: data.status, tracking_number: data.tracking_number } : order,
        ),
      )

      if (selectedOrder && selectedOrder.id === data.order_id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: data.status, tracking_number: data.tracking_number } : null,
        )
      }

      toast({
        title: "Order Updated",
        description: `Order #${data.order_number || data.order_id} status changed to ${data.status}`,
      })
    })

    const unsubscribeTrackingUpdate = websocketService.on("tracking_updated", (data: any) => {
      console.log("Received tracking update:", data)

      if (selectedOrder && selectedOrder.id === data.order_id) {
        loadTrackingInfo(selectedOrder.id)
      }

      toast({
        title: "Tracking Updated",
        description: `New tracking update for order #${data.order_number || data.order_id}`,
      })
    })

    return () => {
      unsubscribeOrderUpdate()
      unsubscribeTrackingUpdate()
    }
  }, [selectedOrder, toast])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await orderService.getOrders({
        page: currentPage,
        per_page: itemsPerPage,
        include_tracking: true,
      })
      setOrders(data)
    } catch (error) {
      console.error("Failed to load orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTrackingStats = async () => {
    try {
      // Mock tracking stats - replace with actual API call
      const stats: TrackingStats = {
        total_shipments: 1250,
        in_transit: 89,
        delivered: 1098,
        delayed: 23,
        exceptions: 15,
        on_time_delivery_rate: 94.2,
        average_delivery_time: 3.2,
      }
      setTrackingStats(stats)
    } catch (error) {
      console.error("Failed to load tracking stats:", error)
    }
  }

  const loadTrackingInfo = async (orderId: string) => {
    try {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      // Enhanced mock tracking info
      const mockTrackingInfo: TrackingInfo = {
        tracking_number: order.tracking_number || `TRK${Math.random().toString().substr(2, 8).toUpperCase()}`,
        carrier: "DHL Express",
        carrier_service: "DHL Express Worldwide",
        estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: "Nairobi Distribution Center",
        current_status: order.status || "processing",
        progress_percentage: getProgressPercentage(order.status || "processing"),
        delivery_instructions: "Leave at front door if no answer",
        special_handling: ["Fragile", "Signature Required"],
        insurance_value: 5000,
        weight: 2.5,
        dimensions: { length: 30, width: 20, height: 15 },
        updates: generateTrackingUpdates(order),
      }

      setTrackingInfo(mockTrackingInfo)
    } catch (error) {
      console.error("Failed to load tracking info:", error)
    }
  }

  const generateTrackingUpdates = (order: Order): TrackingUpdate[] => {
    const updates: TrackingUpdate[] = [
      {
        id: "1",
        order_id: order.id,
        status: "order_placed",
        location: "Nairobi, Kenya",
        description: "Order has been received and is being processed",
        timestamp: order.created_at,
        updated_by: "System",
        carrier_status: "Order Received",
      },
    ]

    const statuses = ["processing", "picked_up", "in_transit", "out_for_delivery", "delivered"]
    const currentStatusIndex = statuses.indexOf(order.status || "processing")

    for (let i = 1; i <= currentStatusIndex + 1; i++) {
      const status = statuses[i - 1]
      const timestamp = new Date(Date.now() - (statuses.length - i) * 24 * 60 * 60 * 1000).toISOString()

      updates.push({
        id: (i + 1).toString(),
        order_id: order.id,
        status,
        location: getLocationForStatus(status),
        description: getDescriptionForStatus(status),
        timestamp,
        updated_by: i === 1 ? "Admin" : "Carrier",
        carrier_status: getCarrierStatusForStatus(status),
        latitude: -1.2921 + (Math.random() - 0.5) * 0.1,
        longitude: 36.8219 + (Math.random() - 0.5) * 0.1,
      })
    }

    return updates.reverse()
  }

  const getProgressPercentage = (status: string): number => {
    const progressMap: Record<string, number> = {
      pending: 10,
      processing: 25,
      picked_up: 40,
      in_transit: 60,
      out_for_delivery: 85,
      delivered: 100,
    }
    return progressMap[status] || 0
  }

  const getLocationForStatus = (status: string): string => {
    const locationMap: Record<string, string> = {
      processing: "Nairobi Warehouse",
      picked_up: "Nairobi Sorting Facility",
      in_transit: "En Route to Destination",
      out_for_delivery: "Local Delivery Hub",
      delivered: "Delivered to Customer",
    }
    return locationMap[status] || "Unknown Location"
  }

  const getDescriptionForStatus = (status: string): string => {
    const descriptionMap: Record<string, string> = {
      processing: "Package is being prepared for shipment",
      picked_up: "Package has been collected by carrier",
      in_transit: "Package is on its way to destination",
      out_for_delivery: "Package is out for delivery",
      delivered: "Package has been delivered successfully",
    }
    return descriptionMap[status] || "Status update"
  }

  const getCarrierStatusForStatus = (status: string): string => {
    const carrierStatusMap: Record<string, string> = {
      processing: "Processing at Origin",
      picked_up: "Picked Up",
      in_transit: "In Transit",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
    }
    return carrierStatusMap[status] || "Unknown"
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(true)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)),
      )

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
        await loadTrackingInfo(orderId)
      }

      await websocketService.emit("order_status_updated", {
        order_id: orderId,
        status: newStatus,
        timestamp: new Date().toISOString(),
        updated_by: "Admin",
      })

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error("Failed to update order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const addTrackingUpdate = async () => {
    if (!selectedOrder || !newLocation || !newDescription) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setUpdating(true)

      const newUpdate: TrackingUpdate = {
        id: Math.random().toString(),
        order_id: selectedOrder.id,
        status: newStatus || selectedOrder.status || "processing",
        location: newLocation,
        description: newDescription,
        timestamp: new Date().toISOString(),
        updated_by: "Admin",
        carrier_status: newDescription,
        estimated_delivery: estimatedDelivery || undefined,
      }

      if (trackingInfo) {
        setTrackingInfo({
          ...trackingInfo,
          current_location: newLocation,
          current_status: newStatus || trackingInfo.current_status,
          estimated_delivery: estimatedDelivery || trackingInfo.estimated_delivery,
          delivery_instructions: deliveryInstructions || trackingInfo.delivery_instructions,
          updates: [newUpdate, ...trackingInfo.updates],
        })
      }

      if (newTrackingNumber && selectedOrder) {
        setSelectedOrder({
          ...selectedOrder,
          tracking_number: newTrackingNumber,
        })

        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === selectedOrder.id ? { ...order, tracking_number: newTrackingNumber } : order,
          ),
        )
      }

      await websocketService.emit("tracking_updated", {
        order_id: selectedOrder.id,
        tracking_number: newTrackingNumber || selectedOrder.tracking_number,
        location: newLocation,
        description: newDescription,
        status: newStatus,
        timestamp: new Date().toISOString(),
      })

      // Clear form
      setNewLocation("")
      setNewDescription("")
      setNewTrackingNumber("")
      setNewCarrier("")
      setNewCarrierService("")
      setNewStatus("")
      setEstimatedDelivery("")
      setDeliveryInstructions("")

      toast({
        title: "Tracking Updated",
        description: "Tracking information has been updated successfully",
      })
    } catch (error) {
      console.error("Failed to add tracking update:", error)
      toast({
        title: "Error",
        description: "Failed to update tracking information",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const bulkUpdateStatus = async (status: string) => {
    if (selectedOrders.length === 0) {
      toast({
        title: "Error",
        description: "Please select orders to update",
        variant: "destructive",
      })
      return
    }

    try {
      setBulkUpdating(true)

      // Simulate bulk update
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setOrders((prevOrders) =>
        prevOrders.map((order) => (selectedOrders.includes(order.id) ? { ...order, status } : order)),
      )

      setSelectedOrders([])

      toast({
        title: "Bulk Update Complete",
        description: `Updated ${selectedOrders.length} orders to ${status}`,
      })
    } catch (error) {
      console.error("Failed to bulk update:", error)
      toast({
        title: "Error",
        description: "Failed to update orders",
        variant: "destructive",
      })
    } finally {
      setBulkUpdating(false)
    }
  }

  const exportTrackingData = () => {
    const csvData = filteredOrders.map((order) => ({
      order_number: order.order_number,
      tracking_number: order.tracking_number || "N/A",
      status: order.status,
      created_at: order.created_at,
      customer: `${order.shipping_address?.first_name || ""} ${order.shipping_address?.last_name || ""}`.trim(),
      total: order.total_amount,
    }))

    const csv = [Object.keys(csvData[0]).join(","), ...csvData.map((row) => Object.values(row).join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tracking-data-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "order_placed":
      case "pending":
        return <Package className="h-4 w-4" />
      case "processing":
        return <RefreshCw className="h-4 w-4" />
      case "picked_up":
        return <Package2 className="h-4 w-4" />
      case "in_transit":
        return <Truck className="h-4 w-4" />
      case "out_for_delivery":
        return <Navigation className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "exception":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    const statusConfig = TRACKING_STATUSES.find((s) => s.value === status.toLowerCase())
    return statusConfig?.color || "bg-gray-100 text-gray-800"
  }

  const copyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber)
    toast({
      title: "Copied",
      description: "Tracking number copied to clipboard",
    })
  }

  const sendTrackingNotification = async (orderId: string) => {
    try {
      // Simulate sending notification
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Notification Sent",
        description: "Tracking update notification sent to customer",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      })
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Tracking Management</h1>
            <p className="text-muted-foreground">Monitor and update order tracking information in real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? "text-green-600" : ""}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportTrackingData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {trackingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Shipments</p>
                  <p className="text-2xl font-bold">{trackingStats.total_shipments.toLocaleString()}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                  <p className="text-2xl font-bold">{trackingStats.in_transit}</p>
                </div>
                <Truck className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold">{trackingStats.delivered.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delayed</p>
                  <p className="text-2xl font-bold">{trackingStats.delayed}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exceptions</p>
                  <p className="text-2xl font-bold">{trackingStats.exceptions}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">On-Time Rate</p>
                  <p className="text-2xl font-bold">{trackingStats.on_time_delivery_rate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Delivery</p>
                  <p className="text-2xl font-bold">{trackingStats.average_delivery_time}d</p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by order number, tracking number, customer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {TRACKING_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {CARRIERS.map((carrier) => (
                    <SelectItem key={carrier.value} value={carrier.value}>
                      {carrier.logo} {carrier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("")
                      setStatusFilter("all")
                      setCarrierFilter("all")
                      setDateFilter("all")
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedOrders.length} order(s) selected</span>
              <div className="flex gap-2">
                <Select onValueChange={bulkUpdateStatus} disabled={bulkUpdating}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Bulk update status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACKING_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Orders ({filteredOrders.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedOrders.length === paginatedOrders.length) {
                        setSelectedOrders([])
                      } else {
                        setSelectedOrders(paginatedOrders.map((o) => o.id))
                      }
                    }}
                  >
                    {selectedOrders.length === paginatedOrders.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                              onChange={() => {
                                if (selectedOrders.length === paginatedOrders.length) {
                                  setSelectedOrders([])
                                } else {
                                  setSelectedOrders(paginatedOrders.map((o) => o.id))
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No orders found
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedOrders.map((order) => (
                            <TableRow
                              key={order.id}
                              className={`cursor-pointer hover:bg-gray-50 ${
                                selectedOrder?.id === order.id ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                setSelectedOrder(order)
                                loadTrackingInfo(order.id)
                              }}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.includes(order.id)}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    if (selectedOrders.includes(order.id)) {
                                      setSelectedOrders(selectedOrders.filter((id) => id !== order.id))
                                    } else {
                                      setSelectedOrders([...selectedOrders, order.id])
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">#{order.order_number}</div>
                                  <div className="text-xs text-muted-foreground">ID: {order.id}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {order.shipping_address?.first_name} {order.shipping_address?.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {order.shipping_address?.email || "No email"}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {order.tracking_number ? (
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-blue-600" />
                                    <span className="font-mono text-sm">{order.tracking_number}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        copyTrackingNumber(order.tracking_number!)
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No tracking</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(order.status || "pending")} variant="outline">
                                  {getStatusIcon(order.status || "pending")}
                                  <span className="ml-1 capitalize">{order.status?.replace("_", " ")}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{formatDate(order.created_at)}</div>
                              </TableCell>
                              <TableCell className="font-medium">{formatCurrency(order.total_amount || 0)}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => sendTrackingNotification(order.id)}>
                                      <Bell className="mr-2 h-4 w-4" />
                                      Send Notification
                                    </DropdownMenuItem>
                                    {order.tracking_number && (
                                      <DropdownMenuItem
                                        onClick={() => window.open(`/track-order/${order.id}`, "_blank")}
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Track Externally
                                      </DropdownMenuItem>
                                    )}
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
                  <div className="p-4 border-t">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

        {/* Tracking Details */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <Tabs defaultValue="tracking" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="tracking">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>#{selectedOrder.order_number}</span>
                      <Select
                        value={selectedOrder.status || "pending"}
                        onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                        disabled={updating}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRACKING_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trackingInfo && (
                      <div className="space-y-6">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{trackingInfo.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${trackingInfo.progress_percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Tracking Summary */}
                        <div className="grid grid-cols-1 gap-3">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center mb-1">
                              <Truck className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="font-medium text-sm">Tracking</span>
                            </div>
                            <p className="text-sm font-mono">{trackingInfo.tracking_number}</p>
                            <p className="text-xs text-muted-foreground">{trackingInfo.carrier}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center mb-1">
                              <MapPin className="h-4 w-4 mr-2 text-green-600" />
                              <span className="font-medium text-sm">Location</span>
                            </div>
                            <p className="text-sm">{trackingInfo.current_location}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center mb-1">
                              <Clock className="h-4 w-4 mr-2 text-orange-600" />
                              <span className="font-medium text-sm">Est. Delivery</span>
                            </div>
                            <p className="text-sm">{formatDate(trackingInfo.estimated_delivery)}</p>
                          </div>
                        </div>

                        <Separator />

                        {/* Timeline */}
                        <div>
                          <h4 className="font-medium mb-3 text-sm">Timeline</h4>
                          <div className="space-y-3">
                            {trackingInfo.updates.slice(0, 5).map((update, index) => (
                              <div key={update.id} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`p-1.5 rounded-full ${
                                      index === 0 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {getStatusIcon(update.status)}
                                  </div>
                                  {index < trackingInfo.updates.length - 1 && (
                                    <div className="w-px h-6 bg-gray-200 mt-1" />
                                  )}
                                </div>
                                <div className="flex-1 pb-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <h5 className="font-medium text-sm capitalize">
                                      {update.status.replace("_", " ")}
                                    </h5>
                                    <span className="text-xs text-gray-500">
                                      {new Date(update.timestamp).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-1">{update.description}</p>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {update.location}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Package Info */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Package Information</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Weight:</span>
                              <span className="ml-1">{trackingInfo.weight}kg</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Insurance:</span>
                              <span className="ml-1">{formatCurrency(trackingInfo.insurance_value || 0)}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Dimensions:</span>
                              <span className="ml-1">
                                {trackingInfo.dimensions?.length}×{trackingInfo.dimensions?.width}×
                                {trackingInfo.dimensions?.height}cm
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="updates">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Update</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label htmlFor="tracking-number" className="text-sm">
                          Tracking Number
                        </Label>
                        <Input
                          id="tracking-number"
                          placeholder="Enter tracking number"
                          value={newTrackingNumber}
                          onChange={(e) => setNewTrackingNumber(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="carrier" className="text-sm">
                          Carrier
                        </Label>
                        <Select value={newCarrier} onValueChange={setNewCarrier}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select carrier" />
                          </SelectTrigger>
                          <SelectContent>
                            {CARRIERS.map((carrier) => (
                              <SelectItem key={carrier.value} value={carrier.value}>
                                {carrier.logo} {carrier.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status" className="text-sm">
                          Status
                        </Label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRACKING_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="location" className="text-sm">
                          Location
                        </Label>
                        <Input
                          id="location"
                          placeholder="Current location"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-sm">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Update description"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="estimated-delivery" className="text-sm">
                          Estimated Delivery
                        </Label>
                        <Input
                          id="estimated-delivery"
                          type="datetime-local"
                          value={estimatedDelivery}
                          onChange={(e) => setEstimatedDelivery(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="delivery-instructions" className="text-sm">
                          Delivery Instructions
                        </Label>
                        <Textarea
                          id="delivery-instructions"
                          placeholder="Special delivery instructions"
                          value={deliveryInstructions}
                          onChange={(e) => setDeliveryInstructions(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button onClick={addTrackingUpdate} disabled={updating} className="w-full">
                      {updating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Update
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2 text-sm">Customer</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-2 text-gray-500" />
                            {selectedOrder.shipping_address?.first_name} {selectedOrder.shipping_address?.last_name}
                          </div>
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-2 text-gray-500" />
                            {selectedOrder.shipping_address?.email || "N/A"}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-2 text-gray-500" />
                            {selectedOrder.shipping_address?.phone || "N/A"}
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2 text-sm">Delivery Address</h4>
                        <div className="text-sm text-gray-600">
                          {selectedOrder.shipping_address ? (
                            <>
                              <p>{selectedOrder.shipping_address.address_line1}</p>
                              {selectedOrder.shipping_address.address_line2 && (
                                <p>{selectedOrder.shipping_address.address_line2}</p>
                              )}
                              <p>
                                {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}
                              </p>
                              <p>{selectedOrder.shipping_address.postal_code}</p>
                              <p>{selectedOrder.shipping_address.country}</p>
                            </>
                          ) : (
                            <p>No address available</p>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2 text-sm">Order Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Items:</span>
                            <span>{selectedOrder.items?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">{formatCurrency(selectedOrder.total_amount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payment:</span>
                            <span>{selectedOrder.payment_method || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Order</h3>
                  <p className="text-gray-600 text-sm">Choose an order from the list to view tracking details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
