"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, PieChartIcon, ArrowUpRight, Plus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface SalesByCategoryProps {
  data?: Array<{
    category: string
    sales: number
  }>
}

// Modern color palette with vibrant colors
const COLORS = [
  "#7c3aed", // Purple
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
]

export function SalesByCategoryChart({ data }: SalesByCategoryProps) {
  const [chartType, setChartType] = useState<"pie" | "donut">("donut")
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg border border-gray-100 dark:border-gray-700 rounded-lg">
          <p className="font-medium text-gray-900 dark:text-white">{payload[0].name}</p>
          <div className="flex items-center mt-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">${payload[0].value.toFixed(2)}</span>
            <div className="w-3 h-3 ml-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
          </div>
        </div>
      )
    }
    return null
  }

  // If no data, show enhanced empty state
  if (!data || data.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Sales by Category</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 w-8 p-0", chartType === "pie" && "bg-primary/10 text-primary")}
                onClick={() => setChartType("pie")}
              >
                <PieChartIcon className="h-4 w-4" />
                <span className="sr-only">Pie Chart</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 w-8 p-0", chartType === "donut" && "bg-primary/10 text-primary")}
                onClick={() => setChartType("donut")}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="sr-only">Donut Chart</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          </div>
          <CardDescription>Distribution of sales across product categories</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex flex-col items-center justify-center h-[280px] bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/20 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <PieChartIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">No category sales data yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
              Start categorizing your products and making sales to see data appear here
            </p>
            <div className="flex gap-3">
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Categories
              </Button>
              <Button size="sm">
                View Products
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Sales by Category</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === "pie" && "bg-primary/10 text-primary")}
              onClick={() => setChartType("pie")}
            >
              <PieChartIcon className="h-4 w-4" />
              <span className="sr-only">Pie Chart</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 w-8 p-0", chartType === "donut" && "bg-primary/10 text-primary")}
              onClick={() => setChartType("donut")}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Donut Chart</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
        <CardDescription>Distribution of sales across product categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={chartType === "donut" ? 60 : 0}
                fill="#ec4899"
                dataKey="sales"
                nameKey="category"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                paddingAngle={2}
                animationDuration={800}
                animationBegin={0}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="drop-shadow-sm hover:opacity-90 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: "20px" }}
                formatter={(value, entry, index) => (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
