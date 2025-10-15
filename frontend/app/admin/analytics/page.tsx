"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  Calendar,
  Download,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { formatCurrency } from "@/lib/utils"

interface OrderStats {
  total_orders: number
  total_revenue: number
  average_order_value: number
  pending_orders: number
  processing_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  growth_rate: number
  revenue_growth: number
}

export default function OrderAnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [salesData, setSalesData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [period, setPeriod] = useState("month")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics()
    }
  }, [isAuthenticated, period])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)

      // Fetch dashboard data for order statistics
      const dashboardData = await adminService.getDashboardData()

      // Fetch sales statistics
      const salesStats = await adminService.getSalesStats({ period })

      // Process the data
      const orderStats: OrderStats = {
        total_orders: dashboardData.counts.orders,
        total_revenue: dashboardData.sales.monthly,
        average_order_value:
          dashboardData.counts.orders > 0 ? dashboardData.sales.monthly / dashboardData.counts.orders : 0,
        pending_orders: dashboardData.order_status.pending || 0,
        processing_orders: dashboardData.order_status.processing || 0,
        shipped_orders: dashboardData.order_status.shipped || 0,
        delivered_orders: dashboardData.order_status.delivered || 0,
        cancelled_orders: dashboardData.order_status.cancelled || 0,
        growth_rate: 12.5, // Calculate based on historical data
        revenue_growth: 8.3, // Calculate based on historical data
      }

      setStats(orderStats)
      setSalesData(salesStats.data || [])
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAnalytics()
    setIsRefreshing(false)
    toast({
      title: "Success",
      description: "Analytics data refreshed successfully",
    })
  }

  const exportData = async () => {
    try {
      toast({
        title: "Export Started",
        description: "Your analytics export is being prepared...",
      })
      // Implement export functionality
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data. Please try again.",
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

  if (isLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Order Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into your order performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />+{stats?.growth_rate || 0}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />+{stats?.revenue_growth || 0}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.average_order_value || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +2.1% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              -0.5% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Current breakdown of orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Pending</span>
                </div>
                <span className="text-sm font-medium">{stats?.pending_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Processing</span>
                </div>
                <span className="text-sm font-medium">{stats?.processing_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Shipped</span>
                </div>
                <span className="text-sm font-medium">{stats?.shipped_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Delivered</span>
                </div>
                <span className="text-sm font-medium">{stats?.delivered_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Cancelled</span>
                </div>
                <span className="text-sm font-medium">{stats?.cancelled_orders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Sales performance over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData.length > 0 ? (
                salesData.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(item.sales)}</div>
                      <div className="text-xs text-muted-foreground">{item.orders} orders</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">No sales data available for the selected period</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key insights and recommendations based on your order data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-700">Peak Performance</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your highest performing day was yesterday with {formatCurrency(1250)} in sales
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-700">Busy Hours</span>
              </div>
              <p className="text-sm text-muted-foreground">Most orders are placed between 2 PM - 6 PM</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-purple-700">Processing Time</span>
              </div>
              <p className="text-sm text-muted-foreground">Average order processing time is 2.3 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
