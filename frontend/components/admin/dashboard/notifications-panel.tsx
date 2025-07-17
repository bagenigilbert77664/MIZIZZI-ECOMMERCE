"use client"

import { motion } from "framer-motion"
import { Bell, Clock, Info, ShoppingBag, User, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Notification {
  id: string
  title: string
  description: string
  time: string
  type: "order" | "user" | "system" | "alert"
  read: boolean
}

interface NotificationsPanelProps {
  notifications: Notification[]
}

export function NotificationsPanel({ notifications = [] }: NotificationsPanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingBag className="h-4 w-4" />
      case "user":
        return <User className="h-4 w-4" />
      case "alert":
        return <Bell className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case "order":
        return "text-green-500 bg-green-100 dark:bg-green-900/30"
      case "user":
        return "text-blue-500 bg-blue-100 dark:bg-blue-900/30"
      case "alert":
        return "text-red-500 bg-red-100 dark:bg-red-900/30"
      default:
        return "text-gray-500 bg-gray-100 dark:bg-gray-800"
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div>
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50 dark:text-cherry-400 dark:hover:bg-cherry-900/20"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All caught up!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
              You don't have any new notifications. We'll notify you when something important happens.
            </p>
            <Button variant="outline" className="gap-2">
              <Bell className="h-4 w-4" />
              Notification Settings
            </Button>
          </div>
        </motion.div>
      ) : (
        <ScrollArea className="h-[320px]">
          <motion.div className="p-4 space-y-3" variants={container} initial="hidden" animate="show">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                className={cn(
                  "flex gap-3 p-3 rounded-lg border transition-all",
                  notification.read
                    ? "bg-white dark:bg-gray-800"
                    : "bg-cherry-50/50 dark:bg-cherry-900/10 border-cherry-100 dark:border-cherry-900/20",
                )}
                variants={item}
                whileHover={{ x: 5 }}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                    getIconColor(notification.type),
                  )}
                >
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    {!notification.read && <span className="w-2 h-2 bg-cherry-500 rounded-full"></span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>{notification.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </ScrollArea>
      )}

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 text-center">
          <Button variant="outline" size="sm" className="text-xs w-full">
            View All Notifications
          </Button>
        </div>
      )}
    </div>
  )
}
