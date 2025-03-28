"use client"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "./order-status-badge"
import { Eye, XSquare } from "lucide-react"
import type { Order } from "@/types"

interface OrderItemCardProps {
  order: Order
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
  getProductName: (item: any) => string
  getProductImage: (item: any) => string
  getProductVariation: (item: any) => string | null
  canCancelOrder: (order: Order) => boolean
  onCancelOrder: (orderId: string) => void
  colors: {
    card: string
    border: string
  }
}

export function OrderItemCard({
  order,
  formatCurrency,
  formatDate,
  getProductName,
  getProductImage,
  getProductVariation,
  canCancelOrder,
  onCancelOrder,
  colors,
}: OrderItemCardProps) {
  return (
    <div className={`rounded-lg border ${colors.border} ${colors.card} overflow-hidden shadow-sm`}>
      <div className="p-4 flex flex-col sm:flex-row gap-4">
        {/* Order item image - first item or placeholder */}
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
          <Image
            src={
              order.items && order.items.length > 0
                ? getProductImage(order.items[0])
                : "/placeholder.svg?height=80&width=80"
            }
            alt={order.items && order.items.length > 0 ? getProductName(order.items[0]) : "Order item"}
            width={80}
            height={80}
            className="h-full w-full object-cover object-center"
          />
        </div>

        {/* Order details */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              {/* Product name - first item or generic */}
              <h3 className="text-base font-medium text-gray-800 line-clamp-2">
                {order.items && order.items.length > 0 ? getProductName(order.items[0]) : "Order Items"}
              </h3>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <OrderStatusBadge status={order.status} />
                <span className="text-xs text-gray-500">Order #{order.order_number}</span>
              </div>

              {/* Date display below status */}
              <div className="mt-1 text-xs text-gray-600 font-medium">{formatDate(order.created_at)}</div>

              <div className="mt-2 text-sm text-gray-600">
                Quantity: {order.items && order.items.length > 0 ? order.items[0].quantity : 0}
              </div>

              {/* Show multiple items indicator if there are more items */}
              {order.items && order.items.length > 1 && (
                <div className="mt-1 text-xs text-gray-500">
                  + {order.items.length - 1} more {order.items.length - 1 === 1 ? "item" : "items"}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="font-medium text-gray-900">{formatCurrency(order.total_amount || order.total || 0)}</p>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="text-xs h-8 px-3 bg-white">
                  <Link href={`/orders/${order.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    View Order
                  </Link>
                </Button>

                {canCancelOrder(order) && (
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
  )
}

