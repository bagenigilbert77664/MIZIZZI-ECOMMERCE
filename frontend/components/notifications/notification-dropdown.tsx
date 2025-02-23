"use client"

import { useState, useLayoutEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"

// Mock notifications moved outside component
const notifications = [
  {
    id: "1",
    title: "Order Shipped!",
    description: "Your order #12345 has been shipped and is on its way.",
    image: "/placeholder.svg?height=50&width=50",
    timestamp: "2 hours ago",
    read: false,
    link: "/order/12345",
  },
  {
    id: "2",
    title: "Flash Sale Starting Soon",
    description: "Don't miss out on our biggest sale of the season!",
    image: "/placeholder.svg?height=50&width=50",
    timestamp: "5 hours ago",
    read: false,
    link: "/flash-sale",
  },
  {
    id: "3",
    title: "New Collection Arrived",
    description: "Check out our latest jewelry collection.",
    image: "/placeholder.svg?height=50&width=50",
    timestamp: "1 day ago",
    read: true,
    link: "/new-arrivals",
  },
]

// Separate client-only notification list component
const NotificationList = ({ onClose, currentNotifications, markAsRead }: any) => {
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 p-6">
        {currentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          currentNotifications.map((notification: any) => (
            <div key={notification.id} className="flex gap-4">
              <div className="relative h-12 w-12 flex-none overflow-hidden rounded-full border bg-muted">
                <Image src={notification.image || "/placeholder.svg"} alt="" fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col">
                <Link
                  href={notification.link}
                  className="text-sm font-medium hover:text-cherry-600"
                  onClick={() => {
                    markAsRead(notification.id)
                    onClose()
                  }}
                >
                  {notification.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                  {!notification.read && (
                    <span className="flex h-2 w-2 rounded-full bg-cherry-600" aria-hidden="true" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}

export function NotificationDropdown() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [currentNotifications, setCurrentNotifications] = useState(notifications)
  const [isMobile, setIsMobile] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  if (!mounted) {
    return null
  }

  const unreadCount = currentNotifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setCurrentNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setCurrentNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  // Mobile version using Sheet
  if (isMobile) {
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
          className="flex w-full flex-col sm:max-w-lg p-0 bg-white"
          aria-describedby="notifications-description"
        >
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>Notifications ({currentNotifications.length})</SheetTitle>
            <SheetDescription id="notifications-description">
              Stay updated with your orders, deals, and new arrivals.
            </SheetDescription>
          </SheetHeader>

          {currentNotifications.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <Bell className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm text-muted-foreground">We'll notify you when something arrives</p>
              </div>
              <Button className="mt-4 bg-cherry-600 hover:bg-cherry-700" onClick={() => setIsOpen(false)}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <NotificationList
                onClose={() => setIsOpen(false)}
                currentNotifications={currentNotifications}
                markAsRead={markAsRead}
              />
              <div className="border-t p-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Unread Notifications</span>
                    <span>{unreadCount}</span>
                  </div>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full hover:bg-cherry-50 hover:text-cherry-900"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    Mark All as Read
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop version using popover
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 sm:h-10 sm:w-10 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
        onClick={() => setIsOpen(!isOpen)}
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-[380px] rounded-lg border bg-white shadow-lg"
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Notifications</h2>
                <p className="text-sm text-muted-foreground">Stay updated with your orders and deals</p>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-cherry-900"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </div>

            <NotificationList
              onClose={() => setIsOpen(false)}
              currentNotifications={currentNotifications}
              markAsRead={markAsRead}
            />

            <div className="border-t p-4">
              <Button variant="outline" className="w-full hover:bg-cherry-50 hover:text-cherry-900" asChild>
                <Link href="/notifications" onClick={() => setIsOpen(false)}>
                  View All Notifications
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

