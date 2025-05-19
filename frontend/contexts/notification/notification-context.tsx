"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"

export type NotificationType =
  | "order"
  | "promotion"
  | "system"
  | "payment"
  | "shipping"
  | "product"
  | "announcement"
  | "product_update"
  | "price_change"
  | "stock_alert"

export type NotificationPriority = "high" | "medium" | "normal" | "low"

export interface NotificationAction {
  label: string
  href: string
}

export interface Notification {
  id: string
  title: string
  message: string
  description?: string
  type: NotificationType
  read: boolean
  date: Date
  link?: string
  priority?: NotificationPriority
  icon?: React.ComponentType<any>
  image?: string
  badge?: string
  timestamp?: string
  actions?: NotificationAction[]
  data?: Record<string, any>
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  addNotification: (notification: Omit<Notification, "id" | "read" | "date">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

// Sample notifications for demonstration
const sampleNotifications: Notification[] = [
  {
    id: uuidv4(),
    title: "Order Confirmed",
    message: "Your order #12345 has been confirmed and is being processed.",
    description: "Your order #12345 has been confirmed and is being processed.",
    type: "order",
    read: false,
    date: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    link: "/orders/12345",
    priority: "normal",
    timestamp: "30 minutes ago",
  },
  {
    id: uuidv4(),
    title: "Special Offer",
    message: "Enjoy 20% off on all electronics this weekend!",
    description: "Enjoy 20% off on all electronics this weekend!",
    type: "promotion",
    read: false,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    link: "/promotions",
    priority: "medium",
    timestamp: "2 hours ago",
    badge: "Limited Time",
  },
  {
    id: uuidv4(),
    title: "Shipping Update",
    message: "Your order #12345 has been shipped and will arrive in 2-3 business days.",
    description: "Your order #12345 has been shipped and will arrive in 2-3 business days.",
    type: "shipping",
    read: true,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    link: "/orders/12345/tracking",
    priority: "normal",
    timestamp: "1 day ago",
  },
  {
    id: uuidv4(),
    title: "Payment Successful",
    message: "Your payment of $129.99 for order #12345 has been processed successfully.",
    description: "Your payment of $129.99 for order #12345 has been processed successfully.",
    type: "payment",
    read: true,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    link: "/orders/12345",
    priority: "normal",
    timestamp: "2 days ago",
  },
  {
    id: uuidv4(),
    title: "Account Security",
    message: "We've detected a login from a new device. Please verify if this was you.",
    description: "We've detected a login from a new device. Please verify if this was you.",
    type: "system",
    read: true,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    link: "/account?tab=security",
    priority: "high",
    timestamp: "3 days ago",
    actions: [
      { label: "Yes, it was me", href: "/account/security/confirm" },
      { label: "No, secure my account", href: "/account/security/lock" },
    ],
  },
]

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize with sample notifications
  useEffect(() => {
    setIsLoading(true)
    setNotifications(sampleNotifications)
    setUnreadCount(sampleNotifications.filter((n) => !n.read).length)
    setIsLoading(false)
  }, [])

  const addNotification = (notification: Omit<Notification, "id" | "read" | "date">) => {
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      read: false,
      date: new Date(),
    }
    setNotifications((prev) => [newNotification, ...prev])
    setUnreadCount((prev) => prev + 1)
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    setUnreadCount(0)
  }

  const deleteNotification = (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
    if (notification && !notification.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

