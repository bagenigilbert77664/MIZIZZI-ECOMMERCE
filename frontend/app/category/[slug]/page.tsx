"use client"
import { use } from "react"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { categoryService, type Category } from "@/services/category"
import { ProductGrid } from "@/components/products/product-grid"
import { Loader } from "@/components/ui/loader"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { ChevronUp, ChevronRight, Home, Sparkles, Star, Grid, List, Search, X, ArrowUpRight } from "lucide-react"
import { defaultViewport } from "@/lib/metadata-utils"

// Export viewport configuration
export const viewport = defaultViewport

export default function CategoryPage({ params }: { params: { slug: Promise<string> } }) {
  const slug = use(params.slug)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [sortValue, setSortValue] = useState("reviews-desc")
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [productCount, setProductCount] = useState(37) // Fixed to 37 as requested
  const [showAllSubcategories, setShowAllSubcategories] = useState(false)
  const [bannerHovered, setBannerHovered] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const MAX_VISIBLE_SUBCATEGORIES = 12

  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const bannerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8])
  const bannerScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  const getCategoryTip = (categoryName: string): string => {
    const tips: Record<string, string> = {
      Bags: "Look for adjustable straps and multiple compartments for better functionality. Quality zippers and hardware ensure longevity.",
      Jewelry:
        "Consider your skin tone when selecting metals. Store pieces separately to prevent tangling and scratching.",
      Watches:
        "Automatic watches require movement to stay wound. Water resistance ratings indicate splash protection, not swimming suitability.",
      Accessories:
        "Scarves and belts can transform basic outfits. Invest in quality sunglasses with UV protection for eye health.",
      Shoes:
        "Shop for shoes in the afternoon when feet are naturally more swollen. Always try both shoes on as sizes can vary.",
      Clothing:
        "Natural fabrics like cotton and linen are more breathable. Check care labels before purchasing high-maintenance items.",
    }

    return (
      tips[categoryName] ||
      "Browse our curated selection for the highest quality products with exclusive designs and premium materials."
    )
  }

  const getRelatedCategories = (categoryName: string): string[] => {
    const related: Record<string, string[]> = {
      Bags: ["Wallets", "Luggage", "Backpacks", "Totes"],
      Jewelry: ["Watches", "Rings", "Necklaces", "Bracelets"],
      Watches: ["Jewelry", "Luxury", "Smart Watches", "Accessories"],
      Accessories: ["Scarves", "Belts", "Hats", "Sunglasses"],
      Shoes: ["Sneakers", "Boots", "Sandals", "Heels"],
      Clothing: ["Dresses", "Tops", "Pants", "Outerwear"],
    }

    return related[categoryName] || ["New Arrivals", "Bestsellers", "Sale", "Premium"]
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Fetch the category
        const categoryData = await categoryService.getCategoryBySlug(slug)

        if (!categoryData) {
          setError("Category not found")
          return
        }

        setCategory(categoryData)

        // Fetch subcategories if this is a parent category
        if (!categoryData.parent_id) {
          const subcategoriesData = await categoryService.getSubcategories(categoryData.id)
          setSubcategories(subcategoriesData)
        }
      } catch (err) {
        console.error("Error fetching category data:", err)
        setError("Failed to load category data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Add scroll listener for back to top button
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [slug])

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const handleSortChange = (value: string) => {
    setSortValue(value)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle search logic here
    console.log("Searching for:", searchQuery)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-700">Error</h2>
          <p className="text-red-600">{error || "Category not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded bg-cherry-600 px-4 py-2 text-white hover:bg-cherry-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  // Determine which subcategories to show based on showAllSubcategories state
  const visibleSubcategories = showAllSubcategories ? subcategories : subcategories.slice(0, MAX_VISIBLE_SUBCATEGORIES)

  return (
    <div className="relative bg-gray-50" ref={containerRef}>
      {/* Sticky search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="fixed inset-x-0 top-0 z-50 bg-white shadow-md"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="container mx-auto px-4">
              <form onSubmit={handleSearchSubmit} className="flex items-center py-3">
                <Search className="mr-2 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${category.name.toLowerCase()}...`}
                  className="flex-1 border-none bg-transparent text-base outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowSearch(false)}
                  className="ml-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb navigation */}
        <nav className="mb-6 flex items-center text-sm text-gray-500">
          <Link href="/" className="flex items-center hover:text-cherry-600">
            <Home className="mr-1 h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="mx-2 h-3.5 w-3.5" />
          {category.parent_id && (
            <>
              <Link href="/categories" className="hover:text-cherry-600">
                Categories
              </Link>
              <ChevronRight className="mx-2 h-3.5 w-3.5" />
            </>
          )}
          <span className="font-medium text-gray-900">{category.name}</span>
        </nav>

        {category.banner_url && (
          <motion.div
            className="relative mb-8 overflow-hidden rounded-xl shadow-lg"
            onHoverStart={() => setBannerHovered(true)}
            onHoverEnd={() => setBannerHovered(false)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ opacity: bannerOpacity, scale: bannerScale }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-r from-[#2c0735] via-[#5a1846] to-[#8c1c57] sm:aspect-[16/5] md:aspect-[21/4]">
              {/* Decorative elements */}
              <div className="absolute -left-4 top-1/2 h-32 w-32 -translate-y-1/2 transform rounded-full bg-gradient-to-br from-pink-400/20 to-purple-600/20 blur-xl"></div>
              <div className="absolute right-1/4 top-0 h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-600/20 blur-md"></div>
              <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-gradient-to-tl from-blue-400/10 to-teal-600/10 blur-lg"></div>

              {/* Banner image as background with overlay */}
              <div className="absolute inset-0">
                <motion.img
                  src={category.banner_url || "/placeholder.svg"}
                  alt="Premium collection banner"
                  className="h-full w-full object-cover"
                  animate={{
                    scale: bannerHovered ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.7 }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#2c0735]/90 via-[#5a1846]/70 to-[#8c1c57]/50"></div>
              </div>

              {/* Content overlay */}
              <div className="relative z-10 flex h-full flex-col justify-center p-4 sm:p-6 md:p-8">
                <div className="max-w-full sm:max-w-[60%] md:max-w-[50%]">
                  <motion.div
                    className="inline-block rounded-full bg-white/20 px-3 py-1"
                    animate={{
                      backgroundColor: bannerHovered ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.2)",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-white">
                      <Sparkles className="h-3 w-3" /> Premium Collection
                    </span>
                  </motion.div>
                  <motion.h2
                    className="mt-2 text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl lg:text-3xl"
                    animate={{
                      scale: bannerHovered ? 1.02 : 1,
                      textShadow: bannerHovered ? "0 0 8px rgba(255,255,255,0.3)" : "none",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    Premium Collection
                  </motion.h2>
                  <p className="mt-1 text-xs text-white/90 sm:text-sm md:mt-2">
                    Discover our curated selection of premium products
                  </p>
                  <div className="mt-3 sm:mt-4">
                    <motion.button
                      onClick={() => scrollToTop()}
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-4 py-2 text-xs font-medium text-[#5a1846] shadow-md transition-all sm:px-6 sm:py-2.5 sm:text-sm"
                      whileHover={{
                        scale: 1.03,
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <span>Experience Excellence</span>
                        <Star className="h-3.5 w-3.5 transition-transform group-hover:rotate-45 sm:h-4 sm:w-4" />
                      </span>
                      <span className="absolute inset-0 z-0 bg-gradient-to-r from-white via-pink-50 to-white bg-size-200 bg-pos-0 transition-all duration-500 group-hover:bg-pos-100"></span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Display subcategories if this is a parent category */}
        {subcategories.length > 0 && (
          <motion.div
            className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold sm:text-xl">Browse Categories</h2>
              {subcategories.length > MAX_VISIBLE_SUBCATEGORIES && (
                <button
                  onClick={() => setShowAllSubcategories(!showAllSubcategories)}
                  className="flex items-center gap-1 text-xs font-medium text-cherry-600 hover:text-cherry-700 sm:text-sm"
                >
                  {showAllSubcategories ? "Show Less" : "View All"}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
              <AnimatePresence>
                {visibleSubcategories.map((subcategory, index) => (
                  <motion.div
                    key={subcategory.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link href={`/category/${subcategory.slug}`}>
                      <motion.div
                        className="group relative overflow-hidden rounded-lg shadow-sm ring-1 ring-gray-200/50"
                        whileHover={{ scale: 1.03, y: -2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="aspect-square w-full overflow-hidden bg-gray-100">
                          <Image
                            src={subcategory.image_url || "/placeholder.svg?height=200&width=200"}
                            alt={subcategory.name}
                            width={200}
                            height={200}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full p-2 sm:p-3">
                          <h3 className="text-xs font-medium text-white sm:text-sm md:text-base">{subcategory.name}</h3>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Premium Product Listing Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="bg-gradient-to-r from-[#2c0735] to-[#8c1c57] bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                {category.name}
              </h2>
              <motion.div
                className="relative ml-2 flex h-6 items-center justify-center rounded-full bg-gradient-to-r from-[#5a1846] to-[#8c1c57] px-3 text-xs font-medium text-white"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {productCount} items
              </motion.div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSearch(true)}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-[#5a1846]"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </motion.button>
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex h-8 w-8 items-center justify-center rounded-md shadow-sm ring-1 ring-gray-200 transition-colors ${viewMode === "grid" ? "bg-[#5a1846] text-white ring-0" : "bg-white text-gray-600 hover:text-[#5a1846]"}`}
                  aria-label="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex h-8 w-8 items-center justify-center rounded-md shadow-sm ring-1 ring-gray-200 transition-colors ${viewMode === "list" ? "bg-[#5a1846] text-white ring-0" : "bg-white text-gray-600 hover:text-[#5a1846]"}`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#2c0735] to-[#8c1c57] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-medium text-gray-900 sm:text-base">
                  Shopping Tips for {category.name}
                </h3>
                <p className="text-xs text-gray-600 sm:text-sm">{getCategoryTip(category.name)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getRelatedCategories(category.name).map((tag, index) => (
                    <Link
                      href={`/category/${tag.toLowerCase().replace(/\s+/g, "-")}`}
                      key={index}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 transition-colors hover:bg-[#5a1846]/10 hover:text-[#5a1846]"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6"
        >
          <ProductGrid categorySlug={slug} />
        </motion.div>

        {/* Back to top button */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#5a1846] to-[#8c1c57] text-white shadow-lg transition-colors hover:shadow-xl sm:bottom-8 sm:right-8"
              onClick={scrollToTop}
              aria-label="Back to top"
            >
              <ChevronUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
