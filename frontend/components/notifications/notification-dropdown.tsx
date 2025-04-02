"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Bell, Package, Tag, CreditCard, Star, ShoppingBag, ChevronRight, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  { id: "product", label: "Products", icon: Star },
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

interface NotificationDropdownProps {
  customTrigger?: React.ReactNode
}

export function NotificationDropdown({ customTrigger }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentNotifications, setCurrentNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  const unreadCount = currentNotifications.filter((n) => !n.read).length

  useEffect(() => {
    // Load notifications when component mounts or when sheet is opened
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  useEffect(() => {
    // Set up real-time notification updates
    const unsubscribe = notificationService.subscribeToNotifications((notification) => {
      setCurrentNotifications((prev) => {
        // Check if notification already exists
        const exists = prev.some((n) => n.id === notification.id)
        if (exists) return prev

        // Add new notification at the beginning
        return [notification, ...prev]
      })

      // Show toast for new notifications when dropdown is closed
      if (!isOpen) {
        toast({
          title: notification.title,
          description: notification.description,
          action: (
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
              View
            </Button>
          ),
        })
      }
    })

    // Dispatch a custom event that other components can listen for
    const event = new CustomEvent("notification-updated", {
      detail: { count: unreadCount },
    })
    document.dispatchEvent(event)

    return () => {
      unsubscribe()
    }
  }, [isOpen, unreadCount, toast])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const notifications = await notificationService.getUserNotifications()
      setCurrentNotifications(notifications)
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredNotifications = currentNotifications.filter((n) => activeTab === "all" || n.type === activeTab)

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setCurrentNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
      )
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setCurrentNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id)
      setCurrentNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error(`Error deleting notification ${id}:`, error)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {customTrigger || (
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 sm:h-10 sm:w-10 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2"
                >
                  <Badge className="h-3 w-3 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-cherry-600 text-[8px] sm:text-[10px]">
                    {unreadCount}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        className="flex w-full flex-col sm:max-w-md p-0 bg-white"
        aria-describedby="notifications-description"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription id="notifications-description" className="flex items-center justify-between">
            <span>Stay updated with your orders and offers</span>
            {unreadCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cherry-600 border-t-transparent"></div>
          </div>
        ) : currentNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-4 p-6"
          >
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gray-100" />
              <Bell className="absolute inset-0 h-24 w-24 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">All Caught Up!</p>
              <p className="text-sm text-muted-foreground">We'll notify you when something new arrives</p>
            </div>
            <Button className="mt-4 bg-cherry-600 hover:bg-cherry-700" onClick={() => setIsOpen(false)}>
              Continue Shopping
            </Button>
          </motion.div>
        ) : (
          <>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
              <div className="border-b px-6">
                <TabsList className="flex w-full justify-start gap-4 border-b-0 overflow-x-auto">
                  {notificationCategories.map((category) => (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="flex items-center gap-2 data-[state=active]:text-cherry-600"
                    >
                      <category.icon className="h-4 w-4" />
                      <span>{category.label}</span>
                      {category.id === "all" && unreadCount > 0 && (
                        <Badge variant="outline" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                          {unreadCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value={activeTab} className="mt-0 p-0">
                  <AnimatePresence mode="popLayout">
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
                          className={cn(
                            "group relative border-b transition-colors",
                            !notification.read && "bg-cherry-50/50",
                            priorityStyles[notification.priority as keyof typeof priorityStyles],
                          )}
                        >
                          <Link
                            href={notification.link || "#"}
                            className="flex gap-4 p-4 hover:bg-gray-50"
                            onClick={() => {
                              markAsRead(notification.id)
                              setIsOpen(false)
                            }}
                          >
                            <div className="relative">
                              <div className="relative h-12 w-12 overflow-hidden rounded-full border bg-muted">
                                <Image
                                  src={notification.image || "/placeholder.svg?height=96&width=96"}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div
                                className={cn(
                                  "absolute -right-1 -top-1 rounded-full border-2 border-white p-1",
                                  iconStyles[notification.priority as keyof typeof iconStyles],
                                )}
                              >
                                <IconComponent className="h-3 w-3" />
                              </div>
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium leading-none">{notification.title}</p>
                                {notification.badge && (
                                  <Badge variant="outline" className="h-5 px-1 text-[10px]">
                                    {notification.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.description}</p>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                                {!notification.read && <span className="flex h-2 w-2 rounded-full bg-cherry-600" />}
                              </div>
                              {notification.actions && (
                                <div className="flex gap-2 pt-2">
                                  {notification.actions.map((action, index) => (
                                    <Button key={index} variant="outline" size="sm" className="h-7 text-xs" asChild>
                                      <Link href={action.href}>{action.label}</Link>
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <SheetFooter className="border-t p-4">
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs" asChild>
                    <Link href="/notifications/preferences">
                      <Settings className="h-3 w-3 mr-1" />
                      Preferences
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" asChild>
                    <Link href="/notifications">
                      View All
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

