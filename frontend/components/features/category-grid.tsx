"use client"

import Link from "next/link"
import { OptimizedImage } from "./optimized-image"

const defaultCategories = [
  {
    id: "1",
    name: "Necklaces",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
    href: "/category/necklaces",
  },
  {
    id: "2",
    name: "Earrings",
    image: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop",
    href: "/category/earrings",
  },
  {
    id: "3",
    name: "Rings",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
    href: "/category/rings",
  },
  {
    id: "4",
    name: "Bracelets",
    image: "https://images.unsplash.com/photo-1531995811006-35cb42e1a022?w=300&h=300&fit=crop",
    href: "/category/bracelets",
  },
  {
    id: "5",
    name: "Dresses",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
    href: "/category/dresses",
  },
  {
    id: "6",
    name: "Tops",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=300&fit=crop",
    href: "/category/tops",
  },
]

interface Category {
  id: string
  name: string
  image: string
  href: string
}

interface CategoryGridProps {
  categories?: Category[]
}

export function CategoryGrid({ categories = defaultCategories }: CategoryGridProps) {
  if (!categories || categories.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {defaultCategories.map((category) => (
          <div key={category.id} className="card-base animate-pulse">
            <div className="aspect-square bg-gray-200" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {categories.map((category) => (
        <Link key={category.id} href={category.href} className="card-base card-hover group relative overflow-hidden">
          <div className="relative aspect-square overflow-hidden">
            <div className="relative h-full w-full">
              <OptimizedImage
                src={category.image}
                alt={category.name}
                width={300}
                height={300}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <h3 className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 text-xs sm:text-sm font-semibold text-white">
              {category.name}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  )
}

