"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { websocketService } from "@/services/websocket"
import { useNotifications } from "@/contexts/notification/notification-context"

/**
 * Hook to monitor stock changes for items in the cart
 * This uses WebSocket to receive real-time updates about product stock changes
 */
export function useStockMonitor() {
  const { items, refreshCart } = useCart()
  const [stockUpdates, setStockUpdates] = useState<Record<number, number>>({})
  const { addNotification } = useNotifications()

  useEffect(() => {
    // Handler for product stock updates
    const handleProductUpdate = (data: any) => {
      if (data.action === "update" && data.data && typeof data.data.stock === "number") {
        const productId = data.product_id
        const newStock = data.data.stock

        // Check if this product is in our cart
        const cartItem = items.find((item) => item.product_id === productId)

        if (cartItem) {
          // Update our local stock tracking
          setStockUpdates((prev) => ({
            ...prev,
            [productId]: newStock,
          }))

          // If the new stock is less than the quantity in cart, show a warning
          if (newStock < cartItem.quantity) {
            addNotification({
              title: "Stock Alert",
              message: `Only ${newStock} units of "${cartItem.product.name}" are now available.`,
              type: "stock_alert",
              priority: "high",
              timestamp: "now",
              badge: "Cart Item",
            })

            // Refresh the cart to get updated validation
            refreshCart()
          }
        }
      }
    }

    // Register for product update events
    websocketService.on("product_updated", handleProductUpdate)

    // Cleanup
    return () => {
      websocketService.off("product_updated", handleProductUpdate)
    }
  }, [items, refreshCart, addNotification])

  return {
    stockUpdates,
  }
}
