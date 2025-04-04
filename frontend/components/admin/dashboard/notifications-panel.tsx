"use client"

import { Bell, Clock, Info, ShoppingBag, User } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Notifications</h3>
        {notifications.length > 0 && <button className="text-sm text-primary hover:underline">Mark all as read</button>}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No new notifications</div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn("flex gap-3 p-3 rounded-lg border", notification.read ? "bg-card" : "bg-muted/20")}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    getIconColor(notification.type),
                  )}
                >
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    {!notification.read && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>{notification.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

