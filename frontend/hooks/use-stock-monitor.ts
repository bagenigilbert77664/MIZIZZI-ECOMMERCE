"use client"

import { useState, useEffect, useCallback } from "react"
import { websocketService } from "@/services/websocket"

interface StockUpdate {
  product_id: number
  stock_level: number
  timestamp: string
}

interface UseStockMonitorProps {
  productIds?: number[]
  onStockUpdate?: (update: StockUpdate) => void
}

export function useStockMonitor({ productIds, onStockUpdate }: UseStockMonitorProps = {}) {
  const [stockUpdates, setStockUpdates] = useState<Record<number, StockUpdate>>({})
  const [lowStockAlerts, setLowStockAlerts] = useState<Record<number, StockUpdate>>({})
  const [isConnected, setIsConnected] = useState(false)

  // Handle inventory updates from WebSocket
  const handleInventoryUpdate = useCallback(
    (data: StockUpdate) => {
      if (!data || !data.product_id) return

      // If we're monitoring specific products and this isn't one of them, ignore
      if (productIds && !productIds.includes(data.product_id)) return

      setStockUpdates((prev) => ({
        ...prev,
        [data.product_id]: data,
      }))

      // Call the callback if provided
      if (onStockUpdate) {
        onStockUpdate(data)
      }
    },
    [productIds, onStockUpdate],
  )

  // Handle low stock alerts from WebSocket
  const handleLowStockAlert = useCallback(
    (data: StockUpdate) => {
      if (!data || !data.product_id) return

      // If we're monitoring specific products and this isn't one of them, ignore
      if (productIds && !productIds.includes(data.product_id)) return

      setLowStockAlerts((prev) => ({
        ...prev,
        [data.product_id]: data,
      }))
    },
    [productIds],
  )

  // Connect to WebSocket and set up listeners
  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect()

    // Set up listeners
    websocketService.on("connect", () => setIsConnected(true))
    websocketService.on("disconnect", () => setIsConnected(false))
    websocketService.on("inventory_updated", handleInventoryUpdate)
    websocketService.on("low_stock_alert", handleLowStockAlert)

    // Clean up listeners on unmount
    return () => {
      websocketService.off("inventory_updated", handleInventoryUpdate)
      websocketService.off("low_stock_alert", handleLowStockAlert)
      websocketService.off("connect", () => setIsConnected(true))
      websocketService.off("disconnect", () => setIsConnected(false))
    }
  }, [handleInventoryUpdate, handleLowStockAlert])

  // Check if a specific product is in stock
  const isInStock = useCallback(
    (productId: number, minQuantity = 1): boolean => {
      const update = stockUpdates[productId]
      if (update) {
        return update.stock_level >= minQuantity
      }
      return true // Default to true if we don't have stock info
    },
    [stockUpdates],
  )

  // Check if a specific product has low stock
  const hasLowStock = useCallback(
    (productId: number): boolean => {
      return !!lowStockAlerts[productId]
    },
    [lowStockAlerts],
  )

  // Get stock level for a product
  const getStockLevel = useCallback(
    (productId: number): number | null => {
      const update = stockUpdates[productId]
      return update ? update.stock_level : null
    },
    [stockUpdates],
  )

  return {
    isConnected,
    stockUpdates,
    lowStockAlerts,
    isInStock,
    hasLowStock,
    getStockLevel,
  }
}
