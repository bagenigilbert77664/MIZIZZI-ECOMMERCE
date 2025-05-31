"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Search,
  CalendarIcon,
  Filter,
  Download,
  RefreshCw,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  RotateCcw,
  ShoppingCart,
  Truck,
  Box,
} from "lucide-react"
import Image from "next/image"

// Types
interface InventoryMovement {
  id: number
  inventory_id: number
  product_id: number
  product_name: string
  product_sku?: string
  product_image?: string
  variant_id?: number
  variant_info?: {
    color?: string
    size?: string
    sku?: string
  }
  movement_type: "adjustment" | "sale" | "purchase" | "return" | "transfer" | "reservation" | "release"
  quantity_change: number
  previous_quantity: number
  new_quantity: number
  reason?: string
  reference_id?: string // Order ID, PO ID, etc.
  reference_type?: "order" | "purchase_order" | "transfer" | "manual"
  user_id?: number
  user_name?: string
  user_avatar?: string
  location?: string
  cost_per_unit?: number
  total_cost?: number
  notes?: string
  created_at: string
  updated_at: string
}

interface InventoryMovementsResponse {
  movements: InventoryMovement[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
  summary: {
    total_movements: number
    total_quantity_in: number
    total_quantity_out: number
    net_change: number
    total_value_change: number
  }
}

export default function InventoryHistoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total_pages: 0,
    total_items: 0,
  })
  const [summary, setSummary] = useState({
    total_movements: 0,
    total_quantity_in: 0,
    total_quantity_out: 0,
    net_change: 0,
    total_value_change: 0,
  })

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    movement_type: "all",
    reference_type: "all",
    product_id: "",
    user_id: "",
    location: "",
    date_from: "",
    date_to: "",
    sort_by: "created_at",
    sort_dir: "desc",
  })

  const { toast } = useToast()

  // Mock data for development
  const mockMovements: InventoryMovement[] = [
    {
      id: 1,
      inventory_id: 1,
      product_id: 1,
      product_name: "Premium Cotton T-Shirt",
      product_sku: "TS001",
      product_image: "/placeholder.svg?height=40&width=40",
      movement_type: "sale",
      quantity_change: -2,
      previous_quantity: 50,
      new_quantity: 48,
      reason: "Order #ORD001",
      reference_id: "ORD001",
      reference_type: "order",
      user_id: 1,
      user_name: "John Doe",
      user_avatar: "/placeholder.svg?height=32&width=32",
      location: "Main Warehouse",
      cost_per_unit: 25.0,
      total_cost: -50.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      inventory_id: 2,
      product_id: 2,
      product_name: "Designer Jeans",
      product_sku: "DJ002",
      product_image: "/placeholder.svg?height=40&width=40",
      movement_type: "adjustment",
      quantity_change: 10,
      previous_quantity: 25,
      new_quantity: 35,
      reason: "Stock correction",
      reference_type: "manual",
      user_id: 1,
      user_name: "Admin User",
      location: "Main Warehouse",
      cost_per_unit: 45.0,
      total_cost: 450.0,
      notes: "Found additional stock during audit",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 3,
      inventory_id: 3,
      product_id: 3,
      product_name: "Leather Handbag",
      product_sku: "LH003",
      product_image: "/placeholder.svg?height=40&width=40",
      movement_type: "purchase",
      quantity_change: 20,
      previous_quantity: 5,
      new_quantity: 25,
      reason: "Purchase Order #PO001",
      reference_id: "PO001",
      reference_type: "purchase_order",
      user_id: 2,
      user_name: "Jane Smith",
      location: "Main Warehouse",
      cost_per_unit: 75.0,
      total_cost: 1500.0,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 4,
      inventory_id: 1,
      product_id: 1,
      product_name: "Premium Cotton T-Shirt",
      product_sku: "TS001",
      product_image: "/placeholder.svg?height=40&width=40",
      variant_info: { color: "Blue", size: "M" },
      movement_type: "return",
      quantity_change: 1,
      previous_quantity: 48,
      new_quantity: 49,
      reason: "Customer return - Order #ORD001",
      reference_id: "ORD001",
      reference_type: "order",
      user_id: 1,
      user_name: "Customer Service",
      location: "Main Warehouse",
      cost_per_unit: 25.0,
      total_cost: 25.0,
      notes: "Item in good condition",
      created_at: new Date(Date.now() - 10800000).toISOString(),
      updated_at: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 5,
      inventory_id: 4,
      product_id: 4,
      product_name: "Running Shoes",
      product_sku: "RS004",
      product_image: "/placeholder.svg?height=40&width=40",
      movement_type: "transfer",
      quantity_change: -5,
      previous_quantity: 30,
      new_quantity: 25,
      reason: "Transfer to Store B",
      reference_id: "TRF001",
      reference_type: "transfer",
      user_id: 3,
      user_name: "Warehouse Manager",
      location: "Main Warehouse → Store B",
      cost_per_unit: 60.0,
      total_cost: -300.0,
      created_at: new Date(Date.now() - 14400000).toISOString(),
      updated_at: new Date(Date.now() - 14400000).toISOString(),
    },
  ]

  const fetchMovements = async () => {
    try {
      setLoading(true)
      setError(null)

      // In a real implementation, you would call your API here
      // const response = await inventoryService.getInventoryMovements(page, 20, filters)

      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

      setMovements(mockMovements)
      setPagination({
        page: 1,
        per_page: 20,
        total_pages: 1,
        total_items: mockMovements.length,
      })
      setSummary({
        total_movements: mockMovements.length,
        total_quantity_in: mockMovements
          .filter((m) => m.quantity_change > 0)
          .reduce((sum, m) => sum + m.quantity_change, 0),
        total_quantity_out: Math.abs(
          mockMovements.filter((m) => m.quantity_change < 0).reduce((sum, m) => sum + m.quantity_change, 0),
        ),
        net_change: mockMovements.reduce((sum, m) => sum + m.quantity_change, 0),
        total_value_change: mockMovements.reduce((sum, m) => sum + (m.total_cost || 0), 0),
      })
    } catch (err: any) {
      setError(err.message || "Failed to fetch inventory movements")
      toast({
        title: "Error",
        description: "Failed to fetch inventory movements",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [page, filters])

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case "sale":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "purchase":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "adjustment":
        return <ArrowUpDown className="h-4 w-4 text-blue-500" />
      case "return":
        return <RotateCcw className="h-4 w-4 text-orange-500" />
      case "transfer":
        return <Truck className="h-4 w-4 text-purple-500" />
      case "reservation":
        return <ShoppingCart className="h-4 w-4 text-yellow-500" />
      case "release":
        return <Box className="h-4 w-4 text-gray-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getMovementTypeBadge = (type: string) => {
    const variants = {
      sale: "destructive",
      purchase: "default",
      adjustment: "secondary",
      return: "outline",
      transfer: "secondary",
      reservation: "outline",
      release: "outline",
    } as const

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"} className="flex items-center gap-1">
        {getMovementTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const exportMovements = () => {
    toast({
      title: "Export Started",
      description: "Your inventory movement report is being generated...",
    })
  }

  if (loading && movements.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory History</h1>
            <p className="text-muted-foreground">Track all inventory movements and changes</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory History</h1>
          <p className="text-muted-foreground">Track all inventory movements and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportMovements}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={fetchMovements} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Movements</p>
                <p className="text-2xl font-bold">{summary.total_movements}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity In</p>
                <p className="text-2xl font-bold text-green-600">+{summary.total_quantity_in}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity Out</p>
                <p className="text-2xl font-bold text-red-600">-{summary.total_quantity_out}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Change</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    summary.net_change > 0
                      ? "text-green-600"
                      : summary.net_change < 0
                        ? "text-red-600"
                        : "text-gray-600",
                  )}
                >
                  {summary.net_change > 0 ? "+" : ""}
                  {summary.net_change}
                </p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Value Change</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    summary.total_value_change > 0
                      ? "text-green-600"
                      : summary.total_value_change < 0
                        ? "text-red-600"
                        : "text-gray-600",
                  )}
                >
                  KSh {summary.total_value_change.toLocaleString()}
                </p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products, SKU, or reason..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.movement_type}
              onValueChange={(value) => setFilters({ ...filters, movement_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Movement Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="reservation">Reservation</SelectItem>
                <SelectItem value="release">Release</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.reference_type}
              onValueChange={(value) => setFilters({ ...filters, reference_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Reference Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All References</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date_from && filters.date_to
                    ? `${format(new Date(filters.date_from), "PP")} - ${format(new Date(filters.date_to), "PP")}`
                    : "Select date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                  <div className="p-3">
                    <p className="text-sm font-medium mb-2">From</p>
                    <Calendar
                      mode="single"
                      selected={filters.date_from ? new Date(filters.date_from) : undefined}
                      onSelect={(date) => setFilters({ ...filters, date_from: date ? format(date, "yyyy-MM-dd") : "" })}
                      initialFocus
                    />
                  </div>
                  <Separator orientation="vertical" />
                  <div className="p-3">
                    <p className="text-sm font-medium mb-2">To</p>
                    <Calendar
                      mode="single"
                      selected={filters.date_to ? new Date(filters.date_to) : undefined}
                      onSelect={(date) => setFilters({ ...filters, date_to: date ? format(date, "yyyy-MM-dd") : "" })}
                      initialFocus
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Movements</CardTitle>
          <CardDescription>{pagination.total_items} total movements</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Movements</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchMovements}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Movements Found</h3>
                <p className="text-muted-foreground">No inventory movements match your current filters.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Product Image */}
                  <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    {movement.product_image ? (
                      <Image
                        src={movement.product_image || "/placeholder.svg"}
                        alt={movement.product_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{movement.product_name}</h3>
                      {movement.variant_info && (
                        <Badge variant="outline" className="text-xs">
                          {movement.variant_info.color} {movement.variant_info.size}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>SKU: {movement.product_sku}</span>
                      {movement.location && (
                        <>
                          <span>•</span>
                          <span>{movement.location}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Movement Type */}
                  <div className="flex-shrink-0">{getMovementTypeBadge(movement.movement_type)}</div>

                  {/* Quantity Change */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={cn(
                        "text-lg font-semibold",
                        movement.quantity_change > 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {movement.quantity_change > 0 ? "+" : ""}
                      {movement.quantity_change}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {movement.previous_quantity} → {movement.new_quantity}
                    </div>
                  </div>

                  {/* Value Change */}
                  {movement.total_cost && (
                    <div className="text-right flex-shrink-0">
                      <div
                        className={cn(
                          "text-lg font-semibold",
                          movement.total_cost > 0 ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {movement.total_cost > 0 ? "+" : ""}KSh {Math.abs(movement.total_cost).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @ KSh {movement.cost_per_unit?.toLocaleString()}/unit
                      </div>
                    </div>
                  )}

                  {/* User & Time */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={movement.user_avatar || "/placeholder.svg"} alt={movement.user_name} />
                      <AvatarFallback>
                        {movement.user_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <div className="font-medium">{movement.user_name}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(movement.created_at), "MMM d, HH:mm")}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{movement.reason}</div>
                    {movement.reference_id && (
                      <div className="text-sm text-muted-foreground">Ref: {movement.reference_id}</div>
                    )}
                    {movement.notes && <div className="text-sm text-muted-foreground truncate">{movement.notes}</div>}
                  </div>

                  {/* Actions */}
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.per_page + 1} to{" "}
                {Math.min(pagination.page * pagination.per_page, pagination.total_items)} of {pagination.total_items}{" "}
                movements
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
                  disabled={page === pagination.total_pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
