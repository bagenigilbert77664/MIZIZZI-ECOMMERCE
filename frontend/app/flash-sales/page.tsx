"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Clock,
  ArrowUpDown,
  Zap,
  ShoppingBag,
  Search,
  X,
  Heart,
  Home,
  ChevronRight,
  Flame,
  Timer,
  Target,
  Users,
  TrendingUp,
} from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useDebounce } from "@/hooks/use-debounce"
import { Skeleton } from "@/components/ui/skeleton"

// Compact Apple-inspired hero banners
const flashSaleHeroBanners = [
  {
    id: 1,
    title: "Flash Sale",
    subtitle: "Up to 70% off",
    description: "Limited time offers",
    gradient: "from-[#1d1d1f] via-[#2d2d30] to-[#1d1d1f]",
    accentColor: "from-[#ff6b35] to-[#f7931e]",
    textColor: "text-white",
  },
  {
    id: 2,
    title: "Today Only",
    subtitle: "Save big",
    description: "Deals that won't last",
    gradient: "from-[#667eea] via-[#764ba2] to-[#667eea]",
    accentColor: "from-[#ff9a9e] to-[#fecfef]",
    textColor: "text-white",
  },
  {
    id: 3,
    title: "Final Hours",
    subtitle: "Last chance",
    description: "Ends at midnight",
    gradient: "from-[#ff6b6b] via-[#ee5a24] to-[#ff6b6b]",
    accentColor: "from-[#ffecd2] to-[#fcb69f]",
    textColor: "text-white",
  },
]

// Compact Product Card Component
const FlashSaleProductCard = memo(({ product }: { product: Product }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [wishlist, setWishlist] = useState<number[]>([])

  const price = typeof product.price === "number" ? product.price : 0
  const salePrice = typeof product.sale_price === "number" ? product.sale_price : null
  const discount = calculateDiscount(price, salePrice)
  const isOnSale = salePrice && salePrice < price

  const handleImageLoad = () => setImageLoaded(true)
  const handleImageError = () => setImageError(true)

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [product.id])

  useEffect(() => {
    const savedWishlist = localStorage.getItem("wishlist")
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (e) {
        console.error("Error parsing wishlist from localStorage:", e)
      }
    }
  }, [])

  const toggleWishlist = (productId: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setWishlist((prev) => {
      const newWishlist = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      localStorage.setItem("wishlist", JSON.stringify(newWishlist))
      return newWishlist
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Link href={`/product/${product.id}`} prefetch={false} className="block h-full">
        <div className="group h-full overflow-hidden bg-white transition-all duration-300 ease-out">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
            <motion.div
              animate={{ scale: isHovering ? 1.02 : 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={(product.image_urls && product.image_urls[0]) || product.thumbnail_url || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                className={`object-cover transition-opacity duration-700 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />

              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin"></div>
                </div>
              )}

              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="text-center">
                    <div className="text-gray-400 mb-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 8V12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 16H12.01"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500">Image not available</span>
                  </div>
                </div>
              )}
            </motion.div>

            {isOnSale && (
              <div className="absolute left-2 top-2 rounded-full bg-[#ff3b30] px-2 py-0.5 text-[10px] font-medium text-white">
                -{discount}%
              </div>
            )}

            {product.stock && product.stock < 10 && (
              <div className="absolute right-2 top-2 rounded-full bg-[#ff9500] px-2 py-0.5 text-[10px] font-medium text-white">
                Only {product.stock} left
              </div>
            )}

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isHovering ? 1 : 0.7,
                scale: isHovering ? 1.1 : 1,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => toggleWishlist(Number(product.id), e)}
              className={cn(
                "absolute right-2 bottom-2 rounded-full p-1.5 transition-all duration-300 backdrop-blur-md shadow-sm",
                wishlist.includes(Number(product.id))
                  ? "bg-[#ff3b30]/90 text-white"
                  : "bg-white/90 text-gray-600 hover:bg-white hover:text-[#ff3b30]",
              )}
            >
              <Heart className={cn("h-3 w-3", wishlist.includes(Number(product.id)) && "fill-current")} />
            </motion.button>
          </div>

          <div className="p-3">
            <div className="mb-1">
              <span className="inline-block rounded-sm bg-[#ff3b30] px-1.5 py-0.5 text-[9px] font-medium text-white">
                FLASH SALE
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{product.name}</h3>
              <div className="text-sm font-semibold text-gray-900">KSh {(salePrice || price).toLocaleString()}</div>
              {isOnSale && <div className="text-xs text-gray-500 line-through">KSh {price.toLocaleString()}</div>}
            </div>

            {(product.stock ?? 0) > 0 && (
              <div className="flex items-center mt-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#30d158] mr-1.5"></div>
                <span className="text-[10px] text-gray-500">Available</span>
              </div>
            )}

            {(product.stock ?? 0) === 0 && (
              <div className="flex items-center mt-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-1.5"></div>
                <span className="text-[10px] text-gray-500">Out of stock</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

FlashSaleProductCard.displayName = "FlashSaleProductCard"

const calculateDiscount = (price: number, salePrice: number | null) => {
  if (!salePrice || salePrice >= price) return 0
  return Math.round(((price - salePrice) / price) * 100)
}

// Compact skeleton loader
const FlashSalePageSkeleton = () => (
  <div className="min-h-screen bg-[#fbfbfd]">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="h-[200px] bg-gradient-to-r from-[#1d1d1f] to-[#2d2d30] relative overflow-hidden"
    >
      <motion.div
        animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:400%_400%]"
      />
    </motion.div>

    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <Skeleton className="h-6 w-12 mb-2 bg-[#f5f5f7]" />
            <Skeleton className="h-3 w-16 bg-[#f5f5f7]" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {[...Array(18)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white"
          >
            <div className="aspect-[4/3] w-full bg-[#f5f5f7] relative overflow-hidden">
              <motion.div
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-[#f5f5f7] via-[#e0e0e3] to-[#f5f5f7] bg-[length:400%_400%]"
              />
            </div>
            <div className="p-3 space-y-2">
              <Skeleton className="h-2 w-12 rounded-sm bg-[#f5f5f7]" />
              <Skeleton className="h-3 w-3/4 rounded-sm bg-[#f5f5f7]" />
              <Skeleton className="h-3 w-1/2 rounded-sm bg-[#f5f5f7]" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
)

export default function FlashSalePage() {
  const [flashSales, setFlashSales] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState({ hours: 5, minutes: 30, seconds: 0 })
  const [sortBy, setSortBy] = useState("discount")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const isMobile = useMediaQuery("(max-width: 768px)")

  // Fetch flash sale products
  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setLoading(true)
        setError(null)

        const products = await productService.getFlashSaleProducts()

        if (products && products.length > 0) {
          setFlashSales(products)
          setFilteredProducts(products)
          setHasMore(products.length >= 20)
        } else {
          const regularProducts = await productService.getProducts({ limit: 24 })
          const flashSaleProducts = regularProducts.map((product) => ({
            ...product,
            is_flash_sale: true,
            sale_price: product.price * 0.7,
          }))
          setFlashSales(flashSaleProducts)
          setFilteredProducts(flashSaleProducts)
          setHasMore(flashSaleProducts.length >= 20)
        }
      } catch (error) {
        console.error("Error fetching flash sales:", error)
        setError("Failed to load flash sales. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchFlashSales()
  }, [])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1
        if (totalSeconds <= 0) {
          clearInterval(timer)
          return { hours: 0, minutes: 0, seconds: 0 }
        }
        return {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
        }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Banner carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % flashSaleHeroBanners.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Filter and sort products
  useEffect(() => {
    let filtered = [...flashSales]

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description && product.description.toLowerCase().includes(query)),
      )
    }

    filtered.sort((a, b) => {
      if (sortBy === "price-asc") {
        return (a.sale_price || a.price) - (b.sale_price || b.price)
      } else if (sortBy === "price-desc") {
        return (b.sale_price || b.price) - (a.sale_price || a.price)
      } else if (sortBy === "discount") {
        const discountA = a.sale_price ? (a.price - a.sale_price) / a.price : 0
        const discountB = b.sale_price ? (b.price - b.sale_price) / b.price : 0
        return discountB - discountA
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      }
      return 0
    })

    setFilteredProducts(filtered)
  }, [flashSales, debouncedSearchQuery, sortBy])

  // Load more products
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1

      const moreProducts = await productService.getProducts({
        page: nextPage,
        limit: 12,
        is_flash_sale: true,
      })

      if (moreProducts.length === 0) {
        setHasMore(false)
      } else {
        const flashSaleProducts = moreProducts.map((product) => ({
          ...product,
          is_flash_sale: true,
          sale_price: product.sale_price || product.price * 0.7,
        }))

        setFlashSales((prev) => [...prev, ...flashSaleProducts])
        setPage(nextPage)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, page])

  // Setup intersection observer
  useEffect(() => {
    if (loadMoreRef.current && !loading) {
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
  }, [hasMore, loadingMore, loading, loadMoreProducts])

  if (loading) {
    return <FlashSalePageSkeleton />
  }

  if (error && flashSales.length === 0) {
    return (
      <div className="min-h-screen bg-[#fbfbfd]">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100"
          >
            <Flame className="h-12 w-12 text-[#ff3b30] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Flash Sale Unavailable</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-[#ff3b30] hover:bg-[#d70015] text-white px-6 py-2 rounded-lg font-medium transition-all duration-300"
            >
              Try Again
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Compact Hero Section */}
      <div className="relative h-[200px] overflow-hidden">
        <AnimatePresence>
          {flashSaleHeroBanners.map((banner, index) => (
            <motion.div
              key={banner.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: index === currentSlide ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${banner.gradient}`}></div>
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: index === currentSlide ? 1 : 0, y: index === currentSlide ? 0 : 20 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={banner.textColor}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="h-5 w-5" />
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{banner.title}</h1>
                  </div>
                  <h2
                    className={`text-lg md:text-xl font-semibold mb-2 bg-gradient-to-r ${banner.accentColor} bg-clip-text text-transparent`}
                  >
                    {banner.subtitle}
                  </h2>
                  <p className="text-sm opacity-90">{banner.description}</p>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: index === currentSlide ? 1 : 0, scale: index === currentSlide ? 1 : 0.9 }}
                    transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-3 flex items-center justify-center gap-2 bg-black/20 backdrop-blur-md rounded-lg px-3 py-2"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Ends in:</span>
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                      <span>:</span>
                      <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                      <span>:</span>
                      <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {flashSaleHeroBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                currentSlide === index ? "bg-white" : "bg-white/40"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="container mx-auto px-4">
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="py-3 flex items-center text-sm text-gray-500"
          >
            <Link href="/" className="flex items-center hover:text-[#ff3b30] transition-colors">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Link>
            <ChevronRight className="mx-2 h-4 w-4" />
            <span className="font-medium text-gray-900">Flash Sale</span>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="pb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
          >
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search flash sales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 border-gray-200 focus:border-[#ff3b30] focus:ring-[#ff3b30] rounded-lg"
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

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-[180px] rounded-lg border-gray-200">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Highest Discount</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Compact Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              icon: ShoppingBag,
              value: filteredProducts.length,
              label: "Products on Sale",
              color: "text-[#ff3b30]",
              bg: "bg-[#ff3b30]/10",
            },
            {
              icon: Target,
              value: "70%",
              label: "Max Discount",
              color: "text-[#ff9500]",
              bg: "bg-[#ff9500]/10",
            },
            {
              icon: Timer,
              value: `${timeLeft.hours < 10 ? `0${timeLeft.hours}` : timeLeft.hours}h`,
              label: "Time Left",
              color: "text-[#30d158]",
              bg: "bg-[#30d158]/10",
            },
            {
              icon: TrendingUp,
              value: "$24,980",
              label: "Monthly Revenue",
              color: "text-[#10b981]",     // Emerald green
              bg: "bg-[#10b981]/10",       // Soft green background
            }
          ].map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${stat.bg}`}>
                  <IconComponent className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className={`text-xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-600 text-xs">{stat.label}</div>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mb-6 text-gray-500 text-sm"
        >
          Showing {filteredProducts.length} flash sale products
        </motion.div>

        {filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm"
          >
            <Flame className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No flash sales found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or check back soon for new deals!</p>
            <Link href="/products">
              <Button className="bg-[#ff3b30] hover:bg-[#d70015] text-white px-6 py-2 rounded-lg font-medium transition-all duration-300">
                Browse All Products
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <FlashSaleProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>

            {hasMore && (
              <div ref={loadMoreRef} className="mt-8 text-center">
                {loadingMore ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 text-gray-500"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-500"
                    />
                    <span className="text-sm font-medium">Loading more flash sales...</span>
                  </motion.div>
                ) : (
                  <div className="h-6 w-full max-w-md mx-auto rounded-full bg-[#f5f5f7]"></div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
