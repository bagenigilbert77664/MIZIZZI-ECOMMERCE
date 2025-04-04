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
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>No sales data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center p-6">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={placeholderData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 10 }}
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
                <Area type="monotone" dataKey="visitors" fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" />
                <Bar dataKey="orders" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={8} />
                <Line type="monotone" dataKey="sales" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
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
          >
            Daily
          </Button>
          <Button
            variant={chartType === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("weekly")}
          >
            Weekly
          </Button>
          <Button
            variant={chartType === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("monthly")}
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
              <Area type="monotone" dataKey="visitors" fill="url(#colorVisitors)" stroke="#6366f1" />
              <Bar dataKey="orders" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={8} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#ec4899"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </motion.div>
  )
}

