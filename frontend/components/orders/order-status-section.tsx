"use client"

import type React from "react"
import { Clock, PackageX, Truck, PackageCheck, RotateCcw } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface OrderStatusSectionProps {
  status: string
  count: number
  children: React.ReactNode
}

export function OrderStatusSection({ status, count, children }: OrderStatusSectionProps) {
  // Status-specific styling
  const statusConfig = {
    pending: {
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      textColor: "text-amber-600",
      borderColor: "border-amber-200",
    },
    shipped: {
      icon: <Truck className="h-5 w-5 text-indigo-500" />,
      textColor: "text-indigo-600",
      borderColor: "border-indigo-200",
    },
    delivered: {
      icon: <PackageCheck className="h-5 w-5 text-emerald-500" />,
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200",
    },
    cancelled: {
      icon: <PackageX className="h-5 w-5 text-rose-500" />,
      textColor: "text-rose-600",
      borderColor: "border-rose-200",
    },
    returned: {
      icon: <RotateCcw className="h-5 w-5 text-slate-500" />,
      textColor: "text-slate-600",
      borderColor: "border-slate-200",
    },
    default: {
      icon: <Clock className="h-5 w-5 text-gray-400" />,
      textColor: "text-gray-700",
      borderColor: "border-gray-200",
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.default

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <div className="flex items-center">
          {config.icon}
          <h2 className={`text-xl font-semibold ml-2 ${config.textColor}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)} Orders
          </h2>
        </div>
        <div className="ml-3 text-sm text-gray-500">
          {count} {count === 1 ? "order" : "orders"} with status "{status}"
        </div>
      </div>
      <Separator className={`mb-6 ${config.borderColor}`} />
      {children}
    </div>
  )
}

