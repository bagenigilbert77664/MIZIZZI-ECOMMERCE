"use client"
import { ShoppingBag, Clock, Truck, CheckCircle, RotateCcw, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface OrderStatusCardProps {
  status: "total" | "pending" | "shipped" | "delivered" | "returned" | "cancelled"
  count: number
  loading: boolean
  onClick?: () => void
}

// Update the OrderStatusCard to be fully responsive
export function OrderStatusCard({ status, count, loading, onClick }: OrderStatusCardProps) {
  const statusConfig = {
    total: {
      label: "Total",
      icon: <ShoppingBag className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-primary/90 to-primary/70",
      borderColor: "border-primary/30",
      hoverBgColor: "group-hover:from-primary to-primary/80",
      hoverBorderColor: "group-hover:border-primary/50",
      iconBgColor: "bg-primary-foreground/10",
      countColor: "text-white",
      labelColor: "text-primary-foreground/80",
      pulseColor: "bg-white",
      isClickable: false,
    },
    pending: {
      label: "Pending",
      icon: <Clock className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-amber-500 to-amber-400",
      borderColor: "border-amber-300",
      hoverBgColor: "group-hover:from-amber-600 group-hover:to-amber-500",
      hoverBorderColor: "group-hover:border-amber-400",
      iconBgColor: "bg-white/10",
      countColor: "text-white",
      labelColor: "text-amber-50",
      pulseColor: "bg-amber-100",
      isClickable: true,
    },
    shipped: {
      label: "Shipped",
      icon: <Truck className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-blue-500 to-blue-400",
      borderColor: "border-blue-300",
      hoverBgColor: "group-hover:from-blue-600 group-hover:to-blue-500",
      hoverBorderColor: "group-hover:border-blue-400",
      iconBgColor: "bg-white/10",
      countColor: "text-white",
      labelColor: "text-blue-50",
      pulseColor: "bg-blue-100",
      isClickable: true,
    },
    delivered: {
      label: "Delivered",
      icon: <CheckCircle className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-emerald-500 to-emerald-400",
      borderColor: "border-emerald-300",
      hoverBgColor: "group-hover:from-emerald-600 group-hover:to-emerald-500",
      hoverBorderColor: "group-hover:border-emerald-400",
      iconBgColor: "bg-white/10",
      countColor: "text-white",
      labelColor: "text-emerald-50",
      pulseColor: "bg-emerald-100",
      isClickable: true,
    },
    returned: {
      label: "Returned",
      icon: <RotateCcw className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-gray-500 to-gray-400",
      borderColor: "border-gray-300",
      hoverBgColor: "group-hover:from-gray-600 group-hover:to-gray-500",
      hoverBorderColor: "group-hover:border-gray-400",
      iconBgColor: "bg-white/10",
      countColor: "text-white",
      labelColor: "text-gray-50",
      pulseColor: "bg-gray-100",
      isClickable: true,
    },
    cancelled: {
      label: "Cancelled",
      icon: <XCircle className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-rose-500 to-rose-400",
      borderColor: "border-rose-300",
      hoverBgColor: "group-hover:from-rose-600 group-hover:to-rose-500",
      hoverBorderColor: "group-hover:border-rose-400",
      iconBgColor: "bg-white/10",
      countColor: "text-white",
      labelColor: "text-rose-50",
      pulseColor: "bg-rose-100",
      isClickable: true,
    },
  }

  const config = statusConfig[status]
  const CardComponent = config.isClickable ? "button" : "div"

  return (
    <CardComponent
      onClick={onClick}
      className={`group relative flex items-center overflow-hidden rounded-lg border shadow-sm transition-all duration-300
        ${config.bgColor} ${config.borderColor} ${config.hoverBgColor} ${config.hoverBorderColor}
        ${
          config.isClickable
            ? "cursor-pointer hover:shadow-md hover:translate-y-[-1px] active:translate-y-[0px] active:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/30"
            : ""
        } min-h-[70px] sm:min-h-[80px] w-full`}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 bg-white/5 rounded-full transform rotate-12 group-hover:scale-125 transition-all duration-500"></div>

      {/* Icon */}
      <div
        className={`flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-md ${config.iconBgColor} m-2 sm:m-3`}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex flex-col py-2 pr-2 sm:py-3 sm:pr-3">
        {loading ? (
          <Skeleton className="h-5 w-8 sm:h-6 sm:w-10 bg-white/20" />
        ) : (
          <div className="relative">
            <p className={`text-xl sm:text-2xl font-bold ${config.countColor} leading-none`}>{count}</p>

            {/* Notification indicators */}
            {(status === "pending" || status === "total") && count > 0 && (
              <div className="absolute -top-1 -right-3 flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-[ping_2s_ease-in-out_infinite]"
                  style={{ backgroundColor: config.pulseColor }}
                ></span>
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: config.pulseColor }}
                ></span>
              </div>
            )}
          </div>
        )}

        <p className={`text-xs sm:text-sm font-medium ${config.labelColor} mt-1`}>{config.label}</p>
      </div>
    </CardComponent>
  )
}

