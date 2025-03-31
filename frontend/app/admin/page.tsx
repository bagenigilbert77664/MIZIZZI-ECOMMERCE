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
import { AlertCircle, ArrowUpRight, DollarSign, Package, ShoppingBag, Users } from "lucide-react"

export default function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [productStats, setProductStats] = useState<any>(null)
  const [salesStats, setSalesStats] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoadingData(true)
        setError(null)

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
      }
    }

    if (isAuthenticated) {
      fetchDashboardData()
    }
  }, [isAuthenticated])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoadingData ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboardData?.sales?.monthly?.toFixed(2) || "0.00"}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <ArrowUpRight className="mr-1 h-3 w-3" />
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.counts?.orders || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.order_status?.PENDING || 0} pending orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.counts?.products || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.low_stock_products?.length || 0} low stock items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.counts?.users || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.counts?.newsletter_subscribers || 0} newsletter subscribers
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Sales Overview</CardTitle>
                    <CardDescription>Monthly sales performance and trends</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <Overview salesData={salesStats?.data || []} />
                  </CardContent>
                </Card>
                <Card className="col-span-3">
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

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Sales by Category</CardTitle>
                    <CardDescription>Top performing product categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SalesByCategoryChart data={dashboardData?.sales_by_category || []} />
                  </CardContent>
                </Card>
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Order Status</CardTitle>
                    <CardDescription>Distribution of orders by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OrderStatusChart data={dashboardData?.order_status || {}} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Low Stock Products</CardTitle>
                    <CardDescription>Products that need restocking soon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LowStockProducts products={dashboardData?.low_stock_products || []} />
                  </CardContent>
                </Card>
                <Card>
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

            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                  <CardDescription>Top selling and highest rated products</CardDescription>
                </CardHeader>
                <CardContent>
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

              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Products</CardTitle>
                  <CardDescription>Products that need restocking soon</CardDescription>
                </CardHeader>
                <CardContent>
                  <LowStockProducts products={dashboardData?.low_stock_products || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Analytics</CardTitle>
                  <CardDescription>Detailed sales performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] flex flex-col gap-8">
                    <Overview salesData={salesStats?.data || []} />
                    <SalesByCategoryChart data={dashboardData?.sales_by_category || []} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest customer orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentOrders orders={dashboardData?.recent_orders || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Customers</CardTitle>
                  <CardDescription>Newly registered users</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentCustomers customers={dashboardData?.recent_users || []} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Insights</CardTitle>
                  <CardDescription>Customer activity and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-medium">Total Customers</h3>
                      <p className="text-3xl font-bold">{dashboardData?.counts?.users || 0}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-medium">Newsletter Subscribers</h3>
                      <p className="text-3xl font-bold">{dashboardData?.counts?.newsletter_subscribers || 0}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-medium">Reviews</h3>
                      <p className="text-3xl font-bold">{dashboardData?.counts?.reviews || 0}</p>
                      <p className="text-sm text-muted-foreground">
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
