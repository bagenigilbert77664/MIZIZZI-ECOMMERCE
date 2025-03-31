"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface SalesData {
  label: string
  sales: number
  orders?: number
}

interface OverviewProps {
  salesData: SalesData[]
}

export function Overview({ salesData }: OverviewProps) {
  // Ensure salesData is an array to prevent "Cannot read properties of undefined (reading 'length')" error
  const data = Array.isArray(salesData) ? salesData : []

  // If no data is provided, show a placeholder with empty data
  if (data.length === 0) {
    const emptyData = Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}`,
      sales: 0,
      orders: 0,
    }))

    return (
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={emptyData}>
            <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip formatter={(value: number) => [`$${value}`, "Sales"]} labelFormatter={(label) => `Day ${label}`} />
            <Bar dataKey="sales" fill="#adfa1d" radius={[4, 4, 0, 0]} className="fill-primary" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-center text-sm text-muted-foreground mt-2">No sales data available for this period</div>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip formatter={(value: number) => [`$${value}`, "Sales"]} />
          <Bar dataKey="sales" fill="#adfa1d" radius={[4, 4, 0, 0]} className="fill-primary" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

