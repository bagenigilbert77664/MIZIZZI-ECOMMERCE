"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Package, Truck, CheckCircle, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import type { Order } from "@/types"

function TrackingDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-16 w-1" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function TrackOrderPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const data = await orderService.getOrderById(params.id)
        setOrder(data)
      } catch (err: any) {
        console.error("Failed to fetch order:", err)
        setError(err.message || "Failed to load order details")
        toast({
          title: "Error",
          description: "Could not load tracking information. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [params.id, toast])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <TrackingDetailsSkeleton />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-1">Tracking information not found</h3>
          <p className="text-muted-foreground mb-4">
            The tracking information you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Format date function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Format time function
  const formatTime = (dateString?: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  // Generate tracking events based on order status
  const generateTrackingEvents = (order: Order) => {
    const events = []
    const orderDate = new Date(order.created_at)

    // Order placed
    events.push({
      status: "Order Placed",
      date: orderDate,
      description: "Your order has been received and is being processed.",
      completed: true,
    })

    // Order processing
    const processingDate = new Date(orderDate)
    processingDate.setHours(processingDate.getHours() + 2)
    events.push({
      status: "Processing",
      date: processingDate,
      description: "Your order is being prepared for shipment.",
      completed: ["processing", "shipped", "delivered"].includes(order.status.toLowerCase()),
    })

    // Order shipped
    const shippedDate = new Date(orderDate)
    shippedDate.setDate(shippedDate.getDate() + 1)
    events.push({
      status: "Shipped",
      date: shippedDate,
      description: "Your order has been shipped and is on its way.",
      completed: ["shipped", "delivered"].includes(order.status.toLowerCase()),
    })

    // Out for delivery
    const outForDeliveryDate = new Date(orderDate)
    outForDeliveryDate.setDate(outForDeliveryDate.getDate() + 3)
    events.push({
      status: "Out for Delivery",
      date: outForDeliveryDate,
      description: "Your package is out for delivery today.",
      completed: order.status.toLowerCase() === "delivered",
    })

    // Delivered
    const deliveredDate = new Date(orderDate)
    deliveredDate.setDate(deliveredDate.getDate() + 3)
    deliveredDate.setHours(deliveredDate.getHours() + 8)
    events.push({
      status: "Delivered",
      date: deliveredDate,
      description: "Your package has been delivered.",
      completed: order.status.toLowerCase() === "delivered",
    })

    return events
  }

  const trackingEvents = generateTrackingEvents(order)

  // Get first order item for display
  const firstItem = order.items[0]
  const itemName =
    firstItem.product?.name || firstItem.product_name || firstItem.name || `Product #${firstItem.product_id}`
  const itemImage =
    firstItem.product?.thumbnail_url ||
    firstItem.thumbnail_url ||
    firstItem.image_url ||
    "/placeholder.svg?height=64&width=64"

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Tracking Information</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Order #{order.order_number} • {formatDate(order.created_at)}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders/${order.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Shipment Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Tracking Number</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.tracking_number ||
                      `TRK${Math.floor(Math.random() * 10000000)
                        .toString()
                        .padStart(7, "0")}`}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {trackingEvents.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-2 ${event.completed ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}
                      >
                        {index === 0 ? (
                          <Package className="h-5 w-5" />
                        ) : index === trackingEvents.length - 1 ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Truck className="h-5 w-5" />
                        )}
                      </div>
                      {index < trackingEvents.length - 1 && (
                        <div className={`h-16 w-0.5 ${event.completed ? "bg-primary" : "bg-gray-200"}`}></div>
                      )}
                    </div>
                    <div>
                      <h3 className={`font-medium ${event.completed ? "text-gray-900" : "text-gray-500"}`}>
                        {event.status}
                      </h3>
                      <p className={`text-sm ${event.completed ? "text-gray-600" : "text-gray-400"}`}>
                        {event.description}
                      </p>
                      <p className={`text-xs ${event.completed ? "text-gray-500" : "text-gray-400"}`}>
                        {event.completed ? (
                          <>
                            {formatDate(event.date.toISOString())} at {formatTime(event.date.toISOString())}
                          </>
                        ) : (
                          "Pending"
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                  <Image
                    src={itemImage || "/placeholder.svg"}
                    alt={itemName}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <p className="font-medium">{itemName}</p>
                  <p className="text-sm text-muted-foreground">Qty: {firstItem.quantity}</p>
                  {order.items.length > 1 && (
                    <p className="text-sm text-muted-foreground">+ {order.items.length - 1} more items</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{order.shipping_address.name}</p>
                <p className="text-sm">{order.shipping_address.street}</p>
                <p className="text-sm">
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zipCode}
                </p>
                <p className="text-sm">{order.shipping_address.country}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

