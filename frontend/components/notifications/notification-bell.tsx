"use client"

import { useState, useRef, useEffect } from "react"
import { Bell, Package, Tag, CreditCard, ShoppingBag, Trash2, Check, CheckCheck, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useOnClickOutside } from "@/styles/hooks/use-on-click-outside"
import { useMediaQuery } from "@/styles/hooks/use-media-query"
import { useNotifications } from "@/contexts/notification/notification-context"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import type { NotificationType } from "@/types/notification"

const notificationCategories = [
  { id: "all", label: "All", icon: Bell },
  { id: "order", label: "Orders", icon: ShoppingBag },
  { id: "promotion", label: "Deals", icon: Tag },
  { id: "product", label: "Products", icon: Package },
  { id: "announcement", label: "Announcements", icon: Bell },
]

const priorityStyles = {
  high: "bg-red-50 border-red-100",
  medium: "bg-blue-50 border-blue-100",
  low: "bg-white",
}

const iconStyles = {
  high: "text-red-600",
  medium: "text-blue-600",
  low: "text-gray-600",
}

// Map notification types to icons
const notificationIcons = {
  order: ShoppingBag,
  payment: CreditCard,
  product: Package,
  promotion: Tag,
  system: Bell,
  announcement: Bell,
  product_update: Package,
  price_change: Tag,
  stock_alert: Bell,
} as Record<NotificationType, any>

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useOnClickOutside(ref, () => setIsOpen(false))

  // Close on escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => {
      window.removeEventListener("keydown", handleEsc)
    }
  }, [])

  // Dispatch notification count update event for other components
  useEffect(() => {
    const event = new CustomEvent("notification-updated", {
      detail: { count: unreadCount },
    })
    document.dispatchEvent(event)
  }, [unreadCount])

  const filteredNotifications = notifications.filter((n) => activeTab === "all" || n.type === activeTab)

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size={isMobile ? "icon" : "default"}
        className={
          isMobile
            ? "relative w-9 h-9 rounded-full hover:bg-gray-100"
            : "relative flex items-center gap-1 font-normal hover:bg-transparent px-3"
        }
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center bg-cherry-600 text-white border-2 border-white text-xs"
            style={{
              fontSize: isMobile ? "8px" : "10px",
              height: isMobile ? "16px" : "20px",
              minWidth: isMobile ? "16px" : "20px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div
          className={`absolute ${
            isMobile ? "right-0 w-[calc(100vw-32px)]" : "right-0"
          } mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200`}
          style={{ maxHeight: "85vh" }}
        >
          <div className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center">
                <h3 className="font-semibold text-lg">Notifications</h3>
                <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-3 pt-2 border-b border-gray-200 bg-white sticky top-[57px] z-10">
                <TabsList className="grid grid-cols-5 w-full bg-gray-100">
                  {notificationCategories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-1 py-1.5">
                      <category.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">{category.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-cherry-600 border-t-transparent"></div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground">No notifications to display</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
                      {filteredNotifications.map((notification) => {
                        // Determine the icon to use
                        const IconComponent = notification.icon || notificationIcons[notification.type as NotificationType] || Bell

                        return (
                          <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`group relative rounded-lg border p-3 transition-colors ${
                              !notification.read ? "bg-cherry-50/50" : ""
                            } ${priorityStyles[notification.priority as keyof typeof priorityStyles]}`}
                          >
                            <div className="flex gap-3">
                              <div className="relative">
                                <div className="relative h-10 w-10 overflow-hidden rounded-full border bg-muted">
                                  <Image
                                    src={notification.image || "/placeholder.svg?height=96&width=96"}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div
                                  className={`absolute -right-1 -top-1 rounded-full border-2 border-white p-1 ${
                                    iconStyles[notification.priority as keyof typeof iconStyles]
                                  }`}
                                >
                                  <IconComponent className="h-3 w-3" />
                                </div>
                              </div>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{notification.title}</p>
                                  {notification.badge && (
                                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                      {notification.badge}
                                    </Badge>
                                  )}
                                  {!notification.read && (
                                    <span className="flex h-2 w-2 rounded-full bg-cherry-600 ml-1" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{notification.description}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                                  <div className="flex gap-1.5">
                                    {notification.actions && (
                                      <div className="flex gap-1.5">
                                        {notification.actions.map((action, index) => (
                                          <Button
                                            key={index}
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-[10px] px-2"
                                            asChild
                                          >
                                            <Link href={action.href} onClick={() => setIsOpen(false)}>
                                              {action.label}
                                            </Link>
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                    {notification.link && (
                                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" asChild>
                                        <Link href={notification.link} onClick={() => setIsOpen(false)}>
                                          View
                                        </Link>
                                      </Button>
                                    )}
                                    {!notification.read && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        onClick={() => markAsRead(notification.id)}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Read
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 absolute top-2 right-2"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </AnimatePresence>
                )}
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="mt-auto p-3 border-t border-gray-200 bg-white sticky bottom-0">
              <Link
                href="/notifications"
                className="block w-full text-center text-sm text-cherry-600 hover:text-cherry-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
                <ChevronRight className="inline h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
