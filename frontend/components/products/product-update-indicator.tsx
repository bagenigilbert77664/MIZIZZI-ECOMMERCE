"use client"

import { useProductUpdates } from "@/hooks/use-product-updates"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"

interface ProductUpdateIndicatorProps {
  productId: string
  onRefresh?: (product: any) => void
}

export function ProductUpdateIndicator({ productId, onRefresh }: ProductUpdateIndicatorProps) {
  const { isUpdated, lastUpdateTime, isRefreshing, refreshProduct } = useProductUpdates(productId)
  const [timeAgo, setTimeAgo] = useState<string>("")

  // Update the time ago text
  useEffect(() => {
    if (!lastUpdateTime) return

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastUpdateTime) / 1000)

      if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`)
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`)
      } else if (seconds < 86400) {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`)
      } else {
        setTimeAgo(`${Math.floor(seconds / 86400)}d ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 1000)

    return () => clearInterval(interval)
  }, [lastUpdateTime])

  const handleRefresh = async () => {
    const product = await refreshProduct()
    if (product && onRefresh) {
      onRefresh(product)
    }
  }

  if (!isUpdated) return null

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
          Updated {timeAgo}
        </Badge>
        <span className="text-sm text-blue-700">
          This product has been updated. Refresh to see the latest information.
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="border-blue-200 text-blue-700 hover:bg-blue-100"
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </Button>
    </div>
  )
}

