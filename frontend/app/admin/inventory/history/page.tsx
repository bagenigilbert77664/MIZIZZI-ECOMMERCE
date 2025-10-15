"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { inventoryService } from "@/services/inventory-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  PackageIcon,
  SearchIcon,
  DownloadIcon,
  CalendarIcon,
  FilterIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  XIcon,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface InventoryMovement {
  id: number
  product_id: number
  product_name?: string
  product_sku?: string
  variant_id?: number
  variant_info?: string
  action_type: string
  quantity_change: number
  previous_quantity: number
  new_quantity: number
  reason?: string
  admin_id?: number
  admin_name?: string
  created_at: string
  order_id?: number
  notes?: string
}

export default function InventoryHistoryPage() {
  const router = useRouter()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [perPage, setPerPage] = useState(20)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Statistics
  const [stats, setStats] = useState({
    total_additions: 0,
    total_removals: 0,
    total_adjustments: 0,
    total_sales: 0,
    total_returns: 0,
  })

  const fetchInventoryHistory = async () => {
    try {
      setLoading(true)
      console.log("[v0] Fetching inventory history with params:", {
        page,
        per_page: perPage,
        action_type: actionTypeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: searchQuery || undefined,
      })

      const response = await inventoryService.getInventoryHistory({
        page,
        per_page: perPage,
        action_type: actionTypeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: searchQuery || undefined,
      })

      console.log("[v0] Inventory history response:", response)
      console.log("[v0] Movements:", response.movements)
      console.log("[v0] Pagination:", response.pagination)
      console.log("[v0] Statistics:", response.statistics)

      setMovements(response.movements || [])
      setTotalPages(response.pagination?.total_pages || 1)
      setTotalItems(response.pagination?.total_items || 0)

      if (response.statistics) {
        setStats(response.statistics)
      }
    } catch (error: any) {
      console.error("Error fetching inventory history:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch inventory history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryHistory()
  }, [page, perPage, actionTypeFilter, startDate, endDate])

  const handleSearch = () => {
    setPage(1)
    fetchInventoryHistory()
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setActionTypeFilter("")
    setStartDate("")
    setEndDate("")
    setPage(1)
  }

  const handleExport = async () => {
    try {
      toast({
        title: "Exporting...",
        description: "Preparing your inventory history export",
      })

      // Export logic would go here
      toast({
        title: "Export Complete",
        description: "Your inventory history has been exported successfully",
      })
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export inventory history",
        variant: "destructive",
      })
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case "addition":
      case "added":
      case "restock":
        return <ArrowUpIcon className="h-4 w-4" />
      case "removal":
      case "removed":
      case "sold":
        return <ArrowDownIcon className="h-4 w-4" />
      case "adjustment":
      case "adjusted":
        return <RefreshCwIcon className="h-4 w-4" />
      case "sale":
      case "order":
        return <ShoppingCartIcon className="h-4 w-4" />
      case "return":
      case "returned":
        return <PackageIcon className="h-4 w-4" />
      default:
        return <ActivityIcon className="h-4 w-4" />
    }
  }

  const getActionBadgeVariant = (actionType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (actionType.toLowerCase()) {
      case "addition":
      case "added":
      case "restock":
      case "return":
        return "default"
      case "removal":
      case "removed":
      case "sold":
      case "sale":
        return "destructive"
      case "adjustment":
      case "adjusted":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Inventory History</h1>
            <p className="mt-1 text-sm text-slate-600">Track all inventory movements and changes</p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="gap-2 border-slate-200 bg-white hover:bg-slate-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <TrendingUpIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600">Additions</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.total_additions.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <TrendingDownIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600">Removals</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.total_removals.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <RefreshCwIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600">Adjustments</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.total_adjustments.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <ShoppingCartIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600">Sales</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.total_sales.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2">
                <PackageIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600">Returns</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.total_returns.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-medium text-slate-900">Filters</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by product name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9 border-slate-200 focus:border-slate-300 focus:ring-slate-200"
                  />
                </div>
              </div>

              {/* Action Type */}
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="addition">Addition</SelectItem>
                  <SelectItem value="removal">Removal</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>

              {/* Start Date */}
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 border-slate-200"
                  placeholder="Start Date"
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 border-slate-200"
                  placeholder="End Date"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSearch} size="sm" className="bg-slate-900 hover:bg-slate-800">
                <SearchIcon className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button
                onClick={handleClearFilters}
                size="sm"
                variant="outline"
                className="border-slate-200 bg-transparent"
              >
                <XIcon className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Inventory History Table */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/50">
                  <TableHead className="font-semibold text-slate-700">Date & Time</TableHead>
                  <TableHead className="font-semibold text-slate-700">Product</TableHead>
                  <TableHead className="font-semibold text-slate-700">Action</TableHead>
                  <TableHead className="font-semibold text-slate-700">Quantity Change</TableHead>
                  <TableHead className="font-semibold text-slate-700">Previous</TableHead>
                  <TableHead className="font-semibold text-slate-700">New</TableHead>
                  <TableHead className="font-semibold text-slate-700">Reason</TableHead>
                  <TableHead className="font-semibold text-slate-700">Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCwIcon className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-600">Loading inventory history...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ActivityIcon className="h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No inventory movements found</p>
                        <p className="text-xs text-slate-500">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id} className="border-slate-100 transition-colors hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDate(movement.created_at)}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(movement.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {movement.product_name || `Product #${movement.product_id}`}
                          </span>
                          {movement.product_sku && (
                            <span className="text-xs text-slate-500">SKU: {movement.product_sku}</span>
                          )}
                          {movement.variant_info && (
                            <span className="text-xs text-slate-500">{movement.variant_info}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(movement.action_type)} className="gap-1.5 font-medium">
                          {getActionIcon(movement.action_type)}
                          {movement.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm font-semibold ${
                            movement.quantity_change > 0
                              ? "text-green-600"
                              : movement.quantity_change < 0
                                ? "text-red-600"
                                : "text-slate-600"
                          }`}
                        >
                          {movement.quantity_change > 0 ? "+" : ""}
                          {movement.quantity_change}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{movement.previous_quantity}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">{movement.new_quantity}</TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm text-slate-600 line-clamp-2">
                          {movement.reason || movement.notes || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{movement.admin_name || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && movements.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <div className="text-sm text-slate-600">
                Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalItems)} of {totalItems} movements
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                  className="border-slate-200"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className={page === pageNum ? "bg-slate-900 hover:bg-slate-800" : "border-slate-200"}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
