"use client"

import { useEffect, useState } from "react"
import { websocketService } from "@/services/websocket"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ProductUpdateNotificationProps {
  showToasts?: boolean
}

export function ProductUpdateNotification({ showToasts = true }: ProductUpdateNotificationProps) {
  const [recentUpdates, setRecentUpdates] = useState<{ id: string; timestamp: number }[]>([])

  useEffect(() => {
    const handleProductUpdate = (data: { id: string }) => {
      // Add to recent updates
      setRecentUpdates((prev) => {
        const newUpdates = [
          { id: data.id, timestamp: Date.now() },
          ...prev.filter((update) => update.id !== data.id),
        ].slice(0, 5) // Keep only the 5 most recent updates

        return newUpdates
      })

      // Show toast notification if enabled
      if (showToasts) {
        toast({
          title: "Product Updated",
          description: `Product #${data.id} has been updated`,
          variant: "default",
        })
      }
    }

    // Subscribe to product updates via WebSocket
    const unsubscribe = websocketService.subscribe("product_updated", handleProductUpdate)

    // Also listen for custom events for product updates
    const handleCustomEvent = (event: CustomEvent) => {
      if (event.detail && event.detail.id) {
        handleProductUpdate({ id: event.detail.id })
      }
    }

    window.addEventListener("product-updated", handleCustomEvent as EventListener)

    return () => {
      unsubscribe()
      window.removeEventListener("product-updated", handleCustomEvent as EventListener)
    }
  }, [showToasts])

  // Remove updates older than 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      setRecentUpdates((prev) => prev.filter((update) => update.timestamp > fiveMinutesAgo))
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (recentUpdates.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <h4 className="font-medium text-sm">Recent Product Updates</h4>
        </div>
        <div className="space-y-1.5">
          {recentUpdates.map((update) => (
            <div key={update.id} className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Product #{update.id}</span>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                Updated {Math.floor((Date.now() - update.timestamp) / 1000)}s ago
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

