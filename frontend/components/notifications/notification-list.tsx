"use client"

import { useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Truck,
  AlertTriangle,
  Gift,
  X,
} from "lucide-react"
import { useNotifications, type NotificationType } from "@/contexts/notification/notification-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface NotificationListProps {
  onClose: () => void
  maxHeight?: string
  showHeader?: boolean
}

export function NotificationList({ onClose, maxHeight = "350px", showHeader = true }: NotificationListProps) {
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")

  const filteredNotifications =
    activeTab === "all" ? notifications : notifications.filter((notification) => !notification.read)

  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "order":
        return <ShoppingBag className="h-5 w-5 text-blue-500" />
      case "payment":
        return <CreditCard className="h-5 w-5 text-green-500" />
      case "shipping":
        return <Truck className="h-5 w-5 text-purple-500" />
      case "system":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "promotion":
        return <Gift className="h-5 w-5 text-cherry-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true })
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else {
      return format(date, "MMM d")
    }
  }

  return (
    <div className="max-h-[80vh] flex flex-col">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            {notifications.filter((n) => !n.read).length} unread
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50"
            onClick={markAllAsRead}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActiveTab(value as "all" | "unread")}>
        <div className="px-3 pt-2 border-b border-gray-200 bg-white sticky top-[57px] z-10">
          <TabsList className="grid grid-cols-2 w-full bg-gray-100">
            <TabsTrigger value="all" className="text-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-sm">
              Unread
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          {renderNotificationList(notifications)}
        </TabsContent>

        <TabsContent value="unread" className="mt-0">
          {renderNotificationList(notifications.filter((n) => !n.read))}
        </TabsContent>
      </Tabs>

      <div className="mt-auto p-3 border-t border-gray-200 bg-white sticky bottom-0">
        <Link
          href="/notifications"
          className="block w-full text-center text-sm text-cherry-600 hover:text-cherry-700 font-medium"
          onClick={onClose}
        >
          View all notifications
          <ChevronRight className="inline h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  )

  function renderNotificationList(notificationList: typeof notifications) {
    if (notificationList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Bell className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === "unread" ? "You have no unread notifications" : "You don't have any notifications yet"}
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-y-auto">
        {notificationList.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
              !notification.read && "bg-blue-50/30",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1.5 rounded-full bg-gray-100">{getNotificationIcon(notification.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={cn("text-sm font-medium", !notification.read ? "text-gray-900" : "text-gray-700")}>
                    {notification.title}
                  </h4>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(notification.date)}</span>
                </div>

                <p className={cn("text-xs mt-0.5", !notification.read ? "text-gray-800" : "text-gray-600")}>
                  {notification.message}
                </p>

                <div className="flex items-center justify-between mt-2">
                  {notification.link && (
                    <Link
                      href={notification.link}
                      className="text-xs text-cherry-600 hover:text-cherry-700 font-medium"
                      onClick={() => {
                        if (!notification.read) markAsRead(notification.id)
                        onClose()
                      }}
                    >
                      View details
                    </Link>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark read
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
}

