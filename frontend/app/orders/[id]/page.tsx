"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Truck, FileText, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import type { Order, OrderItem } from "@/types"

function OrderDetailsSkeleton() {
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
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
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

        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1 mb-4">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-4 w-40 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OrderPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        console.log(`Fetching order details for ID: ${params.id}`)
        const data = await orderService.getOrderById(params.id)
        console.log("Order details fetched:", data)
        setOrder(data)
      } catch (err: any) {
        console.error("Failed to fetch order:", err)
        setError(err.message || "Failed to load order details")
        toast({
          title: "Error",
          description: "Could not load order details. Please try again.",
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
        <OrderDetailsSkeleton />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-1">Order not found</h3>
          <p className="text-muted-foreground mb-4">
            The order you're looking for doesn't exist or you don't have permission to view it.
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

  // Get product image from order item
  const getProductImage = (item: OrderItem): string => {
    // Try to get image from product object
    if (item.product) {
      if (item.product.thumbnail_url) {
        return item.product.thumbnail_url
      }
      if (item.product.image_urls && item.product.image_urls.length > 0) {
        return item.product.image_urls[0]
      }
    }

    // Try other possible image properties
    if (item.thumbnail_url) {
      return item.thumbnail_url
    }
    if (item.image_url) {
      return item.image_url
    }

    // Fallback to placeholder
    return `/placeholder.svg?height=96&width=96`
  }

  // Get product name from order item
  const getProductName = (item: OrderItem): string => {
    // Try all possible name fields
    if (item.product?.name) {
      return item.product.name
    }
    if (item.product_name) {
      return item.product_name
    }
    if (item.name) {
      return item.name
    }

    // If we have a product_id but no name, create a generic name
    if (item.product_id) {
      return `Product #${item.product_id}`
    }

    return "Product"
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground">Placed on {formatDate(order.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                All Orders
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orders/${order.id}/invoice`}>
                <FileText className="h-4 w-4 mr-2" />
                Invoice
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/orders/${order.id}/track`}>
                <Truck className="h-4 w-4 mr-2" />
                Track Order
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                        <Image
                          src={getProductImage(item) || "/placeholder.svg"}
                          alt={getProductName(item)}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{getProductName(item)}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        {item.variation && Object.keys(item.variation).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Object.entries(item.variation)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
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
                  <span>${(order.total_amount || order.total).toFixed(2)}</span>
                </div>
              </div>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 mb-4">
                  <p className="font-medium">{order.shipping_address.name}</p>
                  <p className="text-sm">{order.shipping_address.street}</p>
                  <p className="text-sm">
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zipCode}
                  </p>
                  <p className="text-sm">{order.shipping_address.country}</p>
                </div>
                {order.tracking_number && (
                  <div>
                    <p className="text-sm font-medium">Tracking Number:</p>
                    <p className="text-sm">{order.tracking_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{order.carrier || "Shipping Carrier"}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 mb-4">
                  <p className="font-medium">{order.billing_address.name}</p>
                  <p className="text-sm">{order.billing_address.street}</p>
                  <p className="text-sm">
                    {order.billing_address.city}, {order.billing_address.state} {order.billing_address.zipCode}
                  </p>
                  <p className="text-sm">{order.billing_address.country}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Payment Method:</p>
                  <p className="text-sm">{order.payment_method}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

