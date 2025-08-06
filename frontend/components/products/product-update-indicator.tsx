"use client"

import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { websocketService } from "@/services/websocket" // Assuming websocketService is in this path

interface ProductUpdateIndicatorProps {
  productId: string | number
  onRefresh?: () => void
}

export function ProductUpdateIndicator({ productId, onRefresh }: ProductUpdateIndicatorProps) {
  const { isConnected, subscribe } = useSocket()
  const [hasUpdate, setHasUpdate] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return

    const handleProductUpdate = (data: any) => {
      if (data.product_id === productId || data.productId === productId) {
        setHasUpdate(true)
        setLastUpdateTime(new Date().toLocaleTimeString())
      }
    }

    // Connect to WebSocket if not already connected
    if (!websocketService.getConnectionStatus()) {
      websocketService.connect().then(() => {
        console.log("WebSocket connected for product updates")
      })
    }

    // Subscribe to product updates
    const unsubscribe = websocketService.subscribe("product_updated", handleProductUpdate)

    return () => {
      unsubscribe()
    }
  }, [productId])

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
    setHasUpdate(false)
  }

  if (!hasUpdate) return null

  return (
    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
        Updated
      </Badge>
      <span className="text-sm text-amber-800">
        This product was updated {lastUpdateTime ? `at ${lastUpdateTime}` : "recently"}
      </span>
      <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
        <RefreshCw className="h-3 w-3 mr-1" />
        Refresh
      </Button>
    </div>
  )
}
