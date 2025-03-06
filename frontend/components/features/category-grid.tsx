"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { categoryService, type Category } from "@/services/category"
import { Loader } from "@/components/ui/loader"
import { Button } from "@/components/ui/button"

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true)
        // Fetch only parent categories (those without parent_id)
        const data = await categoryService.getCategories({ parent_id: null })
        setCategories(data)
      } catch (err) {
        console.error("Error fetching categories:", err)
        setError("Failed to load categories")
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return

    const scrollAmount = 300
    const currentScroll = carouselRef.current.scrollLeft

    carouselRef.current.scrollTo({
      left: direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: "smooth",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  // Split categories into two groups
  const carouselCategories = categories // All categories for the carousel

  return (
    <section className="w-full py-8">
      <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-4">
        {/* Carousel */}
        <div className="relative">
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">Shop by Category</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => scrollCarousel("left")} className="rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => scrollCarousel("right")} className="rounded-full">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex overflow-x-auto scrollbar-hide gap-4 pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category, index) => (
              <Link
                href={`/category/${category.slug}`}
                key={`carousel-${category.id || index}`}
                className="flex-shrink-0 w-[200px]"
              >
                <motion.div
                  className="group relative overflow-hidden rounded-lg"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="aspect-square w-full overflow-hidden bg-gray-100">
                    <Image
                      src={category.image_url || "/placeholder.svg?height=200&width=200"}
                      alt={category.name}
                      width={200}
                      height={200}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full p-2 sm:p-3">
                    <h3 className="text-sm font-medium text-white sm:text-base">{category.name}</h3>
                    {category.subcategories && category.subcategories.length > 0 && (
                      <p className="text-xs text-white/80">{category.subcategories.length} subcategories</p>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
