"use client"

import { useState } from "react"
import {
  Line,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area,
} from "recharts"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { TrendingUp, Calendar, Download, RefreshCw } from "lucide-react"

interface SalesOverviewChartProps {
  salesData?: Array<{
    label: string
    sales: number
    orders: number
    visitors: number
  }>
}

export function SalesOverviewChart({ salesData = [] }: SalesOverviewChartProps) {
  const [chartType, setChartType] = useState<"daily" | "weekly" | "monthly">("daily")

  // Handle the case where salesData is undefined or not an array
  if (!Array.isArray(salesData) || salesData.length === 0) {
    // Create placeholder data if no data is available
    const placeholderData = Array.from({ length: 12 }, (_, i) => ({
      label: `Day ${i + 1}`,
      sales: 0,
      orders: 0,
      visitors: 0,
    }))

    return (
      <div>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>No sales data available for the selected period</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <Calendar className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full rounded-lg bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center p-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No sales data yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs text-center mb-6">
              Once you start making sales, you'll see your sales data visualized here.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="gap-1">
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Visualize your sales, orders, and visitor trends</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={chartType === "daily" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("daily")}
            className={chartType === "daily" ? "bg-cherry-600 hover:bg-cherry-700" : ""}
          >
            Daily
          </Button>
          <Button
            variant={chartType === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("weekly")}
            className={chartType === "weekly" ? "bg-cherry-600 hover:bg-cherry-700" : ""}
          >
            Weekly
          </Button>
          <Button
            variant={chartType === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("monthly")}
            className={chartType === "monthly" ? "bg-cherry-600 hover:bg-cherry-700" : ""}
          >
            Monthly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                tickMargin={8}
                tick={{ fontSize: 10 }}
                width={45}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "sales") return [`$${value}`, "Sales"]
                  if (name === "orders") return [value, "Orders"]
                  return [value, name]
                }}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  padding: "8px 12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                fill="url(#colorVisitors)"
                stroke="#6366f1"
                strokeWidth={2}
                animationDuration={1500}
              />
              <Bar dataKey="orders" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={8} animationDuration={1500} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#ec4899"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                animationDuration={1500}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => {
                  if (value === "sales") return "Sales ($)"
                  if (value === "orders") return "Orders"
                  if (value === "visitors") return "Visitors"
                  return value
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export Data</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </CardContent>
    </motion.div>
  )
}
