"use client"

import type React from "react"
import { useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { useToast } from "@/hooks/use-toast"

interface SocketNotificationHandlerProps {
  children?: React.ReactNode
}

export const SocketNotificationHandler: React.FC<SocketNotificationHandlerProps> = ({ children }) => {
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()

  useEffect(() => {
    if (!socket) return

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
        description: data.sale_data.description || "Check out our limited-time offers!",
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
    socket.on("product_updated", handleProductUpdate)
    socket.on("order_updated", handleOrderUpdate)
    socket.on("inventory_updated", handleInventoryUpdate)
    socket.on("flash_sale_started", handleFlashSale)
    socket.on("notification", handleNotification)

    // Clean up on unmount
    return () => {
      socket.off("product_updated", handleProductUpdate)
      socket.off("order_updated", handleOrderUpdate)
      socket.off("inventory_updated", handleInventoryUpdate)
      socket.off("flash_sale_started", handleFlashSale)
      socket.off("notification", handleNotification)
    }
  }, [socket, toast])

  return <>{children}</>
}

