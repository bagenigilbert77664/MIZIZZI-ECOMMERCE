"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface OverviewProps {
  salesData: Array<{
    label: string
    sales: number
    orders: number
  }>
}

export function Overview({ salesData }: OverviewProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="bg-white p-2 shadow-md border">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-green-600">{formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-blue-600">{payload[1].value} orders</p>
        </Card>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      {salesData.length > 0 ? (
        <BarChart data={salesData}>
          <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="sales" fill="#4ade80" radius={[4, 4, 0, 0]} />
          <Bar dataKey="orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">No sales data available</div>
      )}
    </ResponsiveContainer>
  )
}

