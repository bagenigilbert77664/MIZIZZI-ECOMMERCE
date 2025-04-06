import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, ShoppingBag, Truck, CheckCircle, PackageX, RotateCcw, RefreshCw } from "lucide-react"

interface OrderStatusBadgeProps {
  status: string
  size?: "sm" | "default"
}

export function OrderStatusBadge({ status, size = "default" }: OrderStatusBadgeProps) {
  const statusLower = status?.toLowerCase() || "default"

  const statusColors: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: {
      color: "bg-cherry-100 text-cherry-800 border-cherry-200",
      icon: <Clock className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    processing: {
      color: "bg-cherry-100 text-cherry-800 border-cherry-200",
      icon: <ShoppingBag className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    shipped: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <Truck className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    delivered: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    cancelled: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: <PackageX className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    canceled: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: <PackageX className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    returned: {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <RotateCcw className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    refunded: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <RefreshCw className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
    default: {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <Clock className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />,
    },
  }

  const { color, icon } = statusColors[statusLower] || statusColors.default

  return (
    <Badge
      className={`${color} py-1 px-2 flex items-center uppercase ${size === "sm" ? "text-xs" : ""}`}
      variant="outline"
    >
      {icon}
      {status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || "Unknown"}
    </Badge>
  )
}

