"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, XCircle } from "lucide-react"

interface StockIndicatorProps {
  status: "in_stock" | "low_stock" | "out_of_stock" | "unknown"
  quantity?: number
  showQuantity?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StockIndicator({
  status,
  quantity,
  showQuantity = true,
  size = "md",
  className = "",
}: StockIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "in_stock":
        return {
          icon: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
          text: "In Stock",
          variant: "success" as const,
        }
      case "low_stock":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
          text: "Low Stock",
          variant: "warning" as const,
        }
      case "out_of_stock":
        return {
          icon: <XCircle className="h-3.5 w-3.5 mr-1" />,
          text: "Out of Stock",
          variant: "destructive" as const,
        }
      default:
        return {
          icon: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
          text: "Unknown",
          variant: "outline" as const,
        }
    }
  }

  const { icon, text, variant } = getStatusConfig()
  const sizeClass =
    size === "lg" ? "px-3 py-1.5 text-sm" : size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs"

  return (
    <Badge variant={variant} className={`${sizeClass} ${className} font-medium`}>
      <span className="flex items-center">
        {icon}
        {text}
        {showQuantity && quantity !== undefined && quantity >= 0 && (
          <span className="ml-1">
            ({quantity} {quantity === 1 ? "item" : "items"})
          </span>
        )}
      </span>
    </Badge>
  )
}

export default StockIndicator
