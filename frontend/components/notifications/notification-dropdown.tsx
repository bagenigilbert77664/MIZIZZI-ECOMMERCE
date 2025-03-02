"use client"

import { cn } from "@/lib/utils"

import { useState } from "react"
import { Bell, Package, Tag, Gift, CreditCard, Star, ShoppingBag, Truck, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

// Mock notifications with enhanced data
const notifications = [
  {
    id: "1",
    type: "order",
    title: "Order Shipped!",
    description: "Your order #12345 has been shipped via DHL Express",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=96&h=96&fit=crop",
    timestamp: "2 hours ago",
    read: false,
    priority: "high",
    icon: Truck,
    link: "/order/12345",
    actions: [
      { label: "Track Order", href: "/track-order/12345" },
      { label: "View Details", href: "/order/12345" },
    ],
  },
  {
    id: "2",
    type: "promotion",
    title: "Flash Sale Starting Soon!",
    description: "Get up to 70% off on luxury jewelry. Sale starts in 2 hours!",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=96&h=96&fit=crop",
    timestamp: "5 hours ago",
    read: false,
    priority: "medium",
    icon: Tag,
    link: "/flash-sale",
    actions: [
      { label: "Set Reminder", href: "#" },
      { label: "View Catalog", href: "/flash-sale" },
    ],
  },
  {
    id: "3",
    type: "product",
    title: "New Collection Arrived",
    description: "Discover our latest Summer 2024 Jewelry Collection",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=96&h=96&fit=crop",
    timestamp: "1 day ago",
    read: true,
    priority: "medium",
    icon: Gift,
    link: "/new-arrivals",
    badge: "New Arrival",
  },
  {
    id: "4",
    type: "order",
    title: "Order Delivered!",
    description: "Your order #12344 has been delivered successfully",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=96&h=96&fit=crop",
    timestamp: "1 day ago",
    read: true,
    priority: "normal",
    icon: Package,
    link: "/order/12344",
    actions: [{ label: "Write Review", href: "/review/12344" }],
  },
  {
    id: "5",
    type: "payment",
    title: "Payment Successful",
    description: "Your payment of KSh 29,999 has been processed",
    image: "https://images.unsplash.com/photo-1601591563168-fdb40a21d0e3?w=96&h=96&fit=crop",
    timestamp: "2 days ago",
    read: true,
    priority: "normal",
    icon: CreditCard,
    link: "/payments",
  },
]

const notificationCategories = [
  { id: "all", label: "All", icon: Bell },
  { id: "order", label: "Orders", icon: ShoppingBag },
  { id: "promotion", label: "Deals", icon: Tag },
  { id: "product", label: "Products", icon: Star },
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

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentNotifications, setCurrentNotifications] = useState(notifications)
  const [activeTab, setActiveTab] = useState("all")
  const unreadCount = currentNotifications.filter((n) => !n.read).length

  const filteredNotifications = currentNotifications.filter((n) => activeTab === "all" || n.type === activeTab)

  const markAsRead = (id: string) => {
    setCurrentNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setCurrentNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setCurrentNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
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

        {currentNotifications.length === 0 ? (
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
                <TabsList className="flex w-full justify-start gap-4 border-b-0">
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
                    {filteredNotifications.map((notification) => (
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
                          href={notification.link}
                          className="flex gap-4 p-4 hover:bg-gray-50"
                          onClick={() => {
                            markAsRead(notification.id)
                            setIsOpen(false)
                          }}
                        >
                          <div className="relative">
                            <div className="relative h-12 w-12 overflow-hidden rounded-full border bg-muted">
                              <Image
                                src={notification.image || "/placeholder.svg"}
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
                              <notification.icon className="h-3 w-3" />
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
                    ))}
                  </AnimatePresence>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </Button>
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <Link href="/notifications">
                    View All
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

