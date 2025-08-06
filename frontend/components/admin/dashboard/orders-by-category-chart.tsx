"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card } from "@/components/ui/card"

interface OrdersByCategoryProps {
  data: Array<{
    category: string
    orders: number
  }>
}

// Cherry red color palette with complementary colors
const COLORS = ["#b31d40", "#801c36", "#9d1c3b", "#c71f47", "#e02b54", "#a51c3d", "#d71f4b", "#8f1c39"]

export function OrdersByCategoryChart({ data }: OrdersByCategoryProps) {
  // If no data, show placeholder
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-center">
          <p>No orders by category data available</p>
          <p className="text-xs mt-2">Data will appear here once orders are placed</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="bg-white dark:bg-gray-800 p-3 shadow-md border border-gray-100 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{payload[0].name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{payload[0].value} orders</p>
        </Card>
      )
    }
    return null
  }

  const chartData = data.map((item, index) => ({
    name: item.category,
    value: item.orders,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            innerRadius={30}
            fill="#ec4899"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-{#45;index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: "20px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

