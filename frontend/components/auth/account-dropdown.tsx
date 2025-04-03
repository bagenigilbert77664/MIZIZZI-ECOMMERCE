"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Heart, LogOut, Clock, Star, User, ShoppingBag, Truck, History, ChevronDown, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/contexts/auth/auth-context"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

// Define the quick actions as specified
const quickActions = [
  { icon: ShoppingBag, label: "Orders", href: "/orders" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: Star, label: "Reviews", href: "/reviews" },
  { icon: Truck, label: "Track Order", href: "/track-order" },
  { icon: History, label: "Returns", href: "/returns" },
  { icon: Clock, label: "Purchase History", href: "/purchase-history" },
]

export function AccountDropdown({ trigger }: { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Add a loading state to prevent rendering before auth is ready
  const [mounted, setMounted] = useState(false)

  // Add useEffect to handle mounting state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Add click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Add event listener when dropdown is open
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Determine if the user is an admin
  const isAdmin = user?.role === "admin"

  // Modify the debug log to be conditional
  if (process.env.NODE_ENV === "development" && mounted) {
    console.log("AccountDropdown - User data:", user, "isAuthenticated:", isAuthenticated)
  }

  // Wrap the return statement with a check for mounted state
  if (!mounted) {
    return (
      <Button variant="ghost" className="text-[#282828] font-normal flex items-center gap-1">
        <User className="h-4 w-4" />
        <span>Account</span>
        <ChevronDown className="h-3 w-3 ml-1" />
      </Button>
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "👋 See you soon!",
        description: "You have been successfully logged out.",
        className: "bg-white border border-gray-200 text-gray-900 shadow-lg",
      })
      router.push("/auth/login")
      setIsOpen(false)
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Error",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMyAccountClick = () => {
    router.push("/account")
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Custom trigger or default trigger */}
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-3 py-2 text-[#282828] font-normal rounded-md hover:bg-gray-100"
          aria-expanded={isOpen}
          aria-haspopup="true"
          data-testid="account-dropdown-trigger"
        >
          <User className="h-4 w-4" />
          <span className="hidden md:inline-block">
            {isAuthenticated ? `Hi, ${user?.name?.split(" ")[0] || "User"}` : "Account"}
          </span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      )}

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-full sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          role="menu"
          aria-orientation="vertical"
          data-testid="account-dropdown-menu"
        >
          <div className="border-b px-4 py-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border bg-gray-50">
                  {user?.avatar_url ? (
                    <Image
                      src={user.avatar_url || "/placeholder.svg"}
                      alt={user?.name || "User"}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{user?.name || "User"}</h3>
                    {isAdmin && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{user?.email || ""}</p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-lg">Welcome to Mizizzi</h3>
                <p className="text-sm text-gray-500">Sign in to access your account</p>
              </>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {isAuthenticated ? (
              <>
                {/* My Account Button */}
                <div className="p-4 border-b">
                  <Button
                    onClick={handleMyAccountClick}
                    className="w-full bg-cherry-800 hover:bg-cherry-900 text-white"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    My Account
                  </Button>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-1 p-4">
                  {quickActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex items-center gap-2 rounded-lg p-3 transition-colors hover:bg-gray-50"
                      onClick={() => setIsOpen(false)}
                      role="menuitem"
                    >
                      <action.icon className="h-5 w-5 text-cherry-700" />
                      <span className="text-sm font-medium text-gray-700">{action.label}</span>
                    </Link>
                  ))}
                </div>

                <div className="border-t p-4">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full justify-start gap-3 py-2 border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    role="menuitem"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Sign Out {isAdmin ? "(Admin)" : ""}</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-6 space-y-4">
                <Button asChild className="w-full bg-cherry-800 hover:bg-cherry-900 text-white" role="menuitem">
                  <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-cherry-200 text-cherry-800 hover:bg-cherry-50"
                  role="menuitem"
                >
                  <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                    <User className="mr-2 h-4 w-4" />
                    Create Account
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

