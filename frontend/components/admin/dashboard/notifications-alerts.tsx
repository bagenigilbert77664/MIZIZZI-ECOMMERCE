"use client"

import { Bell, Package, Tag, CreditCard, ShoppingBag, Settings } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: any
}

interface NotificationsAlertsProps {
  notifications: Notification[]
}

export function NotificationsAlerts({ notifications }: NotificationsAlertsProps) {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-gray-400 dark:text-gray-500">
          <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No new notifications</p>
          <p className="text-xs mt-2">Recent alerts and updates will appear here</p>
        </div>
      </div>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingBag className="h-4 w-4 text-blue-500" />
      case "payment":
        return <CreditCard className="h-4 w-4 text-green-500" />
      case "product":
        return <Package className="h-4 w-4 text-purple-500" />
      case "promotion":
        return <Tag className="h-4 w-4 text-yellow-500" />
      case "system":
        return <Settings className="h-4 w-4 text-gray-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="max-h-[300px]">
        {notifications.slice(0, 5).map((notification) => (
          <div
            key={notification.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {getActivityIcon(notification.type)}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(notification.timestamp)}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}

