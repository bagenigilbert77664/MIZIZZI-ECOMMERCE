// Update the component to use React.use() for params
"use client"
import { use } from "react"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  CheckCircle,
  Package,
  Truck,
  Copy,
  Clock,
  Shield,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  Mail,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"

// Update the OrderConfirmationData component to use real order data

// Replace the getOrder function with this improved version that properly retrieves real product data
async function getOrder(id: string) {
  // Try to get order data from localStorage first
  if (typeof window !== "undefined") {
    try {
      const savedItems = localStorage.getItem("lastOrderItems")
      const savedDetails = localStorage.getItem("lastOrderDetails")

      if (savedItems && savedDetails) {
        const parsedItems = JSON.parse(savedItems)
        const parsedDetails = JSON.parse(savedDetails)

        console.log("Retrieved saved order items:", parsedItems)
        console.log("Retrieved saved order details:", parsedDetails)

        return {
          id,
          order_number: `ORD-${id}`,
          date: new Date(parsedDetails.date || new Date()).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          email: parsedDetails.shippingAddress?.email || "customer@example.com",
          items: parsedItems,
          subtotal: parsedDetails.subtotal || 0,
          shipping: parsedDetails.shipping || 0,
          tax: parsedDetails.tax || 0,
          total: parsedDetails.total || 0,
          shippingAddress: parsedDetails.shippingAddress || {
            first_name: "John",
            last_name: "Doe",
            email: "customer@example.com",
            phone: "+254712345678",
            address_line1: "123 Main St",
            address_line2: "Apt 4B",
            city: "Nairobi",
            state: "Nairobi",
            postal_code: "00100",
            country: "Kenya",
          },
          paymentMethod: parsedDetails.paymentMethod || "mpesa",
          estimatedDelivery: new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          status: "processing",
        }
      }
    } catch (error) {
      console.error("Error parsing saved order data:", error)
    }
  }

  // Try to fetch from API
  try {
    // Make a real API call to get the order data
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.mizizzi.com"
    const response = await fetch(`${apiUrl}/api/orders/${id}`, {
      headers: {
        "Content-Type": "application/json",
        // Add any authentication headers if needed
      },
      cache: "no-store",
    })

    if (response.ok) {
      const orderData = await response.json()
      console.log("Retrieved order data from API:", orderData)
      return orderData
    }
  } catch (apiError) {
    console.error("Error fetching order from API:", apiError)
  }

  // If API call fails or we're in development, return mock data
  return {
    id,
    order_number: `ORD-${id}`,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    email: "customer@example.com",
    items: [
      {
        id: "1",
        product_id: 1,
        product_name: "Gold Link Watch",
        quantity: 1,
        price: 149999.0,
        total: 149999.0,
        thumbnail_url: "/placeholder.svg?height=100&width=100",
        product: {
          name: "Gold Link Watch",
          thumbnail_url: "/placeholder.svg?height=100&width=100",
        },
      },
      {
        id: "2",
        product_id: 2,
        product_name: "Premium Leather Wallet",
        quantity: 1,
        price: 8999.0,
        total: 8999.0,
        thumbnail_url: "/placeholder.svg?height=100&width=100",
        product: {
          name: "Premium Leather Wallet",
          thumbnail_url: "/placeholder.svg?height=100&width=100",
        },
      },
    ],
    subtotal: 158998.0,
    shipping: 0,
    tax: 25440.0,
    total: 184438.0,
    shippingAddress: {
      first_name: "John",
      last_name: "Doe",
      email: "customer@example.com",
      phone: "+254712345678",
      address_line1: "123 Main St",
      address_line2: "Apt 4B",
      city: "Nairobi",
      state: "Nairobi",
      postal_code: "00100",
      country: "Kenya",
    },
    paymentMethod: "mpesa",
    estimatedDelivery: new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    status: "processing",
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

  const orderDate = new Date(order.date)
  const deliveryDate = new Date(order.estimatedDelivery)

  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "mpesa":
        return "M-Pesa"
      case "airtel":
        return "Airtel Money"
      case "card":
        return "Credit/Debit Card"
      case "cash":
        return "Cash on Delivery"
      default:
        return method.charAt(0).toUpperCase() + method.slice(1)
    }
  }

  return (
    <div className="w-full bg-gray-50 py-8">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
        {/* Cherry Red Header Banner */}
        <div className="bg-red-600 text-white rounded-t-md p-6 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white mb-4">
            <CheckCircle className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Thank You For Your Order!</h1>

          <p className="text-white/90 max-w-2xl mx-auto text-sm sm:text-base">
            Your order has been placed successfully and is being processed.
          </p>
        </div>

        {/* Order Number and Date */}
        <div className="bg-white p-4 rounded-b-md shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-sm font-medium text-gray-500">Order Number:</span>
            <div className="flex items-center">
              <span className="font-bold text-lg text-gray-900">{order.order_number}</span>
              <button
                className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Copy order number"
              >
                <Copy className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end">
            <span className="text-sm font-medium text-gray-500">Order Date:</span>
            <span className="font-medium text-gray-900">
              {orderDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          {/* Order Details */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-red-600 text-white py-4 px-6">
                <div className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  <h3 className="font-semibold">Order Details</h3>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="p-4 flex items-start sm:items-center gap-4">
                    <div className="h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                      {item.thumbnail_url ||
                      item.product?.thumbnail_url ||
                      (item.product?.image_urls && item.product?.image_urls.length > 0
                        ? item.product.image_urls[0]
                        : null) ? (
                        <Image
                          src={
                            item.thumbnail_url ||
                            item.product?.thumbnail_url ||
                            (item.product?.image_urls && item.product?.image_urls.length > 0
                              ? item.product.image_urls[0]
                              : "/placeholder.svg?height=100&width=100")
                          }
                          alt={item.product_name || (item.product && item.product.name) || "Product"}
                          width={100}
                          height={100}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-100">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-base">
                        {item.product_name || (item.product && item.product.name) || "Product"}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                          Qty: {item.quantity}
                        </span>
                        <span className="text-red-700 font-medium">{formatPrice(item.price)} each</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        {formatPrice(item.total || item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-red-600 text-white py-4 px-6">
                <div className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  <h3 className="font-semibold">Order Summary</h3>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">
                    {order.shipping === 0 ? (
                      <span className="inline-flex items-center text-green-600">
                        Free{" "}
                        <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                          Premium
                        </span>
                      </span>
                    ) : (
                      formatPrice(order.shipping)
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT (16%):</span>
                  <span className="font-medium">{formatPrice(order.tax)}</span>
                </div>

                <Separator className="my-2 bg-gray-200" />

                <div className="flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg text-red-600">{formatPrice(order.total)}</span>
                </div>

                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                  <div className="flex items-center text-xs text-gray-600">
                    <Shield className="h-3 w-3 mr-1 text-green-600" />
                    <span>Secure payment processed</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-red-600 text-white py-4 px-6">
                <div className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  <h3 className="font-semibold">Delivery Information</h3>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-red-700" /> Shipping Address
                    </h4>
                    <div className="text-sm">
                      <p className="font-medium">
                        {order.shippingAddress.first_name} {order.shippingAddress.last_name}
                      </p>
                      <p className="text-gray-700">{order.shippingAddress.address_line1}</p>
                      {order.shippingAddress.address_line2 && (
                        <p className="text-gray-700">{order.shippingAddress.address_line2}</p>
                      )}
                      <p className="text-gray-700">
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}
                      </p>
                      <p className="text-gray-700">{order.shippingAddress.country}</p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <Mail className="h-3 w-3 mr-1 text-red-700" /> Contact Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="text-gray-700">{order.shippingAddress.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="text-gray-700">{order.shippingAddress.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <CreditCard className="h-3 w-3 mr-1 text-red-700" /> Payment Method
                    </h4>
                    <p className="text-sm font-medium">{formatPaymentMethod(order.paymentMethod)}</p>
                  </div>

                  <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <Calendar className="h-3 w-3 mr-1 text-red-700" /> Estimated Delivery
                    </h4>
                    <p className="text-sm font-medium">{formattedDeliveryDate}</p>
                  </div>

                  <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <Shield className="h-3 w-3 mr-1 text-red-700" /> Delivery Type
                    </h4>
                    <p className="text-sm font-medium">
                      {order.shipping === 0 ? (
                        <span className="inline-flex items-center text-green-600">
                          Express Delivery
                          <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                            Free
                          </span>
                        </span>
                      ) : (
                        "Standard Delivery"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status */}
          <Card className="shadow border border-gray-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-red-600 text-white py-4 px-6">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  <h3 className="font-semibold">Order Status</h3>
                </div>
              </div>

              <div className="p-4">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-600 via-gray-300 to-gray-300"></div>

                  {/* Timeline events */}
                  <div className="space-y-6 ml-8">
                    {/* Order Confirmed */}
                    <div className="relative pl-4">
                      <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-red-600 shadow-md">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-sm text-gray-900">Order Confirmed</h4>
                        <p className="text-xs text-gray-500">{orderDate.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Processing */}
                    <div className="relative pl-4">
                      <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 shadow-md">
                        <Package className="h-3 w-3 text-white" />
                      </div>
                      <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-sm text-gray-900">Processing</h4>
                        <p className="text-xs text-gray-500">In Progress</p>
                      </div>
                    </div>

                    {/* Shipped */}
                    <div className="relative pl-4">
                      <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 shadow-md">
                        <Truck className="h-3 w-3 text-gray-600" />
                      </div>
                      <div className="bg-white/50 p-3 rounded-md border border-gray-200">
                        <h4 className="font-bold text-sm text-gray-500">Shipped</h4>
                        <p className="text-xs text-gray-400">Pending</p>
                      </div>
                    </div>

                    {/* Delivered */}
                    <div className="relative pl-4">
                      <div className="absolute left-[-24px] flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 shadow-md">
                        <CheckCircle className="h-3 w-3 text-gray-600" />
                      </div>
                      <div className="bg-white/50 p-3 rounded-md border border-gray-200">
                        <h4 className="font-bold text-sm text-gray-500">Delivered</h4>
                        <p className="text-xs text-gray-400">Expected by {formattedDeliveryDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 mb-8">
          <Button asChild variant="outline" className="h-10 px-6 border-gray-300 shadow-sm hover:bg-gray-50">
            <Link href="/orders">
              <Package className="h-4 w-4 mr-2" />
              View My Orders
            </Link>
          </Button>

          <Button asChild className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white shadow-sm">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function OrderConfirmationSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-red-600 text-white rounded-t-md p-6 text-center">
        <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4 bg-white/20" />
        <Skeleton className="h-8 w-64 mx-auto mb-2 bg-white/20" />
        <Skeleton className="h-4 w-80 mx-auto bg-white/20" />
      </div>

      <div className="bg-white p-4 rounded-b-md shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-col items-center sm:items-start">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex flex-col items-center sm:items-end">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Order Details Skeleton */}
        <Card className="shadow border border-gray-200 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-red-600 text-white py-4 px-6">
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 mr-2 bg-white/20" />
                <Skeleton className="h-5 w-32 bg-white/20" />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {[1, 2].map((item) => (
                <div key={item} className="p-4 flex items-start sm:items-center gap-4">
                  <Skeleton className="h-24 w-24 sm:h-28 sm:w-28 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary Skeleton */}
        <Card className="shadow border border-gray-200 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-red-600 text-white py-4 px-6">
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 mr-2 bg-white/20" />
                <Skeleton className="h-5 w-32 bg-white/20" />
              </div>
            </div>

            <div className="p-4 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
              <Separator className="my-2 bg-gray-200" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* More skeletons for other cards */}
        {[1, 2].map((card) => (
          <Card key={card} className="shadow border border-gray-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-red-600 text-white py-4 px-6">
                <div className="flex items-center">
                  <Skeleton className="h-5 w-5 mr-2 bg-white/20" />
                  <Skeleton className="h-5 w-32 bg-white/20" />
                </div>
              </div>
              <div className="p-4">
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 mb-8">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  )
}

// Update the component definition to unwrap the id param
export default function OrderConfirmationPage({ params }: { params: { id: Promise<string> } }) {
  const id = use(params.id)

  // Then update all instances of params.id to use id instead
  return (
    <div className="bg-gray-50 min-h-screen">
      <OrderConfirmationContent id={id} />
    </div>
  )
}
