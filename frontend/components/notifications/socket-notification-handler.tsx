"use client"

import { useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { useToast } from "@/hooks/use-toast"

export function SocketNotificationHandler() {
  const { isConnected, subscribe } = useSocket()
  const { toast } = useToast()

  useEffect(() => {
    if (!isConnected) return

    // Clean up function to store unsubscribe functions
    const unsubscribeFunctions: (() => void)[] = []

    // Handle product updates
    const handleProductUpdate = (data: any) => {
      toast({
        title: "Product Updated",
        description: `Product #${data.product_id} has been updated.`,
        variant: "default",
      })
    }

    // Handle order updates
    const handleOrderUpdate = (data: any) => {
      toast({
        title: "Order Status Updated",
        description: `Order #${data.order_id} status changed to ${data.status}.`,
        variant: "default",
      })
    }

    // Handle inventory updates
    const handleInventoryUpdate = (data: any) => {
      // Only show notification if stock is low
      if (data.stock_level <= 5) {
        toast({
          title: "Low Stock Alert",
          description: `Product #${data.product_id} has only ${data.stock_level} items left.`,
          variant: "destructive",
        })
      }
    }

    // Handle flash sale notifications
    const handleFlashSale = (data: any) => {
      toast({
        title: "Flash Sale Started!",
        description: data.sale_data?.description || "Check out our limited-time offers!",
        variant: "default",
      })
    }

    // Handle general notifications
    const handleNotification = (data: any) => {
      toast({
        title: data.type || "Notification",
        description: data.message,
        variant: data.type === "error" ? "destructive" : "default",
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
  }, [isConnected, subscribe, toast])

  return null
}
