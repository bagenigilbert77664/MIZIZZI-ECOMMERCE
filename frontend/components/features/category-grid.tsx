"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { categoryService, type Category } from "@/services/category"
import { Loader } from "@/components/ui/loader"
import { useInView } from "react-intersection-observer"

// Optimized CategoryCard component to reduce re-renders
const CategoryCard = ({ category, index }: { category: Category; index: number }) => {
  // Use IntersectionObserver for lazy loading
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
  })

  return (
    <Link
      href={`/category/${category.slug}`}
      key={`carousel-${category.id || index}`}
      className="flex-shrink-0 min-w-[150px] sm:min-w-[170px] md:min-w-[190px] flex-1"
      ref={ref}
    >
      <motion.div
        className="group relative overflow-hidden rounded-lg w-full h-full bg-white shadow-md"
        whileHover={{ scale: 1.03, y: -5 }}
        transition={{ duration: 0.2 }}
        layout
      >
        {inView && (
          <>
            <div className="aspect-square w-full overflow-hidden bg-gray-100">
              <Image
                src={category.image_url || "/placeholder.svg?height=200&width=200"}
                alt={category.name}
                width={200}
                height={200}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                sizes="(max-width: 640px) 150px, (max-width: 768px) 170px, 190px"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full p-3">
              <h3 className="text-sm font-medium text-white sm:text-base">{category.name}</h3>
              <p className="text-xs text-white/80 mt-1">Shop Now</p>
            </div>
          </>
        )}
      </motion.div>
    </Link>
  )
}

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)

  // Debounced scroll handler to improve performance
  const handleScroll = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true)
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        setIsScrolling(false)
      })
    }
  }, [isScrolling])

  // Memoized scroll function to prevent recreation on each render
  const scrollCarousel = useCallback((direction: "left" | "right") => {
    if (!carouselRef.current) return

    const scrollAmount = carouselRef.current.clientWidth * 0.75
    const currentScroll = carouselRef.current.scrollLeft

    carouselRef.current.scrollTo({
      left: direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: "smooth",
    })
  }, [])

  // Optimized data fetching with error handling and caching
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const signal = controller.signal

    async function fetchCategories() {
      try {
        setLoading(true)
        // Check if we have cached data
        const cachedData = sessionStorage.getItem("categories")

        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData)
            // Validate that parsedData is an array before setting
            if (isMounted && Array.isArray(parsedData)) {
              setCategories(parsedData)
            } else {
              console.warn("[v0] Cached categories data is not an array, clearing cache")
              sessionStorage.removeItem("categories")
            }
          } catch (parseError) {
            console.error("[v0] Failed to parse cached categories:", parseError)
            sessionStorage.removeItem("categories")
          }
          setLoading(false)

          // Refresh cache in background
          const freshData = await categoryService.getCategories({ parent_id: null, signal })
          if (isMounted && Array.isArray(freshData)) {
            setCategories(freshData)
            sessionStorage.setItem("categories", JSON.stringify(freshData))
          }
        } else {
          // No cache, fetch fresh data
          const data = await categoryService.getCategories({ parent_id: null, signal })
          if (isMounted && Array.isArray(data)) {
            setCategories(data)
            sessionStorage.setItem("categories", JSON.stringify(data))
          } else {
            console.error("[v0] Categories data from API is not an array:", data)
            setError("Invalid data format received")
          }
          if (isMounted) setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof Error && err.name !== "AbortError") {
            console.error("Error fetching categories:", err)
            setError("Failed to load categories")
            setLoading(false)
          }
        }
      }
    }

    fetchCategories()

    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  // Add event listener for scroll with cleanup
  useEffect(() => {
    const carousel = carouselRef.current
    if (carousel) {
      carousel.addEventListener("scroll", handleScroll, { passive: true })
      return () => {
        carousel.removeEventListener("scroll", handleScroll)
      }
    }
  }, [handleScroll])

  // Safety check to ensure memoizedCategories is always an array
  const memoizedCategories = useMemo(() => {
    // Ensure categories is always an array, even if something goes wrong
    return Array.isArray(categories) ? categories : []
  }, [categories])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="bg-cherry-900 py-3 mb-4 rounded-t-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-center">Shop By Category</h2>
      </div>

      <div className="relative px-2 group">
        <div
          ref={carouselRef}
          className="flex overflow-x-auto scrollbar-hide gap-2 pb-3 w-full overscroll-x-contain"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {memoizedCategories.map((category, index) => (
            <CategoryCard key={category.id || `category-${index}`} category={category} index={index} />
          ))}
        </div>

        {/* Left Arrow - Hidden on mobile/tablet, visible on desktop */}
        <button
          onClick={() => scrollCarousel("left")}
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-8 h-8 rounded-full bg-white/90 shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white z-10 will-change-transform"
          aria-label="Scroll left"
          type="button"
        >
          <ChevronLeft className="h-4 w-4 text-gray-700" />
        </button>

        {/* Right Arrow - Hidden on mobile/tablet, visible on desktop */}
        <button
          onClick={() => scrollCarousel("right")}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-8 h-8 rounded-full bg-white/90 shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white z-10 will-change-transform"
          aria-label="Scroll right"
          type="button"
        >
          <ChevronRight className="h-4 w-4 text-gray-700" />
        </button>
      </div>
    </div>
  )
}
