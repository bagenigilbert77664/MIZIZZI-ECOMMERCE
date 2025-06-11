"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Crown, Search, X, Heart, Sparkles, Award, Gem, Star } from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { cn } from "@/lib/utils"
import { cloudinaryService } from "@/services/cloudinary-service"
import { useInView } from "react-intersection-observer"
import { useDebounce } from "@/hooks/use-debounce"

// Apple-inspired animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

// Luxury hero carousel items with Apple-style gradients
const luxuryHeroItems = [
  {
    id: 1,
    title: "EXCLUSIVE COLLECTION",
    subtitle: "Handcrafted Excellence",
    description: "Discover our most prestigious pieces",
    gradient: "from-amber-900 via-amber-800 to-amber-900",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=80",
    accent: "text-amber-200",
  },
  {
    id: 2,
    title: "PREMIUM ARTISTRY",
    subtitle: "Timeless Elegance",
    description: "Where luxury meets innovation",
    gradient: "from-slate-900 via-slate-800 to-slate-900",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&q=80",
    accent: "text-slate-200",
  },
  {
    id: 3,
    title: "SIGNATURE SERIES",
    subtitle: "Unparalleled Quality",
    description: "For the most discerning collectors",
    gradient: "from-emerald-900 via-emerald-800 to-emerald-900",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    accent: "text-emerald-200",
  },
]

// Luxury stats data
const luxuryStats = [
  {
    icon: Crown,
    label: "Premium Items",
    value: "500+",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    icon: Award,
    label: "Exclusive Brands",
    value: "50+",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: Gem,
    label: "Handcrafted",
    value: "100%",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    icon: Star,
    label: "Customer Rating",
    value: "4.9★",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
]

// Enhanced Product Card with luxury styling
const LuxuryProductCard = React.memo(({ product, index }: { product: Product; index: number }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const price = typeof product.price === "number" ? product.price : 0
  const salePrice = typeof product.sale_price === "number" ? product.sale_price : null
  const discount = salePrice ? Math.round(((price - salePrice) / price) * 100) : 0
  const isOnSale = salePrice && salePrice < price

  const imageUrl = product.image_urls?.[0] || product.thumbnail_url || "/placeholder.svg"
  const processedImageUrl =
    typeof imageUrl === "string" && !imageUrl.startsWith("http")
      ? cloudinaryService.generateOptimizedUrl(imageUrl)
      : imageUrl

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsWishlisted(!isWishlisted)
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{ delay: index * 0.05 }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      whileHover={{ y: -4 }}
      className="group h-full"
    >
      <Card className="h-full overflow-hidden border-0 bg-white shadow-sm hover:shadow-lg transition-all duration-300 ease-out">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Crown className="h-6 w-6 text-amber-500" />
              </motion.div>
            </div>
          )}

          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{
              opacity: imageLoaded ? 1 : 0,
              scale: imageLoaded ? (isHovering ? 1.03 : 1) : 1.1,
            }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={processedImageUrl || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-transform duration-700"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxuczpsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY3IiAvPjwvc3ZnPg=="
            />
          </motion.div>

          {/* Luxury badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1 z-20">
            {isOnSale && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#1d1d1f] text-white px-2 py-1 text-[10px] font-medium rounded-full"
              >
                -{discount}%
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-1 text-[10px] font-medium rounded-full flex items-center gap-1"
            >
              <Crown className="h-2.5 w-2.5" />
              LUXURY
            </motion.div>
          </div>

          {/* Wishlist button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={toggleWishlist}
            className={cn(
              "absolute right-2 top-2 rounded-full p-2 transition-all duration-200 backdrop-blur-sm z-20",
              isWishlisted ? "bg-red-500 text-white" : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500",
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", isWishlisted && "fill-white")} />
          </motion.button>

          {/* Hover overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovering ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10"
          />
        </div>

        <CardContent className="p-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h3 className="line-clamp-2 text-sm font-medium leading-tight text-[#1d1d1f]">{product.name}</h3>

            <div className="space-y-1">
              <div className="text-base font-semibold text-[#1d1d1f]">KSh {(salePrice || price).toLocaleString()}</div>
              {isOnSale && <div className="text-sm text-gray-500 line-through">KSh {price.toLocaleString()}</div>}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500">In Stock</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Sparkles className="h-3 w-3" />
                <span>Premium</span>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

LuxuryProductCard.displayName = "LuxuryProductCard"

// Loading skeleton component
const LuxuryPageSkeleton = () => (
  <div className="min-h-screen bg-[#fbfbfd]">
    <div className="container mx-auto px-4 py-6">
      {/* Hero skeleton */}
      <div className="h-48 bg-gray-200 rounded-2xl mb-6 animate-pulse"></div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
        ))}
      </div>

      {/* Products skeleton */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-3">
            <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-3 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default function LuxuryPage() {
  const [luxuryProducts, setLuxuryProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"price" | "name">("price")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [wishlist, setWishlist] = useState<number[]>([])

  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 })

  // Fetch luxury products
  const fetchLuxuryProducts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true)
      setError(null)

      const products = await productService.getLuxuryDealProducts()
      const processedProducts = products.map((product) => ({
        ...product,
        image_urls: (product.image_urls || []).map((url) => {
          if (typeof url === "string" && !url.startsWith("http")) {
            return cloudinaryService.generateOptimizedUrl(url)
          }
          return url
        }),
      }))

      if (reset || pageNum === 1) {
        setLuxuryProducts(processedProducts)
      } else {
        setLuxuryProducts((prev) => [...prev, ...processedProducts])
      }

      setHasMore(processedProducts.length === 20) // Assuming 20 items per page
    } catch (error) {
      console.error("Error fetching luxury products:", error)
      setError("Failed to load luxury collection. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchLuxuryProducts(1, true)

    const savedWishlist = localStorage.getItem("wishlist")
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (e) {
        console.error("Error parsing wishlist:", e)
      }
    }
  }, [fetchLuxuryProducts])

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loading) {
      setPage((prev) => prev + 1)
      fetchLuxuryProducts(page + 1, false)
    }
  }, [inView, hasMore, loading, page, fetchLuxuryProducts])

  // Hero carousel auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % luxuryHeroItems.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter and sort products
  const filteredAndSortedProducts = React.useMemo(() => {
    const filtered = luxuryProducts.filter((product) =>
      product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
    )

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price":
          const priceA = a.sale_price || a.price
          const priceB = b.sale_price || b.price
          return sortOrder === "asc" ? priceA - priceB : priceB - priceA
        case "name":
          return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        default:
          return 0
      }
    })

    return filtered
  }, [luxuryProducts, debouncedSearchQuery, sortBy, sortOrder])

  if (loading && luxuryProducts.length === 0) {
    return <LuxuryPageSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Luxury Collection</span>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="relative h-48 mb-6 overflow-hidden rounded-2xl"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={luxuryHeroItems[currentSlide].image || "/placeholder.svg"}
                alt={luxuryHeroItems[currentSlide].title}
                fill
                className="object-cover"
                priority
              />
              <div
                className={`absolute inset-0 bg-gradient-to-r ${luxuryHeroItems[currentSlide].gradient} bg-opacity-80`}
              />

              <div className="absolute inset-0 flex items-center justify-center text-center text-white p-6">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <motion.div
                    className="flex items-center justify-center mb-2"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  >
                    <Crown className="h-8 w-8 text-amber-300 mr-2" />
                    <h1 className="text-lg font-bold tracking-wider">{luxuryHeroItems[currentSlide].title}</h1>
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">{luxuryHeroItems[currentSlide].subtitle}</h2>
                  <p className={`text-sm ${luxuryHeroItems[currentSlide].accent}`}>
                    {luxuryHeroItems[currentSlide].description}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {luxuryHeroItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentSlide ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        </motion.section>

        {/* Stats Section */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {luxuryStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={scaleIn}
              whileHover={{ scale: 1.02 }}
              className={cn("p-4 rounded-xl border border-gray-100 bg-white shadow-sm", stat.bgColor)}
            >
              <div className="flex items-center space-x-3">
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-600">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.section>

        {/* Search and Sort Controls */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search luxury collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 border-gray-200 focus:border-amber-500 focus:ring-amber-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "price" | "name")}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:ring-amber-500"
              >
                <option value="price">Price</option>
                <option value="name">Name</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3 border-gray-200 hover:border-amber-500"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Products Grid */}
        <motion.section initial="hidden" animate="visible" variants={staggerContainer}>
          {error ? (
            <motion.div variants={fadeInUp} className="text-center py-12">
              <div className="bg-red-50 p-6 rounded-xl max-w-md mx-auto">
                <Crown className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">Oops! Something went wrong</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <Button onClick={() => fetchLuxuryProducts(1, true)} className="bg-red-600 hover:bg-red-700">
                  Try Again
                </Button>
              </div>
            </motion.div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <motion.div variants={fadeInUp} className="text-center py-12">
              <div className="bg-amber-50 p-6 rounded-xl max-w-md mx-auto">
                <Crown className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-amber-900 mb-2">No luxury items found</h3>
                <p className="text-amber-700 mb-4">
                  {searchQuery ? `No results for "${searchQuery}"` : "Our luxury collection is being curated"}
                </p>
                {searchQuery && (
                  <Button
                    onClick={() => setSearchQuery("")}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredAndSortedProducts.map((product, index) => (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <LuxuryProductCard product={product} index={index} />
                  </Link>
                ))}
              </div>

              {/* Load More Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Crown className="h-6 w-6 text-amber-500" />
                  </motion.div>
                </div>
              )}
            </>
          )}
        </motion.section>
      </div>
    </div>
  )
}
