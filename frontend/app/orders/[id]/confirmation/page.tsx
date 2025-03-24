"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { Check, CheckCircle, Truck, ShoppingBag, AlertCircle, Home, ListOrdered } from "lucide-react"

export default function OrderConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderId = params.id as string

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const data = await orderService.getOrderById(orderId)
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

    if (orderId) {
      fetchOrder()
    }
  }, [orderId, toast])

  if (loading) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-6 text-gray-600">Loading your order details from the server...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container max-w-4xl py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "We couldn't find the order you're looking for. Please check the order ID and try again."}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button asChild variant="outline">
            <Link href="/orders">View All Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  const {
    order_number,
    status,
    created_at,
    items,
    shipping_address,
    billing_address,
    payment_method,
    shipping_method,
    subtotal_amount,
    shipping_amount,
    tax_amount,
    total_amount,
    discount_amount,
  } = order

  return (
    <div className="bg-gray-50 py-12">
      <div className="container max-w-4xl">
        {/* Success Message */}
        <div className="mb-10 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Thank you for your purchase. Your order has been confirmed and will be shipped soon.
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-8 overflow-hidden border border-gray-200 shadow-sm">
          <div className="bg-primary/10 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-medium text-gray-800">Order #{order_number}</h2>
                <p className="text-sm text-gray-500">Placed on {formatDate(created_at)}</p>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {status}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-0">
            {/* Delivery Information */}
            <div className="px-4 py-6 sm:px-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:gap-12">
                <div className="mb-6 md:mb-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <Truck className="h-4 w-4 mr-2" />
                    Shipping Details
                  </h3>
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">
                      {shipping_address.first_name} {shipping_address.last_name}
                    </p>
                    <p className="text-gray-600">{shipping_address.address_line1}</p>
                    <p className="text-gray-600">
                      {shipping_address.city}, {shipping_address.state} {shipping_address.postal_code}
                    </p>
                    <p className="text-gray-600">{shipping_address.country}</p>
                    <p className="text-gray-600">Phone: {shipping_address.phone}</p>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Order Information
                  </h3>
                  <div className="text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-700">Shipping Method:</span>{" "}
                      {shipping_method === "standard" ? "Standard Shipping" : shipping_method}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-700">Payment Method:</span>{" "}
                      {payment_method === "cash_on_delivery"
                        ? "Cash on Delivery"
                        : payment_method === "credit-card"
                          ? "Credit Card"
                          : payment_method}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-700">Estimated Delivery:</span>{" "}
                      {new Date(new Date(created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="px-4 sm:px-6 py-6 border-b border-gray-200">
              <h3 className="font-medium text-gray-800 mb-4">Order Items</h3>
              <div className="space-y-4">
                {items.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                      <Image
                        src={
                          item.product.image_url ||
                          item.product.thumbnail_url ||
                          `/placeholder.svg?height=80&width=80&text=${encodeURIComponent(item.product.name)}`
                        }
                        alt={item.product.name}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium text-gray-800">{item.product.name}</h4>
                          {item.product.variation && (
                            <p className="text-sm text-gray-500">
                              {Object.entries(item.product.variation)
                                .map(([key, value]) => `${key}: ${String(value)}`)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800">{formatCurrency(item.unit_price)}</p>
                      </div>
                      <div className="flex mt-1 justify-between text-sm">
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                        <p className="font-medium text-gray-800">{formatCurrency(item.quantity * item.unit_price)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="px-4 sm:px-6 py-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency(subtotal_amount)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-gray-600">Shipping</p>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency(shipping_amount)}</p>
                </div>
                {tax_amount > 0 && (
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">Tax</p>
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(tax_amount)}</p>
                  </div>
                )}
                {discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <p className="text-sm">Discount</p>
                    <p className="text-sm font-medium">-{formatCurrency(discount_amount)}</p>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <p className="font-medium text-gray-800">Total</p>
                  <p className="font-bold text-primary">{formatCurrency(total_amount)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" size="lg" className="flex items-center gap-2">
            <Link href="/products">
              <Home className="h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
          <Button asChild size="lg" className="flex items-center gap-2">
            <Link href="/orders">
              <ListOrdered className="h-4 w-4" />
              View All Orders
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

