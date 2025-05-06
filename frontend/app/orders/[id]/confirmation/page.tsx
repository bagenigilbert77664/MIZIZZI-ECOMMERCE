"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Truck, Package, Clock, AlertTriangle } from "lucide-react"
import { orderService } from "@/services/orders"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/contexts/cart/cart-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function OrderConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { clearCart } = useCart()

  const orderId = params?.orderId as string

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true)
        // Fetch the order details
        const orderData = await orderService.getOrderById(orderId)

        // Check if we have complete order data
        if (!orderData || !orderData.items || orderData.items.length === 0) {
          // If we've already retried 3 times, show an error
          if (retryCount >= 3) {
            throw new Error("Unable to load complete order details after multiple attempts")
          }

          // Otherwise, retry after a delay
          setTimeout(() => {
            setRetryCount((prev) => prev + 1)
          }, 2000)
          return
        }

        setOrder(orderData)

        // Clear the cart after successful order fetch
        await clearCart()
      } catch (error: any) {
        console.error("Error fetching order:", error)
        setError(error.message || "Failed to load order details")
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId, clearCart, retryCount])

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4 text-center">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading your order details...</p>
          {retryCount > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              Retrieving complete order information... Attempt {retryCount}/3
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4 text-center">
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
            <h1 className="text-3xl font-bold mb-4">Order Information Unavailable</h1>
            <p className="mb-6 text-gray-600 max-w-md mx-auto">
              {error ||
                "We couldn't find the order you're looking for. Your order has been placed, but we're having trouble displaying the details."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button onClick={() => router.push("/")}>Return to Home</Button>
              <Button variant="outline" onClick={() => router.push("/orders")}>
                View My Orders
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Format the order date
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

  // Check if any items are missing product details
  const hasMissingProductDetails = order.items.some(
    (item: any) => !item.product || !item.product.name || !item.product.thumbnail_url,
  )

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <Card className="overflow-hidden">
        <CardHeader className="bg-green-50 text-center border-b">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-green-800">Order Confirmed!</CardTitle>
          <p className="text-green-700 mt-2">Thank you for your purchase</p>
        </CardHeader>

        {hasMissingProductDetails && (
          <Alert className="mx-6 mt-6 border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some product details may not be displayed correctly. Your order has been placed successfully.
            </AlertDescription>
          </Alert>
        )}

        <CardContent className="p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Order Information</h3>
              <p className="text-sm text-gray-600">
                Order Number: <span className="font-medium text-gray-900">#{order.order_number || order.id}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date: <span className="font-medium text-gray-900">{orderDate}</span>
              </p>
              <p className="text-sm text-gray-600">
                Status: <span className="font-medium text-green-600 capitalize">{order.status || "Processing"}</span>
              </p>
              <p className="text-sm text-gray-600">
                Payment Method:{" "}
                <span className="font-medium text-gray-900 capitalize">{order.payment_method || "Credit Card"}</span>
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Shipping Address</h3>
              {order.shipping_address ? (
                <div className="text-sm text-gray-600">
                  <p>
                    {order.shipping_address.first_name} {order.shipping_address.last_name}
                  </p>
                  <p>{order.shipping_address.address_line1}</p>
                  {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                  {order.shipping_address.phone && <p>Phone: {order.shipping_address.phone}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Shipping information not available</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-8">
            <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, index: number) => (
                  <div key={index} className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                      <Image
                        src={
                          item.product?.thumbnail_url ||
                          item.product?.image_urls?.[0] ||
                          item.product_image ||
                          "/placeholder.svg?height=80&width=80" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={item.product?.name || item.product_name || "Product"}
                        fill
                        sizes="80px"
                        className="object-cover object-center"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <h4 className="text-sm font-medium text-gray-900">
                        {item.product?.name || item.product_name || item.name || "Product"}
                      </h4>
                      <p className="mt-1 text-xs text-gray-500">Quantity: {item.quantity}</p>
                      <div className="mt-auto flex justify-between items-center">
                        <p className="text-xs text-gray-500">Price: {formatPrice(item.price)}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatPrice(item.total || item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 py-3">No items found in this order</p>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(order.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">{order.shipping ? formatPrice(order.shipping) : "Free"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">
                  {formatPrice(order.tax || (order.subtotal ? order.subtotal * 0.16 : 0))}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">{formatPrice(order.total || 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">What's Next?</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-2">
                <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Order Processing</p>
                  <p className="text-xs text-blue-700">We're preparing your items for shipment</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Shipping</p>
                  <p className="text-xs text-blue-700">Your order will be shipped within 1-3 business days</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Delivery</p>
                  <p className="text-xs text-blue-700">Estimated delivery time: 3-5 business days</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-6 text-center">
            A confirmation email has been sent to {order.shipping_address?.email || "your email address"}.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 p-6 bg-gray-50 border-t">
          <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
            <Link href="/">Continue Shopping</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/orders">View My Orders</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
