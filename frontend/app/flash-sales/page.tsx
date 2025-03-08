"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Clock, ArrowUpDown, Zap, Sparkles, ShoppingBag } from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

// Flash sale carousel items
const carouselItems = [
  {
    image: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=1200&q=80",
    title: "FLASH SALE",
    subtitle: "Up to 70% Off Premium Products",
    description: "Limited time offers on exclusive items!",
    color: "bg-red-600",
  },
  {
    image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1200&q=80",
    title: "24HR DEALS",
    subtitle: "New Deals Every Hour",
    description: "Fresh discounts on trending items all day long",
    color: "bg-orange-500",
  },
  {
    image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&q=80",
    title: "CLEARANCE",
    subtitle: "Extra 20% Off Already Reduced Items",
    description: "Final clearance on seasonal favorites",
    color: "bg-purple-600",
  },
  {
    image: "https://images.unsplash.com/photo-1607083207685-aaf05f2c908c?w=1200&q=80",
    title: "EXCLUSIVE OFFERS",
    subtitle: "Members-Only Flash Deals",
    description: "Special discounts for our valued customers",
    color: "bg-blue-600",
  },
]

export default function FlashSalesPage() {
  const [flashSales, setFlashSales] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 0,
    seconds: 0,
  })
  const [sortBy, setSortBy] = useState("discount")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Fetch flash sale products
  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setLoading(true)
        setError(null)

        const products = await productService.getFlashSaleProducts()
        setFlashSales(products)
        setHasMore(products.length >= 20) // Assuming 20 is the page size
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

  // Carousel auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load more products
  const loadMore = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  // Filter and sort products
  const filteredProducts = flashSales
    .filter((product) => {
      // Apply search filter
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      // Apply sorting
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

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Render loading skeletons
  if (loading && flashSales.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Flash Sales</h1>
              <div className="animate-pulse">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
              <Clock className="h-5 w-5 text-gray-400" />
              <div className="flex items-center gap-1 text-sm font-semibold text-gray-400">
                <span>--</span>
                <span>:</span>
                <span>--</span>
                <span>:</span>
                <span>--</span>
              </div>
            </div>
          </div>

          <div className="h-[220px] bg-gray-200 animate-pulse mb-8 rounded-lg"></div>

          <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(12)].map((_, index) => (
              <div key={index} className="bg-white p-4">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 animate-pulse mb-2 w-1/3"></div>
                <div className="h-4 bg-gray-200 animate-pulse w-2/3"></div>
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
      <div className="min-h-screen bg-white">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-2xl sm:text-3xl font-bold text-gray-900">Flash Sales</h1>
          <div className="bg-white border border-red-200 rounded-lg p-6 text-center shadow-sm">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render empty state
  if (flashSales.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-2xl sm:text-3xl font-bold text-gray-900">Flash Sales</h1>
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No flash sales available at the moment.</p>
            <p className="text-gray-500 text-sm mb-4">Check back soon for exciting deals!</p>
          </div>
        </div>
      </div>
    )
  }

  // Render empty filtered results
  if (filteredProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Flash Sales</h1>
              <Zap className="h-6 w-6 text-amber-500" />
            </div>
            <motion.div
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Clock className="h-5 w-5 text-red-600" />
              <div className="flex items-center gap-1 text-sm font-semibold text-red-600">
                <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                <span>:</span>
                <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span>:</span>
                <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
              </div>
            </motion.div>
          </div>

          {/* Search and Sort */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <Input
                type="text"
                placeholder="Search flash sales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full sm:w-[300px]"
              />

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 w-[180px]">
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

          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <p className="text-gray-600 mb-2">No products match your search.</p>
            <Button onClick={() => setSearchQuery("")} variant="outline" className="mt-2">
              Clear Search
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 px-4 sm:px-6 lg:px-8">
        {/* Header with countdown */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Flash Sales</h1>
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Sparkles className="h-6 w-6 text-amber-500" />
            </motion.div>
          </div>
          <motion.div
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm border border-red-100"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <Clock className="h-5 w-5 text-red-600" />
            <div className="flex items-center gap-1 text-sm font-semibold text-red-600">
              <span>{String(timeLeft.hours).padStart(2, "0")}</span>
              <span>:</span>
              <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
              <span>:</span>
              <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
            </div>
          </motion.div>
        </div>

        {/* Main Carousel */}
        <div className="mb-8 relative overflow-hidden rounded-lg shadow-md">
          <div className="relative h-[220px] w-full overflow-hidden">
            <AnimatePresence mode="wait">
              {carouselItems.map((item, index) => (
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: index > currentSlide ? 100 : -100 }}
                  animate={{
                    opacity: index === currentSlide ? 1 : 0,
                    x: index === currentSlide ? 0 : index > currentSlide ? 100 : -100,
                  }}
                  exit={{ opacity: 0, x: index < currentSlide ? -100 : 100 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      fill
                      className="object-cover"
                      priority={index === 0}
                    />
                    <div className={`absolute inset-0 ${item.color} bg-opacity-60`}></div>
                    <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-center"
                      >
                        <h2 className="text-sm font-bold tracking-widest mb-2">{item.title}</h2>
                        <h3 className="text-3xl sm:text-4xl font-bold mb-2">{item.subtitle}</h3>
                        <p className="text-sm sm:text-base max-w-md">{item.description}</p>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {carouselItems.map((_, index) => (
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
        </div>

        {/* Search and Sort */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Input
              type="text"
              placeholder="Search flash sales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full sm:w-[300px]"
            />

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-[180px]">
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

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">Showing {filteredProducts.length} products</div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={`/product/${product.id}`}>
                  <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <Image
                        src={product.image_urls?.[0] || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {product.sale_price && (
                        <motion.div
                          className="absolute left-0 top-2 bg-red-600 px-2 py-1 text-[10px] font-semibold text-white"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          {calculateDiscount(product.price, product.sale_price)}% OFF
                        </motion.div>
                      )}
                      {product.stock && product.stock < 10 && (
                        <div className="absolute right-0 top-2 bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white">
                          Only {product.stock} left
                        </div>
                      )}
                    </div>
                    <CardContent className="space-y-1.5 p-2">
                      <div className="mb-1">
                        <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          {product.category_id}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-600 group-hover:text-gray-900">
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5">
                        <motion.span
                          className="text-sm font-semibold text-red-600"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          KSh {(product.sale_price || product.price).toLocaleString()}
                        </motion.span>
                        {product.sale_price && (
                          <span className="text-[11px] text-gray-500 line-through">
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
        </div>

        {/* Load more button */}
        {hasMore && (
          <div className="mt-8 text-center">
            <Button onClick={loadMore} disabled={loading} className="px-6 bg-red-600 hover:bg-red-700">
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                  Loading...
                </>
              ) : (
                "Load More Products"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
