"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { notificationService } from "@/services/notification"
import type { Notification as NotificationData } from "@/types/notification"
import { useAuth } from "@/contexts/auth/auth-context"

// Re-export types from the types file
export type {
  NotificationType,
  NotificationPriority,
  Notification,
} from "@/types/notification"

export interface NotificationAction {
  label: string
  href: string
}

interface NotificationContextType {
  notifications: NotificationData[]
  unreadCount: number
  isLoading: boolean
  addNotification: (notification: Omit<NotificationData, "id" | "read" | "timestamp">) => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAllNotifications: () => void
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const data = await notificationService.getUserNotifications()
      const notificationsArray = Array.isArray(data) ? data : []
      setNotifications(notificationsArray)
      setUnreadCount(notificationsArray.filter((n) => !n.read).length)
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const unsubscribe = notificationService.subscribeToNotifications((notification) => {
      console.log("[v0] Received real-time notification:", notification)
      setNotifications((prev) => [notification, ...(Array.isArray(prev) ? prev : [])])
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1)
      }
    })

    return unsubscribe
  }, [isAuthenticated])

  const addNotification = (notification: Omit<NotificationData, "id" | "read" | "timestamp">) => {
    const newNotification: NotificationData = {
      ...notification,
      id: `temp-${Date.now()}`,
      read: false,
      timestamp: new Date().toISOString(),
    }
    setNotifications((prev) => [newNotification, ...(Array.isArray(prev) ? prev : [])])
    setUnreadCount((prev) => prev + 1)
  }

  const markAsRead = async (id: string) => {
    const success = await notificationService.markAsRead(id)
    if (success) {
      setNotifications((prev) =>
        (Array.isArray(prev) ? prev : []).map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification,
        ),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    const success = await notificationService.markAllAsRead()
    if (success) {
      setNotifications((prev) =>
        (Array.isArray(prev) ? prev : []).map((notification) => ({ ...notification, read: true })),
      )
      setUnreadCount(0)
    }
  }

  const deleteNotification = async (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    const success = await notificationService.deleteNotification(id)
    if (success) {
      setNotifications((prev) => (Array.isArray(prev) ? prev : []).filter((notification) => notification.id !== id))
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const refreshNotifications = async () => {
    await fetchNotifications()
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
