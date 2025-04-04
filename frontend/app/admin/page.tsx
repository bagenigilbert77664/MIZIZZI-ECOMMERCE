"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { ProductUpdateNotification } from "@/components/admin/product-update-notification"
import { DashboardCards } from "@/components/admin/dashboard/dashboard-cards"
import { SalesOverviewChart } from "@/components/admin/dashboard/sales-overview-chart"
import { RecentOrders } from "@/components/admin/dashboard/recent-orders"
import { RecentActivity } from "@/components/admin/dashboard/recent-activity"
import { BestSellingProducts } from "@/components/admin/dashboard/best-selling-products"
import { TrafficSourcesChart } from "@/components/admin/dashboard/traffic-sources-chart"
import { LowStockProducts } from "@/components/admin/dashboard/low-stock-products"
import { OrderStatusDistribution } from "@/components/admin/dashboard/order-status-distribution"
import { QuickActions } from "@/components/admin/dashboard/quick-actions"
import { RecentCustomers } from "@/components/admin/dashboard/recent-customers"
import { Overview } from "@/components/admin/dashboard/overview"
import { OrderStatusChart } from "@/components/admin/dashboard/order-status-chart"
import { SalesByCategoryChart } from "@/components/admin/dashboard/sales-by-category"
import { UpcomingEvents } from "@/components/admin/dashboard/upcoming-events"
import { UsersByRegionMap } from "@/components/admin/dashboard/users-by-region-map"
import { RevenueVsRefundsChart } from "@/components/admin/dashboard/revenue-vs-refunds-chart"
import { ActiveUsersChart } from "@/components/admin/dashboard/active-users-chart"
import { NotificationsPanel } from "@/components/admin/dashboard/notifications-panel"
import { RecentSales } from "@/components/admin/dashboard/recent-sales"
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { RefreshCw, Calendar } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, user } = useAdminAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, isLoading, router])

  const fetchDashboardData = async () => {
    try {
      setIsLoadingData(true)
      setIsRefreshing(true)

      // Format dates for API
      const fromDate = dateRange.from.toISOString().split("T")[0]
      const toDate = dateRange.to.toISOString().split("T")[0]

      // Fetch dashboard data
      const data = await adminService.getDashboardData()
      setDashboardData(data)

      // Fetch additional statistics
      try {
        await adminService.getProductStats()
      } catch (productError) {
        console.error("Failed to fetch product stats:", productError)
      }

      try {
        await adminService.getSalesStats({
          period: "custom",
          from: fromDate,
          to: toDate,
        })
      } catch (salesError) {
        console.error("Failed to fetch sales stats:", salesError)
      }
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
          users: 10,
          products: 28,
          orders: 0,
          categories: 12,
          brands: 8,
          reviews: 0,
          pending_reviews: 0,
          newsletter_subscribers: 4,
          new_signups_today: 0,
          new_signups_week: 0,
          orders_in_transit: 0,
          pending_payments: 0,
          low_stock_count: 5,
        },
        sales: {
          today: 0,
          monthly: 0,
          yesterday: 0,
          weekly: 0,
          yearly: 0,
          total_revenue: 0,
          pending_amount: 0,
        },
        order_status: {},
        recent_orders: [],
        recent_users: [],
        recent_activities: [],
        low_stock_products: Array(5).fill({
          id: "1",
          name: "Sample Product",
          stock: 2,
          price: 29.99,
          sku: "SKU-001",
        }),
        sales_by_category: [],
        best_selling_products: [],
        traffic_sources: [],
        notifications: [],
        upcoming_events: [],
        users_by_region: [],
        revenue_vs_refunds: [],
        active_users: [],
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
  }, [isAuthenticated, dateRange])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-1 sm:p-2 md:p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name || "Admin"}!</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md w-full sm:w-auto">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
          </div>
          <Button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </motion.div>

      <Separator className="my-2" />

      {isLoadingData && !isRefreshing ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <DashboardCards
              data={{
                ...(dashboardData?.counts || {}),
                low_stock_count: dashboardData?.low_stock_products?.length || 0,
              }}
              sales={dashboardData?.sales || {}}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-6"
          >
            <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl p-4">
              <div className="mb-2">
                <h2 className="text-lg font-semibold">Quick Actions</h2>
              </div>
              <QuickActions />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Card className="lg:col-span-2 border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
              <SalesOverviewChart salesData={dashboardData?.sales_data || []} />
            </Card>

            <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
              <OrderStatusChart data={dashboardData?.order_status || {}} />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Card className="lg:col-span-2 border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
              <RecentOrders orders={dashboardData?.recent_orders || []} />
            </Card>

            <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
              <RecentSales />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-lg">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <Overview salesData={dashboardData?.sales_data || []} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <SalesByCategoryChart data={dashboardData?.sales_by_category || []} />
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <RecentActivity activities={dashboardData?.recent_activities || []} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <NotificationsPanel notifications={dashboardData?.notifications || []} />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <LowStockProducts products={dashboardData?.low_stock_products || []} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <BestSellingProducts products={dashboardData?.best_selling_products || []} />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="sales" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <OrderStatusDistribution data={dashboardData?.order_status || {}} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <RevenueVsRefundsChart data={dashboardData?.revenue_vs_refunds || []} />
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <TrafficSourcesChart data={dashboardData?.traffic_sources || []} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <ActiveUsersChart data={dashboardData?.active_users || []} />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="customers" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <RecentCustomers customers={dashboardData?.recent_users || []} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <UsersByRegionMap data={dashboardData?.users_by_region || []} />
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl">
                    <UpcomingEvents events={dashboardData?.upcoming_events || []} />
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
      <ProductUpdateNotification showToasts={true} />
    </div>
  )
}

