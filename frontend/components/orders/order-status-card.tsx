"use client"
import { ShoppingBag, Clock, Truck, CheckCircle, RotateCcw, XCircle, Package } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface OrderStatusCardProps {
  status: "total" | "pending" | "processing" | "shipped" | "delivered" | "returned" | "cancelled"
  count: number
  loading: boolean
  onClick?: () => void
}

export function OrderStatusCard({ status, count, loading, onClick }: OrderStatusCardProps) {
  const statusConfig = {
    total: {
      label: "Total",
      icon: <ShoppingBag className="h-4 w-4 text-white" />,
      gradient: "bg-gradient-to-br from-pink-500 to-rose-700",
      hoverGradient: "hover:from-pink-600 hover:to-rose-600",
      shadowColor: "shadow-pink-500/20 hover:shadow-pink-500/30",
      isClickable: false,
    },
    pending: {
      label: "Pending",
      icon: <Clock className="h-4 w-4 text-white" />,
      gradient: "bg-gradient-to-br from-yellow-400 to-amber-600",
      hoverGradient: "hover:from-yellow-500 hover:to-amber-600",
      shadowColor: "shadow-yellow-500/20 hover:shadow-yellow-500/30",
      isClickable: true,
    },
    processing: {
      label: "Processing",
      icon: <Package className="h-4 w-4 text-white" />,
      gradient: "bg-gradient-to-br from-yellow-400 to-amber-700",
      hoverGradient: "hover:from-yellow-500 hover:to-amber-600",
      shadowColor: "shadow-yellow-500/20 hover:shadow-yellow-500/30",
      isClickable: true,
    },
    shipped: {
      label: "Shipped",
      icon: <Truck className="h-4 w-4 text-white" />,
      gradient: "bg-gradient-to-br from-purple-500 to-purple-700",
      hoverGradient: "hover:from-purple-600 hover:to-purple-700",
      shadowColor: "shadow-purple-500/20 hover:shadow-purple-500/30",
      isClickable: true,
    },
    delivered: {
      label: "Delivered",
      icon: <CheckCircle className="h-4 w-4 text-white" />,
      gradient: "bg-gradient-to-br from-green-500 to-emerald-700",
      hoverGradient: "hover:from-green-600 hover:to-emerald-600",
      shadowColor: "shadow-green-500/20 hover:shadow-green-500/30",
      isClickable: true,
    },
    returned: {
      label: "Returned",
      icon: <RotateCcw className="h-4 w-4 text-white" />,
      gradient: "bg-gradient-to-br from-gray-500 to-slate-700",
      hoverGradient: "hover:from-gray-600 hover:to-slate-600",
      shadowColor: "shadow-gray-500/20 hover:shadow-gray-500/30",
      isClickable: true,
    },
    cancelled: {
      label: "Cancelled",
      icon: <XCircle className="h-4 w-4 text-white" />,
      gradient: "bg-gradient-to-br from-red-500 to-pink-700",
      hoverGradient: "hover:from-red-600 hover:to-pink-600",
      shadowColor: "shadow-red-500/20 hover:shadow-red-500/30",
      isClickable: true,
    },
  }

  const config = statusConfig[status]
  const CardComponent = config.isClickable ? "button" : "div"

  return (
    <CardComponent
      onClick={onClick}
      className={`status-card-premium group relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-lg shadow-md transition-all duration-300 ease-out
        ${config.gradient} ${config.hoverGradient} ${config.shadowColor}
        ${
          config.isClickable
            ? "cursor-pointer hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 active:scale-95"
            : ""
        } min-h-[70px] p-2.5`}
    >
      {/* Icon container - smaller size */}
      <div className="flex items-center justify-center h-7 w-7 rounded-md bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
        {config.icon}
      </div>

      {/* Count and label - more compact */}
      <div className="flex flex-col items-center gap-0 min-w-0 flex-1">
        {loading ? (
          <Skeleton className="h-6 w-8 bg-white/30 rounded" />
        ) : (
          <p className="text-xl font-bold text-white leading-none tracking-tight">{count}</p>
        )}

        <p className="text-[9px] font-semibold text-white/95 tracking-wide whitespace-nowrap uppercase mt-0.5">
          {config.label}
        </p>
      </div>

      {/* Premium shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-out" />
    </CardComponent>
  )
}
