"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, Package, ShoppingCart, Users } from "lucide-react"

interface DashboardStatsProps {
  data?: {
    users?: number
    products?: number
    orders?: number
  }
  sales?: {
    today?: number
    monthly?: number
  }
}

export function DashboardStats({ data, sales }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${sales?.monthly?.toLocaleString() || "0"}</div>
          <p className="text-xs text-muted-foreground">
            +20.1% from last month
            <ArrowUpIcon className="ml-1 h-3 w-3 inline text-green-500" />
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.orders?.toLocaleString() || "0"}</div>
          <p className="text-xs text-muted-foreground">
            +12.5% from last month
            <ArrowUpIcon className="ml-1 h-3 w-3 inline text-green-500" />
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.products?.toLocaleString() || "0"}</div>
          <p className="text-xs text-muted-foreground">
            +5.2% from last month
            <ArrowUpIcon className="ml-1 h-3 w-3 inline text-green-500" />
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.users?.toLocaleString() || "0"}</div>
          <p className="text-xs text-muted-foreground">
            -3.1% from last month
            <ArrowDownIcon className="ml-1 h-3 w-3 inline text-red-500" />
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

