"use client"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ChartData {
  month: string
  revenue: number
  refunds: number
}

interface RevenueVsRefundsChartProps {
  data: ChartData[]
}

export function RevenueVsRefundsChart({ data = [] }: RevenueVsRefundsChartProps) {
  // If no data is provided, use sample data
  const chartData =
    data.length > 0
      ? data
      : [
          { month: "Jan", revenue: 0, refunds: 0 },
          { month: "Feb", revenue: 0, refunds: 0 },
          { month: "Mar", revenue: 0, refunds: 0 },
        ]

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Revenue vs Refunds</h3>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#4ade80" name="Revenue" />
            <Bar dataKey="refunds" fill="#f87171" name="Refunds" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

