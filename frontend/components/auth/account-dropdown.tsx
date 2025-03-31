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
  Gift,
  Bookmark,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/contexts/auth/auth-context"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const quickActions = [
  { icon: ShoppingBag, label: "Orders", href: "/orders" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: Star, label: "Reviews", href: "/reviews" },
  { icon: Truck, label: "Track Order", href: "/track-order" },
  { icon: Gift, label: "Gift Cards", href: "/gift-cards" },
  { icon: Bookmark, label: "Saved Items", href: "/saved-items" },
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
  {
    title: "Shopping",
    items: [
      { label: "Purchase History", icon: Clock, href: "/purchase-history" },
      { label: "Returns & Refunds", icon: History, href: "/returns" },
      { label: "Help & Support", icon: HelpCircle, href: "/help" },
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
        <Button variant="ghost" className="text-[#282828] font-normal flex items-center gap-1 hover:bg-cherry-50">
          <div className="relative">
            <User className="h-4 w-4" />
            {isAuthenticated && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-white"></span>
            )}
          </div>
          <span className="hidden md:inline-block">
            {isAuthenticated ? `Hi, ${user?.name?.split(" ")[0] || "User"}` : "Account"}
          </span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white border-l border-cherry-100">
        <SheetHeader className="border-b border-cherry-100 px-6 py-6 bg-gradient-to-r from-cherry-900 to-cherry-800 text-white">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 bg-cherry-700 shadow-lg">
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url || "/placeholder.svg"}
                    alt={user?.name || "User"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-8 w-8 text-white/70" />
                  </div>
                )}
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-white">{user?.name || "User"}</SheetTitle>
                <SheetDescription className="text-cherry-100">{user?.email || ""}</SheetDescription>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span className="text-xs text-cherry-100">Premium Member</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <SheetTitle className="text-xl font-bold text-white mb-2">Welcome to Mizizzi</SheetTitle>
              <SheetDescription className="text-cherry-100">
                Sign in to access exclusive offers, track orders, and manage your wishlist
              </SheetDescription>
              <div className="mt-6 flex gap-3">
                <Button asChild className="bg-white text-cherry-900 hover:bg-white/90 font-medium px-6">
                  <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 text-cherry-900 hover:bg-white/10 hover:text-white"
                >
                  <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </SheetHeader>

        {isAuthenticated ? (
          <>
            <ScrollArea className="flex-1">
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-3 gap-1 border-b border-cherry-100 p-6 bg-cherry-50/50">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors hover:bg-white"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="rounded-full bg-cherry-100 p-2.5">
                      <action.icon className="h-5 w-5 text-cherry-800" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{action.label}</span>
                  </Link>
                ))}
              </div>

              {/* Menu Items */}
              <div className="p-6 space-y-8">
                {menuItems.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h3 className="text-sm font-semibold text-cherry-900 uppercase tracking-wider">{section.title}</h3>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-cherry-50"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5 text-cherry-700" />
                            <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-cherry-300" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Membership Status */}
              <div className="mx-6 mb-6 rounded-xl bg-gradient-to-r from-cherry-900 to-cherry-800 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Premium Member</h4>
                    <p className="text-xs text-cherry-100">Valid until Dec 2023</p>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">20% OFF</div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-white/20">
                    <div className="h-1.5 w-3/4 rounded-full bg-white"></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span>3/4 Benefits Used</span>
                    <span className="font-medium">75%</span>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="border-t border-cherry-100 p-6">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start gap-3 py-5 border-cherry-200 text-cherry-800 transition-colors hover:bg-cherry-50 hover:text-cherry-900 hover:border-cherry-300"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-cherry-900 uppercase tracking-wider">Why Join Mizizzi?</h3>

              <div className="space-y-3">
                {[
                  { icon: Star, title: "Exclusive Offers", desc: "Get access to member-only deals and discounts" },
                  { icon: Truck, title: "Fast Delivery", desc: "Priority shipping on all your orders" },
                  { icon: Gift, title: "Special Rewards", desc: "Earn points with every purchase" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="rounded-full bg-cherry-100 p-2 mt-0.5">
                      <item.icon className="h-4 w-4 text-cherry-800" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{item.title}</h4>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6 bg-cherry-100" />

              <div className="space-y-3">
                <Button asChild className="w-full py-6 bg-cherry-800 hover:bg-cherry-700 text-white font-medium">
                  <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full py-6 border-cherry-800 text-cherry-800 hover:bg-cherry-50"
                >
                  <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </Link>
                </Button>
              </div>
            </div>

            {/* Testimonial */}
            <div className="mt-8 rounded-xl bg-cherry-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=256&q=80"
                    alt="Customer"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Sarah K.</p>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-cherry-500 text-cherry-500" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs italic text-gray-600">
                "Mizizzi has transformed my shopping experience. The quality of products and the seamless checkout
                process make it my go-to store."
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
