"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import {
  User,
  ShoppingBag,
  Star,
  Heart,
  Clock,
  CreditCard,
  MapPin,
  Bell,
  LogOut,
  Edit,
  Phone,
  Truck,
  History,
  Shield,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { AddressManagement } from "@/components/profile/address-management"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/contexts/notification/notification-context"

// Extend the user type if needed
type ExtendedUser = {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  // Add other properties as needed
}

// Define the sidebar menu items
const sidebarItems = [
  { icon: User, label: "My Account", href: "/account", active: true },
  { icon: ShoppingBag, label: "Orders", href: "/orders" },
  { icon: Truck, label: "Track Order", href: "/track-order" },
  { icon: Star, label: "Reviews", href: "/reviews" },
  { icon: Heart, label: "Wishlist", href: "/wishlist" },
  { icon: History, label: "Returns", href: "/returns" },
  { icon: Clock, label: "Purchase History", href: "/purchase-history" },
  { icon: CreditCard, label: "Payment Settings", href: "/payments" },
  { icon: MapPin, label: "Address Book", href: "/account?tab=address" },
  { icon: Bell, label: "Notification Preferences", href: "/account?tab=notifications" },
]

export default function AccountPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const { user, isAuthenticated, logout } = useAuth()
  const { unreadCount } = useNotifications()
  // Cast user to the extended type or use optional chaining
  const userInfo = user as ExtendedUser | undefined
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(searchParams?.tab || "overview")

  // Redirect to login if not authenticated
  if (typeof window !== "undefined" && !isAuthenticated) {
    router.push("/auth/login?redirect=/account")
    return null
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "👋 See you soon!",
        description: "You have been successfully logged out.",
      })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Error",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="container px-4 md:px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block">
            <Card className="sticky top-24 shadow-sm border-gray-200">
              <CardContent className="p-0">
                <div className="p-5 bg-gradient-to-r from-cherry-800 to-cherry-700 text-white rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{userInfo?.name || "User"}</h3>
                      <p className="text-sm text-white/80">{userInfo?.email || ""}</p>
                    </div>
                  </div>
                </div>
                <nav className="p-2">
                  <ul className="space-y-0.5">
                    {sidebarItems.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                            item.active ||
                            (item.href === "/account" && activeTab === "overview") ||
                            (item.href === "/account?tab=address" && activeTab === "address") ||
                            (item.href === "/account?tab=notifications" && activeTab === "notifications")
                              ? "bg-cherry-50 text-cherry-800 font-medium"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </span>
                          {item.label === "Notification Preferences" && unreadCount > 0 && (
                            <Badge className="bg-cherry-600 text-white text-xs px-1.5 py-0.5 h-5">{unreadCount}</Badge>
                          )}
                          {item.href !== "/account" && <ChevronRight className="h-4 w-4 opacity-50" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Separator className="my-3" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2.5 h-4 w-4" />
                    Logout
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden mb-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold">My Account</h1>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
            <div className="flex overflow-x-auto pb-2 gap-1.5 scrollbar-hide">
              <Button
                variant={activeTab === "overview" ? "default" : "outline"}
                size="sm"
                className={`text-xs px-3 ${activeTab === "overview" ? "bg-cherry-800" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </Button>
              <Button
                variant={activeTab === "address" ? "default" : "outline"}
                size="sm"
                className={`text-xs px-3 ${activeTab === "address" ? "bg-cherry-800" : ""}`}
                onClick={() => setActiveTab("address")}
              >
                Addresses
              </Button>
              <Button
                variant={activeTab === "notifications" ? "default" : "outline"}
                size="sm"
                className={`text-xs px-3 ${activeTab === "notifications" ? "bg-cherry-800" : ""}`}
                onClick={() => setActiveTab("notifications")}
              >
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-1.5 bg-white text-cherry-800 text-xs px-1 py-0">{unreadCount}</Badge>
                )}
              </Button>
              <Button
                variant={activeTab === "security" ? "default" : "outline"}
                size="sm"
                className={`text-xs px-3 ${activeTab === "security" ? "bg-cherry-800" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                Security
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {activeTab === "overview" && (
              <>
                <h1 className="text-xl font-bold mb-4 hidden md:block">Account Overview</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {/* Account Details Card */}
                  <Card className="shadow-sm border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-sm font-medium text-gray-700">ACCOUNT DETAILS</CardTitle>
                      <Button variant="ghost" size="sm" className="text-cherry-800 h-8 px-2">
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-1">
                        <p className="font-medium">{userInfo?.name}</p>
                        <p className="text-gray-500 text-sm">{userInfo?.email}</p>
                        {userInfo?.phone && (
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{userInfo.phone}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address Book Card */}
                  <Card className="shadow-sm border-gray-200">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-sm font-medium text-gray-700">ADDRESS BOOK</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cherry-800 h-8 px-2"
                        onClick={() => setActiveTab("address")}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Your default shipping address:</p>
                        {userInfo?.address ? (
                          <div className="text-gray-500 text-sm">
                            <p>{userInfo.name}</p>
                            <p>{userInfo.address}</p>
                            {userInfo.city && (
                              <p>
                                {userInfo.city}, {userInfo.state}
                              </p>
                            )}
                            {userInfo.phone && <p>{userInfo.phone}</p>}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">
                            <p>No default address set</p>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-cherry-800 text-sm"
                              onClick={() => setActiveTab("address")}
                            >
                              Add an address
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="mb-5 shadow-sm border-gray-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium text-gray-700">RECENT ACTIVITY</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Order #12345 placed</p>
                          <p className="text-gray-500 text-xs">2 days ago</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CreditCard className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Payment of $129.99 processed</p>
                          <p className="text-gray-500 text-xs">2 days ago</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Truck className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Order #12345 shipped</p>
                          <p className="text-gray-500 text-xs">1 day ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-3">
                    <Button variant="link" className="p-0 h-auto text-cherry-800 text-sm">
                      View all activity
                    </Button>
                  </CardFooter>
                </Card>

                {/* Quick Links */}
                <h2 className="text-sm font-semibold mb-3 text-gray-700">QUICK LINKS</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Link href="/orders">
                    <Card className="hover:shadow-md transition-shadow border-gray-200 shadow-sm h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <ShoppingBag className="h-6 w-6 text-cherry-800 mb-1.5" />
                        <span className="font-medium text-sm">My Orders</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/wishlist">
                    <Card className="hover:shadow-md transition-shadow border-gray-200 shadow-sm h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <Heart className="h-6 w-6 text-cherry-800 mb-1.5" />
                        <span className="font-medium text-sm">Wishlist</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/reviews">
                    <Card className="hover:shadow-md transition-shadow border-gray-200 shadow-sm h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <Star className="h-6 w-6 text-cherry-800 mb-1.5" />
                        <span className="font-medium text-sm">Reviews</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/track-order">
                    <Card className="hover:shadow-md transition-shadow border-gray-200 shadow-sm h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <Truck className="h-6 w-6 text-cherry-800 mb-1.5" />
                        <span className="font-medium text-sm">Track Order</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/returns">
                    <Card className="hover:shadow-md transition-shadow border-gray-200 shadow-sm h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <History className="h-6 w-6 text-cherry-800 mb-1.5" />
                        <span className="font-medium text-sm">Returns</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/account?tab=security">
                    <Card className="hover:shadow-md transition-shadow border-gray-200 shadow-sm h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <Shield className="h-6 w-6 text-cherry-800 mb-1.5" />
                        <span className="font-medium text-sm">Security</span>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </>
            )}

            {activeTab === "address" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold">Address Book</h1>
                  <Button variant="outline" size="sm" className="md:hidden" onClick={() => setActiveTab("overview")}>
                    Back
                  </Button>
                </div>
                <AddressManagement />
              </>
            )}

            {activeTab === "notifications" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold">Notifications</h1>
                  <Button variant="outline" size="sm" className="md:hidden" onClick={() => setActiveTab("overview")}>
                    Back
                  </Button>
                </div>
                <NotificationCenter />
              </>
            )}

            {activeTab === "security" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold">Security Settings</h1>
                  <Button variant="outline" size="sm" className="md:hidden" onClick={() => setActiveTab("overview")}>
                    Back
                  </Button>
                </div>
                <Card className="shadow-sm border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Password & Security</CardTitle>
                    <CardDescription>Manage your password and security settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Password</label>
                      <input type="password" className="w-full p-2 border rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Password</label>
                      <input type="password" className="w-full p-2 border rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Confirm New Password</label>
                      <input type="password" className="w-full p-2 border rounded-md" />
                    </div>
                    <Button className="bg-cherry-800 hover:bg-cherry-900">Update Password</Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

