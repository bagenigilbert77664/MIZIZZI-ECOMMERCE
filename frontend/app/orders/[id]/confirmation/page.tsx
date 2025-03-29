import { notFound } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { CheckCircle, Package, Truck, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

// Mock function to fetch order data - replace with your actual API call
async function getOrder(id: string) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // For demo purposes, return mock data
  return {
    id,
    orderNumber: `ORD-${id}`,
    date: "March 25, 2025",
    email: "john.doe@example.com",
    items: [
      { id: "1", name: "Wireless Headphones", quantity: 1, price: 129.99 },
      { id: "2", name: "Smart Watch", quantity: 1, price: 249.99 },
    ],
    subtotal: 379.98,
    shipping: 0,
    tax: 31.35,
    total: 411.33,
    shippingAddress: {
      name: "John Doe",
      street: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      country: "USA",
    },
    paymentMethod: "Credit Card (ending in 4242)",
    estimatedDelivery: "March 30, 2025",
  }
}

function OrderConfirmationContent({ id }: { id: string }) {
  const orderPromise = getOrder(id)

  return (
    <Suspense fallback={<OrderConfirmationSkeleton />}>
      <OrderConfirmationData orderPromise={orderPromise} />
    </Suspense>
  )
}

async function OrderConfirmationData({ orderPromise }: { orderPromise: Promise<any> }) {
  const order = await orderPromise

  if (!order) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Thank You for Your Order!</h1>
        <p className="text-muted-foreground">Your order #{order.orderNumber} has been placed successfully.</p>
        <p className="text-muted-foreground">A confirmation email has been sent to {order.email}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between pb-4 border-b last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium">${item.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Separator className="mb-4" />
          <div className="w-full space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "Free" : `$${order.shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium">Estimated Delivery:</p>
              <p className="text-sm">{order.estimatedDelivery}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">Payment Method:</p>
            <p className="mb-4">{order.paymentMethod}</p>
            <p className="text-sm text-muted-foreground">Your payment has been processed successfully.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/orders/${order.id}`}>View Order Details</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/orders/${order.id}/invoice`}>
            <FileText className="h-4 w-4 mr-2" />
            View Invoice
          </Link>
        </Button>
      </div>
    </div>
  )
}

function OrderConfirmationSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-80 mx-auto" />
        <Skeleton className="h-4 w-72 mx-auto mt-1" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex justify-between pb-4 border-b last:border-0 last:pb-0">
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Separator className="mb-4" />
          <div className="w-full space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  )
}

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <OrderConfirmationContent id={params.id} />
    </div>
  )
}

