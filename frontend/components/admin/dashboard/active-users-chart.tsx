"use client"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ChartData {
  date: string
  users: number
}

interface ActiveUsersChartProps {
  data: ChartData[]
}

export function ActiveUsersChart({ data = [] }: ActiveUsersChartProps) {
  // If no data is provided, use sample data
  const chartData =
    data.length > 0
      ? data
      : [
          { date: "Mon", users: 0 },
          { date: "Tue", users: 0 },
          { date: "Wed", users: 0 },
          { date: "Thu", users: 0 },
          { date: "Fri", users: 0 },
          { date: "Sat", users: 0 },
          { date: "Sun", users: 0 },
        ]

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Active Users</h3>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

