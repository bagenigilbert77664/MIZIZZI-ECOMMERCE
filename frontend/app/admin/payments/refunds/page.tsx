"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, RefreshCcw, Eye, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  order_number: string
  user_id: number
  total_amount: number
  status: string
  payment_status: string
  created_at: string
  user: {
    name: string
    email: string
  }
}

interface RefundRequest {
  order_id: string
  amount: number
  reason: string
  refund_type: "full" | "partial"
}

export default function RefundsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundRequest, setRefundRequest] = useState<RefundRequest>({
    order_id: "",
    amount: 0,
    reason: "",
    refund_type: "full",
  })
  const [processing, setProcessing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    total_refunds: 0,
    total_amount: 0,
    pending_refunds: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
    fetchStats()
  }, [currentPage, searchTerm])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "20",
        status: "refunded,completed",
        search: searchTerm,
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch orders")
      }

      const data = await response.json()
      setOrders(data.orders || [])
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/orders/stats?status=refunded`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats({
          total_refunds: data.total_orders || 0,
          total_amount: data.total_amount || 0,
          pending_refunds: data.pending_refunds || 0,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const initiateRefund = (order: Order) => {
    setSelectedOrder(order)
    setRefundRequest({
      order_id: order.id,
      amount: order.total_amount,
      reason: "",
      refund_type: "full",
    })
    setShowRefundDialog(true)
  }

  const processRefund = async () => {
    if (!refundRequest.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the refund",
        variant: "destructive",
      })
      return
    }

    if (refundRequest.refund_type === "partial" && refundRequest.amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid refund amount",
        variant: "destructive",
      })
      return
    }

    try {
      setProcessing(true)
      const token = localStorage.getItem("admin_token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/orders/${refundRequest.order_id}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: refundRequest.amount,
            reason: refundRequest.reason,
            refund_type: refundRequest.refund_type,
          }),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to process refund")
      }

      toast({
        title: "Success",
        description: "Refund processed successfully",
      })

      setShowRefundDialog(false)
      fetchOrders()
      fetchStats()
    } catch (error: any) {
      console.error("Error processing refund:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const exportRefunds = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/orders/export?status=refunded`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `refunds-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting refunds:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Refunds Management</h1>
            <p className="mt-1 text-sm text-gray-600">Process and track refunds for completed orders</p>
          </div>
          <Button onClick={exportRefunds} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Refunds</p>
                <p className="mt-2 text-3xl font-bold text-purple-900">{stats.total_refunds}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <RefreshCcw className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Refunded Amount</p>
                <p className="mt-2 text-3xl font-bold text-purple-900">{formatCurrency(stats.total_amount)}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <RefreshCcw className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Pending Refunds</p>
                <p className="mt-2 text-3xl font-bold text-purple-900">{stats.pending_refunds}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <AlertCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by order number, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{order.user?.name}</div>
                          <div className="text-gray-500">{order.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === "refunded" ? "secondary" : "default"}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.payment_status === "refunded"
                              ? "secondary"
                              : order.payment_status === "completed"
                                ? "default"
                                : "outline"
                          }
                        >
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status !== "refunded" && order.payment_status === "completed" && (
                            <Button variant="outline" size="sm" onClick={() => initiateRefund(order)}>
                              <RefreshCcw className="mr-1 h-3 w-3" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>Initiate a refund for order {selectedOrder?.order_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Refund Type</label>
              <Select
                value={refundRequest.refund_type}
                onValueChange={(value: "full" | "partial") =>
                  setRefundRequest({
                    ...refundRequest,
                    refund_type: value,
                    amount: value === "full" ? selectedOrder?.total_amount || 0 : 0,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Refund</SelectItem>
                  <SelectItem value="partial">Partial Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {refundRequest.refund_type === "partial" && (
              <div>
                <label className="text-sm font-medium">Refund Amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={refundRequest.amount}
                  onChange={(e) =>
                    setRefundRequest({
                      ...refundRequest,
                      amount: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  max={selectedOrder?.total_amount}
                />
                <p className="mt-1 text-xs text-gray-500">Max: {formatCurrency(selectedOrder?.total_amount || 0)}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Reason for Refund</label>
              <Textarea
                placeholder="Enter reason for refund..."
                value={refundRequest.reason}
                onChange={(e) =>
                  setRefundRequest({
                    ...refundRequest,
                    reason: e.target.value,
                  })
                }
                rows={4}
              />
            </div>

            <div className="rounded-md bg-purple-50 p-3">
              <p className="text-sm font-medium text-purple-900">
                Refund Amount: {formatCurrency(refundRequest.amount)}
              </p>
              <p className="mt-1 text-xs text-purple-700">
                This action will process the refund and update the order status
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={processRefund} disabled={processing}>
              {processing ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder && !showRefundDialog} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Complete information about order {selectedOrder?.order_number}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Number</p>
                  <p className="mt-1 font-semibold">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="mt-1 font-semibold">{formatCurrency(selectedOrder.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer</p>
                  <p className="mt-1">{selectedOrder.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{selectedOrder.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Status</p>
                  <Badge className="mt-1">{selectedOrder.status}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Status</p>
                  <Badge className="mt-1">{selectedOrder.payment_status}</Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Order Date</p>
                  <p className="mt-1">{formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
