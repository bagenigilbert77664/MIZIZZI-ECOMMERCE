"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingBag, Clock, Truck, CheckCircle, RotateCcw, XCircle } from "lucide-react"
import type { Order } from "@/types"
import { OrderCard } from "@/components/orders/order-card"

interface OrderStatusTabProps {
  status?: string
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
  const [showDebug, setShowDebug] = useState(false)

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, orders.length)
  const currentOrders = orders.slice(startIndex, endIndex)

  // Get status-specific styling
  const getStatusHeaderStyle = () => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-orange-600 border-orange-500"
      case "shipped":
        return "text-blue-600 border-blue-500"
      case "delivered":
        return "text-green-600 border-green-500"
      case "cancelled":
      case "canceled":
        return "text-red-600 border-red-500"
      case "returned":
        return "text-gray-600 border-gray-500"
      default:
        return "text-gray-800 border-gray-500"
    }
  }

  // Get status icon
  const getStatusIcon = () => {
    switch (status?.toLowerCase()) {
      case "pending":
        return <Clock className="h-6 w-6 text-orange-600" />
      case "shipped":
        return <Truck className="h-6 w-6 text-blue-600" />
      case "delivered":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "returned":
        return <RotateCcw className="h-6 w-6 text-gray-600" />
      case "cancelled":
      case "canceled":
        return <XCircle className="h-6 w-6 text-red-600" />
      default:
        return <ShoppingBag className="h-6 w-6 text-gray-800" />
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-gray-500">Loading orders...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-4">
          <ShoppingBag className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mb-2 text-lg font-medium">No {status} orders</h3>
        <p className="mb-6 text-gray-500">You don't have any orders with this status.</p>
        <Button asChild variant="outline">
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </Card>
    )
  }

  return (
    <div>
      {/* Status header */}
      <div className={`mb-6 pb-2 border-b ${getStatusHeaderStyle()}`}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}

          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"} Orders
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {orders.length} {orders.length === 1 ? "order" : "orders"} with status "{status}"
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {currentOrders.map((order) => (
          <OrderCard key={order.id} order={order} onCancelOrder={onCancelOrder} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 sm:px-3"
            >
              Previous
            </Button>

            {/* Show fewer page buttons on mobile */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // On mobile, show only current page and immediate neighbors
                if (typeof window !== "undefined" && window.innerWidth < 640) {
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                }
                return true
              })
              .map((page, index, array) => {
                // Add ellipsis
                if (index > 0 && page - array[index - 1] > 1) {
                  return (
                    <span key={`ellipsis-${page}`} className="px-1 text-gray-500">
                      ...
                    </span>
                  )
                }

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                )
              })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 sm:px-3"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

