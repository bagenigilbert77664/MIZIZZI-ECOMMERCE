"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
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
  Package,
  Tag,
} from "lucide-react"
import { useNotifications, type NotificationType } from "@/contexts/notification/notification-context"
import type { Notification } from "@/types/notification"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useMobile } from "@/hooks/use-mobile"

interface NotificationListProps {
  onClose: () => void
}

// Map notification types to icons
const notificationIcons: Partial<Record<NotificationType, React.ReactNode>> = {
  order: <ShoppingBag className="h-5 w-5 text-blue-500" />,
  payment: <CreditCard className="h-5 w-5 text-green-500" />,
  // shipping: <Truck className="h-5 w-5 text-purple-500" />, // Removed invalid key
  system: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  promotion: <Gift className="h-5 w-5 text-cherry-500" />,
  product: <Package className="h-5 w-5 text-indigo-500" />,
  announcement: <Bell className="h-5 w-5 text-orange-500" />,
  product_update: <Package className="h-5 w-5 text-blue-500" />,
  price_change: <Tag className="h-5 w-5 text-green-500" />,
  stock_alert: <AlertTriangle className="h-5 w-5 text-red-500" />,
}

const priorityStyles = {
  high: "bg-red-50 border-red-100",
  medium: "bg-blue-50 border-blue-100",
  low: "bg-gray-50 border-gray-100",
}

export function NotificationList({ onClose }: NotificationListProps) {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications()
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const isMobile = useMobile()

  const filteredNotifications =
    activeTab === "all" ? notifications : notifications.filter((notification) => !notification.read)

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            {notifications.filter((n) => !n.read).length} unread
          </span>
        </div>
        <div className="flex items-center gap-2">
          {notifications.filter((n) => !n.read).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50", isMobile ? "px-2" : "px-3")}
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              <span className={isMobile ? "text-xs" : "text-sm"}>Mark all read</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
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

        {/* Tab Content */}
        <ScrollArea className={cn("flex-1", isMobile ? "max-h-[calc(100vh-200px)]" : "max-h-[400px]")}>
          <TabsContent value="all" className="mt-0 p-0">
            {renderNotificationList(notifications)}
          </TabsContent>

          <TabsContent value="unread" className="mt-0 p-0">
            {renderNotificationList(notifications.filter((n) => !n.read))}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer */}
      <div className="mt-auto p-3 border-t border-gray-200 bg-white sticky bottom-0">
        <Link
          href="/account?tab=notifications"
          className="block w-full text-center text-sm text-cherry-600 hover:text-cherry-700 font-medium"
          onClick={onClose}
        >
          View all notifications
          <ChevronRight className="inline h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  )

  function renderNotificationList(notificationList: Notification[]) {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cherry-600 border-t-transparent"></div>
        </div>
      )
    }

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
      <div>
        {notificationList.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
              !notification.read && "bg-cherry-50/30",
              notification.priority && priorityStyles[notification.priority],
            )}
          >
            <div className="flex items-start gap-3">
              {notification.image ? (
                <div className="relative flex-shrink-0">
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full border bg-muted">
                    <Image
                      src={notification.image || "/placeholder.svg?height=96&width=96"}
                      alt=""
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute -right-1 -top-1 rounded-full border-2 border-white p-1 bg-white">
                    {notificationIcons[notification.type]}
                  </div>
                </div>
              ) : (
                <div className="mt-1 p-1.5 rounded-full bg-gray-100 flex-shrink-0">
                  {notificationIcons[notification.type]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn("text-sm font-medium", !notification.read ? "text-gray-900" : "text-gray-700")}>
                      {notification.title}
                    </h4>
                    {notification.badge && (
                      <Badge variant="outline" className="h-5 px-1 text-[10px]">
                        {notification.badge}
                      </Badge>
                    )}
                    {!notification.read && <span className="flex h-2 w-2 rounded-full bg-cherry-600" />}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                    {formatDate(notification.timestamp)}
                  </span>
                </div>

                <p
                  className={cn("text-xs mt-0.5 line-clamp-2", !notification.read ? "text-gray-800" : "text-gray-600")}
                >
                  {notification.description}
                </p>

                <div
                  className={cn("flex items-center mt-2", isMobile ? "flex-col items-start gap-2" : "justify-between")}
                >
                  {notification.actions ? (
                    <div className="flex gap-2 flex-wrap">
                      {notification.actions.map((action, index: number) => (
                        <Button key={index} variant="outline" size="sm" className="h-7 text-xs bg-transparent" asChild>
                          <Link
                            href={action.href}
                            onClick={() => {
                              if (!notification.read) markAsRead(notification.id)
                              onClose()
                            }}
                          >
                            {action.label}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  ) : notification.link ? (
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
                  ) : (
                    <span className="text-xs text-gray-500"></span>
                  )}

                  <div className={cn("flex items-center gap-2", isMobile ? "self-end" : "ml-auto")}>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50"
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
