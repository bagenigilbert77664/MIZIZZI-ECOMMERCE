"use client"

import type React from "react"

import { useState } from "react"
import { Bell, Search, User, Settings, LogOut } from "lucide-react"
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

export function AdminHeader() {
  const [searchQuery, setSearchQuery] = useState("")
  const { user, logout } = useAdminAuth()
  const router = useRouter()

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 sm:px-6 shadow-sm">
      <form onSubmit={handleSearch} className="hidden flex-1 sm:flex sm:max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cherry-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-gray-50 pl-8 focus-visible:ring-cherry-500 border-cherry-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>
      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cherry-600 text-[10px] font-medium text-white shadow-sm">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 shadow-md border-cherry-100">
            <DropdownMenuLabel className="text-cherry-900">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-cherry-100" />
            <div className="max-h-80 overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-cherry-50 cursor-pointer">
                <div className="font-medium text-cherry-900">New Order #1234</div>
                <div className="text-xs text-gray-500">2 minutes ago</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-cherry-50 cursor-pointer">
                <div className="font-medium text-cherry-900">Low Stock Alert: Product XYZ</div>
                <div className="text-xs text-gray-500">1 hour ago</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 hover:bg-cherry-50 cursor-pointer">
                <div className="font-medium text-cherry-900">New Customer Registration</div>
                <div className="text-xs text-gray-500">3 hours ago</div>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="bg-cherry-100" />
            <DropdownMenuItem className="justify-center font-medium text-cherry-600 hover:text-cherry-800 hover:bg-cherry-50 cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9 border border-cherry-100">
              <User className="h-5 w-5 text-cherry-700" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="shadow-md border-cherry-100">
            <DropdownMenuLabel className="text-cherry-900">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-cherry-100" />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <div className="font-medium text-cherry-900">{user?.name || "Admin User"}</div>
              <div className="text-xs text-gray-500">{user?.email || "admin@example.com"}</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-cherry-100" />
            <DropdownMenuItem
              onClick={() => router.push("/admin/profile")}
              className="hover:bg-cherry-50 hover:text-cherry-800 cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/admin/settings")}
              className="hover:bg-cherry-50 hover:text-cherry-800 cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-cherry-100" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="hover:bg-cherry-50 hover:text-cherry-800 cursor-pointer"
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

