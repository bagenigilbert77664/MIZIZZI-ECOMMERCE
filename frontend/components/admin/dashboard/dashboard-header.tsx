"use client"

import { useState, useEffect } from "react"
import { adminService } from "@/services/admin"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Button } from "@/components/ui/button"
import { Bell, HelpCircle, Settings } from "lucide-react"
import { motion } from "framer-motion"

export function DashboardHeader() {
  const { user } = useAdminAuth()
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Use the correct method to fetch notifications
        const response = await adminService.getNotifications()
        setNotificationCount(response.items.length)
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
        setNotificationCount(0)
      }
    }

    fetchNotifications()

    // Set up periodic refresh for real-time updates
    const intervalId = setInterval(() => {
      fetchNotifications()
    }, 60000) // Refresh every minute

    return () => clearInterval(intervalId)
  }, [user])

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl shadow-sm">
      <div>
        <h2 className="text-lg font-medium">Welcome back, {user?.name || "Admin"}</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <motion.span
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cherry-300 text-[10px] font-medium text-cherry-950 shadow-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </motion.span>
          )}
        </Button>

        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

