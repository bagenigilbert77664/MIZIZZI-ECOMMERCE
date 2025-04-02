"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

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
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={placeholderData}>
          <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value: number) => [`$${value}`, "Sales"]}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Bar dataKey="sales" fill="#8884d8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={salesData}>
        <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value}`, "Sales"]}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Bar dataKey="sales" fill="#8884d8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

