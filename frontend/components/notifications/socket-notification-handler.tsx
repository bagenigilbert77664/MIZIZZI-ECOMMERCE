"use client"

import { useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { useToast } from "@/hooks/use-toast"

export function SocketNotificationHandler() {
  const { socket, isConnected, subscribe } = useSocket()
  const { toast } = useToast()

  useEffect(() => {
    if (!isConnected || !socket) return

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

    // Register event listeners using the subscribe method
    const unsubscribeProductUpdate = subscribe("product_updated", handleProductUpdate)
    const unsubscribeOrderUpdate = subscribe("order_updated", handleOrderUpdate)
    const unsubscribeInventoryUpdate = subscribe("inventory_updated", handleInventoryUpdate)
    const unsubscribeFlashSale = subscribe("flash_sale_started", handleFlashSale)
    const unsubscribeNotification = subscribe("notification", handleNotification)

    // Clean up on unmount
    return () => {
      unsubscribeProductUpdate()
      unsubscribeOrderUpdate()
      unsubscribeInventoryUpdate()
      unsubscribeFlashSale()
      unsubscribeNotification()
    }
  }, [socket, isConnected, subscribe, toast])

  return null
}

