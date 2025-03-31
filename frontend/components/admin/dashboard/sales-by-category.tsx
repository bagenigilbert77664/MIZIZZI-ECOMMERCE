"use client"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface SalesByCategoryProps {
  data: {
    category: string
    sales: number
  }[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

export function SalesByCategoryChart({ data }: SalesByCategoryProps) {
  // Sort data by sales in descending order
  const sortedData = [...data].sort((a, b) => b.sales - a.sales)

  // Format data for the chart
  const chartData = sortedData.map((item, index) => ({
    name: item.category,
    value: item.sales,
    color: COLORS[index % COLORS.length],
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="bg-white p-2 shadow-md border">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
        </Card>
      )
    }
    return null
  }

  return (
    <div className="h-[300px] w-full">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No category sales data available
        </div>
      )}
    </div>
  )
}

