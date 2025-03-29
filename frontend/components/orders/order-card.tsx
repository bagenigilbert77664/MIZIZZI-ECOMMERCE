"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { Package, Eye, XSquare, Calendar } from "lucide-react"
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

  // Get the product name
  let productName = "Product"
  if (firstItem?.product?.name) {
    productName = firstItem.product.name
  } else if (firstItem?.product_name) {
    productName = firstItem.product_name
  } else if (firstItem?.name) {
    productName = firstItem.name
  }

  // Get the product image
  let productImage = null
  if (firstItem?.product?.thumbnail_url && firstItem.product.thumbnail_url !== "") {
    productImage = firstItem.product.thumbnail_url
  } else if (
    firstItem?.product?.image_urls &&
    Array.isArray(firstItem.product.image_urls) &&
    firstItem.product.image_urls.length > 0 &&
    firstItem.product.image_urls[0] !== ""
  ) {
    productImage = firstItem.product.image_urls[0]
  } else if (firstItem?.image_url && firstItem.image_url !== "") {
    productImage = firstItem.image_url
  } else {
    // Fallback to placeholder
    productImage = `/placeholder.svg?height=80&width=80`
  }

  // Get the product variation
  let productVariation = ""
  if (firstItem?.variation && Object.keys(firstItem.variation).length > 0) {
    productVariation = Object.entries(firstItem.variation)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")
  }

  // Get the order status
  const status = order.status?.toLowerCase() || "pending"

  // Get the order date
  const orderDate = order.created_at ? formatDate(order.created_at) : "N/A"

  // Get the additional items count
  const additionalItemsCount = order.items && order.items.length > 1 ? order.items.length - 1 : 0

  // Get the order total
  const orderTotal = order.items?.reduce((sum, item) => sum + (item.quantity * item.price || 0), 0) || 0

  // Check if order can be cancelled
  const canCancel = status === "pending" || status === "processing"

  // Status badge styling
  const statusStyles = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    processing: "bg-blue-50 text-blue-800 border-blue-200",
    shipped: "bg-indigo-50 text-indigo-800 border-indigo-200",
    delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-800 border-rose-200",
    canceled: "bg-rose-50 text-rose-800 border-rose-200",
    returned: "bg-slate-50 text-slate-800 border-slate-200",
    default: "bg-gray-50 text-gray-800 border-gray-200",
  }

  const badgeStyle = statusStyles[status as keyof typeof statusStyles] || statusStyles.default

  return (
    <Card className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Product Image */}
          <div className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
            {productImage ? (
              <Image
                src={productImage || "/placeholder.svg"}
                alt={productName}
                width={96}
                height={96}
                className="h-full w-full object-cover object-center"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.src = `/placeholder.svg?height=96&width=96`
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-50">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                {/* Status Badge */}
                <Badge className={`px-2.5 py-0.5 text-xs font-medium uppercase ${badgeStyle} mb-2`} variant="outline">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>

                {/* Product Name */}
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-0.5 line-clamp-2">
                  {truncateText(productName, 60)}
                </h3>

                {/* Order Number */}
                <div className="text-xs text-gray-500 font-medium mb-1.5">Order #{order.order_number}</div>

                {/* Order Date - Larger and more prominent */}
                <div className="flex items-center mb-2">
                  <Calendar className="h-4 w-4 text-gray-400 mr-1.5" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{orderDate}</span>
                </div>

                {/* Product Variation */}
                {productVariation && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Variation:</span> {productVariation}
                  </div>
                )}

                {/* Additional Items */}
                {additionalItemsCount > 0 && (
                  <div className="text-xs text-gray-500">
                    + {additionalItemsCount} more {additionalItemsCount === 1 ? "item" : "items"}
                  </div>
                )}
              </div>

              {/* Price and Actions */}
              <div className="flex flex-col items-start sm:items-end gap-2 mt-1 sm:mt-0">
                <p className="text-base sm:text-lg font-semibold text-gray-900">{formatCurrency(orderTotal)}</p>

                <div className="flex gap-2 mt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-xs font-medium bg-white hover:bg-gray-50 border-gray-200"
                  >
                    <Link href={`/orders/${order.id}`}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View Details
                    </Link>
                  </Button>

                  {canCancel && onCancelOrder && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 bg-white"
                      onClick={() => onCancelOrder(order.id?.toString() || "")}
                    >
                      <XSquare className="h-3.5 w-3.5 mr-1.5" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

