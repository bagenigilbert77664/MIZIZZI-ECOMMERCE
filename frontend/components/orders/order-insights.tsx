"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, PieChart, LineChart } from 'lucide-react'
import type { Order } from "@/types"

interface OrderInsightsProps {
  orders: Order[]
  orderStats: {
    total: number
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    returned: number
  }
  statusColors: Record<string, { color: string; bgColor: string; icon: React.ReactNode }>
}

export function OrderInsights({ orders, orderStats, statusColors }: OrderInsightsProps) {
  const [activeTab, setActiveTab] = useState("summary")

  // Calculate total spent
  const totalSpent = orders.reduce((sum, order) => {
    const orderTotal = order.total_amount || order.total || 0
    return sum + orderTotal
  }, 0)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate order status distribution percentages
  const calculatePercentage = (count: number) => {
    if (orderStats.total === 0) return 0
    return Math.round((count / orderStats.total) * 100)
  }

  return (
    <Card className="p-5 mb-6 border border-gray-100 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Order Insights</h2>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-gray-100 p-1 h-9">
            <TabsTrigger
              value="summary"
              className="text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              <BarChart className="h-3.5 w-3.5 mr-1.5" />
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="status"
              className="text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              <PieChart className="h-3.5 w-3.5 mr-1.5" />
              Status
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="text-xs px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              <LineChart className="h-3.5 w-3.5 mr-1.5" />
              Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-gray-900">{orderStats.total}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Total Spent</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Completed Orders</div>
                <div className="text-2xl font-bold text-emerald-600">{orderStats.delivered}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">In Progress</div>
                <div className="text-2xl font-bold text-amber-600">
                  {orderStats.pending + orderStats.processing + orderStats.shipped}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-3">
                {/* Pending */}
                <div className="flex items-center justify-between bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {statusColors.pending.icon}
                    <span className="ml-2 font-medium text-amber-800">Pending</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-amber-800 font-bold">{orderStats.pending}</span>
                    <span className="ml-2 text-xs text-amber-600">
                      {calculatePercentage(orderStats.pending)}%
                    </span>
                  </div>
                </div>

                {/* Processing */}
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {statusColors.processing.icon}
                    <span className="ml-2 font-medium text-blue-800">Processing</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-800 font-bold">{orderStats.processing}</span>
                    <span className="ml-2 text-xs text-blue-600">
                      {calculatePercentage(orderStats.processing)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Shipped */}
                <div className="flex items-center justify-between bg-indigo-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {statusColors.shipped.icon}
                    <span className="ml-2 font-medium text-indigo-800">Shipped</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-indigo-800 font-bold">{orderStats.shipped}</span>
                    <span className="ml-2 text-xs text-indigo-600">
                      {calculatePercentage(orderStats.shipped)}%
                    </span>
                  </div>
                </div>

                {/* Delivered */}
                <div className="flex items-center justify-between bg-emerald-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {statusColors.delivered.icon}
                    <span className="ml-2 font-medium text-emerald-800">Delivered</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-emerald-800 font-bold">{orderStats.delivered}</span>
                    <span className="ml-2 text-xs text-emerald-600">
                      {calculatePercentage(orderStats.delivered)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Cancelled */}
                <div className="flex items-center justify-between bg-rose-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {statusColors.cancelled.icon}
                    <span className="ml-2 font-medium text-rose-800">Cancelled</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-rose-800 font-bold">{orderStats.cancelled}</span>
                    <span className="ml-2 text-xs text-rose-600">
                      {calculatePercentage(orderStats.cancelled)}%
                    </span>
                  </div>
                </div>

                {/* Returned */}
                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {statusColors.returned.icon}
                    <span className="ml-2 font-medium text-slate-800">Returned</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-slate-800 font-bold">{orderStats.returned}</span>
                    <span className="ml-2 text-xs text-slate-600">
                      {calculatePercentage(orderStats.returned)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="mt-4">
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
              <div className="text-center">
                <LineChart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Order trend visualization will appear here</p>
                <p className="text-xs text-gray-400 mt-1">Coming soon</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  )
}
