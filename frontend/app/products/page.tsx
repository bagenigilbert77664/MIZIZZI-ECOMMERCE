
"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion"
import {
  Search,
  X,
  Heart,
  Eye,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  List,
  ChevronRight,
  Home,
  Star,
  Filter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { productService } from "@/services/product"
import { categoryService, type Category } from "@/services/category"
import type { Product, Review } from "@/types"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { ProductSort } from "@/components/products/product-sort"
import { Loader } from "@/components/ui/loader"

export default function ProductsPage() {
  // State for products and filtering
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productReviews, setProductReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [wishlist, setWishlist] = useState<number[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const isMobile = useMediaQuery("(max-width: 768px)")
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Scroll progress for animations
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  // Fetch categories - optimized with useCallback
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      const fetchedCategories = await categoryService.getCategories({ parent_id: null })
      setCategories(fetchedCategories)
    } catch (err) {
      console.error("Error fetching categories:", err)
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  // Fetch initial products - optimized with useCallback
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setInitialLoading(true)

      const fetchedProducts = await productService.getProducts({ limit: 24 })
      setProducts(fetchedProducts)
      setFilteredProducts(fetchedProducts)
      setHasMore(fetchedProducts.length >= 24)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError("Failed to load products")
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [])

  // Fetch product reviews
  const fetchProductReviews = useCallback(async (productId: number) => {
    if (!productId) return

    try {
      setLoadingReviews(true)
      const reviews = await fetch(`/api/products/${productId}/reviews`).then((res) => res.json())
      setProductReviews(reviews)
    } catch (err) {
      console.error("Error fetching product reviews:", err)
    } finally {
      setLoadingReviews(false)
    }
  }, [])

  // Initial data fetching
  useEffect(() => {
    fetchCategories()
    fetchProducts()

    // Load wishlist from localStorage
    const savedWishlist = localStorage.getItem("wishlist")
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (e) {
        console.error("Error parsing wishlist from localStorage:", e)
      }
    }
  }, [fetchCategories, fetchProducts])

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (loadMoreRef.current && !initialLoading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMoreProducts()
          }
        },
        { threshold: 0.1 },
      )

      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadingMore, initialLoading])

  // Filter products based on search, categories, and price
  useEffect(() => {
    if (loading) return

    let filtered = [...products]

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description && product.description.toLowerCase().includes(query)) ||
          (product.category_id && product.category_id.toString().toLowerCase().includes(query)),
      )
    }

    // Apply category filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => selectedCategories.includes(Number(product.category_id)))
    }

    // Apply price range filter
    filtered = filtered.filter((product) => {
      const price = product.sale_price || product.price
      return price >= priceRange[0] && price <= priceRange[1]
    })

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return (a.sale_price || a.price) - (b.sale_price || b.price)
        case "price-desc":
          return (b.sale_price || b.price) - (a.sale_price || a.price)
        case "discount":
          const discountA = a.sale_price ? (a.price - a.sale_price) / a.price : 0
          const discountB = b.sale_price ? (b.price - b.sale_price) / b.price : 0
          return discountB - discountA
        case "newest":
        default:
          return b.id - a.id
      }
    })

    setFilteredProducts(filtered)

    // Update active filters
    const newActiveFilters: string[] = []
    if (debouncedSearchQuery) newActiveFilters.push(`Search: ${debouncedSearchQuery}`)
    if (selectedCategories.length > 0) {
      newActiveFilters.push(`Categories: ${selectedCategories.length} selected`)
    }
    if (priceRange[0] > 0 || priceRange[1] < 1000000) {
      newActiveFilters.push(`Price: KSh ${priceRange[0].toLocaleString()} - KSh ${priceRange[1].toLocaleString()}`)
    }

    setActiveFilters(newActiveFilters)
  }, [debouncedSearchQuery, products, selectedCategories, priceRange, sortBy, loading])

  // Save wishlist to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist))
  }, [wishlist])

  // Load more products function
  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1

      const moreProducts = await productService.getProducts({
        page: nextPage,
        limit: 12,
      })

      if (moreProducts.length === 0) {
        setHasMore(false)
      } else {
        setProducts((prev) => [...prev, ...moreProducts])
        setPage(nextPage)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Toggle category selection
  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  // Toggle wishlist
  const toggleWishlist = (productId: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
  }

  // Open quick view modal
  const openQuickView = async (product: Product, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    setSelectedProduct(product)
    setActiveImageIndex(0)
    setQuickViewOpen(true)

    // Fetch reviews for the selected product
    await fetchProductReviews(product.id)
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedCategories([])
    setPriceRange([0, 1000000])
    setSortBy("newest")
  }

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Calculate average rating
  const calculateAverageRating = (reviews: Review[]) => {
    if (!reviews || reviews.length === 0) return 0
    const sum = reviews.reduce((total, review) => total + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  // Render error state
  if (error) {
    return (
      <div className="container py-8 bg-white">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">All Products</h1>
        </div>
        <motion.div
          className="rounded-lg border border-red-100 bg-red-50 p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4 bg-cherry-600 hover:bg-cherry-700">
            Try Again
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container py-8 bg-white">
      {/* Progress bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-cherry-600 z-50 origin-left" style={{ scaleX }} />

      {/* Breadcrumb navigation */}
      <nav className="mb-6 flex items-center text-sm text-gray-500">
        <Link href="/" className="flex items-center hover:text-cherry-600 transition-colors">
          <Home className="mr-1 h-3.5 w-3.5" />
          <span>Home</span>
        </Link>
        <ChevronRight className="mx-2 h-3.5 w-3.5" />
        <span className="font-medium text-gray-900">All Products</span>
      </nav>

      {/* Header with search and view toggles */}
      <motion.div
        ref={headerRef}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
          <p className="text-sm text-gray-500">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              className="pl-9 pr-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-gray-200 sm:hidden"
                aria-label="Filter products"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-white">
              <SheetHeader className="mb-5">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* Mobile sort options */}
                <div>
                  <h3 className="mb-3 text-sm font-medium">Sort By</h3>
                  <ProductSort value={sortBy} onValueChange={setSortBy} />
                </div>

                <Separator className="my-4" />

                {/* Mobile price range filter */}
                <div>
                  <h3 className="mb-3 text-sm font-medium text-gray-800">Price Range</h3>
                  <div className="px-1">
                    <Slider
                      min={0}
                      max={1000000}
                      step={5000}
                      value={priceRange}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      className="py-4"
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="relative rounded-md shadow-sm">
                      <span className="absolute inset-y-0 left-2 flex items-center text-xs text-gray-500">KSh</span>
                      <input
                        type="text"
                        value={priceRange[0].toLocaleString()}
                        readOnly
                        className="block w-full rounded-md border-gray-200 pl-10 pr-2 py-1.5 text-xs focus:border-cherry-600 focus:ring-cherry-600"
                      />
                    </div>
                    <div className="relative rounded-md shadow-sm">
                      <span className="absolute inset-y-0 left-2 flex items-center text-xs text-gray-500">KSh</span>
                      <input
                        type="text"
                        value={priceRange[1].toLocaleString()}
                        readOnly
                        className="block w-full rounded-md border-gray-200 pl-10 pr-2 py-1.5 text-xs focus:border-cherry-600 focus:ring-cherry-600"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Mobile category filter */}
                <div>
                  <h3 className="mb-3 text-sm font-medium">Categories</h3>
                  {loadingCategories ? (
                    <div className="flex justify-center py-4">
                      <Loader />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`mobile-category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => toggleCategory(category.id)}
                            className="h-4 w-4 rounded border-gray-300 text-cherry-600 focus:ring-cherry-600"
                          />
                          <label htmlFor={`mobile-category-${category.id}`} className="ml-2 text-sm text-gray-700">
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset All
                  </Button>
                  <SheetClose asChild>
                    <Button size="sm" className="bg-cherry-600 hover:bg-cherry-700">
                      Apply Filters
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              className={cn("h-10 w-10 border-gray-200", viewMode === "grid" && "bg-cherry-600 hover:bg-cherry-700")}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>

            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              className={cn("h-10 w-10 border-gray-200", viewMode === "list" && "bg-cherry-600 hover:bg-cherry-700")}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Sort bar */}
      <motion.div
        className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Sort By:</span>
            <ProductSort value={sortBy} onValueChange={setSortBy} />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex items-center gap-0 border border-gray-200 rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 rounded-none px-3 border-r border-gray-200 transition-colors",
                  viewMode === "grid" && "bg-gray-100 text-cherry-900 font-medium",
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 rounded-none px-3 transition-colors",
                  viewMode === "list" && "bg-gray-100 text-cherry-900 font-medium",
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active filters */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div
            className="mb-6 flex flex-wrap items-center gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeFilters.map((filter, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 rounded-full border-gray-200 px-3 py-1 text-xs"
                >
                  {filter}
                  <button onClick={resetFilters} className="ml-1 rounded-full hover:bg-gray-100">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs text-gray-500 hover:text-gray-700"
              >
                Clear All
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Desktop sidebar filters */}
        <motion.div
          className="hidden w-64 shrink-0 md:block"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="rounded-lg border border-gray-200 bg-white p-5 sticky top-4 shadow-sm">
            <div>
              <h3 className="mb-3 text-base font-medium text-gray-900">Filter Products</h3>
              <Separator className="my-4" />
            </div>

            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-gray-800">Price Range</h3>
              <div className="px-1">
                <Slider
                  min={0}
                  max={1000000}
                  step={5000}
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  className="py-4"
                />
              </div>
              <div className="mt-3 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="relative rounded-md shadow-sm">
                  <span className="absolute inset-y-0 left-2 flex items-center text-xs text-gray-500">KSh</span>
                  <input
                    type="text"
                    value={priceRange[0].toLocaleString()}
                    readOnly
                    className="block w-full rounded-md border-gray-200 pl-10 pr-2 py-1.5 text-xs focus:border-cherry-600 focus:ring-cherry-600"
                  />
                </div>
                <span className="hidden text-gray-400 sm:block">—</span>
                <div className="relative rounded-md shadow-sm">
                  <span className="absolute inset-y-0 left-2 flex items-center text-xs text-gray-500">KSh</span>
                  <input
                    type="text"
                    value={priceRange[1].toLocaleString()}
                    readOnly
                    className="block w-full rounded-md border-gray-200 pl-10 pr-2 py-1.5 text-xs focus:border-cherry-600 focus:ring-cherry-600"
                  />
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-800">Categories</h3>
              {loadingCategories ? (
                <div className="flex justify-center py-4">
                  <Loader />
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  {categories.map((category) => (
                    <motion.div
                      key={category.id}
                      className="flex items-center"
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input
                        type="checkbox"
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="h-4 w-4 rounded border-gray-300 text-cherry-600 focus:ring-cherry-600"
                      />
                      <label
                        htmlFor={`category-${category.id}`}
                        className="ml-2 text-sm text-gray-700 hover:text-cherry-600 cursor-pointer transition-colors"
                      >
                        {category.name}
                      </label>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <Button variant="outline" size="sm" onClick={resetFilters} className="w-full hover:bg-gray-50">
              Reset All Filters
            </Button>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="flex-1">
          {filteredProducts.length === 0 ? (
            <motion.div
              className="rounded-lg border border-gray-200 bg-white p-8 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium">No products found</h3>
              <p className="mb-4 text-gray-500">We couldn't find any products matching your criteria.</p>
              <Button onClick={resetFilters} className="bg-cherry-600 hover:bg-cherry-700">
                Reset Filters
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Grid view */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {initialLoading ? (
                    // Skeleton cards that match the product card layout
                    <>
                      {[...Array(12)].map((_, index) => (
                        <motion.div
                          key={`skeleton-${index}`}
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
                          className="overflow-hidden rounded-lg border border-gray-100 bg-white"
                        >
                          <div className="relative aspect-square bg-gray-100"></div>
                          <div className="p-3">
                            <div className="mb-1">
                              <div className="h-4 w-16 rounded-sm bg-gray-100"></div>
                            </div>
                            <div className="mb-1 h-10">
                              <div className="h-4 w-full rounded-sm bg-gray-100"></div>
                              <div className="mt-1 h-4 w-2/3 rounded-sm bg-gray-100"></div>
                            </div>
                            <div className="mt-2">
                              <div className="h-5 w-20 rounded-sm bg-gray-100"></div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((product, index) => (
                        <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3, delay: (index % 10) * 0.05 }}
                          whileHover={{ y: -5 }}
                        >
                          <Link href={`/product/${product.id}`}>
                            <Card className="group relative h-full overflow-hidden rounded-md border border-gray-100 bg-white transition-all duration-200 hover:shadow-md active:scale-[0.98]">
                              <div className="relative aspect-square overflow-hidden bg-gray-50">
                                <Image
                                  src={
                                    (product.image_urls && product.image_urls[0]) ||
                                    product.thumbnail_url ||
                                    "/placeholder.svg"
                                  }
                                  alt={product.name}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />

                                {/* Discount badge */}
                                {product.sale_price && product.sale_price < product.price && (
                                  <motion.div
                                    className="absolute left-0 top-0 bg-cherry-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                  >
                                    {calculateDiscount(product.price, product.sale_price)}% OFF
                                  </motion.div>
                                )}

                                {/* Quick actions */}
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100">
                                  <div className="flex gap-2">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8 rounded-full bg-white text-cherry-600 hover:bg-white/90 backdrop-blur-sm"
                                      onClick={(e) => openQuickView(product, e)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className={cn(
                                        "h-8 w-8 rounded-full bg-white text-cherry-600 hover:bg-white/90 backdrop-blur-sm",
                                        wishlist.includes(product.id) && "text-red-500",
                                      )}
                                      onClick={(e) => toggleWishlist(product.id, e)}
                                    >
                                      <Heart
                                        className={cn("h-3.5 w-3.5", wishlist.includes(product.id) && "fill-red-500")}
                                      />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <CardContent className="p-3">
                                <div className="mb-1 flex justify-between items-center">
                                  <span className="inline-block rounded-sm bg-gray-50 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                                    {typeof product.category === "object" && product.category
                                      ? product.category.name
                                      : product.category || product.category_id}
                                  </span>

                                  {/* Star rating - if product has reviews */}
                                  {product.reviews && product.reviews.length > 0 && (
                                    <div className="flex items-center">
                                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                      <span className="ml-1 text-[10px] text-gray-600">
                                        {calculateAverageRating(product.reviews)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <h3 className="mb-1 line-clamp-2 min-h-[2.25rem] text-xs font-medium leading-tight text-gray-800 transition-colors group-hover:text-cherry-900">
                                  {product.name}
                                </h3>

                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm font-semibold text-cherry-900">
                                    KSh {(product.sale_price || product.price).toLocaleString()}
                                  </span>
                                  {product.sale_price && product.sale_price < product.price && (
                                    <span className="text-[10px] text-gray-500 line-through">
                                      KSh {product.price.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              )}

              {/* List view */}
              {viewMode === "list" && (
                <div className="space-y-4">
                  {initialLoading ? (
                    // Skeleton cards for list view
                    <>
                      {[...Array(6)].map((_, index) => (
                        <motion.div
                          key={`skeleton-list-${index}`}
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
                          className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                        >
                          <div className="flex flex-col sm:flex-row">
                            <div className="relative h-48 w-full sm:h-auto sm:w-48 md:w-64 bg-gray-100"></div>
                            <div className="flex flex-1 flex-col p-4">
                              <div className="mb-1">
                                <div className="h-4 w-16 rounded-sm bg-gray-100"></div>
                              </div>
                              <div className="mb-2 h-6 w-3/4 rounded-sm bg-gray-100"></div>
                              <div className="mb-4 h-12 w-full rounded-sm bg-gray-100"></div>
                              <div className="mt-auto flex items-center justify-between">
                                <div className="h-6 w-24 rounded-sm bg-gray-100"></div>
                                <div className="flex gap-2">
                                  <div className="h-8 w-24 rounded-full bg-gray-100"></div>
                                  <div className="h-8 w-8 rounded-full bg-gray-100"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((product, index) => (
                        <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3, delay: (index % 10) * 0.05 }}
                          whileHover={{ y: -3 }}
                        >
                          <Link href={`/product/${product.id}`}>
                            <Card className="group overflow-hidden rounded-lg border-gray-200 bg-white transition-all duration-200 hover:shadow-md">
                              <div className="flex flex-col sm:flex-row">
                                <div className="relative h-48 w-full sm:h-auto sm:w-48 md:w-64">
                                  <Image
                                    src={
                                      (product.image_urls && product.image_urls[0]) ||
                                      product.thumbnail_url ||
                                      "/placeholder.svg"
                                    }
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 33vw, 25vw"
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />

                                  {/* Discount badge */}
                                  {product.sale_price && product.sale_price < product.price && (
                                    <div className="absolute left-0 top-0 bg-cherry-600 px-2 py-1 text-xs font-semibold text-white">
                                      {calculateDiscount(product.price, product.sale_price)}% OFF
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-1 flex-col p-4">
                                  <div className="mb-1 flex justify-between items-center">
                                    <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                      {typeof product.category === "object" && product.category
                                        ? product.category.name
                                        : product.category || product.category_id}
                                    </span>

                                    {/* Star rating - if product has reviews */}
                                    {product.reviews && product.reviews.length > 0 && (
                                      <div className="flex items-center">
                                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                        <span className="ml-1 text-xs text-gray-600">
                                          {calculateAverageRating(product.reviews)} ({product.reviews.length})
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <h3 className="mb-2 text-base font-medium text-gray-800 transition-colors group-hover:text-cherry-900">
                                    {product.name}
                                  </h3>

                                  <p className="mb-4 line-clamp-2 text-sm text-gray-500">
                                    {product.description || "Premium quality product from Mizizzi collection."}
                                  </p>

                                  <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-lg font-semibold text-cherry-900">
                                        KSh {(product.sale_price || product.price).toLocaleString()}
                                      </span>
                                      {product.sale_price && product.sale_price < product.price && (
                                        <span className="text-sm text-gray-500 line-through">
                                          KSh {product.price.toLocaleString()}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-full border-gray-200"
                                        onClick={(e) => openQuickView(product, e)}
                                      >
                                        <Eye className="mr-1 h-4 w-4" />
                                        Quick View
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className={cn(
                                          "h-8 w-8 rounded-full border-gray-200",
                                          wishlist.includes(product.id) && "text-red-500",
                                        )}
                                        onClick={(e) => toggleWishlist(product.id, e)}
                                      >
                                        <Heart
                                          className={cn("h-4 w-4", wishlist.includes(product.id) && "fill-red-500")}
                                        />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              )}

              {/* Load more indicator */}
              {hasMore && (
                <div ref={loadMoreRef} className="mt-8 flex items-center justify-center py-4">
                  {loadingMore ? (
                    <motion.div
                      className="flex items-center gap-2 text-sm text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-cherry-600"></div>
                      <span>Loading more products...</span>
                    </motion.div>
                  ) : (
                    <div className="h-8 w-full max-w-sm rounded-full bg-gray-100"></div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick view modal */}
      <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <DialogContent className="max-w-3xl p-0 sm:p-6 bg-white">
          {selectedProduct && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Product images */}
              <div className="relative bg-white">
                <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                  <Image
                    src={
                      (selectedProduct.image_urls && selectedProduct.image_urls[activeImageIndex]) ||
                      selectedProduct.thumbnail_url ||
                      "/placeholder.svg"
                    }
                    alt={selectedProduct.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </div>

                {/* Image thumbnails */}
                {selectedProduct.image_urls && selectedProduct.image_urls.length > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-gray-200"
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev === 0 ? selectedProduct.image_urls!.length - 1 : prev - 1))
                      }
                      aria-label="Previous image"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
                      {selectedProduct.image_urls.map((image, index) => (
                        <motion.button
                          key={index}
                          className={cn(
                            "h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all",
                            activeImageIndex === index ? "border-cherry-600" : "border-transparent",
                          )}
                          onClick={() => setActiveImageIndex(index)}
                          aria-label={`View image ${index + 1}`}
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="relative h-full w-full">
                            <Image
                              src={image || "/placeholder.svg"}
                              alt={`${selectedProduct.name} - Image ${index + 1}`}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-gray-200"
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev === selectedProduct.image_urls!.length - 1 ? 0 : prev + 1))
                      }
                      aria-label="Next image"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Product details */}
              <div className="flex flex-col p-4 sm:p-0">
                <DialogHeader className="mb-4">
                  <div className="mb-1 flex justify-between items-center">
                    <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      {typeof selectedProduct.category === "object" && selectedProduct.category
                        ? selectedProduct.category.name
                        : selectedProduct.category || selectedProduct.category_id}
                    </span>

                    {/* Reviews count */}
                    {productReviews && productReviews.length > 0 && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="ml-1 text-xs text-gray-600">
                          {calculateAverageRating(productReviews)} ({productReviews.length} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                  <DialogTitle className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {selectedProduct.name}
                  </DialogTitle>
                </DialogHeader>

                <p className="mt-2 text-sm text-gray-500 mb-4">
                  {selectedProduct.description || "Premium quality product from Mizizzi collection."}
                </p>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-cherry-900 sm:text-3xl">
                    KSh {(selectedProduct.sale_price || selectedProduct.price).toLocaleString()}
                  </span>
                  {selectedProduct.sale_price && selectedProduct.sale_price < selectedProduct.price && (
                    <span className="text-base text-gray-500 line-through">
                      KSh {selectedProduct.price.toLocaleString()}
                    </span>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Availability</span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        selectedProduct.stock > 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {selectedProduct.stock > 0 ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  {selectedProduct.stock > 0 && selectedProduct.stock < 10 && (
                    <div className="rounded-md bg-amber-50 p-2 text-center text-sm text-amber-800">
                      Only {selectedProduct.stock} items left in stock!
                    </div>
                  )}
                </div>

                {/* Reviews section */}
                {productReviews && productReviews.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Customer Reviews</h4>
                    <div className="max-h-[150px] overflow-y-auto pr-2 space-y-3">
                      {productReviews.slice(0, 2).map((review, index) => (
                        <motion.div
                          key={index}
                          className="border-b border-gray-100 pb-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "h-3 w-3",
                                      i < review.rating ? "text-amber-400 fill-amber-400" : "text-gray-300",
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="ml-2 text-xs font-medium">{review.reviewer_name}</span>
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {review.date ? new Date(review.date as string).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600 line-clamp-2">{review.comment}</p>
                        </motion.div>
                      ))}
                    </div>
                    {productReviews.length > 2 && (
                      <Link
                        href={`/product/${selectedProduct.id}`}
                        className="text-xs text-cherry-600 hover:underline mt-2 inline-block"
                      >
                        View all {productReviews.length} reviews
                      </Link>
                    )}
                  </div>
                )}

                <div className="mt-auto space-y-4 pt-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Link href={`/product/${selectedProduct.id}`} className="block w-full">
                      <Button className="w-full bg-cherry-600 hover:bg-cherry-700">View Full Details</Button>
                    </Link>

                    <Button
                      variant="outline"
                      className="w-full border-gray-200"
                      onClick={() => toggleWishlist(selectedProduct.id)}
                    >
                      <Heart
                        className={cn(
                          "mr-2 h-4 w-4",
                          wishlist.includes(selectedProduct.id) && "fill-red-500 text-red-500",
                        )}
                      />
                      {wishlist.includes(selectedProduct.id) ? "Saved" : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
