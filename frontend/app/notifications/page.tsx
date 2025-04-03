"use client"

import { useState, useEffect } from "react"
import { Bell, Package, Tag, CreditCard, ShoppingBag, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { notificationService } from "@/services/notification"
import type { Notification, NotificationType } from "@/types/notification"
import { useToast } from "@/components/ui/use-toast"

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
  normal: "bg-white",
}

const iconStyles = {
  high: "text-red-600",
  medium: "text-blue-600",
  normal: "text-gray-600",
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    loadNotifications()

    // Set up real-time notification updates
    const unsubscribe = notificationService.subscribeToNotifications((notification) => {
      setNotifications((prev) => {
        // Check if notification already exists
        const exists = prev.some((n) => n.id === notification.id)
        if (exists) return prev

        // Add new notification at the beginning
        return [notification, ...prev]
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const data = await notificationService.getUserNotifications()
      setNotifications(data)
    } catch (error) {
      console.error("Error loading notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
      )
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast({
        title: "Success",
        description: "Notification deleted",
      })
    } catch (error) {
      console.error(`Error deleting notification ${id}:`, error)
    }
  }

  const filteredNotifications = notifications.filter((n) => activeTab === "all" || n.type === activeTab)

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 max-w-4xl">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-8 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Stay updated with your orders, promotions, and announcements
          </p>
        </div>
        <div className="flex gap-2 self-end md:self-auto">
          <Button variant="outline" onClick={loadNotifications} size="sm" className="h-8 md:h-9">
            Refresh
          </Button>
          <Button variant="outline" asChild size="sm" className="h-8 md:h-9">
            <Link href="/notifications/preferences">
              <Settings className="h-4 w-4 mr-1 md:mr-2" />
              <span className="text-xs md:text-sm">Preferences</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <CardTitle className="text-xl md:text-2xl">Your Notifications</CardTitle>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="self-end md:self-auto">
                Mark all as read
              </Button>
            )}
          </div>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full">
              {notificationCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex items-center gap-1 md:gap-2 py-1.5 text-xs md:text-sm"
                >
                  <category.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">{category.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {/* Content remains mostly the same, but we'll update the notification cards */}
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
              <div className="space-y-3 md:space-y-4">
                {filteredNotifications.map((notification) => {
                  // Determine the icon to use
                  const IconComponent = notification.icon || notificationIcons[notification.type] || Bell

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`group relative rounded-lg border p-3 md:p-4 transition-colors ${
                        !notification.read ? "bg-cherry-50/50" : ""
                      } ${priorityStyles[notification.priority as keyof typeof priorityStyles]}`}
                    >
                      <div className="flex gap-3 md:gap-4">
                        <div className="relative">
                          <div className="relative h-10 w-10 md:h-12 md:w-12 overflow-hidden rounded-full border bg-muted">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm md:text-base">{notification.title}</p>
                            {notification.badge && (
                              <Badge variant="outline" className="h-5 px-1 text-[10px]">
                                {notification.badge}
                              </Badge>
                            )}
                            {!notification.read && <span className="flex h-2 w-2 rounded-full bg-cherry-600 ml-2" />}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground">{notification.description}</p>
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-2">
                            <span className="text-xs text-muted-foreground order-2 md:order-1">
                              {notification.timestamp}
                            </span>
                            <div className="flex flex-wrap gap-2 order-1 md:order-2">
                              {notification.actions && (
                                <div className="flex flex-wrap gap-2">
                                  {notification.actions.map((action, index) => (
                                    <Button key={index} variant="outline" size="sm" className="h-7 text-xs" asChild>
                                      <Link href={action.href}>{action.label}</Link>
                                    </Button>
                                  ))}
                                </div>
                              )}
                              {notification.link && (
                                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                  <Link href={notification.link}>View Details</Link>
                                </Button>
                              )}
                              {!notification.read && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  Mark as Read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 absolute top-2 right-2"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

