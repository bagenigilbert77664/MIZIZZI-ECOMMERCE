"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Overview } from "@/components/admin/dashboard/overview"
import { SalesByCategoryChart } from "@/components/admin/dashboard/sales-by-category"
import { ProductsOverview } from "@/components/admin/dashboard/products-overview"
import { Button } from "@/components/ui/button"
import { Calendar, BarChart2, LineChart, PieChart } from "lucide-react"

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [salesStats, setSalesStats] = useState<any>(null)
  const [productStats, setProductStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState("month")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true)

        // Fetch sales statistics based on selected period
        const salesStatsData = await adminService.getSalesStats({ period })
        setSalesStats(salesStatsData)

        // Fetch product statistics
        const productStatsData = await adminService.getProductStats()
        setProductStats(productStatsData)
      } catch (error) {
        console.error("Failed to fetch analytics data:", error)
        toast({
          title: "Error",
          description: "Failed to load analytics data. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchAnalyticsData()
    }
  }, [isAuthenticated, period])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle>Sales Period</CardTitle>
            <CardDescription>Select time period for sales data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={period === "day" ? "default" : "outline"}
                onClick={() => setPeriod("day")}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Daily
              </Button>
              <Button
                variant={period === "week" ? "default" : "outline"}
                onClick={() => setPeriod("week")}
                className="flex items-center gap-2"
              >
                <BarChart2 className="h-4 w-4" />
                Weekly
              </Button>
              <Button
                variant={period === "month" ? "default" : "outline"}
                onClick={() => setPeriod("month")}
                className="flex items-center gap-2"
              >
                <LineChart className="h-4 w-4" />
                Monthly
              </Button>
              <Button
                variant={period === "year" ? "default" : "outline"}
                onClick={() => setPeriod("year")}
                className="flex items-center gap-2"
              >
                <PieChart className="h-4 w-4" />
                Yearly
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : (
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
            <TabsTrigger value="products">Product Analytics</TabsTrigger>
            <TabsTrigger value="customers">Customer Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview - {period.charAt(0).toUpperCase() + period.slice(1)}</CardTitle>
                <CardDescription>
                  {period === "day" && "Hourly sales breakdown for today"}
                  {period === "week" && "Daily sales breakdown for this week"}
                  {period === "month" && "Daily sales breakdown for this month"}
                  {period === "year" && "Monthly sales breakdown for this year"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[400px]">
                  <Overview salesData={salesStats?.data || []} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Distribution of sales across product categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesByCategoryChart data={[]} /> {/* This would need category sales data */}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Metrics</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-3">
                        <div className="text-sm font-medium text-muted-foreground">Average Order Value</div>
                        <div className="text-2xl font-bold">$120.45</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-sm font-medium text-muted-foreground">Conversion Rate</div>
                        <div className="text-2xl font-bold">3.2%</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-sm font-medium text-muted-foreground">Return Rate</div>
                        <div className="text-2xl font-bold">1.8%</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-sm font-medium text-muted-foreground">Cart Abandonment</div>
                        <div className="text-2xl font-bold">68%</div>
                      </div>
                    </div>
                  </div>
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
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Customer behavior and demographics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Customer analytics will be available soon.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

