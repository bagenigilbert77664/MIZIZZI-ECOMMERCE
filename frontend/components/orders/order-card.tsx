"use client"

import Link from "next/link"
import Image from "next/image"
import { Package, Eye, XSquare, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Order } from "@/types"

// Helper function to format date
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-")
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString
  }
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number): string {
  if (!text) return ""
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
}

interface OrderCardProps {
  order: Order
  showDebug?: boolean
  onCancelOrder?: (orderId: string) => void
}

export function OrderCard({ order, showDebug = false, onCancelOrder }: OrderCardProps) {
  // Get the first item from the order
  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null

  // Get the product from the first item
  const product = firstItem?.product

  // Get the product name
  let productName = "Product"
  if (product?.name) {
    productName = product.name
  } else if (firstItem?.product_name) {
    productName = firstItem.product_name
  } else if (firstItem?.name) {
    productName = firstItem.name
  }

  // Get the product image
  let productImage = null
  if (product?.image_urls && product.image_urls.length > 0) {
    productImage = product.image_urls[0]
  } else if (product?.thumbnail_url) {
    productImage = product.thumbnail_url
  } else if (firstItem?.image_url) {
    productImage = firstItem.image_url
  } else {
    // Fallback to placeholder
    productImage = `/placeholder.svg?height=80&width=80`
  }

  // Get the product variation
  let productVariation = ""
  if (product?.variation && Object.keys(product.variation).length > 0) {
    productVariation = Object.entries(product.variation)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")
  } else if (firstItem?.variation && Object.keys(firstItem.variation).length > 0) {
    productVariation = Object.entries(firstItem.variation)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")
  }

  // Get the order status
  type StatusKey = keyof typeof statusStyles
  const status = (order.status?.toLowerCase() || "pending") as StatusKey

  // Get the order date
  const orderDate = order.created_at ? formatDate(order.created_at) : "N/A"

  // Get the additional items count
  const additionalItemsCount = order.items && order.items.length > 1 ? order.items.length - 1 : 0

  // Get the order total
  const orderTotal = order.total_amount || order.total || 0

  // Define status-based styling
  const statusStyles = {
    pending: {
      card: "bg-orange-50 border-orange-200",
      badge: "bg-orange-100 text-orange-800 border-orange-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
    processing: {
      card: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
    shipped: {
      card: "bg-blue-50 border-blue-200",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
    delivered: {
      card: "bg-green-50 border-green-200",
      badge: "bg-green-100 text-green-800 border-green-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
    cancelled: {
      card: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-800 border-red-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
    canceled: {
      card: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-800 border-red-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
    returned: {
      card: "bg-gray-50 border-gray-200",
      badge: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
    default: {
      card: "bg-white border-gray-200",
      badge: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <Clock className="h-4 w-4 mr-1" />,
    },
  }
  const cardStyle = statusStyles[status].card || statusStyles.default.card
  const badgeStyle = statusStyles[status].badge || statusStyles.default.badge
  const statusIcon = statusStyles[status]?.icon || statusStyles.default.icon

  // Check if order can be cancelled
  const canCancel = status === "pending" || status === "processing"

  return (
    <Card className={`overflow-hidden shadow-sm ${cardStyle}`}>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Product Image */}
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
            {productImage ? (
              <Image
                src={productImage || "/placeholder.svg"}
                alt={productName}
                width={80}
                height={80}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-medium text-gray-800 line-clamp-2">{truncateText(productName, 60)}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge className={`py-1 px-2 flex items-center uppercase ${badgeStyle}`} variant="outline">
                    {statusIcon}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                  <span className="text-xs text-gray-500">Order #{order.order_number}</span>
                </div>
                <div className="mt-1 text-xs text-gray-600 font-medium">{orderDate}</div>
                {productVariation && (
                  <div className="mt-2 text-sm text-gray-600">
                    Variation: <span className="font-medium">{productVariation}</span>
                  </div>
                )}
                {additionalItemsCount > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    + {additionalItemsCount} more {additionalItemsCount === 1 ? "item" : "items"}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="font-medium text-gray-900">{formatCurrency(orderTotal)}</p>

                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="text-xs h-8 px-3 bg-white">
                    <Link href={`/orders/${order.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      View Order
                    </Link>
                  </Button>

                  {canCancel && onCancelOrder && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 bg-white"
                      onClick={() => onCancelOrder(order.id?.toString() || "")}
                    >
                      <XSquare className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Information */}
      {showDebug && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-gray-700">Debug Order Data</summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded bg-gray-100 p-2 text-xs">
              {JSON.stringify(order, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </Card>
  )
}
