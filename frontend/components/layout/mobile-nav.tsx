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
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { categoryService, type Category } from "@/services/category"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const fetchedCategories = await categoryService.getCategories()
        const topLevelCategories = fetchedCategories.filter((cat) => !cat.parent_id)

        const categoriesWithSubcategories = await Promise.all(
          topLevelCategories.map(async (category) => {
            if (category.id) {
              const subcategories = await categoryService.getSubcategories(category.id)
              return { ...category, subcategories }
            }
            return category
          }),
        )

        setCategories(categoriesWithSubcategories)
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

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
              <Link href="/" className="block h-full w-full">
                <div className="h-full w-full rounded-lg bg-white p-2">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                    alt="MIZIZZI"
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </Link>
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

          <div className="mb-4">
            <Link
              href="/categories"
              className="flex items-center justify-between w-full p-3 rounded-lg bg-cherry-50 hover:bg-cherry-100 transition-colors"
            >
              <span className="text-sm font-semibold text-cherry-800">Browse All Categories</span>
              <ChevronRight className="h-4 w-4 text-cherry-600" />
            </Link>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Shop by Category</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-1">
                {categories.slice(0, 10).map((category) => (
                  <div key={category.id}>
                    <Collapsible
                      open={expandedCategories.has(category.id)}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <Link
                          href={`/category/${category.slug}`}
                          className="flex-1 text-sm font-medium hover:text-cherry-600"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {category.image_url && (
                                <div className="h-6 w-6 rounded overflow-hidden flex-shrink-0">
                                  <img
                                    src={category.image_url || "/placeholder.svg"}
                                    alt={category.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <span>{category.name}</span>
                            </div>
                            {category.products_count && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {category.products_count}
                              </span>
                            )}
                          </div>
                        </Link>
                        {category.subcategories && category.subcategories.length > 0 && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                              {expandedCategories.has(category.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                      {category.subcategories && category.subcategories.length > 0 && (
                        <CollapsibleContent className="ml-4 mt-1">
                          <div className="space-y-1 border-l-2 border-gray-100 pl-3">
                            {category.subcategories.slice(0, 8).map((subcategory) => (
                              <Link
                                key={subcategory.id}
                                href={`/category/${subcategory.slug}`}
                                className="block text-xs text-muted-foreground hover:text-cherry-600 py-1.5 px-2 rounded hover:bg-gray-50"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{subcategory.name}</span>
                                  {subcategory.products_count && (
                                    <span className="text-gray-400">({subcategory.products_count})</span>
                                  )}
                                </div>
                              </Link>
                            ))}
                            {category.subcategories.length > 8 && (
                              <Link
                                href={`/category/${category.slug}`}
                                className="block text-xs text-cherry-600 font-medium py-1.5 px-2 rounded hover:bg-cherry-50"
                              >
                                View all {category.name} →
                              </Link>
                            )}
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </div>
                ))}

                {categories.length > 10 && (
                  <div className="pt-2 mt-3 border-t border-gray-100">
                    <Link
                      href="/categories"
                      className="flex items-center justify-center w-full p-2 text-sm font-medium text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50 rounded-lg transition-colors"
                    >
                      View All Categories
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-4 text-center">No categories available at the moment.</div>
            )}
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
