"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, Calendar, Clock, RotateCcw, XCircle, BarChart3, Sparkles, ShoppingBag } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/utils"

interface OrderInsightsProps {
  orders: any[]
  orderStats: {
    total: number
    pending: number
    processing?: number
    shipped: number
    delivered: number
    cancelled: number
    returned: number
  }
  statusColors: Record<string, { color: string; bgColor: string; icon: React.ReactNode }>
}

export function OrderInsights({ orders, orderStats, statusColors }: OrderInsightsProps) {
  const [timeRange, setTimeRange] = useState("last_30_days")
  const [chartType, setChartType] = useState("status")
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(true)
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(true)

  // Filter orders based on selected time range
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return []

    const now = new Date()

    if (timeRange === "last_7_days") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return orders.filter((order) => new Date(order.created_at) >= sevenDaysAgo)
    } else if (timeRange === "last_30_days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return orders.filter((order) => new Date(order.created_at) >= thirtyDaysAgo)
    } else if (timeRange === "last_6_months") {
      const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
      return orders.filter((order) => new Date(order.created_at) >= sixMonthsAgo)
    }

    return orders
  }, [orders, timeRange])

  // Calculate order status distribution data
  const statusDistributionData = useMemo(() => {
    const statusCounts = {
      pending: orderStats.pending || 0,
      shipped: orderStats.shipped || 0,
      delivered: orderStats.delivered || 0,
      cancelled: orderStats.cancelled || 0,
      returned: orderStats.returned || 0,
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color:
        status === "pending"
          ? "#f59e0b"
          : status === "shipped"
            ? "#3b82f6"
            : status === "delivered"
              ? "#10b981"
              : status === "cancelled"
                ? "#ef4444"
                : status === "returned"
                  ? "#6b7280"
                  : "#94a3b8",
    }))
  }, [orderStats])

  // Calculate order trends over time
  const orderTrendsData = useMemo(() => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return []
    }

    const dateFormat =
      timeRange === "last_7_days" || timeRange === "last_30_days"
        ? "day"
        : timeRange === "last_6_months"
          ? "month"
          : "month"

    const ordersByDate = filteredOrders.reduce((acc, order) => {
      const date = new Date(order.created_at)
      let dateKey

      if (dateFormat === "day") {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          count: 0,
          total: 0,
          statuses: {
            pending: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            returned: 0,
          },
        }
      }

      acc[dateKey].count += 1
      acc[dateKey].total += order.total_amount || order.total || 0

      const status = order.status?.toLowerCase() || "pending"
      if (
        status === "pending" ||
        status === "shipped" ||
        status === "delivered" ||
        status === "cancelled" ||
        status === "canceled" ||
        status === "returned"
      ) {
        const normalizedStatus = status === "canceled" ? "cancelled" : status
        acc[dateKey].statuses[normalizedStatus] += 1
      }

      return acc
    }, {})

    // Convert to array and sort by date
    return Object.values(ordersByDate).sort((a: any, b: any) => a.date.localeCompare(b.date))
  }, [filteredOrders, timeRange])

  // Calculate average order value
  const averageOrderValue = useMemo(() => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return 0
    }

    const total = filteredOrders.reduce((sum, order) => sum + (order.total_amount || order.total || 0), 0)
    return total / filteredOrders.length
  }, [filteredOrders])

  // Calculate order frequency (orders per day/week/month)
  const orderFrequency = useMemo(() => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return { value: 0, period: "day" }
    }

    const oldestOrder = new Date(Math.min(...filteredOrders.map((order) => new Date(order.created_at).getTime())))
    const now = new Date()
    const daysDifference = Math.max(1, Math.ceil((now.getTime() - oldestOrder.getTime()) / (1000 * 60 * 60 * 24)))

    if (daysDifference <= 7) {
      return {
        value: filteredOrders.length / daysDifference,
        period: "day",
      }
    } else if (daysDifference <= 30) {
      return {
        value: (filteredOrders.length / daysDifference) * 7,
        period: "week",
      }
    } else {
      return {
        value: (filteredOrders.length / daysDifference) * 30,
        period: "month",
      }
    }
  }, [filteredOrders])

  // Calculate completion rate (delivered / total non-cancelled orders)
  const completionRate = useMemo(() => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return 0
    }

    const nonCancelledOrders = filteredOrders.filter((order) => {
      const status = order.status?.toLowerCase()
      return status !== "cancelled" && status !== "canceled"
    })

    if (nonCancelledOrders.length === 0) return 0

    const deliveredOrders = filteredOrders.filter((order) => order.status?.toLowerCase() === "delivered")
    return (deliveredOrders.length / nonCancelledOrders.length) * 100
  }, [filteredOrders])

  // Calculate cancellation rate
  const cancellationRate = useMemo(() => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return 0
    }

    const cancelledOrders = filteredOrders.filter((order) => {
      const status = order.status?.toLowerCase()
      return status === "cancelled" || status === "canceled"
    })

    return (cancelledOrders.length / filteredOrders.length) * 100
  }, [filteredOrders])

  // Calculate return rate
  const returnRate = useMemo(() => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return 0
    }

    const returnedOrders = filteredOrders.filter((order) => order.status?.toLowerCase() === "returned")
    return (returnedOrders.length / filteredOrders.length) * 100
  }, [filteredOrders])

  // Generate personalized recommendations
  const recommendations = useMemo(() => {
    const recs = []

    if (cancellationRate > 10) {
      recs.push({
        title: "High Cancellation Rate",
        description:
          "Your order cancellation rate is above 10%. Consider reviewing your order process to reduce cancellations.",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        priority: "high",
      })
    }

    if (returnRate > 5) {
      recs.push({
        title: "High Return Rate",
        description:
          "Your return rate is above 5%. Review product descriptions and quality to improve customer satisfaction.",
        icon: <RotateCcw className="h-5 w-5 text-amber-500" />,
        priority: "medium",
      })
    }

    if (orderStats.pending > orderStats.delivered * 0.5 && orderStats.pending > 3) {
      recs.push({
        title: "Many Pending Orders",
        description:
          "You have a high number of pending orders. Consider following up on these to ensure timely delivery.",
        icon: <Clock className="h-5 w-5 text-amber-500" />,
        priority: "medium",
      })
    }

    if (completionRate < 70 && filteredOrders.length > 5) {
      recs.push({
        title: "Low Order Completion Rate",
        description: "Your order completion rate is below 70%. Check for issues in your fulfillment process.",
        icon: <TrendingDown className="h-5 w-5 text-red-500" />,
        priority: "high",
      })
    }

    if (orderFrequency.value < 1 && orderFrequency.period === "month" && filteredOrders.length > 0) {
      recs.push({
        title: "Low Order Frequency",
        description:
          "You're placing less than one order per month. Consider setting up recurring orders for frequently purchased items.",
        icon: <Calendar className="h-5 w-5 text-blue-500" />,
        priority: "low",
      })
    }

    // If no issues found, add a positive recommendation
    if (recs.length === 0) {
      recs.push({
        title: "Your Orders Look Great!",
        description: "We don't see any issues with your order patterns. Keep up the good work!",
        icon: <Sparkles className="h-5 w-5 text-green-500" />,
        priority: "positive",
      })
    }

    return recs
  }, [cancellationRate, returnRate, orderStats, completionRate, orderFrequency, filteredOrders.length])

  // Format date for display
  const formatDate = (dateString: string) => {
    if (timeRange === "last_7_days" || timeRange === "last_30_days") {
      const date = new Date(dateString)
      return `${date.getDate()}/${date.getMonth() + 1}`
    } else {
      const [year, month] = dateString.split("-")
      return `${month}/${year.slice(2)}`
    }
  }

  // Custom tooltip for pie chart
  const PieCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{payload[0].name}</p>
          <p style={{ color: payload[0].payload.color }}>Count: {payload[0].value}</p>
          <p style={{ color: payload[0].payload.color }}>{((payload[0].value / orderStats.total) * 100).toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800">
              <BarChart3 className="h-5 w-5 text-primary" />
              Order Summary
            </h2>
            <p className="text-sm text-gray-500 mt-1">Overview of your recent orders</p>
          </div>

          <Tabs defaultValue="last_30_days" value={timeRange} onValueChange={setTimeRange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="last_7_days" className="text-xs sm:text-sm">
                7 Days
              </TabsTrigger>
              <TabsTrigger value="last_30_days" className="text-xs sm:text-sm">
                30 Days
              </TabsTrigger>
              <TabsTrigger value="last_6_months" className="text-xs sm:text-sm">
                6 Months
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{filteredOrders.length}</div>
                <Badge variant="outline" className="text-xs">
                  {timeRange === "last_7_days" ? "7 days" : timeRange === "last_30_days" ? "30 days" : "6 months"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Average Value</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
              <div className="mt-1 text-xs text-gray-500">Per order</div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
              <div className="mt-1 text-xs text-gray-500">Orders delivered</div>
            </CardContent>
          </Card>
        </div>

        {/* Order Status Distribution */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-semibold">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="h-[180px] sm:h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => (percent > 0.08 ? `${name} ${(percent * 100).toFixed(0)}%` : "")}
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieCustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col justify-center">
                <div className="space-y-3">
                  {statusDistributionData.map((status) => (
                    <div key={status.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: status.color }}></div>
                        <span className="text-xs sm:text-sm">{status.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-medium">{status.value}</span>
                        <span className="text-xs text-gray-500 hidden xs:inline">
                          ({orderStats.total > 0 ? ((status.value / orderStats.total) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {orderStats.pending > 0 && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-xs sm:text-sm text-amber-800">
                      <span className="font-medium">Note:</span> You have {orderStats.pending} pending orders that need
                      attention.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <Card className="overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingBag className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No orders in this period</h3>
              <p className="text-sm text-gray-500 max-w-md">
                There are no orders in your selected time period. Try selecting a different time range or check back
                later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}

