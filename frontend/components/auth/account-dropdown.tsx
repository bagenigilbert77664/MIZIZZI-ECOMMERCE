"use client"
import { useState, useEffect } from "react"
import {
  Heart,
  Settings,
  LogOut,
  CreditCard,
  Clock,
  Star,
  User,
  UserPlus,
  ShoppingBag,
  Truck,
  ChevronRight,
  Bell,
  Shield,
  History,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/contexts/auth/auth-context"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

const quickActions = [
  { icon: ShoppingBag, label: "Orders", href: "/orders" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: Star, label: "Reviews", href: "/reviews" },
  { icon: Truck, label: "Track Order", href: "/track-order" },
  { icon: History, label: "Returns", href: "/returns" },
  { icon: Clock, label: "Purchase History", href: "/purchase-history" },
]

const menuItems = [
  {
    title: "Account",
    items: [
      { label: "Profile Settings", icon: Settings, href: "/settings" },
      { label: "Payment Methods", icon: CreditCard, href: "/payments" },
      { label: "Notifications", icon: Bell, href: "/notifications" },
      { label: "Security", icon: Shield, href: "/security" },
    ],
  },
]

export function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  // Add a loading state to prevent rendering before auth is ready
  const [mounted, setMounted] = useState(false)

  // Add useEffect to handle mounting state
  useEffect(() => {
    setMounted(true)
  }, [])

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

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    toast({
      title: "👋 See you soon!",
      description: "You have been successfully logged out.",
      className: "bg-white border border-gray-200 text-gray-900 shadow-lg",
    })
    router.push("/auth/login")
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="text-[#282828] font-normal flex items-center gap-1">
          <User className="h-4 w-4" />
          <span className="hidden md:inline-block">
            {isAuthenticated ? `Hi, ${user?.name?.split(" ")[0] || "User"}` : "Account"}
          </span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white">
        <SheetHeader className="border-b px-6 py-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border bg-gray-50">
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url || "/placeholder.svg"}
                    alt={user?.name || "User"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <SheetTitle>{user?.name || "User"}</SheetTitle>
                <SheetDescription>{user?.email || ""}</SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle>Welcome to Jumia</SheetTitle>
              <SheetDescription>Sign in to access your account</SheetDescription>
            </>
          )}
        </SheetHeader>

        {isAuthenticated ? (
          <>
            <ScrollArea className="flex-1">
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-3 gap-1 border-b p-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors hover:bg-gray-50"
                    onClick={() => setIsOpen(false)}
                  >
                    <action.icon className="h-6 w-6 text-[#f68b1e]" />
                    <span className="text-xs font-medium text-gray-700">{action.label}</span>
                  </Link>
                ))}
              </div>

              {/* Menu Items */}
              <div className="p-6 space-y-6">
                {menuItems.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-500">{section.title}</h3>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5 text-[#f68b1e]" />
                            <span className="text-sm text-gray-700">{item.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-6">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start gap-3 py-3 border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6 space-y-4">
            <Button asChild className="w-full bg-[#f68b1e] hover:bg-[#f68b1e]/90">
              <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

