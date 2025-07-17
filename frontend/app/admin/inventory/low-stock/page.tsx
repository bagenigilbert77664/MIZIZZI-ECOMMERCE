"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

// Icons
import { AlertTriangle, Package, RefreshCw, Plus, Eye, Edit } from "lucide-react"

// Services
import { inventoryService, type InventoryItem } from "@/services/inventory-service"

export default function LowStockPage() {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total_pages: 1,
    total_items: 0,
  })
  const [refreshing, setRefreshing] = useState(false)

  // Fetch low stock items
  const fetchLowStockItems = async (page = 1) => {
    try {
      setLoading(page === 1)
      setError(null)

      const response = await inventoryService.getLowStockItems(page, pagination.per_page)

      setLowStockItems(response.items)
      setPagination(response.pagination)
    } catch (err: any) {
      setError(err.message || "Failed to fetch low stock items")
      toast({
        title: "Error",
        description: "Failed to fetch low stock items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchLowStockItems(pagination.page)
  }

  // Quick stock adjustment
  const handleQuickAdjustment = async (item: InventoryItem, adjustment: number) => {
    try {
      await inventoryService.adjustInventory(
        item.product_id,
        adjustment,
        item.variant_id || undefined,
        `Quick adjustment for low stock item`,
      )

      toast({
        title: "Success",
        description: `Stock adjusted by ${adjustment}`,
      })

      fetchLowStockItems(pagination.page)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to adjust stock",
        variant: "destructive",
      })
    }
  }

  // Initial load
  useEffect(() => {
    fetchLowStockItems()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
            Low Stock Items
          </h1>
          <p className="text-muted-foreground">Items that need immediate restocking attention</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Alert */}
      <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong>{pagination.total_items} items</strong> are running low on stock and need immediate attention.
        </AlertDescription>
      </Alert>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-8 w-full" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : lowStockItems.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-600">Great! No Low Stock Items</h3>
            <p className="text-muted-foreground">All your inventory items have sufficient stock levels.</p>
          </CardContent>
        </Card>
      ) : (
        /* Low Stock Items Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lowStockItems.map((item) => (
            <Card key={item.id} className="border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Product ID: {item.product_id}</CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  >
                    Low Stock
                  </Badge>
                </div>
                {item.variant_id && <CardDescription>Variant ID: {item.variant_id}</CardDescription>}
                {item.product_name && <CardDescription className="font-medium">{item.product_name}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stock Information */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">{item.stock_level}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Threshold</p>
                    <p className="text-lg font-medium">{item.low_stock_threshold}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reserved</p>
                    <p className="font-medium">{item.reserved_quantity || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-medium text-yellow-600">{item.available_quantity}</p>
                  </div>
                </div>

                {/* SKU and Location */}
                {(item.sku || item.location) && (
                  <div className="text-sm space-y-1">
                    {item.sku && (
                      <p>
                        <span className="text-muted-foreground">SKU:</span> {item.sku}
                      </p>
                    )}
                    {item.location && (
                      <p>
                        <span className="text-muted-foreground">Location:</span> {item.location}
                      </p>
                    )}
                  </div>
                )}

                {/* Stock Level Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stock Level</span>
                    <span>
                      {item.stock_level} / {item.low_stock_threshold + 10}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (item.stock_level / (item.low_stock_threshold + 10)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAdjustment(item, 10)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      +10
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAdjustment(item, 25)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      +25
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Last Updated */}
                {item.last_updated && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(item.last_updated).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => fetchLowStockItems(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            onClick={() => fetchLowStockItems(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
