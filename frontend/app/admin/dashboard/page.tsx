"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/admin/dashboard/overview"
import { RecentOrders } from "@/components/admin/dashboard/recent-orders"
import { RecentSales } from "@/components/admin/dashboard/recent-sales"
import { DashboardStats } from "@/components/admin/dashboard/dashboard-stats"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { ProductsOverview } from "@/components/admin/dashboard/products-overview"
import { SalesByCategoryChart } from "@/components/admin/dashboard/sales-by-category"
import { LowStockProducts } from "@/components/admin/dashboard/low-stock-products"
// Ensure the component is exported from "@/components/admin/product-update-notification" or remove this line if not needed.

export default function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [productStats, setProductStats] = useState<any>(null)
  const [salesStats, setSalesStats] = useState<any>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoadingData(true)
        const data = await adminService.getDashboardData()
        setDashboardData(data)

        // Fetch additional statistics
        const productStatsData = await adminService.getProductStats()
        setProductStats(productStatsData)

        const salesStatsData = await adminService.getSalesStats({ period: "month" })
        setSalesStats(salesStatsData)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again later.",
          variant: "destructive",
        })
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

      {isLoadingData ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <DashboardStats
            data={{
              ...(dashboardData?.counts || { users: 0, products: 0, orders: 0 }),
              low_stock_products: dashboardData?.low_stock_products || [],
            }}
            sales={dashboardData?.sales || { today: 0, monthly: 0 }}
            orderStatus={dashboardData?.order_status || {}}
          />

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none bg-white shadow-md dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle>Sales Overview</CardTitle>
                    <CardDescription>Monthly sales performance and trends</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <Overview salesData={salesStats?.data || []} />
                  </CardContent>
                </Card>
                <Card className="col-span-3 border-none bg-white shadow-md dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                      {dashboardData?.sales?.monthly
                        ? `You made ${Math.round(dashboardData.sales.monthly / 100)} sales this month.`
                        : "Sales data unavailable."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-3 border-none bg-white shadow-md dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle>Sales by Category</CardTitle>
                    <CardDescription>Top performing product categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SalesByCategoryChart data={dashboardData?.sales_by_category || []} />
                  </CardContent>
                </Card>
                <Card className="col-span-4 border-none bg-white shadow-md dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle>Low Stock Products</CardTitle>
                    <CardDescription>Products that need restocking soon</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LowStockProducts products={dashboardData?.low_stock_products || []} />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-none bg-white shadow-md dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Recent customer orders and their status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentOrders orders={dashboardData?.recent_orders || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Card className="border-none bg-white shadow-md dark:bg-gray-800">
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
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card className="border-none bg-white shadow-md dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Sales Analytics</CardTitle>
                  <CardDescription>Detailed sales performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[400px] flex-col gap-8">
                    <Overview salesData={salesStats?.data || []} />
                    <SalesByCategoryChart data={dashboardData?.sales_by_category || []} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <Card className="border-none bg-white shadow-md dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Customer Insights</CardTitle>
                  <CardDescription>Recent customer activity and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                    Customer insights will be available soon.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
      {/* Uncomment this line if the component is correctly exported and needed */}
      {/* <ProductUpdateNotification showToasts={true} /> */}
    </div>
  )
}
