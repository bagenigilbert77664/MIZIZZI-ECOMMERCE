import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ShoppingCart, DollarSign, Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface DashboardStatsProps {
  data: {
    users: number
    products: number
    orders: number
    categories?: number
    brands?: number
    reviews?: number
    pending_reviews?: number
    newsletter_subscribers?: number
  }
  sales: {
    today: number
    yesterday?: number
    weekly?: number
    monthly: number
    yearly?: number
  }
  orderStatus?: Record<string, number>
}

export function DashboardStats({ data, sales, orderStatus = {} }: DashboardStatsProps) {
  // Calculate sales growth percentage
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100
    return ((current - previous) / previous) * 100
  }

  const dailyGrowth = sales.yesterday ? calculateGrowth(sales.today, sales.yesterday) : 0
  const monthlyGrowth = sales.yearly && sales.monthly ? calculateGrowth(sales.monthly, sales.yearly / 12) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(sales.monthly)}</div>
          <p className="text-xs text-muted-foreground">
            {monthlyGrowth > 0 ? (
              <span className="flex items-center text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />+{monthlyGrowth.toFixed(1)}% from average
              </span>
            ) : (
              <span className="flex items-center text-red-600">
                <TrendingDown className="mr-1 h-3 w-3" />
                {monthlyGrowth.toFixed(1)}% from average
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(sales.today)}</div>
          <p className="text-xs text-muted-foreground">
            {dailyGrowth > 0 ? (
              <span className="flex items-center text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />+{dailyGrowth.toFixed(1)}% from yesterday
              </span>
            ) : (
              <span className="flex items-center text-red-600">
                <TrendingDown className="mr-1 h-3 w-3" />
                {dailyGrowth.toFixed(1)}% from yesterday
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.orders.toLocaleString()}</div>
          <div className="mt-1 flex gap-1 text-xs">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
              {orderStatus.DELIVERED || 0} delivered
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
              {orderStatus.PROCESSING || 0} processing
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.users.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {data.newsletter_subscribers
              ? `${data.newsletter_subscribers} newsletter subscribers`
              : "Lifetime customers"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

