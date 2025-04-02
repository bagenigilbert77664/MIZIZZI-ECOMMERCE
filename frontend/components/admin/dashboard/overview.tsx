"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface OverviewProps {
  salesData?: Array<{
    label: string
    sales: number
    orders: number
  }>
}

export function Overview({ salesData = [] }: OverviewProps) {
  // Handle the case where salesData is undefined or not an array
  if (!Array.isArray(salesData) || salesData.length === 0) {
    // Create placeholder data if no data is available
    const placeholderData = Array.from({ length: 12 }, (_, i) => ({
      label: `Day ${i + 1}`,
      sales: 0,
      orders: 0,
    }))

    return (
      <div className="w-full h-[350px] rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={placeholderData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 10 }} // Smaller font for mobile
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
              tickMargin={8}
              tick={{ fontSize: 10 }} // Smaller font for mobile
              width={45} // Fixed width to ensure enough space for labels
            />
            <Tooltip
              formatter={(value: number) => [`$${value}`, "Sales"]}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                padding: "8px 12px",
              }}
              cursor={{ fill: "rgba(236, 72, 153, 0.1)" }}
            />
            <Bar dataKey="sales" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={30} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 10 }} // Smaller font for mobile
            interval="preserveStartEnd" // Only show start and end ticks on small screens
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
            tickMargin={8}
            tick={{ fontSize: 10 }} // Smaller font for mobile
            width={45} // Fixed width to ensure enough space for labels
          />
          <Tooltip
            formatter={(value: number) => [`$${value}`, "Sales"]}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              padding: "8px 12px",
            }}
            cursor={{ fill: "rgba(236, 72, 153, 0.1)" }}
          />
          <Bar dataKey="sales" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={30} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

