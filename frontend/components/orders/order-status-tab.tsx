"use client"

import type React from "react"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrderCard } from "@/components/orders/order-card"
import type { Order } from "@/types"

interface OrderStatusTabProps {
  status: string
  orders: Order[]
  loading: boolean
  formatCurrency: (amount: number) => string
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
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, orders.length)
  const currentOrders = orders.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-sm text-gray-500">Loading orders...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-gray-50 p-4 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 12H4M8 16l-4-4 4-4M16 16l4-4-4-4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No {status} orders</h3>
        <p className="text-sm text-gray-500 max-w-md">
          {status === "pending"
            ? "You don't have any pending orders at the moment."
            : status === "shipped"
              ? "You don't have any orders in transit right now."
              : status === "delivered"
                ? "You don't have any delivered orders yet."
                : status === "cancelled"
                  ? "You don't have any cancelled orders."
                  : status === "returned"
                    ? "You don't have any returned orders."
                    : "You don't have any orders with this status."}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-4">
        {currentOrders.map((order) => (
          <OrderCard key={order.id} order={order} onCancelOrder={onCancelOrder} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 text-xs"
            >
              Previous
            </Button>
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

