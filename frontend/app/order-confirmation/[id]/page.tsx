"use client"
import { use, useEffect, useState } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { orderService } from "@/services/orders"
import { productService } from "@/services/product"
import CheckoutConfirmation from "@/components/checkout/checkout-confirmation"

async function getOrder(id: string) {
  // Try to get order data from localStorage first
  if (typeof window !== "undefined") {
    try {
      const savedItems = localStorage.getItem("lastOrderItems")
      const savedDetails = localStorage.getItem("lastOrderDetails")

      if (savedItems && savedDetails) {
        const parsedItems = JSON.parse(savedItems)
        const parsedDetails = JSON.parse(savedDetails)

        console.log("[v0] Retrieved saved order items:", parsedItems)
        console.log("[v0] Retrieved saved order details:", parsedDetails)

        const enrichedItems = await Promise.all(
          parsedItems.map(async (item: any, index: number) => {
            let productData = item.product || {}

            // If we don't have complete product data, try to fetch it
            if (!productData.name || !productData.thumbnail_url || productData.name.includes("Product #")) {
              try {
                const fetchedProduct = await productService.getProductForCartItem(item.product_id)
                if (fetchedProduct) {
                  productData = {
                    ...productData,
                    ...fetchedProduct,
                  }
                }
              } catch (error) {
                console.warn(`Failed to fetch product data for item ${item.product_id}:`, error)
              }
            }

            return {
              ...item,
              // Ensure required fields exist with real product data
              product_id: item.product_id || index + 1,
              product_name:
                productData.name || item.product_name || item.name || `Product #${item.product_id || index + 1}`,
              quantity: item.quantity || 1,
              price: item.price || item.unit_price || productData.price || 0,
              total: item.total || item.price * item.quantity || 0,
              thumbnail_url:
                productData.thumbnail_url ||
                (productData.image_urls && productData.image_urls[0]) ||
                item.thumbnail_url ||
                item.image_url ||
                "/diverse-products-still-life.png",
              product: {
                ...productData,
                name: productData.name || item.product_name || item.name,
                thumbnail_url: productData.thumbnail_url || (productData.image_urls && productData.image_urls[0]),
                image_urls: productData.image_urls || [productData.thumbnail_url].filter(Boolean),
                sku: productData.sku,
                description: productData.description,
                category: productData.category,
                brand: productData.brand,
              },
            }
          }),
        )

        const calculatedSubtotal = enrichedItems.reduce((sum: number, item: any) => {
          return sum + (item.total || item.price * item.quantity)
        }, 0)

        // Return data in CheckoutConfirmation format
        return {
          formData: {
            firstName: parsedDetails.shippingAddress?.first_name || "John",
            lastName: parsedDetails.shippingAddress?.last_name || "Doe",
            email: parsedDetails.shippingAddress?.email || "customer@example.com",
            phone: parsedDetails.shippingAddress?.phone || "+254712345678",
            address: parsedDetails.shippingAddress?.address_line1 || "123 Main St",
            city: parsedDetails.shippingAddress?.city || "Nairobi",
            state: parsedDetails.shippingAddress?.state || "Nairobi",
            zipCode: parsedDetails.shippingAddress?.postal_code || "00100",
            country: parsedDetails.shippingAddress?.country || "Kenya",
            paymentMethod: parsedDetails.paymentMethod || "cod",
          },
          orderId: parsedDetails.orderId || `ORD-${id}`,
          orderItems: enrichedItems,
          subtotal: calculatedSubtotal,
          shipping: 0, // Free shipping
          tax: 0, // No tax as requested
          total: calculatedSubtotal,
        }
      }
    } catch (error) {
      console.error("[v0] Error parsing saved order data:", error)
    }
  }

  try {
    console.log("[v0] Attempting to fetch order from API using authenticated service")
    const order = await orderService.getOrderById(id)

    if (!order) {
      throw new Error(`Order with ID ${id} not found`)
    }

    console.log("[v0] Retrieved order data from API:", order)

    let calculatedSubtotal = order.subtotal || 0
    if (calculatedSubtotal === 0 && order.items && order.items.length > 0) {
      calculatedSubtotal = order.items.reduce((sum: number, item: any) => {
        return sum + (item.total || item.price * item.quantity)
      }, 0)
    }

    const enrichedApiItems = await Promise.all(
      (order.items || []).map(async (item: any, index: number) => {
        let productData = item.product || {}

        // If we don't have complete product data, try to fetch it
        if (!productData.name || !productData.thumbnail_url || productData.name.includes("Product #")) {
          try {
            const fetchedProduct = await productService.getProductForCartItem(item.product_id || item.id)
            if (fetchedProduct) {
              productData = {
                ...productData,
                ...fetchedProduct,
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch product data for item ${item.product_id || item.id}:`, error)
          }
        }

        return {
          ...item,
          // Ensure required fields exist with real product data
          product_id: item.product_id || item.id || index + 1,
          product_name:
            productData.name || item.product_name || item.name || `Product #${item.product_id || item.id || index + 1}`,
          quantity: item.quantity || 1,
          price: item.price || item.unit_price || productData.price || 0,
          total: item.total || item.price * item.quantity || 0,
          thumbnail_url:
            productData.thumbnail_url ||
            (productData.image_urls && productData.image_urls[0]) ||
            item.thumbnail_url ||
            item.image_url ||
            "/diverse-products-still-life.png",
          product: {
            ...productData,
            name: productData.name || item.product_name || item.name,
            thumbnail_url: productData.thumbnail_url || (productData.image_urls && productData.image_urls[0]),
            image_urls: productData.image_urls || [productData.thumbnail_url].filter(Boolean),
            sku: productData.sku,
            description: productData.description,
            category: productData.category,
            brand: productData.brand,
          },
        }
      }),
    )

    // Transform the order data to CheckoutConfirmation format
    return {
      formData: {
        firstName: order.shipping_address?.first_name || "John",
        lastName: order.shipping_address?.last_name || "Doe",
        email: order.shipping_address?.email || "customer@example.com",
        phone: order.shipping_address?.phone || "+254712345678",
        address: order.shipping_address?.address_line1 || "123 Main St",
        city: order.shipping_address?.city || "Nairobi",
        state: order.shipping_address?.state || "Nairobi",
        zipCode: order.shipping_address?.postal_code || "00100",
        country: order.shipping_address?.country || "Kenya",
        paymentMethod: order.payment_method || "cod",
      },
      orderId: order.order_number || `ORD-${id}`,
      orderItems: enrichedApiItems,
      subtotal: calculatedSubtotal,
      shipping: 0, // Free shipping
      tax: 0, // No tax as requested
      total: calculatedSubtotal,
    }
  } catch (apiError) {
    console.error("[v0] Error fetching order from API:", apiError)
    throw apiError
  }
}

function OrderConfirmationContent({ id }: { id: string }) {
  return (
    <Suspense fallback={<OrderConfirmationSkeleton />}>
      <OrderConfirmationData id={id} />
    </Suspense>
  )
}

function OrderConfirmationData({ id }: { id: string }) {
  const [orderData, setOrderData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getOrder(id)
      .then((data) => {
        if (!cancelled) {
          setOrderData(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOrderData(null)
          setError(err.message || "Failed to load order data")
          console.error("[v0] Failed to load order:", err)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <OrderConfirmationSkeleton />

  if (error || !orderData) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <Card className="shadow border border-red-200 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-red-50 border-b border-red-200 py-4 px-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                <h3 className="font-semibold text-red-800">Order Not Found</h3>
              </div>
            </div>
            <div className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Order</h2>
              <p className="text-gray-600 mb-6">
                {error?.includes("Backend URL not configured") ? (
                  <>
                    Backend URL not configured. Please set the{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">NEXT_PUBLIC_API_URL</code> environment
                    variable to connect to your server.
                  </>
                ) : error?.includes("Failed to fetch") ? (
                  <>Unable to connect to the server. Please check your internet connection and try again.</>
                ) : (
                  error || `We couldn't find order #${id}. Please check your order number and try again.`
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link href="/orders">View My Orders</Link>
                </Button>
                <Button asChild className="bg-red-600 hover:bg-red-700">
                  <Link href="/">Continue Shopping</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <CheckoutConfirmation
      formData={orderData.formData}
      orderId={orderData.orderId}
      orderItems={orderData.orderItems}
      subtotal={orderData.subtotal}
      shipping={orderData.shipping}
      tax={orderData.tax}
      total={orderData.total}
    />
  )
}

function OrderConfirmationSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-emerald-600 text-white rounded-t-md p-6 text-center">
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
        {[1, 2, 3, 4].map((card) => (
          <Card key={card} className="shadow border border-gray-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-emerald-600 text-white py-4 px-6">
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

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params)
  const id = resolvedParams.id

  return (
    <div className="bg-gray-50 min-h-screen">
      <OrderConfirmationContent id={id} />
    </div>
  )
}
