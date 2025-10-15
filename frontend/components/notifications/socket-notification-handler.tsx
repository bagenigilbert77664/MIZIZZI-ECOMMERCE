"use client"

import { useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { useNotifications } from "@/contexts/notification/notification-context"

export function SocketNotificationHandler() {
  const { isConnected, subscribe } = useSocket()
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (!isConnected) return

    // Clean up function to store unsubscribe functions
    const unsubscribeFunctions: (() => void)[] = []

    // Handle product updates
    const handleProductUpdate = (data: any) => {
      addNotification({
        title: "Product Updated",
        message: `Product #${data.product_id} has been updated.`,
        type: "product_update",
        priority: "normal",
        timestamp: "now",
      })
    }

    // Handle order updates
    const handleOrderUpdate = (data: any) => {
      addNotification({
        title: "Order Status Updated",
        message: `Order #${data.order_id} status changed to ${data.status}.`,
        type: "order",
        priority: "normal",
        timestamp: "now",
        link: `/orders/${data.order_id}`,
      })
    }

    // Handle inventory updates
    const handleInventoryUpdate = (data: any) => {
      // Only show notification if stock is low
      if (data.stock_level <= 5) {
        addNotification({
          title: "Low Stock Alert",
          message: `Product #${data.product_id} has only ${data.stock_level} items left.`,
          type: "stock_alert",
          priority: "high",
          timestamp: "now",
          badge: "Urgent",
        })
      }
    }

    // Handle flash sale notifications
    const handleFlashSale = (data: any) => {
      addNotification({
        title: "Flash Sale Started!",
        message: data.sale_data?.description || "Check out our limited-time offers!",
        type: "promotion",
        priority: "medium",
        timestamp: "now",
        badge: "Limited Time",
      })
    }

    // Handle general notifications
    const handleNotification = (data: any) => {
      addNotification({
        title: data.type || "Notification",
        message: data.message,
        type: data.type === "error" ? "system" : "system",
        priority: data.type === "error" ? "high" : "normal",
        timestamp: "now",
      })
    }

    // Register event listeners
    unsubscribeFunctions.push(subscribe("product_updated", handleProductUpdate))
    unsubscribeFunctions.push(subscribe("order_updated", handleOrderUpdate))
    unsubscribeFunctions.push(subscribe("inventory_updated", handleInventoryUpdate))
    unsubscribeFunctions.push(subscribe("flash_sale_started", handleFlashSale))
    unsubscribeFunctions.push(subscribe("notification", handleNotification))

    // Clean up on unmount
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe())
    }
  }, [isConnected, subscribe, addNotification])

  return null
}
