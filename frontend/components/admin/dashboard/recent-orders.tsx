"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { Eye } from "lucide-react"
import { useMobile } from "@/styles/hooks/use-mobile"

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  created_at: string
  user?: {
    name: string
    email: string
  }
}

interface RecentOrdersProps {
  orders: Order[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const router = useRouter()
  const isMobile = useMobile()

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-gray-400 dark:text-gray-500">
          <p>No recent orders found</p>
          <p className="text-xs mt-2">New orders will appear here</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === "delivered" || statusLower === "shipped" || statusLower === "processing") return "default"
    if (statusLower === "pending") return "secondary"
    if (statusLower === "cancelled") return "destructive"
    return "default"
  }

  // Mobile-optimized card view for orders
  if (isMobile) {
    return (
      <div className="space-y-3">
        {orders.slice(0, 5).map((order) => (
          <div key={order.id} className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="p-3 flex justify-between items-center border-b">
              <div>
                <div className="font-medium">{order.order_number}</div>
                <div className="text-xs text-gray-500">{order.user?.name || "Guest"}</div>
              </div>
              <Badge variant={getStatusColor(order.status)} className="capitalize">
                {order.status.toLowerCase()}
              </Badge>
            </div>
            <div className="p-3 flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500">{formatDate(order.created_at)}</div>
                <div className="font-medium">${order.total_amount?.toFixed(2) || "0.00"}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/orders/${order.id}`)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
                <span className="sr-only">View order</span>
              </Button>
            </div>
          </div>
        ))}
        {orders.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")} className="text-xs">
              View all orders
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[120px]">Order</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.slice(0, 5).map((order) => (
            <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <TableCell className="font-medium">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{order.order_number}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                    {order.user?.name || "Guest"}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-gray-500 dark:text-gray-400">
                {formatDate(order.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusColor(order.status)} className="capitalize">
                  {order.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">${order.total_amount?.toFixed(2) || "0.00"}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  className="h-8 w-8"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View order</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders.length > 5 && (
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")} className="text-xs">
            View all orders
          </Button>
        </div>
      )}
    </div>
  )
}
