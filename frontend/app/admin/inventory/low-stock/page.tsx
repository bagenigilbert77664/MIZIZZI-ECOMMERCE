"use client"

import { useState, useEffect } from "react"
import { inventoryService, type EnhancedInventoryItem } from "@/services/inventory-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Package,
  Search,
  Download,
  RefreshCw,
  TrendingDown,
  AlertCircle,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Bell,
  ExternalLink,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { OptimizedImage } from "@/components/ui/optimized-image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function LowStockPage() {
  const [items, setItems] = useState<EnhancedInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [adjustingId, setAdjustingId] = useState<number | null>(null)
  const perPage = 20

  const fetchLowStockItems = async () => {
    try {
      setLoading(true)
      const response = await inventoryService.getLowStockItems(page, perPage)

      console.log("[v0] Low stock response:", response)
      console.log("[v0] Response type:", typeof response)
      console.log("[v0] Response keys:", Object.keys(response))
      console.log("[v0] low_stock_items exists?", "low_stock_items" in response)
      // Try to extract the data from known properties
      let itemsData: EnhancedInventoryItem[] = []

      if (response.items && Array.isArray(response.items)) {
        itemsData = response.items
        console.log("[v0] Using items array, length:", itemsData.length)
      } else if (Array.isArray(response)) {
        itemsData = response
        console.log("[v0] Response itself is array, length:", itemsData.length)
      }

      console.log("[v0] Final extracted items:", itemsData)
      console.log("[v0] Final items length:", itemsData.length)

      const paginationData = response.pagination || {}

      console.log("[v0] Pagination data:", paginationData)

      setItems(itemsData)
      setTotalPages(paginationData.total_pages || 1)
      setTotalItems(paginationData.total_items || itemsData.length)
    } catch (error) {
      console.error("[v0] Error fetching low stock items:", error)
      toast({
        title: "Error",
        description: "Failed to load low stock items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLowStockItems()
  }, [page])

  const handleQuickAdjust = async (item: EnhancedInventoryItem, adjustment: number) => {
    try {
      setAdjustingId(item.id)

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                stock_level: Math.max(0, i.stock_level + adjustment),
                available_quantity: Math.max(0, i.available_quantity + adjustment),
              }
            : i,
        ),
      )

      await inventoryService.quickStockAdjustment(
        item.product_id,
        adjustment,
        item.variant_id || undefined,
        `Quick ${adjustment > 0 ? "increase" : "decrease"} from low stock page`,
      )

      // Refresh data in background
      await fetchLowStockItems()

      toast({
        title: "Stock Updated",
        description: `Successfully ${adjustment > 0 ? "added" : "removed"} ${Math.abs(adjustment)} unit(s)`,
      })
    } catch (error) {
      console.error("[v0] Error adjusting stock:", error)
      // Revert optimistic update
      await fetchLowStockItems()
      toast({
        title: "Error",
        description: "Failed to adjust stock",
        variant: "destructive",
      })
    } finally {
      setAdjustingId(null)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await inventoryService.exportInventory("csv", "low_stock")
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `low-stock-items-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: "Export Successful",
        description: "Low stock items exported successfully",
      })
    } catch (error) {
      console.error("[v0] Error exporting:", error)
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      })
    }
  }

  const filteredItems = items.filter((item) => {
    const searchLower = searchQuery.toLowerCase()
    const productName = item.product?.name || item.product_name || ""
    const productSku = item.product?.sku || item.product_sku || item.sku || ""

    return productName.toLowerCase().includes(searchLower) || productSku.toLowerCase().includes(searchLower)
  })

  const criticalItems = filteredItems.filter((item) => item.stock_level <= 5)
  const needsReorder = filteredItems.filter((item) => item.stock_level <= (item.reorder_level || 10))

  const getStockLevelColor = (item: EnhancedInventoryItem) => {
    const percentage = (item.stock_level / (item.reorder_level || item.low_stock_threshold || 10)) * 100
    if (percentage <= 25) return "text-red-600"
    if (percentage <= 50) return "text-orange-600"
    return "text-yellow-600"
  }

  const getStockLevelBg = (item: EnhancedInventoryItem) => {
    const percentage = (item.stock_level / (item.reorder_level || item.low_stock_threshold || 10)) * 100
    if (percentage <= 25) return "bg-red-50/80 border-red-200/60 hover:bg-red-50 hover:border-red-300"
    if (percentage <= 50) return "bg-orange-50/80 border-orange-200/60 hover:bg-orange-50 hover:border-orange-300"
    return "bg-yellow-50/80 border-yellow-200/60 hover:bg-yellow-50 hover:border-yellow-300"
  }

  const getProgressGradient = (item: EnhancedInventoryItem) => {
    const percentage = (item.stock_level / (item.reorder_level || item.low_stock_threshold || 10)) * 100
    if (percentage <= 25) return "bg-gradient-to-r from-red-500 via-red-600 to-red-700"
    if (percentage <= 50) return "bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700"
    return "bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700"
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading low stock items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl blur-xl opacity-30 animate-pulse" />
              <div className="relative p-3.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-gray-900 leading-tight">Low Stock Alert</h1>
              <p className="text-base text-gray-500 mt-1.5 leading-relaxed">
                Monitor and manage items running low on inventory
              </p>
            </div>
          </div>

          {criticalItems.length > 0 && (
            <div className="relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
              <div className="relative flex items-start gap-4">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl animate-pulse">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white tracking-tight">Critical Stock Alert</h3>
                  <p className="text-red-50 mt-1.5 text-sm leading-relaxed">
                    <span className="font-semibold">{criticalItems.length}</span>{" "}
                    {criticalItems.length === 1 ? "item has" : "items have"} critically low stock (≤5 units). Immediate
                    action required to prevent stockouts.
                  </p>
                </div>
                <Button
                  onClick={() => setSearchQuery("")}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all"
                  variant="outline"
                >
                  View All
                </Button>
              </div>
            </div>
          )}

          {filteredItems.length > 0 && criticalItems.length === 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200/60 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-orange-100 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-orange-900 tracking-tight">Action Recommended</h3>
                  <p className="text-sm text-orange-700 mt-1.5 leading-relaxed">
                    {filteredItems.length} {filteredItems.length === 1 ? "item is" : "items are"} running low on stock.
                    Consider reordering soon to maintain optimal inventory levels.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 tracking-wide">Low Stock Items</p>
                  <p className="text-4xl font-semibold text-gray-900 mt-2.5 tracking-tight tabular-nums">
                    {totalItems}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">Total items below threshold</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl shadow-sm">
                  <TrendingDown className="h-7 w-7 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 tracking-wide">Critical Level</p>
                  <p className="text-4xl font-semibold text-red-600 mt-2.5 tracking-tight tabular-nums">
                    {criticalItems.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">≤5 units remaining</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-100 to-red-50 rounded-2xl shadow-sm">
                  <AlertTriangle className="h-7 w-7 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 tracking-wide">Needs Reorder</p>
                  <p className="text-4xl font-semibold text-blue-600 mt-2.5 tracking-tight tabular-nums">
                    {needsReorder.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">Below reorder point</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl shadow-sm">
                  <Package className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by product name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-gray-200 focus:border-gray-300 focus:ring-gray-300 bg-white rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchLowStockItems}
                  disabled={loading}
                  className="h-11 border-gray-200 hover:bg-gray-50 bg-white rounded-xl transition-all"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="h-11 border-gray-200 hover:bg-gray-50 bg-white rounded-xl transition-all"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredItems.length === 0 ? (
          <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
            <CardContent className="p-16">
              <div className="text-center space-y-4">
                <div className="inline-flex p-6 bg-gradient-to-br from-green-100 to-green-50 rounded-3xl shadow-sm">
                  <Package className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 tracking-tight">All Stock Levels Healthy</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                  No items are currently running low on stock. Great job maintaining inventory levels!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item, index) => {
              const productName = item.product?.name || item.product_name || "Unknown Product"
              const productSku = item.product?.sku || item.product_sku || item.sku || "N/A"
              const productImage = item.product?.thumbnail_url || item.product?.image_urls?.[0]
              const productPrice = item.product?.sale_price || item.product?.price || 0
              const categoryName = item.product?.category?.name

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "border transition-all duration-300 hover:shadow-lg animate-in fade-in slide-in-from-bottom-4",
                    getStockLevelBg(item),
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-md flex-shrink-0 ring-1 ring-gray-200/50">
                        {productImage ? (
                          <OptimizedImage
                            src={productImage}
                            alt={productName}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                            fallback={
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                <Package className="h-8 w-8 text-gray-400" />
                              </div>
                            }
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/admin/products/${item.product_id}`}
                              className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 tracking-tight inline-flex items-center gap-2 group"
                            >
                              {productName}
                              <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs font-medium bg-gray-100 border-gray-200">
                                SKU: {productSku}
                              </Badge>
                              {categoryName && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium bg-blue-50 border-blue-200 text-blue-700"
                                >
                                  {categoryName}
                                </Badge>
                              )}
                              {item.variant_info && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium bg-purple-50 border-purple-200 text-purple-700"
                                >
                                  {item.variant_info.color && `${item.variant_info.color} `}
                                  {item.variant_info.size && `/ ${item.variant_info.size}`}
                                </Badge>
                              )}
                            </div>
                            {productPrice > 0 && (
                              <p className="text-sm font-semibold text-gray-700 mt-2">
                                KSh {productPrice.toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <div
                              className={cn("text-4xl font-bold tracking-tight tabular-nums", getStockLevelColor(item))}
                            >
                              {item.stock_level}
                            </div>
                            <div className="text-xs text-gray-500 mt-1.5 font-medium">
                              Reorder at {item.reorder_level || item.low_stock_threshold || 10}
                            </div>
                            {item.reserved_quantity > 0 && (
                              <div className="text-xs text-gray-400 mt-1">{item.reserved_quantity} reserved</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
                            <span>Stock Level</span>
                            <span className="tabular-nums">
                              {Math.round(
                                (item.stock_level / (item.reorder_level || item.low_stock_threshold || 10)) * 100,
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-2.5 bg-white/60 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={cn("h-full transition-all duration-700 ease-out", getProgressGradient(item))}
                              style={{
                                width: `${Math.min(100, (item.stock_level / (item.reorder_level || item.low_stock_threshold || 10)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAdjust(item, -1)}
                            disabled={adjustingId === item.id || item.stock_level <= 0}
                            className="h-9 px-3 bg-white hover:bg-red-50 hover:border-red-300 border-gray-300 shadow-sm rounded-lg transition-all disabled:opacity-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAdjust(item, 1)}
                            disabled={adjustingId === item.id}
                            className="h-9 px-3 bg-white hover:bg-green-50 hover:border-green-300 border-gray-300 shadow-sm rounded-lg transition-all"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleQuickAdjust(item, 10)}
                            disabled={adjustingId === item.id}
                            className="h-9 px-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                          >
                            {adjustingId === item.id ? (
                              <div className="relative w-4 h-4">
                                <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                                <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Add 10
                              </>
                            )}
                          </Button>
                          <Link href={`/admin/inventory/${item.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 px-4 text-gray-600 hover:text-gray-900 hover:bg-white/70 rounded-lg transition-all"
                            >
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 font-medium tabular-nums">
                  Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalItems)} of {totalItems} items
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="h-9 border-gray-200 hover:bg-gray-50 bg-white rounded-lg transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold text-gray-700 px-4 tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="h-9 border-gray-200 hover:bg-gray-50 bg-white rounded-lg transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
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
