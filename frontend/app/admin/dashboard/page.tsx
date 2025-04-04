"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"

export default function AdminDashboard() {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoadingData(true)

        // Format dates for API
        const fromDate = dateRange.from.toISOString().split("T")[0]
        const toDate = dateRange.to.toISOString().split("T")[0]

        // Fetch dashboard data without date parameters
        const data = await adminService.getDashboardData()
        setDashboardData(data)

        // Fetch additional statistics without unused parameters
        await adminService.getProductStats()

        await adminService.getSalesStats({
          period: "custom",
        })
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
            new_signups_today: 0,
            new_signups_week: 0,
            orders_in_transit: 0,
            pending_payments: 0,
            low_stock_count: 0,
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
          low_stock_products: [],
          sales_by_category: [],
          best_selling_products: [],
          traffic_sources: [],
        })
      } finally {
        setIsLoadingData(false)
      }
    }

    if (isAuthenticated) {
      fetchDashboardData()
    }
  }, [isAuthenticated, dateRange])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {isLoadingData ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <DashboardCards
            data={{
              ...(dashboardData?.counts || {}),
              low_stock_count: dashboardData?.low_stock_products?.length || 0,
            }}
            sales={dashboardData?.sales || {}}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
              <SalesOverviewChart salesData={dashboardData?.sales_data || []} />
            </Card>

            <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
              <OrderStatusDistribution data={dashboardData?.order_status || {}} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
              <RecentOrders orders={dashboardData?.recent_orders || []} />
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="actions">Quick Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
                  <BestSellingProducts products={dashboardData?.best_selling_products || []} />
                </Card>

                <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
                  <TrafficSourcesChart data={dashboardData?.traffic_sources || []} />
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
                  <RecentActivity activities={dashboardData?.recent_activities || []} />
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
                  <LowStockProducts products={dashboardData?.low_stock_products || []} />
                </Card>

                <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
                  <BestSellingProducts products={dashboardData?.best_selling_products || []} />
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
                  <OrderStatusDistribution data={dashboardData?.order_status || {}} />
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-6">
              <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden">
                <QuickActions />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
      <ProductUpdateNotification showToasts={true} />
    </div>
  )
}
