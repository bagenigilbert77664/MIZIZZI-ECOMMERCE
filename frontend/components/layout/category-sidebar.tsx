"use client"

import Link from "next/link"
import {
  Store,
  Smartphone,
  Tv,
  Refrigerator,
  Heart,
  Home,
  Shirt,
  Laptop,
  Gamepad2,
  ShoppingCart,
  Baby,
  MoreHorizontal,
} from "lucide-react"

const categories = [
  { icon: Store, label: "Official Stores", href: "/official-stores" },
  { icon: Smartphone, label: "Phones & Tablets", href: "/category/phones-tablets" },
  { icon: Tv, label: "TVs & Audio", href: "/category/tvs-audio" },
  { icon: Refrigerator, label: "Appliances", href: "/category/appliances" },
  { icon: Heart, label: "Health & Beauty", href: "/category/health-beauty" },
  { icon: Home, label: "Home & Office", href: "/category/home-office" },
  { icon: Shirt, label: "Fashion", href: "/category/fashion" },
  { icon: Laptop, label: "Computing", href: "/category/computing" },
  { icon: Gamepad2, label: "Gaming", href: "/category/gaming" },
  { icon: ShoppingCart, label: "Supermarket", href: "/category/supermarket" },
  { icon: Baby, label: "Baby Products", href: "/category/baby-products" },
  { icon: MoreHorizontal, label: "Other categories", href: "/categories" },
]

export function CategorySidebar() {
  return (
    <aside className="hidden lg:block w-[220px] bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
      <nav className="py-2">
        {categories.map((category, index) => {
          const Icon = category.icon
          return (
            <Link
              key={index}
              href={category.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
            >
              <Icon className="h-4 w-4 text-gray-500 group-hover:text-orange-600 transition-colors flex-shrink-0" />
              <span className="font-medium">{category.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
