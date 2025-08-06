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
      <div className="w-full h-[350px] rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-900/30 flex items-center justify-center p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm backdrop-blur-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={placeholderData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.8)" />
                <stop offset="100%" stopColor="rgba(217, 70, 239, 0.8)" />
              </linearGradient>
            </defs>
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
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                padding: "8px 12px",
              }}
              cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
            />
            <Bar dataKey="sales" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={30} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="w-full h-[350px] rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.8)" />
              <stop offset="100%" stopColor="rgba(217, 70, 239, 0.8)" />
            </linearGradient>
          </defs>
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
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              padding: "8px 12px",
            }}
            cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
          />
          <Bar dataKey="sales" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={30} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
