"use client"
import { useState, useEffect, useRef } from "react"
import { User, ShoppingBag, Heart, LogOut, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Handle mounting state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

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

  if (!mounted) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-gray-800 hover:text-cherry-700 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="account-dropdown-trigger"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cherry-50 text-cherry-700">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="font-medium text-sm">
          {isAuthenticated ? `Hi, ${user?.name?.split(" ")[0] || "User"}` : "Account"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-100 z-50 py-2"
          role="menu"
          aria-orientation="vertical"
          data-testid="account-dropdown-menu"
        >
          {isAuthenticated ? (
            <>
              {/* User greeting */}
              <div className="px-4 py-2 border-b border-gray-100 mb-1">
                <p className="font-medium text-gray-800">Hi, {user?.name?.split(" ")[0] || "User"}</p>
              </div>

              {/* Menu Items */}
              <Link
                href="/account"
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-cherry-700"
                onClick={() => setIsOpen(false)}
              >
                <User className="mr-3 h-4 w-4 text-gray-500" />
                My Account
              </Link>

              <Link
                href="/orders"
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-cherry-700"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingBag className="mr-3 h-4 w-4 text-gray-500" />
                Orders
              </Link>

              <Link
                href="/wishlist"
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-cherry-700"
                onClick={() => setIsOpen(false)}
              >
                <Heart className="mr-3 h-4 w-4 text-gray-500" />
                Wishlist
              </Link>

              <button
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-cherry-700"
              >
                <LogOut className="mr-3 h-4 w-4 text-gray-500" />
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Sign In/Register Options */}
              <div className="px-4 py-3">
                <Link
                  href="/auth/login"
                  className="block w-full text-center bg-cherry-600 hover:bg-cherry-700 text-white font-medium py-2.5 rounded-md mb-3"
                  onClick={() => setIsOpen(false)}
                >
                  Sign In
                </Link>

                <div className="text-center text-sm">
                  <span className="text-gray-500">New customer? </span>
                  <Link
                    href="/auth/login"
                    className="text-cherry-600 hover:text-cherry-800 font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    Create your account
                  </Link>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-2 pt-2">
                <Link
                  href="/account"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cherry-700"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="mr-3 h-4 w-4 text-gray-500" />
                  My Account
                </Link>

                <Link
                  href="/orders"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cherry-700"
                  onClick={() => setIsOpen(false)}
                >
                  <ShoppingBag className="mr-3 h-4 w-4 text-gray-500" />
                  Orders
                </Link>

                <Link
                  href="/wishlist"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-cherry-700"
                  onClick={() => setIsOpen(false)}
                >
                  <Heart className="mr-3 h-4 w-4 text-gray-500" />
                  Wishlist
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
