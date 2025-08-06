"use client"

import React, { useState } from "react"
import { ChevronLeft, ChevronRight, Package } from "lucide-react"
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
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage))
  const currentOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-sm text-gray-600">Loading your orders...</div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-24 px-6">
        <div className="mb-4 flex items-center justify-center rounded-full bg-gray-100 p-4 w-16 h-16 mx-auto">
          <Package className="h-6 w-6 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          No {status} Orders
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          You haven’t placed any orders with this status yet.
        </p>
        <Button variant="default" size="sm" onClick={() => window.location.href = "/"}>
          Browse Products
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {currentOrders.map((order) => (
          <div key={order.id} className="rounded border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <OrderCard order={order} onCancelOrder={onCancelOrder} />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
