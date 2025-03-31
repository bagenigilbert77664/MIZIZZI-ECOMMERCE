"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

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

  if (!orders || orders.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">No recent orders found</div>
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === "delivered") return "success"
    if (statusLower === "shipped") return "info"
    if (statusLower === "processing") return "warning"
    if (statusLower === "pending") return "secondary"
    if (statusLower === "cancelled") return "destructive"
    return "default"
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.order_number}
                <div className="text-xs text-muted-foreground">{order.user?.name || "Guest"}</div>
              </TableCell>
              <TableCell>{formatDate(order.created_at)}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
              </TableCell>
              <TableCell>${order.total_amount?.toFixed(2) || "0.00"}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

