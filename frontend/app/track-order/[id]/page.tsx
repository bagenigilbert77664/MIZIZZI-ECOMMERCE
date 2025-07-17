"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import orderService from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader } from "@/components/ui/loader"
import { AlertCircle, CheckCircle2, Package2, Truck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function TrackOrderDetailPage({ params }: { params: { orderId: Promise<string> } }) {
  const orderId = use(params.orderId)
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated && !isLoading) {
      router.push("/auth/login")
      return
    }

    // Fetch order details
    const fetchOrder = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const orderData = await orderService.getOrderById(orderId)
        setOrder(orderData)
      } catch (error: any) {
        console.error("Error fetching order:", error)

        if (error.response?.status === 404) {
          setError("Order not found")
        } else {
          setError("Failed to load order details")
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchOrder()
    }
  }, [isAuthenticated, orderId, router])

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader  />
            <p className="mt-4 text-muted-foreground">Loading order tracking information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-10">
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-red-100 p-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">{error}</h2>
            <p className="mb-6 text-center text-muted-foreground">
              We couldn't find the tracking information for this order.
            </p>
            <Button asChild>
              <Link href="/orders">View All Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Define tracking steps based on order status
  const trackingSteps = [
    { status: "pending", label: "Order Placed", icon: CheckCircle2, completed: true },
    {
      status: "processing",
      label: "Processing",
      icon: Package2,
      completed: ["processing", "shipped", "delivered"].includes(order?.status),
    },
    {
      status: "shipped",
      label: "Shipped",
      icon: Truck,
      completed: ["shipped", "delivered"].includes(order?.status),
    },
    {
      status: "delivered",
      label: "Delivered",
      icon: CheckCircle2,
      completed: order?.status === "delivered",
    },
  ]

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Track Order</h1>
        <p className="mt-2 text-muted-foreground">
          Order #{order?.order_number} • Placed on {new Date(order?.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Tracking Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tracking Information</CardTitle>
          <CardDescription>
            Current Status: <span className="font-medium capitalize">{order?.status}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-6 top-0 h-full w-0.5 bg-muted" />

            {/* Tracking Steps */}
            <div className="space-y-8">
              {trackingSteps.map((step, index) => (
                <div key={step.status} className="relative flex items-start gap-4">
                  <div
                    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                      step.completed
                        ? "border-green-500 bg-green-50 text-green-600"
                        : "border-muted bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className={`font-medium ${step.completed ? "text-green-700" : "text-muted-foreground"}`}>
                      {step.label}
                    </h3>
                    {step.completed && (
                      <p className="text-sm text-muted-foreground">
                        {index === 0
                          ? `${new Date(order?.created_at).toLocaleDateString()} at ${new Date(order?.created_at).toLocaleTimeString()}`
                          : index === trackingSteps.length - 1 && order?.status === "delivered"
                            ? "Your order has been delivered"
                            : `${step.status === order?.status ? "In progress" : "Completed"}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-medium">Shipping Address</h3>
              <address className="not-italic text-sm text-muted-foreground">
                {order?.shipping_address.first_name} {order?.shipping_address.last_name}
                <br />
                {order?.shipping_address.address_line1}
                <br />
                {order?.shipping_address.city}, {order?.shipping_address.state}
                <br />
                {order?.shipping_address.postal_code}
                <br />
                {order?.shipping_address.country}
                <br />
                {order?.shipping_address.phone}
              </address>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Shipping Method</h3>
              <p className="text-sm text-muted-foreground capitalize">{order?.shipping_method}</p>

              <h3 className="mb-2 mt-4 font-medium">Payment Method</h3>
              <p className="text-sm text-muted-foreground capitalize">{order?.payment_method?.replace("_", " ")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Status: <span className="capitalize">{order?.payment_status}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order?.items?.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-none overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={item.product?.thumbnail_url || "/placeholder.svg?height=64&width=64"}
                    alt={item.product?.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.product?.name}</h4>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">KSh {item.total.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">KSh {item.price.toLocaleString()} each</p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>KSh {(order?.total_amount - order?.shipping_cost).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order?.shipping_cost === 0 ? "Free" : `KSh ${order?.shipping_cost.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>KSh {order?.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" asChild>
          <Link href="/orders">Back to Orders</Link>
        </Button>

        {order?.status === "pending" && (
          <Button
            variant="destructive"
            onClick={async () => {
              try {
                await orderService.cancelOrder(order.id)
                router.push("/orders")
              } catch (error) {
                console.error("Failed to cancel order:", error)
              }
            }}
          >
            Cancel Order
          </Button>
        )}
      </div>
    </div>
  )
}
