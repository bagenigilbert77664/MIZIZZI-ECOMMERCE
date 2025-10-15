"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UpdateOrderStatusPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated && orderId && !isNaN(Number(orderId))) {
      fetchOrderDetails()
    } else if (orderId && isNaN(Number(orderId))) {
      router.push("/admin/orders")
    }
  }, [isAuthenticated, orderId])

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true)
      const orderIdNumber = Number.parseInt(orderId)
      if (isNaN(orderIdNumber)) {
        throw new Error("Invalid order ID")
      }
      const response = await adminService.getOrder(orderIdNumber)
      setOrder(response)
      setNewStatus(response.status)
      setTrackingNumber(response.tracking_number || "")
      setTrackingUrl(response.tracking_url || "")
      setNotes(response.notes || "")
    } catch (error) {
      console.error("Failed to fetch order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive",
      })
      router.push("/admin/orders")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUpdating(true)
      await adminService.updateOrderStatus(Number.parseInt(orderId), {
        status: newStatus,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        notes: notes,
      })

      toast({
        title: "Success",
        description: "Order status updated successfully",
      })

      // Redirect back to order details
      router.push(`/admin/orders/${orderId}`)
    } catch (error) {
      console.error("Failed to update order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
      case "canceled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Order has been placed and is awaiting processing"
      case "processing":
        return "Order is being prepared for shipment"
      case "shipped":
        return "Order has been shipped and is on its way"
      case "delivered":
        return "Order has been successfully delivered"
      case "cancelled":
      case "canceled":
        return "Order has been cancelled"
      default:
        return "Order status"
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Order Not Found</h2>
          <p className="text-muted-foreground mt-2">The order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/admin/orders")} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push(`/admin/orders/${orderId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Update Order Status</h1>
            <p className="text-muted-foreground">
              Order #{order.order_number} • Placed on {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/orders/${orderId}`)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleStatusUpdate} disabled={isUpdating}>
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Update Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Status Update</CardTitle>
              <CardDescription>Change the order status and add tracking information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div>
                <Label className="text-sm font-medium">Current Status</Label>
                <div className="mt-2">
                  <Badge className={`${getStatusColor(order.status)} text-sm`} variant="outline">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* New Status */}
              <div>
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <div className="flex flex-col items-start">
                        <span>Pending</span>
                        <span className="text-xs text-muted-foreground">Order awaiting processing</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="processing">
                      <div className="flex flex-col items-start">
                        <span>Processing</span>
                        <span className="text-xs text-muted-foreground">Order being prepared</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="shipped">
                      <div className="flex flex-col items-start">
                        <span>Shipped</span>
                        <span className="text-xs text-muted-foreground">Order has been shipped</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="delivered">
                      <div className="flex flex-col items-start">
                        <span>Delivered</span>
                        <span className="text-xs text-muted-foreground">Order successfully delivered</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex flex-col items-start">
                        <span>Cancelled</span>
                        <span className="text-xs text-muted-foreground">Order has been cancelled</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {newStatus && <p className="text-sm text-muted-foreground mt-2">{getStatusDescription(newStatus)}</p>}
              </div>

              {/* Tracking Information */}
              {(newStatus === "shipped" || newStatus === "delivered") && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tracking">Tracking Number</Label>
                    <Input
                      id="tracking"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="trackingUrl">Tracking URL (Optional)</Label>
                    <Input
                      id="trackingUrl"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="https://tracking.example.com/track"
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this status update..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* Status Change Warning */}
              {newStatus !== order.status && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Status Change Confirmation</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          You are changing the order status from <span className="font-medium">{order.status}</span> to{" "}
                          <span className="font-medium">{newStatus}</span>.
                        </p>
                        {newStatus === "cancelled" && (
                          <p className="mt-1">
                            <strong>Warning:</strong> Cancelling this order may trigger refund processes.
                          </p>
                        )}
                        {newStatus === "delivered" && (
                          <p className="mt-1">
                            <strong>Note:</strong> Marking as delivered will complete the order lifecycle.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Order Number</span>
                <span className="text-sm font-medium">#{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Customer</span>
                <span className="text-sm font-medium">{order.user?.name || "Guest"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Amount</span>
                <span className="text-sm font-medium">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Payment Status</span>
                <Badge variant="outline" className="text-xs">
                  {order.payment_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Items</span>
                <span className="text-sm font-medium">{order.items?.length || 0}</span>
              </div>
              {order.tracking_number && (
                <div className="flex justify-between">
                  <span className="text-sm">Current Tracking</span>
                  <span className="text-sm font-mono">{order.tracking_number}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setNewStatus("processing")}
              >
                Mark as Processing
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setNewStatus("shipped")}
              >
                Mark as Shipped
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setNewStatus("delivered")}
              >
                Mark as Delivered
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={() => setNewStatus("cancelled")}
              >
                Cancel Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
