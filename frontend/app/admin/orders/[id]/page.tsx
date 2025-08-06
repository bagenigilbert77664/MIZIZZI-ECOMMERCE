"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Mail,
  Phone,
  Download,
  Printer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OrderDetailsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [notes, setNotes] = useState("")

  // Add validation to ensure orderId is a valid number
  useEffect(() => {
    if (isAuthenticated && orderId && !isNaN(Number(orderId))) {
      fetchOrderDetails()
    } else if (orderId && isNaN(Number(orderId))) {
      // If orderId is not a number, redirect to orders list
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
      setNotes(response.notes || "")
    } catch (error) {
      console.error("Failed to fetch order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive",
      })
      // Redirect to orders list if order not found
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
        notes: notes,
      })

      toast({
        title: "Success",
        description: "Order status updated successfully",
      })

      setShowStatusUpdate(false)
      fetchOrderDetails()
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "processing":
        return <Package className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
      case "canceled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
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
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.order_number}</h1>
            <p className="text-muted-foreground">Placed on {formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={() => setShowStatusUpdate(!showStatusUpdate)} size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Update Status
          </Button>
        </div>
      </div>

      {/* Status Update Panel */}
      {showStatusUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>Update Order Status</CardTitle>
            <CardDescription>Change the order status and add tracking information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Order Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this status update..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleStatusUpdate} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Status"}
              </Button>
              <Button variant="outline" onClick={() => setShowStatusUpdate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${getStatusColor(order.status)} flex items-center gap-2`} variant="outline">
                    {getStatusIcon(order.status)}
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <Badge className={getPaymentStatusColor(order.payment_status)} variant="outline">
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">{formatCurrency(order.total_amount)}</div>
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                </div>
              </div>
              {order.tracking_number && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Tracking Number</div>
                  <div className="text-lg font-mono">{order.tracking_number}</div>
                </div>
              )}
              {order.notes && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Notes</div>
                  <div className="text-sm">{order.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      {item.product?.thumbnail_url ? (
                        <img
                          src={item.product.thumbnail_url || "/placeholder.svg"}
                          alt={item.product?.name || "Product"}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.product?.name || `Product #${item.product_id}`}</div>
                      {item.variant && (
                        <div className="text-sm text-muted-foreground">
                          {item.variant.color && `Color: ${item.variant.color}`}
                          {item.variant.size && ` • Size: ${item.variant.size}`}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(item.total)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.total_amount - (order.shipping_cost || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{formatCurrency(order.shipping_cost || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer & Shipping Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="font-medium">{order.user?.name || "Guest Customer"}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {order.user?.email || "No email"}
                  </div>
                  {order.user?.phone && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {order.user.phone}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.shipping_address && (
                <div className="space-y-1 text-sm">
                  {typeof order.shipping_address === "string" ? (
                    <div>{order.shipping_address}</div>
                  ) : (
                    <>
                      <div className="font-medium">
                        {order.shipping_address.first_name} {order.shipping_address.last_name}
                      </div>
                      <div>{order.shipping_address.address_line1}</div>
                      {order.shipping_address.address_line2 && <div>{order.shipping_address.address_line2}</div>}
                      <div>
                        {order.shipping_address.city}, {order.shipping_address.state}{" "}
                        {order.shipping_address.postal_code}
                      </div>
                      <div>{order.shipping_address.country}</div>
                      {order.shipping_address.phone && (
                        <div className="flex items-center gap-1 mt-2">
                          <Phone className="h-3 w-3" />
                          {order.shipping_address.phone}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Method</span>
                  <span className="text-sm font-medium">
                    {order.payment_method?.charAt(0).toUpperCase() + order.payment_method?.slice(1) || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Status</span>
                  <Badge className={getPaymentStatusColor(order.payment_status)} variant="outline">
                    {order.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Amount</span>
                  <span className="text-sm font-medium">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Method</span>
                  <span className="text-sm font-medium">
                    {order.shipping_method?.charAt(0).toUpperCase() + order.shipping_method?.slice(1) || "Standard"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cost</span>
                  <span className="text-sm font-medium">{formatCurrency(order.shipping_cost || 0)}</span>
                </div>
                {order.tracking_number && (
                  <div className="flex justify-between">
                    <span className="text-sm">Tracking</span>
                    <span className="text-sm font-mono">{order.tracking_number}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
