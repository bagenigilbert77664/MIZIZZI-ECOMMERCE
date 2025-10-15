"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface AdminContextType {
  sidebarOpen: boolean
  toggleSidebar: () => void
  notifications: Notification[]
  markNotificationAsRead: (id: string) => void
  clearAllNotifications: () => void
}

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
}

const AdminContext = createContext<AdminContextType>({
  sidebarOpen: true,
  toggleSidebar: () => {},
  notifications: [],
  markNotificationAsRead: () => {},
  clearAllNotifications: () => {},
})

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "New Order",
      message: "Order #12345 has been placed",
      timestamp: new Date(),
      read: false,
    },
    {
      id: "2",
      title: "Low Stock Alert",
      message: "Product 'Luxury Watch' is running low on stock",
      timestamp: new Date(Date.now() - 3600000),
      read: false,
    },
    {
      id: "3",
      title: "Payment Received",
      message: "Payment for Order #12340 has been received",
      timestamp: new Date(Date.now() - 7200000),
      read: false,
    },
  ])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications(
      notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  return (
    <AdminContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => useContext(AdminContext)

export type { AdminContextType, Notification }
