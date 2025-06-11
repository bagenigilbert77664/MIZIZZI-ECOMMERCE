"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
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
} from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useDebounce } from "@/hooks/use-debounce"

// Flash sale banner items for the hero carousel
const flashSaleBanners = [
  {
    image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1200&q=80",
    title: "MEGA FLASH SALE",
    subtitle: "Up to 80% Off",
    description: "Limited time offers on premium products",
    gradient: "from-red-600 via-orange-500 to-yellow-400",
    textColor: "text-white",
  },
  {
    image: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=1200&q=80",
    title: "HOURLY DEALS",
    subtitle: "Flash Sales Every Hour",
    description: "New deals dropping every 60 minutes",
    gradient: "from-purple-600 via-pink-500 to-red-500",
    textColor: "text-white",
  },
  {
    image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&q=80",
    title: "CLEARANCE BLITZ",
    subtitle: "Final Hours",
    description: "Last chance for massive savings",
    gradient: "from-blue-600 via-purple-600 to-pink-500",
    textColor: "text-white",
  },
]

export default function FlashSalesPage() {
  const [flashSales, setFlashSales] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 30,
    seconds: 0,
  })
  const [sortBy, setSortBy] = useState("discount")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [wishlist, setWishlist] = useState<number[]>([])
  const [loadingMore, setLoadingMore] = useState(false)

  const isMobile = useMediaQuery("(max-width: 768px)")

  // Fetch flash sale products
  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setLoading(true)
        setError(null)

        const products = await productService.getFlashSaleProducts()
        setFlashSales(products)
        setFilteredProducts(products)
        setHasMore(products.length >= 20)
      } catch (error) {
        console.error("Error fetching flash sales:", error)
        setError("Failed to load flash sales. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchFlashSales()

    const savedWishlist = localStorage.getItem("wishlist")
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (e) {
        console.error("Error parsing wishlist from localStorage:", e)
      }
    }
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

  // Banner carousel auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % flashSaleBanners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter and sort products
  useEffect(() => {
    let filtered = [...flashSales]

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description && product.description.toLowerCase().includes(query)),
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "price-asc") {
        return (a.sale_price || a.price) - (b.sale_price || b.price)
      } else if (sortBy === "price-desc") {
        return (b.sale_price || b.price) - (a.sale_price || a.price)
      } else if (sortBy === "discount") {
        const discountA = a.sale_price ? (a.price - a.sale_price) / a.price : 0
        const discountB = b.sale_price ? (b.price - b.sale_price) / b.price : 0
        return discountB - discountA
      }
      return 0
    })

    setFilteredProducts(filtered)
  }, [flashSales, debouncedSearchQuery, sortBy])

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist))
  }, [wishlist])

  // Load more products
  const loadMore = async () => {
    try {
      setLoadingMore(true)
      const nextPage = page + 1

      const moreProducts = await productService.getFlashSaleProducts()

      if (moreProducts.length === 0) {
        setHasMore(false)
      } else {
        setFlashSales((prev) => [...prev, ...moreProducts])
        setPage(nextPage)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Toggle wishlist
  const toggleWishlist = (productId: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
  }

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Product Card Component (matching product grid style)
  const FlashSaleCard = ({ product }: { product: Product }) => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const price = typeof product.price === "number" ? product.price : 0
    const salePrice = typeof product.sale_price === "number" ? product.sale_price : null
    const discount = calculateDiscount(price, salePrice)
    const isOnSale = salePrice && salePrice < price

    return (
      <Link href={`/product/${product.id}`} prefetch={false}>
        <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-lg active:scale-[0.99] font-sans">
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
            <Image
              src={(product.image_urls && product.image_urls[0]) || product.thumbnail_url || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlZWVlIiAvPjwvc3ZnPg=="
            />

            {/* Flash sale badge */}
            {isOnSale && (
              <div className="absolute left-0 top-2 bg-red-700 px-2 py-1 text-[10px] font-semibold text-white flex items-center gap-1">
                <Zap className="h-3 w-3" />-{discount}%
              </div>
            )}

            {/* Limited stock indicator */}
            {product.stock && product.stock < 10 && (
              <div className="absolute right-0 top-2 bg-orange-500 px-2 py-1 text-[10px] font-semibold text-white">
                Only {product.stock} left!
              </div>
            )}

            {/* Wishlist button */}
            <button
              onClick={(e) => toggleWishlist(Number(product.id), e)}
              className={cn(
                "absolute right-2 bottom-2 rounded-full p-1.5 transition-colors opacity-0 group-hover:opacity-100",
                wishlist.includes(Number(product.id))
                  ? "bg-red-50 text-red-600"
                  : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-600",
              )}
            >
              <Heart className={cn("h-4 w-4", wishlist.includes(Number(product.id)) && "fill-red-600")} />
            </button>
          </div>

          <CardContent className="p-2 font-sans">
            {/* Flash Sale branding */}
            <div className="mb-1">
              <span className="inline-block rounded-sm bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-medium">
                FLASH SALE
              </span>
            </div>

            <div className="space-y-0.5">
              <h3 className="line-clamp-2 text-sm font-medium leading-tight text-gray-800">{product.name}</h3>
              <div className="text-base font-semibold text-red-600">KSh {(salePrice || price).toLocaleString()}</div>
              {isOnSale && <div className="text-sm text-gray-500 line-through">KSh {price.toLocaleString()}</div>}
            </div>

            {/* Progress bar for stock */}
            {product.stock && product.stock < 20 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Stock Level</span>
                  <span>{product.stock} left</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-red-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max((product.stock / 20) * 100, 10)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          {/* Loading hero banner */}
          <div className="h-[200px] bg-gradient-to-r from-red-600 to-orange-500 rounded-lg mb-8 animate-pulse"></div>

          {/* Loading grid */}
          <div className="grid grid-cols-2 gap-x-[1px] gap-y-6 bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(12)].map((_, index) => (
              <div key={index} className="bg-white p-2">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-gray-200 animate-pulse"></div>
                  <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse"></div>
                  <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error && flashSales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-red-200 rounded-lg p-6 text-center shadow-sm">
            <ShoppingBag className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Flash Sales Unavailable</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          {/* Breadcrumb navigation */}
          <nav className="py-3 flex items-center text-sm text-gray-500 overflow-x-auto">
            <Link href="/" className="flex items-center hover:text-red-600 transition-colors whitespace-nowrap">
              <Home className="mr-1 h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="mx-2 h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-gray-900 whitespace-nowrap">Flash Sales</span>
          </nav>

          {/* Main header */}
          <div className="py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Flame className="h-8 w-8 text-red-600" />
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Flash Sales</h1>
                  <Badge className="bg-red-600 text-white px-3 py-1">
                    <Timer className="h-3 w-3 mr-1" />
                    LIVE NOW
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-4">
                  <span>{filteredProducts.length} products on flash sale</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                    <Target className="h-3 w-3 mr-1" />
                    Up to 80% off
                  </Badge>
                </div>
              </div>

              {/* Countdown timer */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-lg">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Ends in:</span>
                <div className="flex items-center gap-1 text-lg font-bold">
                  <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                  <span>:</span>
                  <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <span>:</span>
                  <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
                </div>
              </div>
            </div>

            {/* Search and sort controls */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search flash sales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
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
                  <SelectTrigger className="h-11 w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Highest Discount</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner Carousel */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative h-[200px] sm:h-[250px] md:h-[300px] overflow-hidden rounded-lg mb-8">
          <AnimatePresence>
            {flashSaleBanners.map((banner, index) => (
              <motion.div
                key={index}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: index === currentSlide ? 1 : 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={banner.image || "/placeholder.svg"}
                    alt={banner.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} bg-opacity-80`}></div>
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: index === currentSlide ? 1 : 0, y: index === currentSlide ? 0 : 20 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className={banner.textColor}
                    >
                      <h2 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-wider mb-2 flex items-center justify-center gap-2">
                        <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
                        {banner.title}
                      </h2>
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2">{banner.subtitle}</h3>
                      <p className="text-sm sm:text-base opacity-90">{banner.description}</p>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {flashSaleBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 w-8 rounded-full transition-colors ${
                  currentSlide === index ? "bg-white" : "bg-white/40"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Flash Sale Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">{filteredProducts.length}</div>
            <div className="text-sm text-gray-600">Products on Sale</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">80%</div>
            <div className="text-sm text-gray-600">Max Discount</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {timeLeft.hours < 10 ? `0${timeLeft.hours}` : timeLeft.hours}h
            </div>
            <div className="text-sm text-gray-600">Time Left</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">1,247</div>
            <div className="text-sm text-gray-600">Products Sold</div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">Showing {filteredProducts.length} flash sale products</div>

        {/* Product grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <Flame className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No flash sales available</h3>
            <p className="text-gray-600 mb-4">Check back soon for exciting deals!</p>
            <Link href="/products">
              <Button className="bg-red-600 hover:bg-red-700 text-white">Browse All Products</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-[1px] gap-y-6 bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filteredProducts.map((product, index) => (
                <FlashSaleCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 bg-red-600 hover:bg-red-700 text-white"
                >
                  {loadingMore ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                      Loading...
                    </>
                  ) : (
                    "Load More Flash Sales"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
