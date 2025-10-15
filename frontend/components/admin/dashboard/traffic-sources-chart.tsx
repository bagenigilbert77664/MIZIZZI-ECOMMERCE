"use client"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { motion } from "framer-motion"

interface TrafficSource {
  name: string
  value: number
  color: string
}

interface TrafficSourcesChartProps {
  data: TrafficSource[]
}

export function TrafficSourcesChart({ data }: TrafficSourcesChartProps) {
  // Default data if none provided
  const chartData =
    data && data.length > 0
      ? data
      : [
          { name: "Direct", value: 0, color: "#3b82f6" },
          { name: "Organic Search", value: 0, color: "#10b981" },
          { name: "Social Media", value: 0, color: "#f59e0b" },
          { name: "Referral", value: 0, color: "#8b5cf6" },
          { name: "Email", value: 0, color: "#ec4899" },
        ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 shadow-md border border-gray-100 dark:border-gray-700 rounded-md">
          <p className="font-medium text-gray-900 dark:text-white">{payload[0].name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{`${payload[0].value} visits (${((payload[0].value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`}</p>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
        <CardDescription>Where your visitors are coming from</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ paddingLeft: "20px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </motion.div>
  )
}

