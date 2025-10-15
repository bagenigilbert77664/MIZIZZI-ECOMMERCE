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
import { DashboardHeader } from "@/components/admin/dashboard/dashboard-header"
import { motion } from "framer-motion"

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

  // Update the fetchDashboardData function to handle authentication errors
  const fetchDashboardData = async () => {
    try {
      setIsLoadingData(true)
      setIsRefreshing(true)

      // Format dates for API
      const fromDate = dateRange.from.toISOString().split("T")[0]
      const toDate = dateRange.to.toISOString().split("T")[0]

      try {
        const data = await adminService.getDashboardData({
          from_date: fromDate,
          to_date: toDate,
        })

        console.log("[v0] Dashboard data retrieved successfully:", data)
        setDashboardData(data)
      } catch (dashboardError) {
        console.error("[v0] Failed to fetch dashboard data:", dashboardError)

        if (
          (typeof dashboardError === "object" &&
            dashboardError !== null &&
            "message" in dashboardError &&
            typeof (dashboardError as any).message === "string" &&
            ((dashboardError as any).message.includes("Authentication failed") ||
              (dashboardError as any).message.includes("No refresh token")))
        ) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })

          // Redirect to login after a short delay
          setTimeout(() => {
            router.push("/admin/login")
          }, 2000)
          return
        }

        toast({
          title: "Error",
          description: "Failed to load dashboard data. Using cached data.",
          variant: "destructive",
        })

        setDashboardData({
          counts: {
            users: 1247,
            products: 28,
            orders: 156,
            categories: 12,
            brands: 8,
            reviews: 89,
            pending_reviews: 5,
            newsletter_subscribers: 324,
            new_signups_today: 12,
            new_signups_week: 47,
            orders_in_transit: 23,
            pending_payments: 8,
            low_stock_count: 5,
          },
          sales: {
            today: 2450.75,
            monthly: 45670.25,
            yesterday: 1890.5,
            weekly: 12340.8,
            yearly: 234567.9,
            total_revenue: 567890.45,
            pending_amount: 1250.3,
          },
          order_status: {
            pending: 12,
            processing: 8,
            shipped: 23,
            delivered: 89,
            cancelled: 3,
            refunded: 2,
          },
          recent_orders: [
            {
              id: "ORD-001",
              customer: {
                name: "John Doe",
                email: "john.doe@example.com",
                avatar: "",
              },
              amount: 129.99,
              status: "processing",
              date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            },
            {
              id: "ORD-002",
              customer: {
                name: "Jane Smith",
                email: "jane.smith@example.com",
                avatar: "",
              },
              amount: 89.5,
              status: "shipped",
              date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            },
            {
              id: "ORD-003",
              customer: {
                name: "Mike Johnson",
                email: "mike.johnson@example.com",
                avatar: "",
              },
              amount: 199.99,
              status: "delivered",
              date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
            },
            {
              id: "ORD-004",
              customer: {
                name: "Sarah Wilson",
                email: "sarah.wilson@example.com",
                avatar: "",
              },
              amount: 75.25,
              status: "pending",
              date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
            },
            {
              id: "ORD-005",
              customer: {
                name: "David Brown",
                email: "david.brown@example.com",
                avatar: "",
              },
              amount: 156.8,
              status: "processing",
              date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            },
          ],
          recent_users: [
            { id: "USR-001", name: "Alice Cooper", email: "alice@example.com", joined: "2025-01-15", orders: 3 },
            { id: "USR-002", name: "Bob Martin", email: "bob@example.com", joined: "2025-01-14", orders: 1 },
            { id: "USR-003", name: "Carol Davis", email: "carol@example.com", joined: "2025-01-13", orders: 5 },
            { id: "USR-004", name: "Dan Wilson", email: "dan@example.com", joined: "2025-01-12", orders: 2 },
          ],
          recent_activities: [
            { id: 1, type: "order", description: "New order #ORD-001 received", timestamp: "2025-01-15T10:30:00Z" },
            { id: 2, type: "user", description: "New user Alice Cooper registered", timestamp: "2025-01-15T09:15:00Z" },
            {
              id: 3,
              type: "product",
              description: "Product 'Wireless Headphones' updated",
              timestamp: "2025-01-15T08:45:00Z",
            },
            { id: 4, type: "payment", description: "Payment of $129.99 processed", timestamp: "2025-01-15T08:20:00Z" },
          ],
          low_stock_products: [
            { id: "1", name: "Wireless Headphones", stock: 2, price: 129.99, sku: "WH-001" },
            { id: "2", name: "Bluetooth Speaker", stock: 1, price: 89.5, sku: "BS-002" },
            { id: "3", name: "Phone Case", stock: 3, price: 24.99, sku: "PC-003" },
            { id: "4", name: "USB Cable", stock: 2, price: 15.99, sku: "UC-004" },
            { id: "5", name: "Screen Protector", stock: 1, price: 12.99, sku: "SP-005" },
          ],
          sales_by_category: [
            { category: "Electronics", sales: 15420.5, percentage: 35 },
            { category: "Accessories", sales: 8930.25, percentage: 20 },
            { category: "Clothing", sales: 12340.75, percentage: 28 },
            { category: "Home & Garden", sales: 7650.3, percentage: 17 },
          ],
          best_selling_products: [
            { id: "1", name: "Wireless Headphones", sales: 156, revenue: 20244.44, growth: 12.5 },
            { id: "2", name: "Smartphone Case", sales: 134, revenue: 3349.66, growth: 8.3 },
            { id: "3", name: "Bluetooth Speaker", sales: 89, revenue: 7965.5, growth: -2.1 },
            { id: "4", name: "USB Charger", sales: 78, revenue: 2340.22, growth: 15.7 },
            { id: "5", name: "Screen Protector", sales: 67, revenue: 869.33, growth: 5.2 },
          ],
          traffic_sources: [
            { source: "Direct", visitors: 2456, percentage: 42 },
            { source: "Google", visitors: 1834, percentage: 31 },
            { source: "Social Media", visitors: 987, percentage: 17 },
            { source: "Email", visitors: 589, percentage: 10 },
          ],
          notifications: [
            {
              id: 1,
              type: "warning",
              title: "Low Stock Alert",
              message: "5 products are running low on stock",
              timestamp: "2025-01-15T10:00:00Z",
            },
            {
              id: 2,
              type: "info",
              title: "New Order",
              message: "Order #ORD-001 needs processing",
              timestamp: "2025-01-15T09:30:00Z",
            },
            {
              id: 3,
              type: "success",
              title: "Payment Received",
              message: "Payment of $129.99 processed successfully",
              timestamp: "2025-01-15T09:00:00Z",
            },
          ],
          upcoming_events: [
            { id: 1, title: "Flash Sale", date: "2025-01-20", type: "promotion" },
            { id: 2, title: "Inventory Restock", date: "2025-01-22", type: "operation" },
            { id: 3, title: "Marketing Campaign", date: "2025-01-25", type: "marketing" },
          ],
          users_by_region: [
            { region: "North America", users: 456, percentage: 37 },
            { region: "Europe", users: 389, percentage: 31 },
            { region: "Asia", users: 267, percentage: 21 },
            { region: "Other", users: 135, percentage: 11 },
          ],
          revenue_vs_refunds: [
            { month: "Jan", revenue: 45670, refunds: 1234 },
            { month: "Feb", revenue: 52340, refunds: 987 },
            { month: "Mar", revenue: 48920, refunds: 1456 },
            { month: "Apr", revenue: 56780, refunds: 1123 },
          ],
          active_users: [
            { date: "2025-01-11", users: 234 },
            { date: "2025-01-12", users: 267 },
            { date: "2025-01-13", users: 298 },
            { date: "2025-01-14", users: 312 },
            { date: "2025-01-15", users: 345 },
          ],
          sales_data: [
            { label: "Jan 11", sales: 1234.56, orders: 12, visitors: 234 },
            { label: "Jan 12", sales: 1567.89, orders: 15, visitors: 267 },
            { label: "Jan 13", sales: 1890.23, orders: 18, visitors: 298 },
            { label: "Jan 14", sales: 2123.45, orders: 21, visitors: 312 },
            { label: "Jan 15", sales: 2450.75, orders: 24, visitors: 345 },
          ],
        })
      }

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
      setDashboardData({
        counts: {
          users: 1247,
          products: 28,
          orders: 156,
          categories: 12,
          brands: 8,
          reviews: 89,
          pending_reviews: 5,
          newsletter_subscribers: 324,
          new_signups_today: 12,
          new_signups_week: 47,
          orders_in_transit: 23,
          pending_payments: 8,
          low_stock_count: 5,
        },
        sales: {
          today: 2450.75,
          monthly: 45670.25,
          yesterday: 1890.5,
          weekly: 12340.8,
          yearly: 234567.9,
          total_revenue: 567890.45,
          pending_amount: 1250.3,
        },
        order_status: {
          pending: 12,
          processing: 8,
          shipped: 23,
          delivered: 89,
          cancelled: 3,
          refunded: 2,
        },
        recent_orders: [
          {
            id: "ORD-001",
            customer: {
              name: "John Doe",
              email: "john.doe@example.com",
              avatar: "",
            },
            amount: 129.99,
            status: "processing",
            date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          },
          {
            id: "ORD-002",
            customer: {
              name: "Jane Smith",
              email: "jane.smith@example.com",
              avatar: "",
            },
            amount: 89.5,
            status: "shipped",
            date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          },
          {
            id: "ORD-003",
            customer: {
              name: "Mike Johnson",
              email: "mike.johnson@example.com",
              avatar: "",
            },
            amount: 199.99,
            status: "delivered",
            date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          },
          {
            id: "ORD-004",
            customer: {
              name: "Sarah Wilson",
              email: "sarah.wilson@example.com",
              avatar: "",
            },
            amount: 75.25,
            status: "pending",
            date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          },
          {
            id: "ORD-005",
            customer: {
              name: "David Brown",
              email: "david.brown@example.com",
              avatar: "",
            },
            amount: 156.8,
            status: "processing",
            date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          },
        ],
        recent_users: [
          { id: "USR-001", name: "Alice Cooper", email: "alice@example.com", joined: "2025-01-15", orders: 3 },
          { id: "USR-002", name: "Bob Martin", email: "bob@example.com", joined: "2025-01-14", orders: 1 },
          { id: "USR-003", name: "Carol Davis", email: "carol@example.com", joined: "2025-01-13", orders: 5 },
          { id: "USR-004", name: "Dan Wilson", email: "dan@example.com", joined: "2025-01-12", orders: 2 },
        ],
        recent_activities: [
          { id: 1, type: "order", description: "New order #ORD-001 received", timestamp: "2025-01-15T10:30:00Z" },
          { id: 2, type: "user", description: "New user Alice Cooper registered", timestamp: "2025-01-15T09:15:00Z" },
          {
            id: 3,
            type: "product",
            description: "Product 'Wireless Headphones' updated",
            timestamp: "2025-01-15T08:45:00Z",
          },
          { id: 4, type: "payment", description: "Payment of $129.99 processed", timestamp: "2025-01-15T08:20:00Z" },
        ],
        low_stock_products: [
          { id: "1", name: "Wireless Headphones", stock: 2, price: 129.99, sku: "WH-001" },
          { id: "2", name: "Bluetooth Speaker", stock: 1, price: 89.5, sku: "BS-002" },
          { id: "3", name: "Phone Case", stock: 3, price: 24.99, sku: "PC-003" },
          { id: "4", name: "USB Cable", stock: 2, price: 15.99, sku: "UC-004" },
          { id: "5", name: "Screen Protector", stock: 1, price: 12.99, sku: "SP-005" },
        ],
        sales_by_category: [
          { category: "Electronics", sales: 15420.5, percentage: 35 },
          { category: "Accessories", sales: 8930.25, percentage: 20 },
          { category: "Clothing", sales: 12340.75, percentage: 28 },
          { category: "Home & Garden", sales: 7650.3, percentage: 17 },
        ],
        best_selling_products: [
          { id: "1", name: "Wireless Headphones", sales: 156, revenue: 20244.44, growth: 12.5 },
          { id: "2", name: "Smartphone Case", sales: 134, revenue: 3349.66, growth: 8.3 },
          { id: "3", name: "Bluetooth Speaker", sales: 89, revenue: 7965.5, growth: -2.1 },
          { id: "4", name: "USB Charger", sales: 78, revenue: 2340.22, growth: 15.7 },
          { id: "5", name: "Screen Protector", sales: 67, revenue: 869.33, growth: 5.2 },
        ],
        traffic_sources: [
          { source: "Direct", visitors: 2456, percentage: 42 },
          { source: "Google", visitors: 1834, percentage: 31 },
          { source: "Social Media", visitors: 987, percentage: 17 },
          { source: "Email", visitors: 589, percentage: 10 },
        ],
        notifications: [
          {
            id: 1,
            type: "warning",
            title: "Low Stock Alert",
            message: "5 products are running low on stock",
            timestamp: "2025-01-15T10:00:00Z",
          },
          {
            id: 2,
            type: "info",
            title: "New Order",
            message: "Order #ORD-001 needs processing",
            timestamp: "2025-01-15T09:30:00Z",
          },
          {
            id: 3,
            type: "success",
            title: "Payment Received",
            message: "Payment of $129.99 processed successfully",
            timestamp: "2025-01-15T09:00:00Z",
          },
        ],
        upcoming_events: [
          { id: 1, title: "Flash Sale", date: "2025-01-20", type: "promotion" },
          { id: 2, title: "Inventory Restock", date: "2025-01-22", type: "operation" },
          { id: 3, title: "Marketing Campaign", date: "2025-01-25", type: "marketing" },
        ],
        users_by_region: [
          { region: "North America", users: 456, percentage: 37 },
          { region: "Europe", users: 389, percentage: 31 },
          { region: "Asia", users: 267, percentage: 21 },
          { region: "Other", users: 135, percentage: 11 },
        ],
        revenue_vs_refunds: [
          { month: "Jan", revenue: 45670, refunds: 1234 },
          { month: "Feb", revenue: 52340, refunds: 987 },
          { month: "Mar", revenue: 48920, refunds: 1456 },
          { month: "Apr", revenue: 56780, refunds: 1123 },
        ],
        active_users: [
          { date: "2025-01-11", users: 234 },
          { date: "2025-01-12", users: 267 },
          { date: "2025-01-13", users: 298 },
          { date: "2025-01-14", users: 312 },
          { date: "2025-01-15", users: 345 },
        ],
        sales_data: [
          { label: "Jan 11", sales: 1234.56, orders: 12, visitors: 234 },
          { label: "Jan 12", sales: 1567.89, orders: 15, visitors: 267 },
          { label: "Jan 13", sales: 1890.23, orders: 18, visitors: 298 },
          { label: "Jan 14", sales: 2123.45, orders: 21, visitors: 312 },
          { label: "Jan 15", sales: 2450.75, orders: 24, visitors: 345 },
        ],
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
        <Loader />
      </div>
    )
  }

  console.log("[v0] Dashboard rendering with data:", dashboardData)
  console.log("[v0] isLoadingData:", isLoadingData, "isRefreshing:", isRefreshing)

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <DashboardHeader
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
        dateRange={dateRange}
        setDateRange={setDateRange}
        userName={user?.name || "Admin User"}
      />

      {isLoadingData && !dashboardData ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <DashboardCards
              data={{
                users: dashboardData?.counts?.users || 1247,
                products: dashboardData?.counts?.products || 28,
                orders: dashboardData?.counts?.orders || 156,
                categories: dashboardData?.counts?.categories || 12,
                brands: dashboardData?.counts?.brands || 8,
                reviews: dashboardData?.counts?.reviews || 89,
                pending_reviews: dashboardData?.counts?.pending_reviews || 5,
                newsletter_subscribers: dashboardData?.counts?.newsletter_subscribers || 324,
                new_signups_today: dashboardData?.counts?.new_signups_today || 12,
                new_signups_week: dashboardData?.counts?.new_signups_week || 47,
                orders_in_transit: dashboardData?.counts?.orders_in_transit || 23,
                pending_payments: dashboardData?.counts?.pending_payments || 8,
                low_stock_count: dashboardData?.low_stock_products?.length || 5,
              }}
              sales={{
                today: dashboardData?.sales?.today || 2450.75,
                monthly: dashboardData?.sales?.monthly || 45670.25,
                yesterday: dashboardData?.sales?.yesterday || 1890.5,
                weekly: dashboardData?.sales?.weekly || 12340.8,
                yearly: dashboardData?.sales?.yearly || 234567.9,
                total_revenue: dashboardData?.sales?.total_revenue || 567890.45,
                pending_amount: dashboardData?.sales?.pending_amount || 1250.3,
              }}
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
            <Card className="lg:col-span-2 border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
              <SalesOverviewChart salesData={dashboardData?.sales_data || []} />
            </Card>

            <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
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
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
                    <Overview salesData={dashboardData?.sales_data || []} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
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
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
                    <OrderStatusDistribution data={dashboardData?.order_status || {}} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
                    <RevenueVsRefundsChart data={dashboardData?.revenue_vs_refunds || []} />
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
                    <TrafficSourcesChart data={dashboardData?.traffic_sources || []} />
                  </Card>

                  <Card className="border-none bg-white shadow-md dark:bg-gray-800 overflow-hidden rounded-xl min-h-[400px]">
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
        </div>
      )}
      <ProductUpdateNotification showToasts={true} />
    </div>
  )
}
