"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  Search,
  RefreshCw,
  Download,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Calculator,
  BarChart3,
  XCircle,
} from "lucide-react"
import Image from "next/image"

// Types
interface StockAdjustment {
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
  adjustment_type: "increase" | "decrease" | "set"
  previous_quantity: number
  adjustment_quantity: number
  new_quantity: number
  reason: string
  cost_impact?: number
  user_id: number
  user_name: string
  reference_id?: string
  notes?: string
  status: "pending" | "approved" | "rejected" | "completed"
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

interface StockAdjustmentRequest {
  product_id: number
  variant_id?: number
  adjustment_type: "increase" | "decrease" | "set"
  quantity: number
  reason: string
  notes?: string
  cost_per_unit?: number
}

export default function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewAdjustmentDialog, setShowNewAdjustmentDialog] = useState(false)
  const [showBulkAdjustmentDialog, setShowBulkAdjustmentDialog] = useState(false)
  const [newAdjustment, setNewAdjustment] = useState<StockAdjustmentRequest>({
    product_id: 0,
    adjustment_type: "increase",
    quantity: 0,
    reason: "",
    notes: "",
  })

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    adjustment_type: "all",
    date_from: "",
    date_to: "",
  })

  const { toast } = useToast()

  // Mock data for development
  const mockAdjustments: StockAdjustment[] = [
    {
      id: 1,
      inventory_id: 1,
      product_id: 1,
      product_name: "Premium Cotton T-Shirt",
      product_sku: "TS001",
      product_image: "/placeholder.svg?height=40&width=40",
      adjustment_type: "increase",
      previous_quantity: 45,
      adjustment_quantity: 10,
      new_quantity: 55,
      reason: "Stock replenishment",
      cost_impact: 250.0,
      user_id: 1,
      user_name: "Admin User",
      reference_id: "ADJ001",
      notes: "Received new shipment",
      status: "completed",
      approved_by: "Manager",
      approved_at: new Date().toISOString(),
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
      adjustment_type: "decrease",
      previous_quantity: 30,
      adjustment_quantity: 5,
      new_quantity: 25,
      reason: "Damaged items",
      cost_impact: -225.0,
      user_id: 1,
      user_name: "Warehouse Staff",
      reference_id: "ADJ002",
      notes: "Found damaged during quality check",
      status: "pending",
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
      variant_info: { color: "Black", size: "Medium" },
      adjustment_type: "set",
      previous_quantity: 12,
      adjustment_quantity: 15,
      new_quantity: 15,
      reason: "Physical count correction",
      cost_impact: 225.0,
      user_id: 2,
      user_name: "Inventory Manager",
      reference_id: "ADJ003",
      notes: "Annual inventory audit correction",
      status: "approved",
      approved_by: "Director",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ]

  const fetchAdjustments = async () => {
    try {
      setLoading(true)
      setError(null)

      // In a real implementation, you would call your API here
      // const response = await inventoryService.getStockAdjustments(filters)

      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setAdjustments(mockAdjustments)
    } catch (err: any) {
      setError(err.message || "Failed to fetch adjustments")
      toast({
        title: "Error",
        description: "Failed to fetch stock adjustments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdjustments()
  }, [filters])

  const handleCreateAdjustment = async () => {
    try {
      if (!newAdjustment.product_id || newAdjustment.quantity <= 0 || !newAdjustment.reason) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      // In a real implementation, you would call your API here
      // await inventoryService.createStockAdjustment(newAdjustment)

      toast({
        title: "Adjustment Created",
        description: "Stock adjustment has been created successfully",
      })

      setShowNewAdjustmentDialog(false)
      setNewAdjustment({
        product_id: 0,
        adjustment_type: "increase",
        quantity: 0,
        reason: "",
        notes: "",
      })
      fetchAdjustments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create adjustment",
        variant: "destructive",
      })
    }
  }

  const getAdjustmentTypeIcon = (type: string) => {
    switch (type) {
      case "increase":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "decrease":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "set":
        return <ArrowUpDown className="h-4 w-4 text-blue-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "outline",
      approved: "secondary",
      rejected: "destructive",
      completed: "default",
    } as const

    const colors = {
      pending: "text-yellow-600",
      approved: "text-blue-600",
      rejected: "text-red-600",
      completed: "text-green-600",
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const approveAdjustment = async (adjustmentId: number) => {
    try {
      // In a real implementation, you would call your API here
      // await inventoryService.approveStockAdjustment(adjustmentId)

      toast({
        title: "Adjustment Approved",
        description: "Stock adjustment has been approved",
      })
      fetchAdjustments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve adjustment",
        variant: "destructive",
      })
    }
  }

  const rejectAdjustment = async (adjustmentId: number) => {
    try {
      // In a real implementation, you would call your API here
      // await inventoryService.rejectStockAdjustment(adjustmentId)

      toast({
        title: "Adjustment Rejected",
        description: "Stock adjustment has been rejected",
      })
      fetchAdjustments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject adjustment",
        variant: "destructive",
      })
    }
  }

  const fetchMovements = () => {
    fetchAdjustments()
  }

  if (loading && adjustments.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Stock Adjustments</h1>
            <p className="text-muted-foreground">Manage inventory adjustments and corrections</p>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <h1 className="text-3xl font-bold">Stock Adjustments</h1>
          <p className="text-muted-foreground">Manage inventory adjustments and corrections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={showBulkAdjustmentDialog} onOpenChange={setShowBulkAdjustmentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Stock Adjustments</DialogTitle>
                <DialogDescription>Upload a CSV file to perform multiple stock adjustments at once</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-file">CSV File</Label>
                  <Input type="file" accept=".csv" id="bulk-file" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Download template with required columns: SKU, Adjustment Type, Quantity, Reason
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowBulkAdjustmentDialog(false)}>
                    Cancel
                  </Button>
                  <Button>Upload & Process</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewAdjustmentDialog} onOpenChange={setShowNewAdjustmentDialog}>
            <DialogTrigger asChild>
              <Button>
                <Calculator className="mr-2 h-4 w-4" />
                New Adjustment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Stock Adjustment</DialogTitle>
                <DialogDescription>Adjust inventory levels with proper documentation</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-search">Product</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input id="product-search" placeholder="Search product by name or SKU..." className="pl-10" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="adjustment-type">Adjustment Type</Label>
                  <Select
                    value={newAdjustment.adjustment_type}
                    onValueChange={(value: "increase" | "decrease" | "set") =>
                      setNewAdjustment({ ...newAdjustment, adjustment_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Increase Stock
                        </div>
                      </SelectItem>
                      <SelectItem value="decrease">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          Decrease Stock
                        </div>
                      </SelectItem>
                      <SelectItem value="set">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4 text-blue-500" />
                          Set Exact Count
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">
                    {newAdjustment.adjustment_type === "set" ? "New Quantity" : "Adjustment Quantity"}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={newAdjustment.quantity}
                    onChange={(e) =>
                      setNewAdjustment({ ...newAdjustment, quantity: Number.parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason (Required)</Label>
                  <Select
                    value={newAdjustment.reason}
                    onValueChange={(value) => setNewAdjustment({ ...newAdjustment, reason: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock_replenishment">Stock Replenishment</SelectItem>
                      <SelectItem value="damaged_goods">Damaged Goods</SelectItem>
                      <SelectItem value="expired_items">Expired Items</SelectItem>
                      <SelectItem value="theft_loss">Theft/Loss</SelectItem>
                      <SelectItem value="supplier_return">Supplier Return</SelectItem>
                      <SelectItem value="physical_count">Physical Count Correction</SelectItem>
                      <SelectItem value="system_error">System Error Correction</SelectItem>
                      <SelectItem value="quality_control">Quality Control</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cost-per-unit">Cost per Unit (Optional)</Label>
                  <Input
                    id="cost-per-unit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAdjustment.cost_per_unit || ""}
                    onChange={(e) =>
                      setNewAdjustment({
                        ...newAdjustment,
                        cost_per_unit: Number.parseFloat(e.target.value) || undefined,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional additional details..."
                    value={newAdjustment.notes}
                    onChange={(e) => setNewAdjustment({ ...newAdjustment, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewAdjustmentDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAdjustment}>Create Adjustment</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Adjustments</p>
                <p className="text-2xl font-bold">{adjustments.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {adjustments.filter((a) => a.status === "pending").length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {adjustments.filter((a) => a.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Value Impact</p>
                <p className="text-2xl font-bold">
                  KSh {adjustments.reduce((sum, a) => sum + (a.cost_impact || 0), 0).toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products, SKU, or reference..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.adjustment_type}
              onValueChange={(value) => setFilters({ ...filters, adjustment_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Adjustment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
                <SelectItem value="set">Set Count</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchMovements}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments List */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustments</CardTitle>
          <CardDescription>Recent stock adjustments and their approval status</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Adjustments</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchAdjustments}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : adjustments.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Adjustments Found</h3>
                <p className="text-muted-foreground mb-4">No stock adjustments match your current filters.</p>
                <Button onClick={() => setShowNewAdjustmentDialog(true)}>
                  <Calculator className="mr-2 h-4 w-4" />
                  Create First Adjustment
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {adjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Product Image */}
                  <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    {adjustment.product_image ? (
                      <Image
                        src={adjustment.product_image || "/placeholder.svg"}
                        alt={adjustment.product_name}
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
                      <h3 className="font-medium truncate">{adjustment.product_name}</h3>
                      {adjustment.variant_info && (
                        <Badge variant="outline" className="text-xs">
                          {adjustment.variant_info.color} {adjustment.variant_info.size}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>SKU: {adjustment.product_sku}</span>
                      <span>•</span>
                      <span>Ref: {adjustment.reference_id}</span>
                    </div>
                  </div>

                  {/* Adjustment Type */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getAdjustmentTypeIcon(adjustment.adjustment_type)}
                    <span className="text-sm font-medium capitalize">{adjustment.adjustment_type}</span>
                  </div>

                  {/* Quantity Change */}
                  <div className="text-center flex-shrink-0">
                    <div className="text-sm text-muted-foreground">Change</div>
                    <div
                      className={cn(
                        "text-lg font-semibold",
                        adjustment.adjustment_type === "increase"
                          ? "text-green-600"
                          : adjustment.adjustment_type === "decrease"
                            ? "text-red-600"
                            : "text-blue-600",
                      )}
                    >
                      {adjustment.adjustment_type === "set"
                        ? `Set to ${adjustment.new_quantity}`
                        : `${adjustment.adjustment_quantity > 0 ? "+" : ""}${adjustment.adjustment_quantity}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {adjustment.previous_quantity} → {adjustment.new_quantity}
                    </div>
                  </div>

                  {/* Cost Impact */}
                  {adjustment.cost_impact && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm text-muted-foreground">Cost Impact</div>
                      <div
                        className={cn(
                          "text-lg font-semibold",
                          adjustment.cost_impact > 0 ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {adjustment.cost_impact > 0 ? "+" : ""}KSh {Math.abs(adjustment.cost_impact).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex-shrink-0">{getStatusBadge(adjustment.status)}</div>

                  {/* Reason */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{adjustment.reason}</div>
                    <div className="text-sm text-muted-foreground">by {adjustment.user_name}</div>
                    {adjustment.notes && (
                      <div className="text-sm text-muted-foreground truncate">{adjustment.notes}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {adjustment.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveAdjustment(adjustment.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectAdjustment(adjustment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
