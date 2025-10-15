"use client"

import type React from "react"

import { Check, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderStatusTimelineProps {
  currentStatus: string
  orderDate?: string
  confirmedDate?: string
  processingDate?: string
  shippedDate?: string
  deliveredDate?: string
  cancelledDate?: string
  estimatedDelivery?: string
}

interface TimelineStage {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  date?: string
}

export function OrderStatusTimeline({
  currentStatus,
  orderDate,
  confirmedDate,
  processingDate,
  shippedDate,
  deliveredDate,
  cancelledDate,
  estimatedDelivery,
}: OrderStatusTimelineProps) {
  // Normalize status to lowercase for comparison
  const status = currentStatus?.toLowerCase() || "pending"

  // Define the order of statuses
  const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"]
  const currentIndex = statusOrder.indexOf(status)

  // Handle cancelled/refunded/returned orders
  const isCancelled = ["cancelled", "refunded", "returned"].includes(status)

  // Define timeline stages
  const stages: TimelineStage[] = [
    {
      key: "pending",
      label: "Order Placed",
      description: "Order received",
      icon: <Package className="h-4 w-4" />,
      date: orderDate,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      description: "Payment verified",
      icon: <CheckCircle className="h-4 w-4" />,
      date: confirmedDate,
    },
    {
      key: "processing",
      label: "Processing",
      description: "Preparing items",
      icon: <Clock className="h-4 w-4" />,
      date: processingDate,
    },
    {
      key: "shipped",
      label: "Shipped",
      description: "In transit",
      icon: <Truck className="h-4 w-4" />,
      date: shippedDate,
    },
    {
      key: "delivered",
      label: "Delivered",
      description: "Completed",
      icon: <Check className="h-4 w-4" />,
      date: deliveredDate,
    },
  ]

  // If order is cancelled, show cancelled stage
  if (isCancelled) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-900">Order Status</h3>
        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium text-neutral-900">
                {status === "cancelled" ? "Cancelled" : status === "refunded" ? "Refunded" : "Returned"}
              </p>
              <p className="text-xs text-neutral-500">{cancelledDate || "Order has been cancelled"}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">Order Status</h3>
        {estimatedDelivery && currentIndex < 4 && (
          <p className="text-xs text-neutral-500">
            Est. Delivery: <span className="font-medium text-neutral-700">{estimatedDelivery}</span>
          </p>
        )}
      </div>

      <div className="relative space-y-6">
        {stages.map((stage, index) => {
          const stageIndex = statusOrder.indexOf(stage.key)
          const isCompleted = stageIndex <= currentIndex
          const isCurrent = stageIndex === currentIndex
          const isFuture = stageIndex > currentIndex

          return (
            <div key={stage.key} className="relative flex items-start gap-3">
              {/* Connector line */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "absolute left-4 top-8 h-[calc(100%+0.5rem)] w-0.5",
                    isCompleted ? "bg-green-500" : "bg-neutral-200",
                  )}
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && !isCompleted && "bg-amber-100 text-amber-700",
                  isFuture && "bg-neutral-100 text-neutral-400",
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stage.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted && "text-neutral-900",
                    isCurrent && !isCompleted && "text-neutral-900",
                    isFuture && "text-neutral-400",
                  )}
                >
                  {stage.label}
                </p>
                <p
                  className={cn(
                    "text-xs transition-colors",
                    isCompleted && "text-neutral-600",
                    isCurrent && !isCompleted && "text-neutral-500",
                    isFuture && "text-neutral-400",
                  )}
                >
                  {stage.description}
                </p>
                {stage.date && <p className="mt-0.5 text-xs text-neutral-500">{stage.date}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
