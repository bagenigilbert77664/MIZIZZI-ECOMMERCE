"use client"

import { useState, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationList } from "@/components/notifications/notification-list"
import { useNotifications } from "@/contexts/notification/notification-context"
import useOnClickOutside from "@/hooks/use-on-click-outside"
import { cn } from "@/lib/utils"
import useMobile from "@/hooks/use-mobile"

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications } = useNotifications()
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  const unreadCount = notifications.filter((n) => !n.read).length

  useOnClickOutside(ref, () => setIsOpen(false))

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative h-9 w-9 rounded-full transition-all duration-200",
          "hover:bg-cherry-50 hover:text-cherry-700",
          isOpen && "bg-cherry-50 text-cherry-700",
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-[1.2rem] w-[1.2rem]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cherry-600 text-[10px] font-medium text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg",
            "origin-top-right transition-all duration-200 ease-out",
            isMobile ? "w-[calc(100vw-32px)] max-w-[420px] -right-[calc(100vw-100px)]" : "w-[400px] max-h-[85vh]",
          )}
          style={{
            maxHeight: isMobile ? "calc(100vh - 120px)" : "85vh",
            right: isMobile ? "-8px" : "0",
          }}
        >
          <NotificationList onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  )
}
