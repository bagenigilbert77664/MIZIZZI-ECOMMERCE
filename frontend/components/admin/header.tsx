"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Bell, Search, User, Settings, LogOut, HelpCircle, ShoppingBag, ChevronDown, Sun, Moon } from "lucide-react"
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
import { useMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"

export function AdminHeader() {
  const [searchQuery, setSearchQuery] = useState("")
  const { user, logout } = useAdminAuth()
  const router = useRouter()
  const isMobile = useMobile()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // After mounting, we can safely show the UI that depends on the theme
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality
    console.log("Searching for:", searchQuery)
  }

  const handleLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-white px-2 sm:px-4 md:px-6 shadow-sm">
      {isMobile ? (
        <>
          <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <SheetTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Search className="h-5 w-5 text-gray-600" />
                </Button>
              </motion.div>
            </SheetTrigger>
            <SheetContent side="top" className="pt-12">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="w-full bg-gray-50 pl-10 focus-visible:ring-orange-500 border-gray-200 rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <form onSubmit={handleSearch} className="hidden flex-1 sm:flex sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search products, orders, customers..."
              className="w-full bg-gray-50 pl-10 focus-visible:ring-orange-500 border-gray-200 rounded-md transition-all duration-300 hover:border-orange-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      )}

      <div className="ml-auto flex items-center gap-1 sm:gap-3">
        {mounted && (
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-gray-600 hover:text-orange-500 hover:bg-orange-50"
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
            className="text-gray-600 hover:text-orange-500 hover:bg-orange-50"
            onClick={() => router.push("/admin/help")}
          >
            <HelpCircle className="h-5 w-5 sm:mr-1" />
            <span className="hidden md:inline">Help</span>
          </Button>
        </motion.div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <motion.span
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-medium text-white shadow-sm"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  3
                </motion.span>
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px] md:w-80 shadow-md border-gray-100">
            <DropdownMenuLabel className="text-gray-900 flex justify-between items-center">
              <span>Notifications</span>
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-0">
                3 new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <div className="max-h-80 overflow-y-auto">
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-orange-50 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="bg-orange-50 p-2 rounded-full">
                        <ShoppingBag className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">New Order #1234</div>
                        <div className="text-xs text-gray-500">2 minutes ago</div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
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
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-orange-50 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="bg-orange-50 p-2 rounded-full">
                        <Bell className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Low Stock Alert: Product XYZ</div>
                        <div className="text-xs text-gray-500">1 hour ago</div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
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
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-orange-50 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <div className="bg-orange-50 p-2 rounded-full">
                        <User className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">New Customer Registration</div>
                        <div className="text-xs text-gray-500">3 hours ago</div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              </AnimatePresence>
            </div>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem className="justify-center font-medium text-orange-500 hover:text-orange-600 hover:bg-orange-50 cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" className="flex items-center gap-1 px-1 sm:px-2 sm:gap-2">
                <div className="relative h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
                  <User className="h-5 w-5 text-orange-500" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-700">{user?.name || "Admin User"}</div>
                  <div className="text-xs text-gray-500">Store Admin</div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="shadow-md border-gray-100">
            <DropdownMenuLabel className="text-gray-900">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <div className="font-medium text-gray-900">{user?.name || "Admin User"}</div>
              <div className="text-xs text-gray-500">{user?.email || "admin@example.com"}</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem
              onClick={() => router.push("/admin/profile")}
              className="hover:bg-orange-50 hover:text-orange-500 cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/admin/settings")}
              className="hover:bg-orange-50 hover:text-orange-500 cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="hover:bg-orange-50 hover:text-orange-500 cursor-pointer"
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

