"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Loader2, Eye } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Order } from "@/types"

interface OrderStatusTabProps {
  status: string
  orders: Order[]
  loading: boolean
  formatCurrency: (value: number) => string
  formatDate: (date: string) => string
  getStatusBadge: (status: string) => React.ReactNode
  getProductName: (item: any) => string
  getProductImage: (item: any) => string
  getProductVariation: (item: any) => string | null
  canCancelOrder: (order: Order) => boolean
  onCancelOrder: (orderId: string) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
}

export function OrderStatusTab({
  status,
  orders,
  loading,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getProductName,
  getProductImage,
  getProductVariation,
  canCancelOrder,
  onCancelOrder,
  currentPage,
  setCurrentPage,
  itemsPerPage,
}: OrderStatusTabProps) {
  // Calculate pagination
  const totalOrders = orders.length
  const totalPages = Math.max(1, Math.ceil(totalOrders / itemsPerPage))

  // Get current page of orders
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalOrders)
  const currentOrders = orders.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state-modern">
        <div className="empty-state-icon">
          {status === "pending" && <div className="h-12 w-12 text-4xl">🕒</div>}
          {status === "confirmed" && <div className="h-12 w-12 text-4xl">✓</div>}
          {status === "processing" && <div className="h-12 w-12 text-4xl">📦</div>}
          {status === "shipped" && <div className="h-12 w-12 text-4xl">🚚</div>}
          {status === "delivered" && <div className="h-12 w-12 text-4xl">✅</div>}
          {status === "returned" && <div className="h-12 w-12 text-4xl">↩️</div>}
          {status === "cancelled" && <div className="h-12 w-12 text-4xl">❌</div>}
        </div>
        <h3 className="empty-state-title">No {status} orders</h3>
        <p className="empty-state-description">
          {status === "pending" && "You don't have any pending orders at the moment."}
          {status === "confirmed" && "You don't have any confirmed orders waiting to be processed."}
          {status === "processing" && "You don't have any orders being processed right now."}
          {status === "shipped" && "You don't have any orders in transit right now."}
          {status === "delivered" && "You don't have any delivered orders yet."}
          {status === "returned" && "You haven't returned any orders."}
          {status === "cancelled" && "You don't have any cancelled orders."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {currentOrders.map((order) => (
        <div key={order.id} className="order-card-modern">
          <div className="order-card-header">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-semibold text-gray-900">Order #{order.order_number}</span>
                {getStatusBadge(order.status || "")}
              </div>
              <div className="text-xs text-gray-500">{formatDate(order.created_at)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-gray-200 hover:bg-gray-50 hover:border-gray-300 bg-transparent"
              >
                <Link href={`/orders/${order.id}`}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  View Details
                </Link>
              </Button>
              {canCancelOrder(order) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 bg-transparent"
                  onClick={() => onCancelOrder(order.id)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items && order.items.length > 0 ? (
              order.items.slice(0, 3).map((item, index) => (
                <div
                  key={`${order.id}-item-${index}`}
                  className="flex p-5 gap-4 hover:bg-gray-50/50 transition-colors duration-150"
                >
                  <div className="flex-shrink-0 w-20 h-20 relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <Image
                      src={getProductImage(item) || "/placeholder.svg"}
                      alt={getProductName(item)}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-gray-900 truncate text-sm">{getProductName(item)}</h4>
                    {getProductVariation(item) && (
                      <p className="text-xs text-gray-500 mt-1">{getProductVariation(item)}</p>
                    )}
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">No items found in this order</div>
            )}

            {order.items && order.items.length > 3 && (
              <div className="p-3 text-center text-xs text-gray-500 bg-gray-50/50 font-medium">
                + {order.items.length - 3} more item(s)
              </div>
            )}
          </div>

          <div className="order-card-footer">
            <span className="text-sm font-medium text-gray-600">{order.items ? order.items.length : 0} item(s)</span>
            <span className="font-semibold text-gray-900">
              Total: {formatCurrency(order.total_amount || order.total || 0)}
            </span>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  )
}
