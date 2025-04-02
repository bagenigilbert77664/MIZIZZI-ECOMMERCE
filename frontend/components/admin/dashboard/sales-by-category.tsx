"use client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card } from "@/components/ui/card"

interface SalesByCategoryProps {
  data: Array<{
    category: string
    sales: number
  }>
}

// Cherry red color palette
const COLORS = ["#b31d40", "#801c36", "#9d1c3b", "#c71f47", "#e02b54", "#a51c3d", "#d71f4b", "#8f1c39"]

export function SalesByCategoryChart({ data }: SalesByCategoryProps) {
  // If no data, show placeholder
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-center">
          <p>No sales by category data available</p>
          <p className="text-xs mt-2">Data will appear here once sales are made</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="bg-white dark:bg-gray-800 p-2 shadow-md border border-gray-100 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{payload[0].name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">${payload[0].value.toFixed(2)}</p>
        </Card>
      )
    }
    return null
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            innerRadius={40}
            fill="#ec4899"
            dataKey="sales"
            nameKey="category"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#ffffff" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: "20px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

