"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"

interface ProductUpdate {
  product_id: string | number
  data: any
  timestamp: string
}

export function useProductUpdates(productId?: string | number) {
  const { socket } = useSocket()
  const [updates, setUpdates] = useState<ProductUpdate[]>([])
  const [lastUpdate, setLastUpdate] = useState<ProductUpdate | null>(null)

  useEffect(() => {
    if (!socket) return

    const handleProductUpdate = (data: ProductUpdate) => {
      // If productId is provided, only track updates for that product
      if (productId && data.product_id.toString() !== productId.toString()) {
        return
      }

      setLastUpdate(data)
      setUpdates((prev) => [data, ...prev].slice(0, 20)) // Keep last 20 updates
    }

    socket.on("product_updated", handleProductUpdate)
    socket.on("inventory_updated", handleProductUpdate)

    return () => {
      socket.off("product_updated", handleProductUpdate)
      socket.off("inventory_updated", handleProductUpdate)
    }
  }, [socket, productId])

  return { updates, lastUpdate }
}
