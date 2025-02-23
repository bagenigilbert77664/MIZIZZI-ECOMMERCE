"use client"

import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  ShoppingBag,
  Heart,
  Gift,
  Truck,
  HelpCircle,
  Settings,
  LogOut,
  User,
  CreditCard,
  Clock,
  Star,
} from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

const categories = [
  { name: "Jewelry", href: "/category/jewelry", subcategories: ["Necklaces", "Earrings", "Bracelets", "Rings"] },
  { name: "Fashion", href: "/category/fashion", subcategories: ["Dresses", "Tops", "Bottoms", "Sets"] },
  { name: "Accessories", href: "/category/accessories", subcategories: ["Bags", "Shoes", "Watches", "Sunglasses"] },
]

const accountLinks = [
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Wishlist", href: "/wishlist", icon: Heart },
  { name: "Gift Cards", href: "/gift-cards", icon: Gift },
  { name: "Track Order", href: "/track-order", icon: Truck },
]

const supportLinks = [
  { name: "Help Center", href: "/help", icon: HelpCircle },
  { name: "Account Settings", href: "/settings", icon: Settings },
  { name: "Sign Out", href: "/signout", icon: LogOut },
]

export function MobileNav() {
  return (
    <div className="flex h-full flex-col bg-white">
      <SheetHeader className="border-b px-6 py-4">
        <SheetTitle>
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-10 w-10 overflow-hidden rounded-lg bg-gradient-to-br from-cherry-800 to-cherry-900 p-0.5"
            >
              <div className="h-full w-full rounded-lg bg-white p-1">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                  alt="MIZIZZI"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
            </motion.div>
            <span className="text-lg font-bold">MIZIZZI</span>
          </div>
        </SheetTitle>
        <SheetDescription>Browse categories and manage your account</SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/account" className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted/50">
              <User className="h-5 w-5 text-cherry-600" />
              <div className="text-sm font-medium">Account</div>
            </Link>
            <Link href="/orders" className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted/50">
              <Clock className="h-5 w-5 text-cherry-600" />
              <div className="text-sm font-medium">Orders</div>
            </Link>
            <Link href="/payments" className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted/50">
              <CreditCard className="h-5 w-5 text-cherry-600" />
              <div className="text-sm font-medium">Payments</div>
            </Link>
            <Link href="/reviews" className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted/50">
              <Star className="h-5 w-5 text-cherry-600" />
              <div className="text-sm font-medium">Reviews</div>
            </Link>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Shop by Category</h3>
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.name}>
                  <Link href={category.href} className="text-sm font-medium hover:text-cherry-600">
                    {category.name}
                  </Link>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {category.subcategories.map((subcategory) => (
                      <Link
                        key={subcategory}
                        href={`${category.href}/${subcategory.toLowerCase()}`}
                        className="text-xs text-muted-foreground hover:text-cherry-600"
                      >
                        {subcategory}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Account Links */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">My Account</h3>
            <div className="space-y-2">
              {accountLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg py-2 text-sm hover:text-cherry-600"
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <Separator />

          {/* Support Links */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Support</h3>
            <div className="space-y-2">
              {supportLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg py-2 text-sm hover:text-cherry-600"
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

