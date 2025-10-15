"use client"

import { useNotifications } from "@/contexts/notification/notification-context"
import { useCallback } from "react"

/**
 * Hook to replace toast notifications with header notifications
 * This provides the same interface as useToast but adds notifications to the header instead
 */
export function useNotificationToast() {
  const { addNotification } = useNotifications()

  const toast = useCallback(
    ({
      title,
      description,
      variant = "default",
      ...props
    }: {
      title: string
      description?: string
      variant?: "default" | "destructive" | "success" | "warning"
    }) => {
      // Map toast variants to notification types and priorities
      let type: any = "system"
      let priority: any = "normal"

      if (title.toLowerCase().includes("order")) {
        type = "order"
      } else if (title.toLowerCase().includes("stock") || title.toLowerCase().includes("inventory")) {
        type = "stock_alert"
        priority = "high"
      } else if (title.toLowerCase().includes("payment")) {
        type = "payment"
      } else if (title.toLowerCase().includes("shipping")) {
        type = "shipping"
      }

      if (variant === "destructive") {
        priority = "high"
      } else if (variant === "warning") {
        priority = "medium"
      }

      // Add notification to header instead of showing toast
      addNotification({
        title,
        message: description || title,
        type,
        priority,
        timestamp: "now",
      })
    },
    [addNotification],
  )

  return { toast }
}
