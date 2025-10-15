"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"

interface ProductUpdate {
  product_id: string | number
  data: any
  timestamp: string
}

export function useProductUpdates(productId?: string | number) {
  const { isConnected, subscribe } = useSocket()
  const [updates, setUpdates] = useState<ProductUpdate[]>([])
  const [lastUpdate, setLastUpdate] = useState<ProductUpdate | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isConnected) return

    setIsLoading(false)

    const handleProductUpdate = (data: ProductUpdate) => {
      // If productId is provided, only track updates for that product
      if (productId && data.product_id.toString() !== productId.toString()) {
        return
      }

      setLastUpdate(data)
      setUpdates((prev) => [data, ...prev].slice(0, 20)) // Keep last 20 updates
    }

    const unsubProductUpdate = subscribe("product_updated", handleProductUpdate)
    const unsubInventoryUpdate = subscribe("inventory_updated", handleProductUpdate)

    return () => {
      unsubProductUpdate()
      unsubInventoryUpdate()
    }
  }, [isConnected, productId, subscribe])

  return { updates, lastUpdate, isLoading }
}
