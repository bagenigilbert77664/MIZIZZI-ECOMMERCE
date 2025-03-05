"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { OptimizedImage } from "./optimized-image"
import { categoryService } from "@/services/category"

interface Category {
  id: string
  name: string
  image: string
  href: string
}

interface CategoryGridProps {
  categories?: Category[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const [isLoading, setIsLoading] = useState(!categories)
  const [categoriesState, setCategories] = useState<Category[]>(categories || [])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If categories are provided as props, use them
    if (categories) {
      setCategories(categories)
      setIsLoading(false)
      return
    }

    // Otherwise fetch categories from API
    const fetchCategories = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await categoryService.getCategories()
        if (data && data.length > 0) {
          setCategories(data)
        } else {
          setError("No categories found")
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
        setError("Failed to load categories")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [categories])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array(6)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="card-base animate-pulse">
              <div className="aspect-square bg-gray-200" />
            </div>
          ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  if (categoriesState.length === 0) {
    return <div className="text-gray-500 p-4">No categories available</div>
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {categoriesState.map((category) => (
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

