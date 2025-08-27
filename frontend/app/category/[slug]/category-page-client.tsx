"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { ProductGrid } from "@/components/products/product-grid"
import { Loader } from "@/components/ui/loader"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronUp,
  ChevronRight,
  Home,
  Search,
  X,
  Filter,
  SlidersHorizontal,
  CheckCircle2,
  Grid3X3,
  Grid2X2,
  ArrowRight,
  Heart,
  ShoppingBag,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import type { Category } from "@/services/category"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CategoryPageClientProps {
  category: Category
  subcategories: Category[]
  slug: string
  relatedCategories?: Category[]
}

export default function CategoryPageClient({
  category,
  subcategories,
  slug,
  relatedCategories = [],
}: CategoryPageClientProps) {
  const router = useRouter()
  const [sortValue, setSortValue] = useState("featured")
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [productCount, setProductCount] = useState(37) // Sample count
  const [activeTab, setActiveTab] = useState("all")
  const [gridView, setGridView] = useState<"compact" | "comfortable">("comfortable")

  // Monitor scroll position for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Focus search input when search is shown
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
    console.log("Searching for:", searchQuery)
    setShowSearch(false)
  }

  // Featured subcategories (pick top 4)
  const featuredSubcategories = subcategories.slice(0, 4)

  // Group remaining subcategories for the grid
  const remainingSubcategories = subcategories.slice(4)

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky search overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="container mx-auto px-4 h-full flex flex-col">
              <div className="py-6 flex items-center justify-between">
                <h2 className="text-xl font-medium">Search {category.name}</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <form onSubmit={handleSearchSubmit} className="mt-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${category.name.toLowerCase()}...`}
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" className="bg-gray-900 hover:bg-black text-white">
                    Search
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Filters sidebar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-medium">Filter Products</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-8">
                  {/* Price Range */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-sm font-semibold mb-4 text-gray-900">Price Range</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Min: KSh 0</div>
                        <div className="text-sm font-medium">Max: KSh 100,000</div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full relative">
                        <div className="absolute h-2 left-[20%] right-[30%] bg-gray-900 rounded-full"></div>
                        <div className="absolute w-4 h-4 bg-white border border-gray-300 rounded-full shadow-md left-[20%] top-1/2 -translate-y-1/2 cursor-pointer"></div>
                        <div className="absolute w-4 h-4 bg-white border border-gray-300 rounded-full shadow-md right-[30%] top-1/2 -translate-y-1/2 cursor-pointer"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Min Price</label>
                          <input
                            type="number"
                            className="w-full p-2 border border-gray-200 rounded-md text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Max Price</label>
                          <input
                            type="number"
                            className="w-full p-2 border border-gray-200 rounded-md text-sm"
                            placeholder="100,000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-sm font-semibold mb-4 text-gray-900">Colors</h3>
                    <div className="flex flex-wrap gap-3">
                      {[
                        "#000000",
                        "#ffffff",
                        "#0000ff",
                        "#ff0000",
                        "#ffff00",
                        "#00ff00",
                        "#ffa500",
                        "#800080",
                        "#a52a2a",
                        "#808080",
                        "#f5f5dc",
                      ].map((color, idx) => (
                        <button
                          key={idx}
                          className={`w-8 h-8 rounded-full ${color === "#ffffff" ? "border border-gray-200" : ""} transition-transform hover:scale-110 hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-gray-900`}
                          style={{ backgroundColor: color }}
                          aria-label={`Color ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-sm font-semibold mb-4 text-gray-900">Sizes</h3>
                    <div className="flex flex-wrap gap-2">
                      {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                        <button
                          key={size}
                          className="h-9 w-12 flex items-center justify-center rounded-md border border-gray-200 text-sm font-medium transition-all hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brands */}
                  <div className="border-b border-gray-100 pb-8">
                    <h3 className="text-sm font-semibold mb-4 text-gray-900">Brands</h3>
                    <div className="space-y-3">
                      {["Nike", "Adidas", "Puma", "Reebok", "Under Armour", "New Balance"].map((brand) => (
                        <div key={brand} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`brand-${brand}`}
                            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                          />
                          <label htmlFor={`brand-${brand}`} className="ml-2 text-sm text-gray-700">
                            {brand}
                          </label>
                        </div>
                      ))}
                      <button className="text-sm text-gray-500 mt-2 flex items-center">
                        View all brands
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Ratings */}
                  <div>
                    <h3 className="text-sm font-semibold mb-4 text-gray-900">Ratings</h3>
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`rating-${rating}`}
                            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                          />
                          <label htmlFor={`rating-${rating}`} className="ml-2 flex items-center text-sm text-gray-700">
                            {Array(rating)
                              .fill(0)
                              .map((_, i) => (
                                <svg
                                  key={i}
                                  className="h-4 w-4 text-yellow-400 fill-yellow-400"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                              ))}
                            {Array(5 - rating)
                              .fill(0)
                              .map((_, i) => (
                                <svg
                                  key={i}
                                  className="h-4 w-4 text-gray-300 fill-gray-300"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                              ))}
                            <span className="ml-1">& Up</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 pt-4 pb-4 bg-white border-t border-gray-100 mt-8">
                  <div className="flex gap-4">
                    <Button variant="outline" className="flex-1">
                      Reset All
                    </Button>
                    <Button className="flex-1 bg-gray-900 hover:bg-black text-white">Apply Filters</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      <div>
        {/* Compact Category Header (replacing the large banner) */}
        <div className="border-b border-gray-100">
          <div className="container mx-auto px-4">
            {/* Breadcrumb navigation */}
            <nav className="flex items-center text-sm text-gray-500 py-4">
              <Link href="/" className="flex items-center hover:text-gray-900 transition-colors">
                <Home className="h-3.5 w-3.5 mr-1" />
                <span>Home</span>
              </Link>
              <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-300" />
              {category.parent_id && (
                <>
                  <Link href="/categories" className="hover:text-gray-900 transition-colors">
                    Categories
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5 mx-2 text-gray-300" />
                </>
              )}
              <span className="font-medium text-gray-900">{category.name}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end justify-between py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{category.name}</h1>
                <p className="text-sm text-gray-500 max-w-2xl">
                  {category.description ||
                    `Stylish ${category.name.toLowerCase()} including bags, shoes, watches, and sunglasses`}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-4 md:mt-0">
                <div className="bg-gray-100 px-3 py-1.5 rounded-full">
                  <span className="text-sm font-medium text-gray-700">{productCount} Products</span>
                </div>
                {subcategories.length > 0 && (
                  <div className="bg-gray-100 px-3 py-1.5 rounded-full">
                    <span className="text-sm font-medium text-gray-700">{subcategories.length} Subcategories</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Featured Subcategories */}
          {featuredSubcategories.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-gray-700" />
                Featured Collections
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featuredSubcategories.map((subcat) => (
                  <Link href={`/category/${subcat.slug}`} key={subcat.id}>
                    <motion.div
                      className="group relative h-[180px] overflow-hidden rounded-lg"
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="absolute inset-0 bg-gray-200">
                        <Image
                          src={
                            subcat.image_url ||
                            `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(subcat.name) || "/placeholder.svg"}`
                          }
                          alt={subcat.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80"></div>

                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <Badge className="mb-2 bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                          {Math.floor(Math.random() * 50) + 10} Items
                        </Badge>
                        <h3 className="text-base font-medium text-white mb-1">{subcat.name}</h3>
                        <div className="flex items-center text-white/80 text-xs transition-colors group-hover:text-white">
                          <span className="mr-1">Explore Collection</span>
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Product Categories Grid */}
          {remainingSubcategories.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <Grid3X3 className="h-4 w-4 mr-2 text-gray-700" />
                  All Categories
                </h2>
                <Button variant="ghost" className="text-gray-500 hover:text-gray-900 text-sm">
                  View All Categories
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {remainingSubcategories.map((subcategory) => (
                  <Link href={`/category/${subcategory.slug}`} key={subcategory.id}>
                    <motion.div
                      className="group h-full bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all"
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="aspect-square relative overflow-hidden rounded-md mb-3 bg-white">
                        <Image
                          src={
                            subcategory.image_url ||
                            `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(subcategory.name.charAt(0)) || "/placeholder.svg"}`
                          }
                          alt={subcategory.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{subcategory.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{Math.floor(Math.random() * 100) + 5} products</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Popular Collections */}
          {relatedCategories.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-gray-700" />
                  Popular Collections
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedCategories.slice(0, 3).map((relatedCat, index) => (
                  <Link href={`/category/${relatedCat.slug}`} key={relatedCat.id} className="group">
                    <motion.div
                      className="relative overflow-hidden rounded-lg shadow-sm h-[220px]"
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Image
                        src={
                          relatedCat.image_url ||
                          `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(relatedCat.name) || "/placeholder.svg"}`
                        }
                        alt={relatedCat.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                      <div className="absolute inset-0 p-5 flex flex-col justify-end">
                        <h3 className="text-lg font-medium text-white mb-1">{relatedCat.name}</h3>
                        <p className="text-white/80 text-xs mb-3">
                          Explore our {relatedCat.name.toLowerCase()} collection
                        </p>
                        <div className="inline-block">
                          <span className="bg-white text-gray-900 px-4 py-1.5 text-xs font-medium rounded-full inline-flex items-center group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            Shop Now
                            <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Filter Bar with Sticky Positioning */}
          <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-white border-y border-gray-100 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </Button>

                <span className="text-sm font-medium text-gray-700 hidden md:inline-block">
                  {productCount} products
                </span>

                <div className="hidden md:flex items-center gap-3">
                  <Badge variant="secondary" className="bg-gray-50 hover:bg-gray-100">
                    New Arrivals
                    <button className="ml-1 text-gray-400 hover:text-gray-700">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>

                  <Badge variant="secondary" className="bg-gray-50 hover:bg-gray-100">
                    Under KSh 5,000
                    <button className="ml-1 text-gray-400 hover:text-gray-700">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center border border-gray-200 rounded-md">
                  <button
                    onClick={() => setGridView("compact")}
                    className={`p-1.5 ${
                      gridView === "compact" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700"
                    }`}
                    aria-label="Compact view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGridView("comfortable")}
                    className={`p-1.5 ${
                      gridView === "comfortable" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700"
                    }`}
                    aria-label="Comfortable view"
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSearch(true)}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </Button>

                <Select value={sortValue} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[140px] md:w-[180px] h-8 text-xs border-gray-200">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Sort by" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="newest">Newest Arrivals</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Customer Rating</SelectItem>
                    <SelectItem value="popularity">Popularity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <section>
            <Tabs defaultValue="all" onValueChange={setActiveTab} value={activeTab} className="mb-6">
              <div className="border-b border-gray-200">
                <TabsList className="flex -mb-px space-x-8">
                  <TabsTrigger
                    value="all"
                    className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  >
                    All Products
                  </TabsTrigger>
                  <TabsTrigger
                    value="new"
                    className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 flex items-center"
                  >
                    New Arrivals
                    <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">New</Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="bestsellers"
                    className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  >
                    Bestsellers
                  </TabsTrigger>
                  <TabsTrigger
                    value="sale"
                    className="pb-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 flex items-center"
                  >
                    On Sale
                    <Badge className="ml-2 bg-red-100 text-red-800 hover:bg-red-200 border-0">Sale</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="pt-8">
                <Suspense
                  fallback={
                    <div className="flex justify-center py-12">
                      <Loader />
                    </div>
                  }
                >
                  <ProductGrid categorySlug={slug} limit={24} />
                </Suspense>
              </TabsContent>

              <TabsContent value="new" className="pt-8">
                <Suspense
                  fallback={
                    <div className="flex justify-center py-12">
                      <Loader />
                    </div>
                  }
                >
                  <ProductGrid categorySlug={`${slug}?filter=new`} limit={24} />
                </Suspense>
              </TabsContent>

              <TabsContent value="bestsellers" className="pt-8">
                <Suspense
                  fallback={
                    <div className="flex justify-center py-12">
                      <Loader  />
                    </div>
                  }
                >
                  <ProductGrid categorySlug={`${slug}?filter=bestsellers`} limit={24} />
                </Suspense>
              </TabsContent>

              <TabsContent value="sale" className="pt-8">
                <Suspense
                  fallback={
                    <div className="flex justify-center py-12">
                      <Loader/>
                    </div>
                  }
                >
                  <ProductGrid categorySlug={`${slug}?filter=sale`} limit={24} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </section>

          {/* Shopping Benefits Section */}
          <section className="mt-24 mb-12 border-t border-gray-100 pt-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="flex items-start">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mr-4">
                  <ShoppingBag className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Free Delivery</h3>
                  <p className="text-sm text-gray-500 mt-1">On orders above KSh 5,000</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mr-4">
                  <CheckCircle2 className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Quality Guarantee</h3>
                  <p className="text-sm text-gray-500 mt-1">100% genuine products</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mr-4">
                  <Heart className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Customer Love</h3>
                  <p className="text-sm text-gray-500 mt-1">4.8/5 star rating</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mr-4">
                  <svg
                    className="h-6 w-6 text-gray-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 14L18 11M18 11L21 8M18 11H19.5C19.8978 11 20.2794 10.842 20.5607 10.5607C20.842 10.2794 21 9.89782 21 9.5C21 9.10218 20.842 8.72064 20.5607 8.43934C20.2794 8.15804 19.8978 8 19.5 8H18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.5 3.5C13.659 3.5 13 4.15901 13 5V19C13 19.841 13.659 20.5 14.5 20.5C15.341 20.5 16 19.841 16 19V5C16 4.15901 15.341 3.5 14.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 14L6 11M6 11L3 8M6 11H4.5C4.10218 11 3.72064 10.842 3.43934 10.5607C3.15804 10.2794 3 9.89782 3 9.5C3 9.10218 3.15804 8.72064 3.43934 8.43934C3.72064 8.15804 4.10218 8 4.5 8H6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 3.5C10.341 3.5 11 4.15901 11 5V19C11 19.841 10.341 20.5 9.5 20.5C8.65901 20.5 8 19.841 8 19V5C8 4.15901 8.65901 3.5 9.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Easy Returns</h3>
                  <p className="text-sm text-gray-500 mt-1">30-day return policy</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-8 right-8 z-40 h-12 w-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-black transition-colors"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}