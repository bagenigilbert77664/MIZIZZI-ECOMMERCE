import Link from "next/link"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OptimizedImage } from "@/components/shared/optimized-image"
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

interface OrderCardProps {
  order: Order
  showDebug?: boolean
}

export function OrderCard({ order, showDebug = false }: OrderCardProps) {
  // Log the order data for debugging
  console.log("OrderCard - order data:", order)

  // Get the first item from the order
  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null
  console.log("OrderCard - first item:", firstItem)

  // Get the product from the first item
  const product = firstItem?.product
  console.log("OrderCard - product:", product)

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
  } else if (firstItem?.product_image) {
    productImage = firstItem.product_image
  } else if (firstItem?.image_url) {
    productImage = firstItem.image_url
  }

  // Get the order status
  const status = order.status?.toUpperCase() || "PENDING"

  // Get the order date
  const orderDate = order.created_at ? formatDate(order.created_at) : "N/A"

  // Get the additional items count
  const additionalItemsCount = order.items && order.items.length > 1 ? order.items.length - 1 : 0

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Product Image */}
        <div className="flex items-center justify-center p-4 sm:w-24 md:w-32">
          {productImage ? (
            <OptimizedImage
              src={productImage}
              alt={productName}
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-md bg-gray-100">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-medium">{productName}</h3>
              <p className="text-sm text-gray-500">Order {order.order_number}</p>
            </div>
            <Link
              href={`/orders/${order.id}`}
              className="mt-2 text-sm font-medium text-orange-500 hover:text-orange-600 sm:mt-0"
            >
              <span className="relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-in-out hover:after:origin-bottom-left hover:after:scale-x-100">
                See details
              </span>
            </Link>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={cn(
                "px-2 py-1 text-xs font-medium",
                status === "DELIVERED" && "border-green-500 bg-green-50 text-green-700",
                status === "PENDING" && "border-yellow-500 bg-yellow-50 text-yellow-700",
                status === "CANCELLED" && "border-red-500 bg-red-50 text-red-700",
                status === "CANCELED" && "border-red-500 bg-red-50 text-red-700",
                status === "SHIPPED" && "border-blue-500 bg-blue-50 text-blue-700",
                status === "PROCESSING" && "border-purple-500 bg-purple-50 text-purple-700",
                status === "RETURNED" && "border-gray-500 bg-gray-50 text-gray-700",
              )}
            >
              {status}
            </Badge>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">On {orderDate}</span>
              {additionalItemsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  +{additionalItemsCount} more {additionalItemsCount === 1 ? "item" : "items"}
                </Badge>
              )}
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

