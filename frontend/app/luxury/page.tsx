"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Crown, Search, X } from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

// Luxury showcase carousel items
const carouselItems = [
  {
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=80",
    title: "PREMIUM COLLECTION",
    subtitle: "Exquisite Craftsmanship",
    description: "Discover our curated selection of luxury pieces",
    color: "bg-indigo-900",
  },
  {
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&q=80",
    title: "SIGNATURE SERIES",
    subtitle: "Timeless Elegance",
    description: "Handcrafted pieces for the discerning collector",
    color: "bg-slate-900",
  },
]

export default function LuxuryPage() {
  const [luxuryProducts, setLuxuryProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("price-desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Fetch luxury products
  useEffect(() => {
    const fetchLuxuryProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const products = await productService.getLuxuryDealProducts()
        setLuxuryProducts(products || [])
        setHasMore(products?.length >= 20) // Assuming 20 is the page size
      } catch (error) {
        console.error("Error fetching luxury products:", error)
        setError("Failed to load luxury collection. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchLuxuryProducts()
  }, [])

  // Carousel auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // Load more products
  const loadMore = async () => {
    try {
      setLoading(true)
      const nextPage = page + 1

      let moreProducts: Product[]
      if (typeof productService.getLuxuryDealProducts === "function") {
        moreProducts = await productService.getLuxuryDealProducts()
        if (!moreProducts || moreProducts.length === 0) {
          setHasMore(false)
        } else {
          setLuxuryProducts((prev) => [...prev, ...moreProducts])
              setPage(nextPage)
            }
          }
        } catch (error) {
          console.error("Error loading more products:", error)
        } finally {
          setLoading(false)
        }
      }
  const filteredProducts = luxuryProducts
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
      } else if (sortBy === "newest") {
        // Assuming newer products have higher IDs
        return b.id - a.id
      }
      return 0
    })

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Render loading skeletons
  if (loading && luxuryProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Luxury Collection</h1>
            <div className="animate-pulse">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
          </div>

          <div className="h-[300px] bg-gray-200 animate-pulse mb-8 rounded-lg"></div>

          <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(12)].map((_, index) => (
              <div key={index} className="bg-white p-2">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse mb-2"></div>
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (error && luxuryProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-2xl sm:text-3xl font-bold text-gray-900">Luxury Collection</h1>
          <div className="bg-white border border-red-200 rounded-lg p-6 text-center shadow-sm">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render empty state
  if (luxuryProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-2xl sm:text-3xl font-bold text-gray-900">Luxury Collection</h1>
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <Crown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No luxury products available at the moment.</p>
            <p className="text-gray-500 text-sm mb-4">Our curators are assembling an exclusive collection for you.</p>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link href="/">Explore Other Collections</Link>
            </Button>
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
          <div className="mb-8 flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Luxury Collection</h1>
            <Crown className="h-6 w-6 text-amber-500" />
          </div>

          {/* Search and Sort */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search luxury collection..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-4"
                />
                {searchQuery && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <p className="text-gray-600 mb-2">No products match your search criteria.</p>
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
        {/* Header */}
        <div className="mb-8 flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 bg-clip-text text-transparent">
            Luxury Collection
          </h1>
          <motion.div
            animate={{ rotate: [0, 10, 0, -10, 0] }}
            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <Crown className="h-6 w-6 text-amber-500" />
          </motion.div>
        </div>

        {/* Main Carousel */}
        <div className="mb-8 relative overflow-hidden rounded-lg shadow-md">
          <div className="relative h-[300px] w-full overflow-hidden">
            <AnimatePresence mode="wait">
              {carouselItems.map((item, index) => (
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{
                    opacity: index === currentSlide ? 1 : 0,
                    scale: index === currentSlide ? 1 : 1.05,
                  }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.7 }}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      sizes="100vw"
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
                  className={`h-1.5 w-8 rounded-full transition-colors ${
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
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search luxury collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 pr-4"
              />
              {searchQuery && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">Showing {filteredProducts.length} products</div>

        {/* Product grid - Matching the luxury-deals component style */}
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
                  <Card className="group h-full overflow-hidden border border-gray-100 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <Image
                        src={product.image_urls?.[0] || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {product.sale_price && product.sale_price < product.price && (
                        <motion.div
                          className="absolute left-0 top-2 bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          {calculateDiscount(product.price, product.sale_price)}% OFF
                        </motion.div>
                      )}
                    </div>
                    <CardContent className="space-y-1.5 p-2">
                      <div className="mb-1">
                        <span className="inline-block rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Luxury
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-600 group-hover:text-gray-900">
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-semibold text-gray-900">
                          KSh {(product.sale_price || product.price).toLocaleString()}
                        </span>
                        {product.sale_price && product.sale_price < product.price && (
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
            <Button onClick={loadMore} disabled={loading} className="px-6 bg-indigo-600 hover:bg-indigo-700">
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
