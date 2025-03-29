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
    pending: "bg-amber-500 text-white border-amber-500",
    processing: "bg-blue-500 text-white border-blue-500",
    shipped: "bg-indigo-500 text-white border-indigo-500",
    delivered: "bg-green-500 text-white border-green-500",
    cancelled: "bg-rose-500 text-white border-rose-500",
    canceled: "bg-rose-500 text-white border-rose-500",
    returned: "bg-slate-500 text-white border-slate-500",
    default: "bg-gray-500 text-white border-gray-500",
  }

  const badgeStyle = statusStyles[status as keyof typeof statusStyles] || statusStyles.default

  return (
    <Card className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white mb-4">
      <div className="flex items-center p-4">
        {/* Product Image - Fixed size on all devices */}
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-100 bg-white mr-4">
          {productImage ? (
            <Image
              src={productImage || "/placeholder.svg"}
              alt={productName}
              width={64}
              height={64}
              className="h-full w-full object-cover object-center"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.currentTarget as HTMLImageElement
                target.src = `/placeholder.svg?height=64&width=64`
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-50">
              <Package className="h-6 w-6 text-gray-300" />
            </div>
          )}
        </div>

        {/* Order Details - Middle section */}
        <div className="flex-1 min-w-0">
          {/* Status Badge */}
          <Badge className={`px-2 py-0.5 text-xs font-medium uppercase ${badgeStyle} mb-1.5 rounded`} variant="outline">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>

          {/* Product Name */}
          <h3 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">{truncateText(productName, 30)}</h3>

          {/* Order Number */}
          <div className="text-xs text-gray-500 mb-1">Order #{order.order_number}</div>

          {/* Order Date */}
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {orderDate}
          </div>
        </div>

        {/* Price and Actions - Right section */}
        <div className="flex flex-col items-end ml-2">
          {/* Price */}
          <p className="text-base font-semibold text-gray-900 mb-2">{formatCurrency(orderTotal)}</p>

          {/* View Details Button */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-medium bg-white hover:bg-gray-50 border-gray-200 w-full"
          >
            <Link href={`/orders/${order.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View Details
            </Link>
          </Button>

          {/* Cancel Button - Only show if order can be cancelled */}
          {canCancel && onCancelOrder && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 bg-white mt-2 w-full"
              onClick={() => onCancelOrder(order.id?.toString() || "")}
            >
              <XSquare className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

