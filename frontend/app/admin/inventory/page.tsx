"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Icons
import {
  Package,
  Search,
  Plus,
  Edit,
  AlertTriangle,
  RefreshCw,
  Upload,
  CheckCircle,
  XCircle,
  Boxes,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Minus,
  SortAsc,
  SortDesc,
  ShoppingCart,
  Clock,
  DollarSign,
} from "lucide-react"

// Services
import { inventoryService, type InventoryItem } from "@/services/inventory-service"

// Types
interface InventoryFilters {
  search: string
  status: string
  stock_level: string
  category: string
  brand: string
  sort_by: string
  sort_dir: string
}

interface StockAdjustment {
  product_id: number
  variant_id?: number
  adjustment: number
  reason: string
}

interface InventoryStats {
  total_items: number
  in_stock: number
  low_stock: number
  out_of_stock: number
  total_value: number
  reserved_quantity: number
  needs_reorder: number
}

interface EnhancedInventoryItem extends InventoryItem {
  product?: {
    id: number
    name: string
    slug: string
    price: number
    sale_price?: number
    thumbnail_url?: string
    image_urls?: string[]
    category?: { name: string }
    brand?: { name: string }
    sku?: string
  }
}

export default function InventoryPage() {
  // State
  const [inventory, setInventory] = useState<EnhancedInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total_pages: 1,
    total_items: 0,
  })
  const [filters, setFilters] = useState<InventoryFilters>({
    search: "",
    status: "all",
    stock_level: "all",
    category: "all",
    brand: "all",
    sort_by: "product_name",
    sort_dir: "asc",
  })
  const [stats, setStats] = useState<InventoryStats>({
    total_items: 0,
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_value: 0,
    reserved_quantity: 0,
    needs_reorder: 0,
  })
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [adjustmentData, setAdjustmentData] = useState<StockAdjustment>({
    product_id: 0,
    adjustment: 0,
    reason: "",
  })
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<EnhancedInventoryItem | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")

  // Fetch inventory data
  const fetchInventory = async (page = 1, newFilters = filters) => {
    try {
      setLoading(page === 1)
      setError(null)

      const filterParams = {
        ...newFilters,
        status: newFilters.status === "all" ? "" : newFilters.status,
        category: newFilters.category === "all" ? "" : newFilters.category,
        brand: newFilters.brand === "all" ? "" : newFilters.brand,
        stock_level: newFilters.stock_level === "all" ? "" : newFilters.stock_level,
        ...(activeTab === "low_stock" && { low_stock: "true" }),
        ...(activeTab === "out_of_stock" && { out_of_stock: "true" }),
        ...(activeTab === "in_stock" && { status: "active" }),
        ...(activeTab === "needs_reorder" && { needs_reorder: "true" }),
      }

      const response = await inventoryService.getAllInventory(page, pagination.per_page, filterParams)

      setInventory(response.items)
      setPagination(response.pagination)

      // Calculate stats
      calculateStats(response.items)
    } catch (err: any) {
      setError(err.message || "Failed to fetch inventory")
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Calculate inventory statistics
  const calculateStats = (items: EnhancedInventoryItem[]) => {
    const stats = items.reduce(
      (acc, item) => {
        acc.total_items += 1
        acc.reserved_quantity += item.reserved_quantity || 0

        if (item.stock_level > 0) {
          acc.in_stock += 1
        }
        if (item.is_low_stock) {
          acc.low_stock += 1
        }
        if (item.stock_level <= 0) {
          acc.out_of_stock += 1
        }
        if (item.stock_level <= (item.reorder_level || 0)) {
          acc.needs_reorder += 1
        }

        // Calculate value using product price
        const price = item.product?.sale_price || item.product?.price || 0
        acc.total_value += item.stock_level * price

        return acc
      },
      {
        total_items: 0,
        in_stock: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
        reserved_quantity: 0,
        needs_reorder: 0,
      },
    )

    setStats(stats)
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof InventoryFilters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchInventory(1, newFilters)
  }

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const resetFilters = { ...filters, status: "all", stock_level: "all" }
    setFilters(resetFilters)
    fetchInventory(1, resetFilters)
  }

  // Handle quick stock adjustment
  const handleQuickAdjustment = async (item: EnhancedInventoryItem, amount: number) => {
    try {
      await inventoryService.quickStockAdjustment(item.product_id, amount, item.variant_id || undefined)
      fetchInventory(pagination.page)
    } catch (err: any) {
      // Error already handled in service
    }
  }

  // Handle stock adjustment
  const handleStockAdjustment = async () => {
    try {
      if (!adjustmentData.product_id || adjustmentData.adjustment === 0) {
        toast({
          title: "Error",
          description: "Please provide valid product ID and adjustment amount",
          variant: "destructive",
        })
        return
      }

      await inventoryService.adjustInventory(
        adjustmentData.product_id,
        adjustmentData.adjustment,
        adjustmentData.variant_id,
        adjustmentData.reason,
      )

      setIsAdjustDialogOpen(false)
      setAdjustmentData({ product_id: 0, adjustment: 0, reason: "" })
      fetchInventory(pagination.page)

      toast({
        title: "Success",
        description: "Stock adjusted successfully",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to adjust stock",
        variant: "destructive",
      })
    }
  }

  // Handle bulk operations
  const handleBulkAdjustment = async (adjustment: number, reason: string) => {
    try {
      if (selectedItems.length === 0) {
        toast({
          title: "Error",
          description: "Please select items to adjust",
          variant: "destructive",
        })
        return
      }

      const adjustments = selectedItems.map((id) => {
        const item = inventory.find((inv) => inv.id === id)
        return {
          product_id: item?.product_id || 0,
          variant_id: item?.variant_id != null ? item.variant_id : undefined,
          adjustment,
          reason,
        }
      })

      await inventoryService.bulkStockAdjustment(adjustments)
      setSelectedItems([])
      setIsBulkDialogOpen(false)
      fetchInventory(pagination.page)
    } catch (err: any) {
      // Error already handled in service
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchInventory(pagination.page)
  }

  // Handle sync from products
  const handleSyncFromProducts = async () => {
    try {
      setLoading(true)
      const result = await inventoryService.syncInventoryFromProducts()

      toast({
        title: "Sync Complete",
        description: `Created ${result.created} and updated ${result.updated} inventory items`,
      })

      fetchInventory(1)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to sync inventory",
        variant: "destructive",
      })
    }
  }

  // Handle export
  const handleExport = () => {
    const csvContent = [
      ["Product Name", "SKU", "Stock Level", "Reserved", "Available", "Status", "Last Updated"].join(","),
      ...inventory.map((item) =>
        [
          item.product?.name || `Product ${item.product_id}`,
          item.sku || item.product?.sku || "N/A",
          item.stock_level,
          item.reserved_quantity || 0,
          item.available_quantity,
          item.stock_level <= 0 ? "Out of Stock" : item.is_low_stock ? "Low Stock" : "In Stock",
          new Date(item.last_updated).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: "Inventory data exported successfully",
    })
  }

  // Get status badge
  const getStatusBadge = (item: EnhancedInventoryItem) => {
    if (item.stock_level <= 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Out of Stock
        </Badge>
      )
    }
    if (item.is_low_stock) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        In Stock
      </Badge>
    )
  }

  // Get stock level color
  const getStockLevelColor = (item: EnhancedInventoryItem) => {
    if (item.stock_level <= 0) return "text-red-600"
    if (item.is_low_stock) return "text-yellow-600"
    return "text-green-600"
  }

  // Get stock progress percentage
  const getStockProgress = (item: EnhancedInventoryItem) => {
    const maxStock = Math.max(item.stock_level, item.reorder_level || 50, 50)
    return Math.min((item.stock_level / maxStock) * 100, 100)
  }

  // Get progress color
  const getProgressColor = (item: EnhancedInventoryItem) => {
    if (item.stock_level <= 0) return "bg-red-500"
    if (item.is_low_stock) return "bg-yellow-500"
    return "bg-green-500"
  }

  // Handle item selection
  const handleItemSelection = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(inventory.map((item) => item.id))
    } else {
      setSelectedItems([])
    }
  }

  // Initial load
  useEffect(() => {
    fetchInventory()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your product inventory, stock levels, and reservations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleSyncFromProducts}>
            <Upload className="h-4 w-4 mr-2" />
            Sync from Products
          </Button>
          <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adjust Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Stock Level</DialogTitle>
                <DialogDescription>Increase or decrease stock for a specific product</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product_id">Product ID</Label>
                  <Input
                    id="product_id"
                    type="number"
                    value={adjustmentData.product_id || ""}
                    onChange={(e) =>
                      setAdjustmentData({
                        ...adjustmentData,
                        product_id: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter product ID"
                  />
                </div>
                <div>
                  <Label htmlFor="variant_id">Variant ID (Optional)</Label>
                  <Input
                    id="variant_id"
                    type="number"
                    value={adjustmentData.variant_id || ""}
                    onChange={(e) =>
                      setAdjustmentData({
                        ...adjustmentData,
                        variant_id: Number.parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="Enter variant ID (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="adjustment">Adjustment Amount</Label>
                  <Input
                    id="adjustment"
                    type="number"
                    value={adjustmentData.adjustment || ""}
                    onChange={(e) =>
                      setAdjustmentData({
                        ...adjustmentData,
                        adjustment: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter adjustment (+/-)"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use positive numbers to increase stock, negative to decrease
                  </p>
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={adjustmentData.reason}
                    onChange={(e) =>
                      setAdjustmentData({
                        ...adjustmentData,
                        reason: e.target.value,
                      })
                    }
                    placeholder="Enter reason for adjustment"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStockAdjustment}>Adjust Stock</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_items}</div>
            <p className="text-xs text-muted-foreground">Inventory items tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.in_stock}</div>
            <p className="text-xs text-muted-foreground">Items available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.low_stock}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.out_of_stock}</div>
            <p className="text-xs text-muted-foreground">Unavailable</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Reorder</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needs_reorder}</div>
            <p className="text-xs text-muted-foreground">Below reorder level</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.reserved_quantity}</div>
            <p className="text-xs text-muted-foreground">Items reserved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">KSh {stats.total_value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & Controls</CardTitle>
            <div className="flex items-center space-x-2">
              {selectedItems.length > 0 && (
                <>
                  <Badge variant="secondary">{selectedItems.length} selected</Badge>
                  <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Bulk Actions
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Bulk Stock Adjustment</DialogTitle>
                        <DialogDescription>Adjust stock for {selectedItems.length} selected items</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <Button variant="outline" onClick={() => handleBulkAdjustment(10, "Bulk increase: +10")}>
                            +10
                          </Button>
                          <Button variant="outline" onClick={() => handleBulkAdjustment(25, "Bulk increase: +25")}>
                            +25
                          </Button>
                          <Button variant="outline" onClick={() => handleBulkAdjustment(50, "Bulk increase: +50")}>
                            +50
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button variant="outline" onClick={() => handleBulkAdjustment(-10, "Bulk decrease: -10")}>
                            -10
                          </Button>
                          <Button variant="outline" onClick={() => handleBulkAdjustment(-25, "Bulk decrease: -25")}>
                            -25
                          </Button>
                          <Button variant="outline" onClick={() => handleBulkAdjustment(-50, "Bulk decrease: -50")}>
                            -50
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              <div className="flex items-center space-x-1 border rounded-md">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="search">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, SKU..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="home">Home & Garden</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sort_by">Sort By</Label>
              <Select value={filters.sort_by} onValueChange={(value) => handleFilterChange("sort_by", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_name">Product Name</SelectItem>
                  <SelectItem value="stock_level">Stock Level</SelectItem>
                  <SelectItem value="last_updated">Last Updated</SelectItem>
                  <SelectItem value="product_id">Product ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sort_dir">Sort Direction</Label>
              <Select value={filters.sort_dir} onValueChange={(value) => handleFilterChange("sort_dir", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">
                    <div className="flex items-center">
                      <SortAsc className="h-4 w-4 mr-2" />
                      Ascending
                    </div>
                  </SelectItem>
                  <SelectItem value="desc">
                    <div className="flex items-center">
                      <SortDesc className="h-4 w-4 mr-2" />
                      Descending
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Items ({stats.total_items})</TabsTrigger>
          <TabsTrigger value="in_stock">In Stock ({stats.in_stock})</TabsTrigger>
          <TabsTrigger value="low_stock">Low Stock ({stats.low_stock})</TabsTrigger>
          <TabsTrigger value="out_of_stock">Out of Stock ({stats.out_of_stock})</TabsTrigger>
          <TabsTrigger value="needs_reorder">Needs Reorder ({stats.needs_reorder})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <Skeleton className="h-8 w-[100px]" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Inventory Content */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Inventory Items</CardTitle>
                    <CardDescription>{pagination.total_items} total items found</CardDescription>
                  </div>
                  {inventory.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox checked={selectedItems.length === inventory.length} onCheckedChange={handleSelectAll} />
                      <Label className="text-sm">Select All</Label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No inventory items found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or sync from products</p>
                  </div>
                ) : viewMode === "table" ? (
                  /* Table View */
                  <div className="space-y-4">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
                      <div className="col-span-1">Select</div>
                      <div className="col-span-3">Product</div>
                      <div className="col-span-1">Stock</div>
                      <div className="col-span-1">Reserved</div>
                      <div className="col-span-1">Available</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1">Value</div>
                      <div className="col-span-2">Actions</div>
                    </div>

                    {/* Table Rows */}
                    {inventory.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b">
                        <div className="col-span-1">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center space-x-3">
                            <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100">
                              {item.product?.thumbnail_url ? (
                                <img
                                  src={item.product.thumbnail_url || "/placeholder.svg"}
                                  alt={item.product.name || "Product"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {item.product?.name || `Product ${item.product_id}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku || item.product?.sku || "N/A"}
                              </p>
                              {item.product?.category && (
                                <p className="text-xs text-muted-foreground">{item.product.category.name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-1">
                          <div className="space-y-1">
                            <p className={cn("font-medium", getStockLevelColor(item))}>{item.stock_level}</p>
                            <Progress
                              value={getStockProgress(item)}
                              className="h-1"
                              style={{
                                background: `linear-gradient(to right, ${getProgressColor(item)} ${getStockProgress(item)}%, #e5e7eb ${getStockProgress(item)}%)`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="col-span-1">
                          <p className="text-sm text-blue-600">{item.reserved_quantity || 0}</p>
                        </div>
                        <div className="col-span-1">
                          <p className={cn("font-medium", getStockLevelColor(item))}>{item.available_quantity}</p>
                        </div>
                        <div className="col-span-2">
                          <div className="space-y-1">
                            {getStatusBadge(item)}
                            {item.stock_level <= (item.reorder_level || 0) && item.stock_level > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Reorder Soon
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <p className="text-sm font-medium">
                            KSh{" "}
                            {(
                              (item.product?.sale_price || item.product?.price || 0) * item.stock_level
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center space-x-1">
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAdjustment(item, 10)}
                                className="h-7 w-7 p-0"
                                title="Add 10"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAdjustment(item, -10)}
                                className="h-7 w-7 p-0"
                                title="Remove 10"
                                disabled={item.stock_level < 10}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAdjustmentData({
                                  product_id: item.product_id,
                                  variant_id: item.variant_id || undefined,
                                  adjustment: 0,
                                  reason: "",
                                })
                                setIsAdjustDialogOpen(true)
                              }}
                              className="h-7 w-7 p-0"
                              title="Custom adjustment"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedInventoryItem(item)
                                setIsHistoryDialogOpen(true)
                              }}
                              className="h-7 w-7 p-0"
                              title="View history"
                            >
                              <History className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Grid View */
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {inventory.map((item) => (
                      <Card key={item.id} className="relative">
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                          />
                        </div>
                        <CardHeader className="pb-2">
                          <div className="relative h-32 w-full rounded-md overflow-hidden bg-gray-100">
                            {item.product?.thumbnail_url ? (
                              <img
                                src={item.product.thumbnail_url || "/placeholder.svg"}
                                alt={item.product.name || "Product"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <h3 className="font-medium text-sm truncate">
                              {item.product?.name || `Product ${item.product_id}`}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.sku || item.product?.sku || "N/A"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Stock Level</span>
                              <span className={cn("font-medium", getStockLevelColor(item))}>{item.stock_level}</span>
                            </div>
                            <Progress
                              value={getStockProgress(item)}
                              className="h-2"
                              style={{
                                background: `linear-gradient(to right, ${getProgressColor(item)} ${getStockProgress(item)}%, #e5e7eb ${getStockProgress(item)}%)`,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Available</span>
                            <span className={cn("font-medium", getStockLevelColor(item))}>
                              {item.available_quantity}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Value</span>
                            <span className="font-medium text-sm">
                              KSh{" "}
                              {(
                                (item.product?.sale_price || item.product?.price || 0) * item.stock_level
                              ).toLocaleString()}
                            </span>
                          </div>

                          {getStatusBadge(item)}

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAdjustment(item, 10)}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAdjustment(item, -10)}
                                className="h-7 w-7 p-0"
                                disabled={item.stock_level < 10}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAdjustmentData({
                                  product_id: item.product_id,
                                  variant_id: item.variant_id || undefined,
                                  adjustment: 0,
                                  reason: "",
                                })
                                setIsAdjustDialogOpen(true)
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.per_page + 1} to{" "}
                      {Math.min(pagination.page * pagination.per_page, pagination.total_items)} of{" "}
                      {pagination.total_items} items
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchInventory(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                          const page = i + 1
                          return (
                            <Button
                              key={page}
                              variant={pagination.page === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchInventory(page)}
                            >
                              {page}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchInventory(pagination.page + 1)}
                        disabled={pagination.page >= pagination.total_pages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inventory History</DialogTitle>
            <DialogDescription>
              Stock movements for{" "}
              {selectedInventoryItem?.product?.name || `Product ${selectedInventoryItem?.product_id}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inventory history feature coming soon</p>
              <p className="text-sm">Track all stock movements and changes over time</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
