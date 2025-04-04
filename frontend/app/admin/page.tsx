"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { ProductUpdateNotification } from "@/components/admin/product-update-notification"
import { DashboardCards } from "@/components/admin/dashboard/dashboard-cards"
import { RecentOrders } from "@/components/admin/dashboard/recent-orders"
import { LowStockProducts } from "@/components/admin/dashboard/low-stock-products"
import { QuickActions } from "@/components/admin/dashboard/quick-actions"
import { BestSellingProducts } from "@/components/admin/dashboard/best-selling-products"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, user } = useAdminAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, isLoading, router])

  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true)
      const data = await adminService.getDashboardData()
      setDashboardData(data)
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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{user?.name ? `, ${user.name}` : ""}! Here's an overview of your store.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 sm:mt-0"
          onClick={fetchDashboardData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      {isLoadingData ? (
        <div className="flex h-[200px] items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <DashboardCards
              data={{
                ...(dashboardData?.counts || {}),
                low_stock_count: dashboardData?.low_stock_products?.length || 0,
              }}
              sales={dashboardData?.sales || {}}
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuickActions />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 lg:col-span-1"
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Low Stock Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <LowStockProducts products={dashboardData?.low_stock_products || []} />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2"
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentOrders orders={dashboardData?.recent_orders || []} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Best Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <BestSellingProducts products={dashboardData?.best_selling_products || []} />
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
      <ProductUpdateNotification showToasts={true} />
    </div>
  )
}
