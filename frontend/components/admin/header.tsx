"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  HelpCircle,
  ShoppingBag,
  ChevronDown,
  Sun,
  Moon,
  Calendar,
  BarChart3,
} from "lucide-react"
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
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMobile } from "@/styles/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AdminHeader() {
  const [searchQuery, setSearchQuery] = useState("")
  const { user, logout, refreshSession } = useAdminAuth()
  const router = useRouter()
  const isMobile = useMobile()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())
  const searchRef = useRef<HTMLDivElement>(null)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleLogout = useCallback(async () => {
    await logout()
    router.push("/admin/login")
  }, [logout, router])

  const handleSessionCheck = useCallback(async () => {
    try {
      const isValid = await refreshSession()
      if (!isValid) {
        handleLogout()
      }
    } catch (error) {
      console.error("Session check error:", error)
      handleLogout()
    }
  }, [refreshSession, handleLogout])

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(
        () => {
          handleSessionCheck()
        },
        30 * 60 * 1000,
      )
    }

    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]
    activityEvents.forEach((event) => {
      document.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      clearTimeout(inactivityTimer)
      activityEvents.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [handleSessionCheck])

  // After mounting, we can safely show the UI that depends on the theme
  useEffect(() => {
    setMounted(true)

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality
    console.log("Searching for:", searchQuery)
  }

  const handleSearchFocus = () => {
    setIsSearchFocused(true)
  }

  const handleSearchBlur = () => {
    setIsSearchFocused(false)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-cherry-700/20 bg-gradient-to-r from-cherry-800 to-cherry-700 dark:from-cherry-900 dark:to-cherry-800 px-2 sm:px-4 md:px-6 shadow-md">
      {isMobile ? (
        <>
          <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <SheetTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-white/90 hover:text-white hover:bg-white/10"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </motion.div>
            </SheetTrigger>
            <SheetContent side="top" className="pt-12 bg-cherry-800 border-cherry-700 text-white">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cherry-300" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="w-full bg-cherry-700/50 pl-10 focus-visible:ring-cherry-300 border-cherry-600 text-white placeholder:text-cherry-300/70 rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <div
          ref={searchRef}
          className={cn(
            "hidden flex-1 sm:flex sm:max-w-md relative transition-all duration-300",
            isSearchFocused ? "sm:max-w-xl" : "sm:max-w-md",
          )}
        >
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cherry-300" />
              <Input
                type="search"
                placeholder="Search products, orders, customers..."
                className="w-full bg-cherry-700/50 pl-10 focus-visible:ring-cherry-300 border-cherry-600 text-white placeholder:text-cherry-300/70 rounded-md transition-all duration-300 hover:border-cherry-500 focus:border-cherry-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />
            </div>
          </form>
        </div>
      )}

      <div className="hidden md:flex items-center gap-2 text-white/80">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">{format(currentTime, "EEEE, MMMM d, yyyy")}</span>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-3">
        <motion.div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-cherry-600/30 text-white/90 border border-cherry-600/30"
          whileHover={{ backgroundColor: "rgba(220, 38, 38, 0.4)" }}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-medium">Sales: +12.5%</span>
        </motion.div>

        {mounted && (
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white/90 hover:text-white hover:bg-white/10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </motion.div>
        )}

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/90 hover:text-white hover:bg-white/10"
            onClick={() => router.push("/admin/help")}
          >
            <HelpCircle className="h-5 w-5 sm:mr-1" />
            <span className="hidden md:inline">Help</span>
          </Button>
        </motion.div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="relative text-white/90 hover:text-white hover:bg-white/10">
                <Bell className="h-5 w-5" />
                <motion.span
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cherry-300 text-[10px] font-medium text-cherry-950 shadow-sm"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  3
                </motion.span>
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[280px] md:w-80 shadow-md border-cherry-700/20 bg-white dark:bg-gray-900"
          >
            <DropdownMenuLabel className="text-cherry-900 dark:text-white flex justify-between items-center">
              <span>Notifications</span>
              <Badge
                variant="outline"
                className="bg-cherry-50 dark:bg-cherry-900/50 text-cherry-600 dark:text-cherry-300 border-0"
              >
                3 new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-cherry-100 dark:bg-cherry-800/50" />
            <div className="max-h-80 overflow-y-auto">
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-cherry-50 dark:hover:bg-cherry-900/20 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="bg-cherry-50 dark:bg-cherry-900/50 p-2 rounded-full">
                        <ShoppingBag className="h-4 w-4 text-cherry-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-cherry-900 dark:text-white">New Order #1234</div>
                        <div className="text-xs text-cherry-500 dark:text-cherry-400">2 minutes ago</div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-cherry-500"></div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-cherry-50 dark:hover:bg-cherry-900/20 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="bg-cherry-50 dark:bg-cherry-900/50 p-2 rounded-full">
                        <Bell className="h-4 w-4 text-cherry-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-cherry-900 dark:text-white">Low Stock Alert: Product XYZ</div>
                        <div className="text-xs text-cherry-500 dark:text-cherry-400">1 hour ago</div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-cherry-500"></div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                >
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-cherry-50 dark:hover:bg-cherry-900/20 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="bg-cherry-50 dark:bg-cherry-900/50 p-2 rounded-full">
                        <User className="h-4 w-4 text-cherry-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-cherry-900 dark:text-white">New Customer Registration</div>
                        <div className="text-xs text-cherry-500 dark:text-cherry-400">3 hours ago</div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-cherry-500"></div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              </AnimatePresence>
            </div>
            <DropdownMenuSeparator className="bg-cherry-100 dark:bg-cherry-800/50" />
            <DropdownMenuItem className="justify-center font-medium text-cherry-500 hover:text-cherry-600 hover:bg-cherry-50 dark:hover:bg-cherry-900/20 cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                className="flex items-center gap-1 px-1 sm:px-2 sm:gap-2 text-white/90 hover:text-white hover:bg-white/10"
              >
                <Avatar className="h-8 w-8 border-2 border-cherry-600">
                  <AvatarImage src="https://i.pravatar.cc/300" alt={user?.name || "Admin User"} />
                  <AvatarFallback className="bg-cherry-600 text-white">
                    {(user?.name || "AU").substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-white">{user?.name || "Admin User"}</div>
                  <div className="text-xs text-cherry-200/80">Store Admin</div>
                </div>
                <ChevronDown className="h-4 w-4 text-cherry-300 hidden sm:block" />
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="shadow-md border-cherry-700/20 bg-white dark:bg-gray-900">
            <DropdownMenuLabel className="text-cherry-900 dark:text-white">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-cherry-100 dark:bg-cherry-800/50" />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <div className="font-medium text-cherry-900 dark:text-white">{user?.name || "Admin User"}</div>
              <div className="text-xs text-cherry-500 dark:text-cherry-400">{user?.email || "admin@example.com"}</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-cherry-100 dark:bg-cherry-800/50" />
            <DropdownMenuItem
              onClick={() => router.push("/admin/profile")}
              className="hover:bg-cherry-50 dark:hover:bg-cherry-900/20 hover:text-cherry-500 cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/admin/settings")}
              className="hover:bg-cherry-50 dark:hover:bg-cherry-900/20 hover:text-cherry-500 cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-cherry-100 dark:bg-cherry-800/50" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="hover:bg-cherry-50 dark:hover:bg-cherry-900/20 hover:text-cherry-500 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
