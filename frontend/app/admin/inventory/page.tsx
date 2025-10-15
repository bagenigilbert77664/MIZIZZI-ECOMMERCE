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
import { OptimizedImage } from "@/components/ui/optimized-image"
import { motion } from "framer-motion" // Import motion for animations

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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Minus,
  SortAsc,
  SortDesc,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  Grid3X3,
  List,
  Zap,
  Target,
  BarChart3,
  Settings,
} from "lucide-react"

// Services
import { inventoryService, type EnhancedInventoryItem } from "@/services/inventory-service"

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

  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<EnhancedInventoryItem | null>(null)
  const [stockInputMode, setStockInputMode] = useState<"adjustment" | "absolute">("adjustment")
  const [newStockValue, setNewStockValue] = useState<number>(0)

  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, boolean>>({})
  const [operationLoading, setOperationLoading] = useState<{
    type: "adjust" | "bulk" | "sync" | "refresh" | null
    message: string
  }>({ type: null, message: "" })

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

      const uniqueItems = response.items.filter(
        (item, index, self) =>
          index ===
          self.findIndex((i) => i.product_id === item.product_id && (i.variant_id || null) === (i.variant_id || null)),
      )

      setInventory(uniqueItems)
      setPagination({
        page: response.pagination.page,
        per_page: response.pagination.per_page,
        total_pages: response.pagination.total_pages,
        total_items: response.pagination.total_items,
      })

      if ("statistics" in response && (response as any).statistics) {
        console.log("[v0] Using real API statistics:", (response as any).statistics)
        setStats((response as any).statistics)
      } else {
        console.log("[v0] No statistics in API response, calculating from items")
        // Calculate stats from actual inventory items if API doesn't provide them
        const calculatedStats = calculateStatsFromItems(uniqueItems)
        setStats(calculatedStats)
      }
    } catch (err: any) {
      console.error("[v0] API Error:", err)
      setError("Failed to load inventory data. Please check your connection.")
      setInventory([])
      setStats({
        total_items: 0,
        in_stock: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
        reserved_quantity: 0,
        needs_reorder: 0,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateStatsFromItems = (items: EnhancedInventoryItem[]) => {
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
        if (item.stock_level <= (item.reorder_level || 5)) {
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

    return stats
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

  const handleQuickAdjustment = async (item: EnhancedInventoryItem, amount: number) => {
    const itemKey = `${item.product_id}-${item.variant_id || "default"}`

    try {
      // Set loading state for this specific item
      setItemLoadingStates((prev) => ({ ...prev, [itemKey]: true }))

      // Optimistic update - immediately update the UI
      setInventory((prev) =>
        prev.map((inv) =>
          inv.product_id === item.product_id && inv.variant_id === item.variant_id
            ? { ...inv, stock_level: Math.max(0, inv.stock_level + amount) }
            : inv,
        ),
      )

      // Make API call
      await inventoryService.quickStockAdjustment(item.product_id, amount, item.variant_id || undefined)

      // Refresh data silently in background
      const response = await inventoryService.getAllInventory(pagination.page, pagination.per_page, {
        ...filters,
        status: filters.status === "all" ? "" : filters.status,
        category: filters.category === "all" ? "" : filters.category,
      })

      const uniqueItems = response.items.filter(
        (item, index, self) =>
          index ===
          self.findIndex((i) => i.product_id === item.product_id && (i.variant_id || null) === (i.variant_id || null)),
      )

      setInventory(uniqueItems)
      if ("statistics" in response && (response as any).statistics) {
        setStats((response as any).statistics)
      } else {
        setStats(calculateStatsFromItems(uniqueItems))
      }

      toast({
        title: "Stock Adjusted",
        description: `Stock ${amount > 0 ? "increased" : "decreased"} by ${Math.abs(amount)} units`,
      })
    } catch (err: any) {
      // Revert optimistic update on error
      setInventory((prev) =>
        prev.map((inv) =>
          inv.product_id === item.product_id && inv.variant_id === item.variant_id
            ? { ...inv, stock_level: Math.max(0, inv.stock_level - amount) }
            : inv,
        ),
      )
      toast({
        title: "Error",
        description: "Failed to adjust stock. Please try again.",
        variant: "destructive",
      })
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, [itemKey]: false }))
    }
  }

  const handleStockAdjustment = async () => {
    try {
      if (!selectedItemForAdjustment) {
        toast({
          title: "Error",
          description: "Please select an item to adjust",
          variant: "destructive",
        })
        return
      }

      setOperationLoading({ type: "adjust", message: "Adjusting stock level..." })

      let finalAdjustment = adjustmentData.adjustment

      if (stockInputMode === "absolute") {
        finalAdjustment = newStockValue - selectedItemForAdjustment.stock_level
      }

      if (finalAdjustment === 0) {
        toast({
          title: "Error",
          description: "No adjustment needed - stock level unchanged",
          variant: "destructive",
        })
        return
      }

      // Optimistic update
      setInventory((prev) =>
        prev.map((inv) =>
          inv.product_id === selectedItemForAdjustment.product_id &&
          inv.variant_id === selectedItemForAdjustment.variant_id
            ? {
                ...inv,
                stock_level: Math.max(
                  0,
                  stockInputMode === "absolute" ? newStockValue : inv.stock_level + finalAdjustment,
                ),
              }
            : inv,
        ),
      )

      await inventoryService.adjustInventory(
        selectedItemForAdjustment.product_id,
        finalAdjustment,
        adjustmentData.variant_id,
        adjustmentData.reason ||
          `Stock ${stockInputMode === "absolute" ? "set to" : "adjusted by"} ${stockInputMode === "absolute" ? newStockValue : finalAdjustment}`,
      )

      setIsAdjustDialogOpen(false)
      setAdjustmentData({ product_id: 0, adjustment: 0, reason: "", variant_id: undefined })
      setSelectedItemForAdjustment(null)
      setNewStockValue(0)

      // Silent background refresh
      const response = await inventoryService.getAllInventory(pagination.page, pagination.per_page, {
        ...filters,
        status: filters.status === "all" ? "" : filters.status,
        category: filters.category === "all" ? "" : filters.category,
      })

      const uniqueItems = response.items.filter(
        (item, index, self) =>
          index ===
          self.findIndex((i) => i.product_id === item.product_id && (i.variant_id || null) === (i.variant_id || null)),
      )

      setInventory(uniqueItems)
      if ("statistics" in response && (response as any).statistics) {
        setStats((response as any).statistics)
      } else {
        setStats(calculateStatsFromItems(uniqueItems))
      }

      toast({
        title: "Success",
        description: `Stock ${stockInputMode === "absolute" ? "updated to" : "adjusted by"} ${stockInputMode === "absolute" ? newStockValue : finalAdjustment} units`,
      })
    } catch (err: any) {
      // Revert optimistic update on error
      if (selectedItemForAdjustment) {
        setInventory((prev) =>
          prev.map((inv) =>
            inv.product_id === selectedItemForAdjustment.product_id &&
            inv.variant_id === selectedItemForAdjustment.variant_id
              ? selectedItemForAdjustment
              : inv,
          ),
        )
      }
      toast({
        title: "Error",
        description: err.message || "Failed to adjust stock",
        variant: "destructive",
      })
    } finally {
      setOperationLoading({ type: null, message: "" })
    }
  }

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

      setOperationLoading({ type: "bulk", message: `Adjusting ${selectedItems.length} items...` })

      const adjustments = selectedItems
        .map((id) => {
          const item = inventory.find((inv) => inv.id === id)
          return {
            product_id: item?.product_id || 0,
            variant_id: item?.variant_id != null ? item.variant_id : undefined,
            adjustment,
            reason,
          }
        })
        .filter((adj) => adj.product_id > 0)

      // Optimistic update
      setInventory((prev) =>
        prev.map((inv) =>
          selectedItems.includes(inv.id) ? { ...inv, stock_level: Math.max(0, inv.stock_level + adjustment) } : inv,
        ),
      )

      const result = await inventoryService.bulkAdjustInventory(adjustments)

      setIsBulkDialogOpen(false)
      setSelectedItems([])

      // Silent background refresh
      const response = await inventoryService.getAllInventory(pagination.page, pagination.per_page, {
        ...filters,
        status: filters.status === "all" ? "" : filters.status,
        category: filters.category === "all" ? "" : filters.category,
      })

      const uniqueItems = response.items.filter(
        (item, index, self) =>
          index ===
          self.findIndex((i) => i.product_id === item.product_id && (i.variant_id || null) === (i.variant_id || null)),
      )

      setInventory(uniqueItems)
      if ("statistics" in response && (response as any).statistics) {
        setStats((response as any).statistics)
      } else {
        setStats(calculateStatsFromItems(uniqueItems))
      }

      toast({
        title: "Bulk Adjustment Complete",
        description: `${result.successful} items adjusted successfully${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
      })
    } catch (err: any) {
      // Revert optimistic update on error
      setInventory((prev) =>
        prev.map((inv) =>
          selectedItems.includes(inv.id) ? { ...inv, stock_level: Math.max(0, inv.stock_level - adjustment) } : inv,
        ),
      )
      toast({
        title: "Error",
        description: err.message || "Failed to process bulk adjustments",
        variant: "destructive",
      })
    } finally {
      setOperationLoading({ type: null, message: "" })
    }
  }

  const handleRefresh = async () => {
    setOperationLoading({ type: "refresh", message: "Refreshing inventory data..." })
    try {
      await fetchInventory(pagination.page)
    } finally {
      setOperationLoading({ type: null, message: "" })
    }
  }

  const handleSyncFromProducts = async () => {
    try {
      setOperationLoading({ type: "sync", message: "Syncing products with inventory..." })
      const result = await inventoryService.syncInventoryFromProducts()

      // Silent background refresh
      const response = await inventoryService.getAllInventory(pagination.page, pagination.per_page, {
        ...filters,
        status: filters.status === "all" ? "" : filters.status,
        category: filters.category === "all" ? "" : filters.category,
      })

      const uniqueItems = response.items.filter(
        (item, index, self) =>
          index ===
          self.findIndex((i) => i.product_id === item.product_id && (i.variant_id || null) === (i.variant_id || null)),
      )

      setInventory(uniqueItems)
      if ("statistics" in response && (response as any).statistics) {
        setStats((response as any).statistics)
      } else {
        setStats(calculateStatsFromItems(uniqueItems))
      }

      toast({
        title: "Sync Complete",
        description: `Created ${result.created} and updated ${result.updated} inventory items`,
      })
    } catch (err: any) {
      toast({
        title: "Sync Error",
        description: err.message || "Failed to sync inventory",
        variant: "destructive",
      })
    } finally {
      setOperationLoading({ type: null, message: "" })
    }
  }

  // Handle export
  const handleExport = async (format: "csv" | "json" = "csv") => {
    try {
      const data = await inventoryService.exportInventory(format, filters.status === "all" ? undefined : filters.status)

      if (format === "csv") {
        const url = window.URL.createObjectURL(data as Blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        const jsonStr = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonStr], { type: "application/json" })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `inventory-export-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }

      toast({
        title: "Export Complete",
        description: `Inventory data exported as ${format.toUpperCase()}`,
      })
    } catch (err: any) {
      toast({
        title: "Export Error",
        description: err.message || "Failed to export inventory",
        variant: "destructive",
      })
    }
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

  const openAdjustmentDialog = (item: EnhancedInventoryItem) => {
    setSelectedItemForAdjustment(item)
    setAdjustmentData({
      product_id: item.product_id,
      adjustment: 0,
      reason: "",
      variant_id: undefined,
    })
    setNewStockValue(item.stock_level)
    setIsAdjustDialogOpen(true)
  }

  // Initial load
  useEffect(() => {
    fetchInventory()
  }, [])

  const LoadingOverlay = ({ message }: { message: string }) => (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-medium text-center">{message}</p>
      </div>
    </div>
  )

  const MiniSpinner = () => (
    <div className="relative w-4 h-4">
      <div className="absolute inset-0 border-2 border-gray-200 dark:border-gray-600 rounded-full"></div>
      <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your product inventory with powerful tools and real-time insights
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={operationLoading.type === "refresh"}
              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950 bg-transparent"
            >
              {operationLoading.type === "refresh" ? <MiniSpinner /> : <RefreshCw className="h-4 w-4" />}
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncFromProducts}
              disabled={operationLoading.type === "sync"}
              className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950 bg-transparent"
            >
              {operationLoading.type === "sync" ? <MiniSpinner /> : <Upload className="h-4 w-4" />}
              <span>Sync from Products</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-950"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100"
                >
                  <Settings className="h-4 w-4" />
                  Adjust Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Package className="h-5 w-5 text-blue-600" />
                    Adjust Stock Level
                  </DialogTitle>
                  <DialogDescription>
                    Make precise adjustments to inventory stock levels with real-time preview
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Product Selection */}
                  {!selectedItemForAdjustment ? (
                    <div className="space-y-3">
                      <Label htmlFor="product_search" className="text-sm font-medium">
                        Search Product
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input id="product_search" placeholder="Search by product name or SKU..." className="pl-10" />
                      </div>
                      <div className="text-sm text-gray-500">
                        Or select a product from the table below and click its Edit button
                      </div>
                    </div>
                  ) : (
                    /* Selected Product Display */
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white border-2 border-white shadow-sm">
                          <OptimizedImage
                            src={
                              selectedItemForAdjustment.product?.thumbnail_url ||
                              selectedItemForAdjustment.product?.image_urls?.[0]
                            }
                            alt={selectedItemForAdjustment.product?.name || "Product"}
                            width={64}
                            height={64}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {selectedItemForAdjustment.product?.name || "Unknown Product"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            SKU: {selectedItemForAdjustment.product?.sku || "N/A"}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-3 h-3 rounded-full",
                                  selectedItemForAdjustment.stock_level <= 0
                                    ? "bg-red-500"
                                    : selectedItemForAdjustment.is_low_stock
                                      ? "bg-yellow-500"
                                      : "bg-green-500",
                                )}
                              />
                              <span className="text-sm font-medium">
                                Current Stock: {selectedItemForAdjustment.stock_level}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Available: {selectedItemForAdjustment.available_quantity}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedItemForAdjustment && (
                    <>
                      {/* Stock Input Mode Toggle */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Adjustment Method</Label>
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                          <Button
                            type="button"
                            variant={stockInputMode === "adjustment" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setStockInputMode("adjustment")}
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adjust (+/-)
                          </Button>
                          <Button
                            type="button"
                            variant={stockInputMode === "absolute" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setStockInputMode("absolute")}
                            className="flex-1"
                          >
                            <Target className="h-4 w-4 mr-1" />
                            Set Exact
                          </Button>
                        </div>
                      </div>

                      {/* Stock Input */}
                      <div className="space-y-3">
                        {stockInputMode === "adjustment" ? (
                          <div>
                            <Label htmlFor="adjustment" className="text-sm font-medium">
                              Adjustment Amount
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAdjustmentData({ ...adjustmentData, adjustment: -10 })}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  -10
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAdjustmentData({ ...adjustmentData, adjustment: -1 })}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  -1
                                </Button>
                              </div>
                              <Input
                                id="adjustment"
                                type="number"
                                value={adjustmentData.adjustment}
                                onChange={(e) =>
                                  setAdjustmentData({
                                    ...adjustmentData,
                                    adjustment: Number.parseInt(e.target.value) || 0,
                                  })
                                }
                                placeholder="0"
                                className="text-center font-mono"
                              />
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAdjustmentData({ ...adjustmentData, adjustment: 1 })}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  +1
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAdjustmentData({ ...adjustmentData, adjustment: 10 })}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  +10
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              New stock will be: {selectedItemForAdjustment.stock_level + adjustmentData.adjustment}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="new_stock" className="text-sm font-medium">
                              Set Stock To
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNewStockValue(0)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  0
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNewStockValue(selectedItemForAdjustment.reorder_level || 20)}
                                  className="text-yellow-600 hover:bg-yellow-50"
                                >
                                  Reorder
                                </Button>
                              </div>
                              <Input
                                id="new_stock"
                                type="number"
                                min="0"
                                value={newStockValue}
                                onChange={(e) => setNewStockValue(Number.parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="text-center font-mono"
                              />
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNewStockValue(50)}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  50
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setNewStockValue(100)}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  100
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Change: {newStockValue - selectedItemForAdjustment.stock_level > 0 ? "+" : ""}
                              {newStockValue - selectedItemForAdjustment.stock_level}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Variant ID (Optional) */}
                      <div>
                        <Label htmlFor="variant_id" className="text-sm font-medium">
                          Variant ID (Optional)
                        </Label>
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
                          placeholder="Leave empty for main product"
                          className="mt-1"
                        />
                      </div>

                      {/* Reason */}
                      <div>
                        <Label htmlFor="reason" className="text-sm font-medium">
                          Reason for Adjustment
                        </Label>
                        <Textarea
                          id="reason"
                          value={adjustmentData.reason}
                          onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                          placeholder="e.g., Damaged goods, Inventory count correction, Restocking..."
                          className="mt-1 resize-none"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAdjustDialogOpen(false)
                        setSelectedItemForAdjustment(null)
                        setAdjustmentData({ product_id: 0, adjustment: 0, reason: "", variant_id: undefined })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStockAdjustment}
                      disabled={!selectedItemForAdjustment || operationLoading.type === "adjust"}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {operationLoading.type === "adjust" ? <MiniSpinner /> : <Package className="h-4 w-4 mr-2" />}
                      {stockInputMode === "adjustment" ? "Adjust Stock" : "Update Stock"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Items</p>
                <motion.p
                  className="text-3xl font-bold mt-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  {stats?.total_items ?? 0}
                </motion.p>
                <p className="text-blue-200 text-xs mt-1">Items tracked</p>
              </div>
              <div className="bg-blue-400/30 p-3 rounded-lg">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">In Stock</p>
                <motion.p
                  className="text-3xl font-bold mt-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {stats?.in_stock ?? 0}
                </motion.p>
                <p className="text-green-200 text-xs mt-1">Items available</p>
              </div>
              <div className="bg-green-400/30 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-orange-100 text-sm font-medium">Low Stock</p>
                <motion.p
                  className="text-3xl font-bold mt-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  {stats?.low_stock ?? 0}
                </motion.p>
                <p className="text-orange-200 text-xs mt-1">Need restocking</p>
              </div>
              <div className="bg-orange-400/30 p-3 rounded-lg">
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 3,
                  }}
                >
                  <AlertTriangle className="h-6 w-6" />
                </motion.div>
              </div>
            </div>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-400/20"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Out of Stock</p>
                <motion.p
                  className="text-3xl font-bold mt-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  {stats?.out_of_stock ?? 0}
                </motion.p>
                <p className="text-red-200 text-xs mt-1">Unavailable</p>
              </div>
              <div className="bg-red-400/30 p-3 rounded-lg">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Reserved</p>
                <motion.p
                  className="text-3xl font-bold mt-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  {stats?.reserved_quantity ?? 0}
                </motion.p>
                <p className="text-indigo-200 text-xs mt-1">Items reserved</p>
              </div>
              <div className="bg-indigo-400/30 p-3 rounded-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Value</p>
                <motion.p
                  className="text-2xl font-bold mt-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  KSh {(stats?.total_value ?? 0).toLocaleString()}
                </motion.p>
                <p className="text-purple-200 text-xs mt-1">Inventory value</p>
              </div>
              <div className="bg-purple-400/30 p-3 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Filters and Controls */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Filters & Controls</CardTitle>
                  <CardDescription>Search, filter, and manage your inventory</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {selectedItems.length > 0 && (
                  <>
                    <Badge variant="secondary" className="px-3 py-1 text-sm">
                      {selectedItems.length} selected
                    </Badge>
                    <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                          <Zap className="h-4 w-4" />
                          Bulk Actions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Bulk Stock Adjustment
                          </DialogTitle>
                          <DialogDescription>Adjust stock for {selectedItems.length} selected items</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => handleBulkAdjustment(10, "Bulk increase: +10")}
                              className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200"
                            >
                              <TrendingUp className="h-4 w-4" />
                              +10
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleBulkAdjustment(25, "Bulk increase: +25")}
                              className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200"
                            >
                              <TrendingUp className="h-4 w-4" />
                              +25
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleBulkAdjustment(50, "Bulk increase: +50")}
                              className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200"
                            >
                              <TrendingUp className="h-4 w-4" />
                              +50
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => handleBulkAdjustment(-10, "Bulk decrease: -10")}
                              className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200"
                            >
                              <TrendingDown className="h-4 w-4" />
                              -10
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleBulkAdjustment(-25, "Bulk decrease: -25")}
                              className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200"
                            >
                              <TrendingDown className="h-4 w-4" />
                              -25
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleBulkAdjustment(-50, "Bulk decrease: -50")}
                              className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200"
                            >
                              <TrendingDown className="h-4 w-4" />
                              -50
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                <div className="flex items-center bg-white dark:bg-slate-800 border rounded-lg p-1">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="flex items-center gap-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Grid
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">
                  Search Products
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, SKU..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="pl-10 h-11 border-2 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status
                </Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category
                </Label>
                <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
                  <SelectTrigger className="h-11 border-2 focus:border-blue-500">
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
              <div className="space-y-2">
                <Label htmlFor="sort_by" className="text-sm font-medium">
                  Sort By
                </Label>
                <Select value={filters.sort_by} onValueChange={(value) => handleFilterChange("sort_by", value)}>
                  <SelectTrigger className="h-11 border-2 focus:border-blue-500">
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
              <div className="space-y-2">
                <Label htmlFor="sort_dir" className="text-sm font-medium">
                  Sort Direction
                </Label>
                <Select value={filters.sort_dir} onValueChange={(value) => handleFilterChange("sort_dir", value)}>
                  <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">
                      <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4" />
                        Ascending
                      </div>
                    </SelectItem>
                    <SelectItem value="desc">
                      <div className="flex items-center gap-2">
                        <SortDesc className="h-4 w-4" />
                        Descending
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Inventory Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-12 bg-white dark:bg-slate-800 border-2">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4" />
              All Items ({stats?.total_items ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="in_stock"
              className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <CheckCircle className="h-4 w-4" />
              In Stock ({stats?.in_stock ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="low_stock"
              className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock ({stats?.low_stock ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="out_of_stock"
              className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white"
            >
              <XCircle className="h-4 w-4" />
              Out of Stock ({stats?.out_of_stock ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="needs_reorder"
              className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <AlertCircle className="h-4 w-4" />
              Needs Reorder ({stats?.needs_reorder ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-6">
                        <Skeleton className="h-16 w-16 rounded-lg" />
                        <div className="space-y-3 flex-1">
                          <Skeleton className="h-5 w-[300px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                        <Skeleton className="h-10 w-[120px]" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Enhanced Inventory Content */
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Inventory Items</CardTitle>
                        <CardDescription>{inventory.length} items found</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedItems.length === inventory.length && inventory.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-2"
                      />
                      <Label className="text-sm font-medium">Select All</Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {viewMode === "table" ? (
                    /* Enhanced Table View */
                    <div className="overflow-x-auto">
                      <div className="min-w-full">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 p-6 bg-slate-50 dark:bg-slate-800 border-b font-medium text-sm text-slate-600 dark:text-slate-300">
                          <div className="col-span-1">Select</div>
                          <div className="col-span-3">Product</div>
                          <div className="col-span-1">Stock</div>
                          <div className="col-span-1">Reserved</div>
                          <div className="col-span-1">Available</div>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-1">Price</div>
                          <div className="col-span-2">Actions</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {inventory.map((item, index) => (
                            <div
                              key={item.id}
                              className={cn(
                                "grid grid-cols-12 gap-4 p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                                index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-25 dark:bg-slate-850",
                              )}
                            >
                              <div className="col-span-1 flex items-center">
                                <Checkbox
                                  checked={selectedItems.includes(item.id)}
                                  onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                                  className="border-2"
                                />
                              </div>
                              <div className="col-span-3 flex items-center space-x-4">
                                <div className="relative">
                                  {item.product?.thumbnail_url ? (
                                    <OptimizedImage
                                      src={item.product.thumbnail_url}
                                      alt={item.product?.name || "Product"}
                                      width={64}
                                      height={64}
                                      className="h-16 w-16 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700"
                                      fallback={
                                        item.product?.image_urls && item.product.image_urls.length > 0 ? (
                                          <OptimizedImage
                                            src={item.product.image_urls[0]}
                                            alt={item.product?.name || "Product"}
                                            width={64}
                                            height={64}
                                            className="h-16 w-16 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700"
                                            fallback={
                                              <div className="h-16 w-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                <Package className="h-6 w-6 text-slate-400" />
                                              </div>
                                            }
                                          />
                                        ) : (
                                          <div className="h-16 w-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                            <Package className="h-6 w-6 text-slate-400" />
                                          </div>
                                        )
                                      }
                                    />
                                  ) : (
                                    <div className="h-16 w-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                      <Package className="h-6 w-6 text-slate-400" />
                                    </div>
                                  )}
                                  {item.is_low_stock && (
                                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 rounded-full border-2 border-white dark:border-slate-900" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {item.product?.name || "Unknown Product"}
                                  </h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    SKU: {item.product?.sku || "N/A"}
                                  </p>
                                  {item.product?.category && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      {item.product.category.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-1 flex items-center">
                                <div className="text-center">
                                  <p className={cn("text-2xl font-bold", getStockLevelColor(item))}>
                                    {item.stock_level}
                                  </p>
                                  <Progress
                                    value={getStockProgress(item)}
                                    className="w-16 h-2 mt-1"
                                    style={{
                                      background:
                                        item.stock_level <= 0 ? "#fee2e2" : item.is_low_stock ? "#fef3c7" : "#dcfce7",
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="col-span-1 flex items-center">
                                <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
                                  {item.reserved_quantity}
                                </p>
                              </div>
                              <div className="col-span-1 flex items-center">
                                <p className={cn("text-lg font-bold", getStockLevelColor(item))}>
                                  {item.available_quantity}
                                </p>
                              </div>
                              <div className="col-span-2 flex items-center">
                                <div className="space-y-2">
                                  {getStatusBadge(item)}
                                  {item.stock_level <= (item.reorder_level || 0) && item.stock_level > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700"
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Reorder Soon
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-1 flex items-center">
                                <div>
                                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    KSh {(item.product?.sale_price || item.product?.price || 0).toLocaleString()}
                                  </p>
                                  {item.product?.sale_price &&
                                    item.product?.price &&
                                    item.product.sale_price < item.product.price && (
                                      <div className="text-sm text-slate-500 line-through">
                                        KSh {item.product.price.toLocaleString()}
                                      </div>
                                    )}
                                </div>
                              </div>
                              <div className="col-span-2 flex items-center">
                                <div className="flex items-center gap-2">
                                  {/* Quick Adjustment Buttons */}
                                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleQuickAdjustment(item, 10)}
                                      className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                                      title="Add 10"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleQuickAdjustment(item, -10)}
                                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                      title="Remove 10"
                                      disabled={item.stock_level < 10}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  {/* Custom Adjustment */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAdjustmentDialog(item)}
                                    className="h-8 px-3 hover:bg-blue-50 hover:border-blue-200"
                                    title="Custom adjustment"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>

                                  {/* History */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInventoryItem(item)
                                      setIsHistoryDialogOpen(true)
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-purple-50 hover:border-purple-200"
                                    title="View history"
                                  >
                                    <History className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Enhanced Grid View */
                    <div className="p-6">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {inventory.map((item) => (
                          <Card
                            key={item.id}
                            className="group overflow-hidden border-2 hover:border-blue-200 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="aspect-square relative overflow-hidden">
                              {item.product?.thumbnail_url ? (
                                <OptimizedImage
                                  src={item.product.thumbnail_url}
                                  alt={item.product?.name || "Product"}
                                  width={300}
                                  height={300}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  fallback={
                                    item.product?.image_urls && item.product.image_urls.length > 0 ? (
                                      <OptimizedImage
                                        src={item.product.image_urls[0]}
                                        alt={item.product?.name || "Product"}
                                        width={300}
                                        height={300}
                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        fallback={
                                          <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                                            <Package className="h-16 w-16 text-slate-400" />
                                          </div>
                                        }
                                      />
                                    ) : (
                                      <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                                        <Package className="h-16 w-16 text-slate-400" />
                                      </div>
                                    )
                                  }
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                                  <Package className="h-16 w-16 text-slate-400" />
                                </div>
                              )}

                              {/* Overlay with selection */}
                              <div className="absolute top-3 left-3">
                                <Checkbox
                                  checked={selectedItems.includes(item.id)}
                                  onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                                  className="bg-white/90 border-2"
                                />
                              </div>

                              {/* Stock indicator */}
                              <div className="absolute top-3 right-3">
                                <div
                                  className={cn(
                                    "px-2 py-1 rounded-full text-xs font-bold text-white",
                                    item.stock_level <= 0
                                      ? "bg-red-500"
                                      : item.is_low_stock
                                        ? "bg-yellow-500"
                                        : "bg-green-500",
                                  )}
                                >
                                  {item.stock_level}
                                </div>
                              </div>
                            </div>

                            <CardContent className="p-4 space-y-4">
                              <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 line-clamp-2">
                                  {item.product?.name || "Unknown Product"}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  SKU: {item.product?.sku || "N/A"}
                                </p>
                                {item.product?.category && (
                                  <Badge variant="outline" className="mt-2">
                                    {item.product.category.name}
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-slate-600 dark:text-slate-400">Stock Level</span>
                                  <span className={cn("font-bold", getStockLevelColor(item))}>{item.stock_level}</span>
                                </div>
                                <Progress
                                  value={getStockProgress(item)}
                                  className="h-2"
                                  style={{
                                    background:
                                      item.stock_level <= 0 ? "#fee2e2" : item.is_low_stock ? "#fef3c7" : "#dcfce7",
                                  }}
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>Reserved: {item.reserved_quantity}</span>
                                  <span>Available: {item.available_quantity}</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-slate-100">
                                    KSh {(item.product?.sale_price || item.product?.price || 0).toLocaleString()}
                                  </p>
                                  {item.product?.sale_price &&
                                    item.product?.price &&
                                    item.product.sale_price < item.product.price && (
                                      <div className="text-sm text-slate-500 line-through">
                                        KSh {item.product.price.toLocaleString()}
                                      </div>
                                    )}
                                </div>
                                {getStatusBadge(item)}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuickAdjustment(item, 10)}
                                  className="flex-1 hover:bg-green-50 hover:border-green-200"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  +10
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuickAdjustment(item, -10)}
                                  className="flex-1 hover:bg-red-50 hover:border-red-200"
                                  disabled={item.stock_level < 10}
                                >
                                  <Minus className="h-3 w-3 mr-1" />
                                  -10
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAdjustmentDialog(item)}
                                  className="hover:bg-blue-50 hover:border-blue-200"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pagination */}
                  {pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 dark:bg-slate-800">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Showing {(pagination.page - 1) * pagination.per_page + 1} to{" "}
                        {Math.min(pagination.page * pagination.per_page, pagination.total_items)} of{" "}
                        {pagination.total_items} items
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchInventory(pagination.page - 1)}
                          disabled={pagination.page <= 1}
                          className="flex items-center gap-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                            const page = i + 1
                            return (
                              <Button
                                key={page}
                                variant={pagination.page === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => fetchInventory(page)}
                                className={cn("w-10 h-10", pagination.page === page && "bg-blue-500 hover:bg-blue-600")}
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
                          className="flex items-center gap-2"
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

        {operationLoading.type && <LoadingOverlay message={operationLoading.message} />}
      </div>
    </div>
  )
}