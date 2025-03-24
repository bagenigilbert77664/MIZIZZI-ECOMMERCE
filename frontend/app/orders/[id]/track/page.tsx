"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader } from "@/components/ui/loader"
import { AlertCircle, ArrowLeft, Package2, Truck, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { orderService } from "@/services/order"

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
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

        const orderData = await orderService.getOrderById(params.id)
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
  }, [isAuthenticated, params.id, router])

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader size="large" />
            <p className="mt-4 text-muted-foreground">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/orders">View All Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Define the steps based on order status
  const steps = [
    { id: "pending", label: "Order Placed", icon: Package2, description: "Your order has been received" },
    { id: "processing", label: "Processing", icon: Package2, description: "Your order is being processed" },
    { id: "shipped", label: "Shipped", icon: Truck, description: "Your order is on the way" },
    { id: "delivered", label: "Delivered", icon: CheckCircle2, description: "Your order has been delivered" },
  ]

  // Determine the current step
  const currentStepIndex = steps.findIndex((step) => step.id === order?.status)
  const isCancelled = order?.status === "cancelled"

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Track Order #{order?.order_number}</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isCancelled ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">Order Cancelled</h2>
              <p className="text-muted-foreground">This order has been cancelled and will not be processed further.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="relative">
                {/* Progress bar */}
                <div className="absolute left-5 top-0 h-full w-0.5 bg-muted" />

                {/* Steps */}
                {steps.map((step, index) => {
                  const StepIcon = step.icon
                  const isCompleted = index <= currentStepIndex
                  const isCurrent = index === currentStepIndex

                  return (
                    <div key={step.id} className="relative flex pb-8 last:pb-0">
                      <div
                        className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                          isCompleted ? "border-green-500 bg-green-100" : "border-muted bg-background"
                        }`}
                      >
                        <StepIcon className={`h-5 w-5 ${isCompleted ? "text-green-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="ml-14">
                        <h3
                          className={`text-lg font-medium ${
                            isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {isCurrent && (
                          <p className="mt-1 text-sm font-medium text-green-600">
                            {new Date().toLocaleDateString()} - Current Status
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {order?.tracking_number && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Tracking Information</h3>
                  <p className="text-sm">
                    Tracking Number: <span className="font-medium">{order.tracking_number}</span>
                  </p>
                  <p className="mt-2 text-sm">
                    Carrier: <span className="font-medium">{order.shipping_method || "Standard Shipping"}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="mb-2 font-medium">Order Information</h3>
              <p className="text-sm">
                Order Date: <span className="font-medium">{new Date(order?.created_at).toLocaleDateString()}</span>
              </p>
              <p className="text-sm">
                Payment Method:{" "}
                <span className="font-medium capitalize">{order?.payment_method.replace("_", " ")}</span>
              </p>
              <p className="text-sm">
                Payment Status: <span className="font-medium capitalize">{order?.payment_status}</span>
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Shipping Address</h3>
              <address className="not-italic text-sm">
                {order?.shipping_address.first_name} {order?.shipping_address.last_name}
                <br />
                {order?.shipping_address.address_line1}
                <br />
                {order?.shipping_address.city}, {order?.shipping_address.state}
                <br />
                {order?.shipping_address.postal_code}
                <br />
                {order?.shipping_address.country}
              </address>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Contact Information</h3>
              <p className="text-sm">
                Email: <span className="font-medium">{order?.shipping_address.email}</span>
              </p>
              <p className="text-sm">
                Phone: <span className="font-medium">{order?.shipping_address.phone}</span>
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-4 font-medium">Order Items</h3>
            <div className="space-y-4">
              {order?.items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="relative h-16 w-16 flex-none overflow-hidden rounded-md border bg-muted">
                    <img
                      src={item.product?.thumbnail_url || "/placeholder.svg?height=64&width=64"}
                      alt={item.product?.name}
                      className="h-full w-full object-cover"
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
          </div>

          <div className="mt-6 flex justify-between border-t pt-4">
            <span>Subtotal</span>
            <span>KSh {(order?.total_amount - order?.shipping_cost).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{order?.shipping_cost === 0 ? "Free" : `KSh ${order?.shipping_cost.toLocaleString()}`}</span>
          </div>
          <div className="flex justify-between border-t pt-4 font-medium">
            <span>Total</span>
            <span>KSh {order?.total_amount.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

