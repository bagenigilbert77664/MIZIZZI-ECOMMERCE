"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/admin/dashboard/overview"
import { RecentOrders } from "@/components/admin/dashboard/recent-orders"
import { RecentSales } from "@/components/admin/dashboard/recent-sales"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { ProductsOverview } from "@/components/admin/dashboard/products-overview"
import { SalesByCategoryChart } from "@/components/admin/dashboard/sales-by-category"
import { LowStockProducts } from "@/components/admin/dashboard/low-stock-products"
import { RecentCustomers } from "@/components/admin/dashboard/recent-customers"
import { OrderStatusChart } from "@/components/admin/dashboard/order-status-chart"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowUpRight, DollarSign, Package, ShoppingBag, Users, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

export default function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [productStats, setProductStats] = useState<any>(null)
  const [salesStats, setSalesStats] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, isLoading, router])

  const fetchDashboardData = async () => {
    try {
      setIsLoadingData(true)
      setError(null)
      if (isRefreshing) setIsRefreshing(true)

      const data = await adminService.getDashboardData()
      setDashboardData(data)

      // Fetch additional statistics
      try {
        const productStatsData = await adminService.getProductStats()
        setProductStats(productStatsData)
      } catch (productError) {
        console.error("Failed to fetch product stats:", productError)
      }

      try {
        const salesStatsData = await adminService.getSalesStats({ period: "month" })
        setSalesStats(salesStatsData)
      } catch (salesError) {
        console.error("Failed to fetch sales stats:", salesError)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      setError("Failed to load dashboard data. Please try again later.")

      // Set default empty data structure to prevent rendering errors
      setDashboardData({
        counts: {
          users: 0,
          products: 0,
          orders: 0,
          categories: 0,
          brands: 0,
          reviews: 0,
          pending_reviews: 0,
          newsletter_subscribers: 0,
        },
        sales: {
          today: 0,
          monthly: 0,
          yesterday: 0,
          weekly: 0,
          yearly: 0,
        },
        order_status: {},
        recent_orders: [],
        recent_users: [],
        low_stock_products: [],
        sales_by_category: [],
      })
    } finally {
      setIsLoadingData(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData()
    }
  }, [isAuthenticated])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchDashboardData()
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back! Here's an overview of your store.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 self-end md:self-auto"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing..." : isMobile ? "Refresh" : "Refresh Data"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoadingData && !isRefreshing ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${dashboardData?.sales?.monthly?.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  {dashboardData?.sales?.monthly > (dashboardData?.sales?.yesterday || 0) ? "+" : ""}
                  {dashboardData?.sales?.yesterday
                    ? (
                        ((dashboardData.sales.monthly - dashboardData.sales.yesterday) /
                          dashboardData.sales.yesterday) *
                        100
                      ).toFixed(1)
                    : "0"}
                  % from yesterday
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.counts?.orders || 0}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardData?.order_status?.PENDING || 0} pending orders
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.counts?.products || 0}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardData?.low_stock_products?.length || 0} low stock items
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.counts?.users || 0}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardData?.counts?.newsletter_subscribers || 0} newsletter subscribers
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <div className="overflow-x-auto pb-2">
              <TabsList className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 w-full sm:w-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm whitespace-nowrap">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="products" className="text-xs sm:text-sm whitespace-nowrap">
                  Products
                </TabsTrigger>
                <TabsTrigger value="sales" className="text-xs sm:text-sm whitespace-nowrap">
                  Sales
                </TabsTrigger>
                <TabsTrigger value="customers" className="text-xs sm:text-sm whitespace-nowrap">
                  Customers
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-full lg:col-span-4 bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>Sales Overview</CardTitle>
                    <CardDescription>Monthly sales performance and trends</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2 overflow-x-auto">
                    <div className="min-w-[400px]">
                      <Overview salesData={salesStats?.data || []} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-full lg:col-span-3 bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                      {dashboardData?.sales?.monthly
                        ? `You made $${Math.round(dashboardData.sales.monthly)} sales this month.`
                        : "Sales data unavailable."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-full lg:col-span-3 bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>Sales by Category</CardTitle>
                    <CardDescription>Top performing product categories</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="min-w-[300px]">
                      <SalesByCategoryChart data={dashboardData?.sales_by_category || []} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-full lg:col-span-4 bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>Order Status</CardTitle>
                    <CardDescription>Distribution of orders by status</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="min-w-[300px]">
                      <OrderStatusChart data={dashboardData?.order_status || {}} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>Low Stock Products</CardTitle>
                    <CardDescription>Products that need restocking soon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LowStockProducts products={dashboardData?.low_stock_products || []} />
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Recent customer orders and their status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentOrders orders={dashboardData?.recent_orders || []} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-6 mt-6">
              {/* Rest of the code remains the same */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                  <CardDescription>Top selling and highest rated products</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <ProductsOverview
                    productStats={
                      productStats || {
                        top_selling: [],
                        highest_rated: [],
                        low_stock: [],
                        out_of_stock: [],
                      }
                    }
                  />
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Low Stock Products</CardTitle>
                  <CardDescription>Products that need restocking soon</CardDescription>
                </CardHeader>
                <CardContent>
                  <LowStockProducts products={dashboardData?.low_stock_products || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales" className="space-y-6 mt-6">
              {/* Same structure, improved for mobile */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Sales Analytics</CardTitle>
                  <CardDescription>Detailed sales performance over time</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <div className="h-[400px] flex flex-col gap-8 min-w-[400px]">
                    <Overview salesData={salesStats?.data || []} />
                    <SalesByCategoryChart data={dashboardData?.sales_by_category || []} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest customer orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentOrders orders={dashboardData?.recent_orders || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-6 mt-6">
              {/* Same structure, improved for mobile */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Recent Customers</CardTitle>
                  <CardDescription>Newly registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentCustomers customers={dashboardData?.recent_users || []} />
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Customer Insights</CardTitle>
                  <CardDescription>Customer activity and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Total Customers</h3>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                        {dashboardData?.counts?.users || 0}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Newsletter Subscribers</h3>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                        {dashboardData?.counts?.newsletter_subscribers || 0}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reviews</h3>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                        {dashboardData?.counts?.reviews || 0}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {dashboardData?.counts?.pending_reviews || 0} pending
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
