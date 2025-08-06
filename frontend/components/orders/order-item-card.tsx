"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "./order-status-badge"
import { Eye, XSquare } from "lucide-react"
import type { Order, OrderItem } from "@/types"

interface OrderItemCardProps {
  order: Order
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
  getProductName: (item: OrderItem) => string
  getProductImage: (item: OrderItem) => string
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
  const mainItem = order.items?.[0]

  return (
    <div className={`border ${colors.border} ${colors.card} rounded-md px-4 py-3 shadow-sm`}>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Product image */}
        <div className="w-20 h-20 flex-shrink-0 rounded border border-gray-200 bg-white overflow-hidden">
          <Image
            src={mainItem ? getProductImage(mainItem) : "/placeholder.svg?height=80&width=80"}
            alt={mainItem ? getProductName(mainItem) : "Order item"}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Order content */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-gray-900">
              {mainItem ? getProductName(mainItem) : "Order Item"}
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <OrderStatusBadge status={order.status} />
              <span>Order #{order.order_number}</span>
            </div>

            <div className="text-xs text-gray-600">{formatDate(order.created_at)}</div>

            <div className="text-sm text-gray-700 mt-1">
              Quantity: {mainItem?.quantity || 0}
            </div>

            {order.items?.length > 1 && (
              <div className="text-xs text-gray-500">
                + {order.items.length - 1} more item{order.items.length - 1 > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="font-semibold text-sm text-gray-900">
              {formatCurrency(order.total_amount || order.total || 0)}
            </p>

            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline" className="text-xs h-8 px-3 bg-white">
                <Link href={`/orders/${order.id}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Link>
              </Button>

              {canCancelOrder(order) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 text-red-600 border-red-300 bg-white hover:bg-red-50"
                  onClick={() => onCancelOrder(order.id?.toString() || "")}
                >
                  <XSquare className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
