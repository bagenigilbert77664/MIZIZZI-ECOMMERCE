"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { Button, ButtonProps } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader } from "@/components/ui/loader"
import { AlertCircle, CheckCircle2, Package2, Printer, ShoppingBag } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
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

        const response = await api.get(`/orders/${params.id}`)
        setOrder(response.data)
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

  // Handle print invoice
  const handlePrintInvoice = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader />
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

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8 flex flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-full bg-green-100 p-3">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Order Confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your purchase. Your order has been received and is being processed.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order #{order?.order_number}</CardTitle>
          <CardDescription>Placed on {new Date(order?.created_at).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
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
              <h3 className="mb-2 font-medium">Payment Method</h3>
              <p className="text-sm text-muted-foreground capitalize">{order?.payment_method.replace("_", " ")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Status: <span className="capitalize">{order?.payment_status}</span>
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Order Status</h3>
              <div className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                <span className="capitalize">{order?.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Estimated delivery: 3-5 business days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>KSh {(order?.total_amount - order?.shipping_cost).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{order?.shipping_cost === 0 ? "Free" : `KSh ${order?.shipping_cost.toLocaleString()}`}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>KSh {order?.total_amount.toLocaleString()}</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 sm:flex-row">
          <Button variant="outline" className="w-full" onClick={handlePrintInvoice}>
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/orders/${params.id}/track`}>
              <Package2 className="mr-2 h-4 w-4" />
              Track Order
            </Link>
          </Button>
          <Button className="w-full" asChild>
            <Link href="/products">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
