"use client"

import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import { useNotifications } from "@/contexts/notification/notification-context"
import { NotificationList } from "@/components/notifications/notification-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useOnClickOutside } from "@/hooks/use-on-click-outside"
import { useMediaQuery } from "@/hooks/use-media-query"

export function NotificationBell() {
  const { unreadCount } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
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
          className={`absolute ${isMobile ? "right-0" : "right-0"} mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200`}
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          <NotificationList onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  )
}

