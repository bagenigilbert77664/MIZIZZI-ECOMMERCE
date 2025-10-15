"use client"
import { useState } from "react"
import { Bell, Menu, Search, User, Settings, LogOut, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useMyAdminAuth } from "@/contexts/myadmin/auth-context"
import { useMyAdmin } from "@/contexts/myadmin/admin-context"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface MyAdminHeaderProps {
  toggleSidebar: () => void
  isSidebarCollapsed: boolean
}

export function MyAdminHeader({ toggleSidebar, isSidebarCollapsed }: MyAdminHeaderProps) {
  const { user, logout } = useMyAdminAuth()
  const { notifications, markNotificationAsRead, clearAllNotifications } = useMyAdmin()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")

  const unreadNotifications = notifications.filter((n) => !n.read)

  const handleLogout = async () => {
    await logout()
  }

  const handleNotificationClick = (notificationId: string) => {
    markNotificationAsRead(notificationId)
  }

  return (
    <motion.header
      className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b px-4 md:px-6"
      style={{
        backgroundColor: "hsl(var(--myadmin-background))",
        borderColor: "hsl(var(--myadmin-border))",
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
        style={{ color: "hsl(var(--myadmin-foreground))" }}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-2.5 h-4 w-4"
            style={{ color: "hsl(var(--myadmin-muted-foreground))" }}
          />
          <Input
            type="search"
            placeholder="Search MyAdmin..."
            className="pl-8 myadmin-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9"
          style={{ color: "hsl(var(--myadmin-foreground))" }}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              style={{ color: "hsl(var(--myadmin-foreground))" }}
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications.length > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  style={{ backgroundColor: "hsl(var(--myadmin-primary))", color: "white" }}
                >
                  {unreadNotifications.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="h-auto p-0 text-xs"
                  style={{ color: "hsl(var(--myadmin-primary))" }}
                >
                  Clear all
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm" style={{ color: "hsl(var(--myadmin-muted-foreground))" }}>
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 cursor-pointer",
                    !notification.read && "bg-opacity-50",
                  )}
                  style={{ backgroundColor: !notification.read ? "hsl(var(--myadmin-muted) / 0.5)" : "transparent" }}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium text-sm">{notification.title}</span>
                    {!notification.read && (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: "hsl(var(--myadmin-primary))" }}
                      />
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "hsl(var(--myadmin-muted-foreground))" }}>
                    {notification.message}
                  </span>
                  <span className="text-xs" style={{ color: "hsl(var(--myadmin-muted-foreground))" }}>
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: "hsl(var(--myadmin-primary))" }}
              >
                {user?.first_name?.[0] || user?.email?.[0] || "A"}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email || "MyAdmin User"}
                </p>
                <p className="text-xs leading-none" style={{ color: "hsl(var(--myadmin-muted-foreground))" }}>
                  {user?.email || "admin@mizizzi.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  )
}
