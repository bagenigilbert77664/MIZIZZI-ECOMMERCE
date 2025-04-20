"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ChevronRight, Zap } from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

// Create a memoized product card component to prevent unnecessary re-renders
const ProductCard = memo(({ product }: { product: Product }) => {
  const discountPercentage = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0

  // Determine the image URL to use
  const imageUrl = getProductImageUrl(product)

  return (
    <Link href={`/product/${product.id}`} prefetch={false}>
      <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxuczpsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlZWVlIiAvPjwvc3ZnPg=="
          />
          {product.sale_price && (
            <motion.div
              className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              {discountPercentage}% OFF
            </motion.div>
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
              className="text-sm font-semibold text-cherry-900"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              KSh {(product.sale_price || product.price).toLocaleString()}
            </motion.span>
            {product.sale_price && (
              <span className="text-[11px] text-gray-500 line-through">KSh {product.price.toLocaleString()}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
})

ProductCard.displayName = "ProductCard"

// Helper function to get the best available product image URL
function getProductImageUrl(product: Product): string {
  // Check for image_urls array first
  if (product.image_urls && product.image_urls.length > 0) {
    return product.image_urls[0]
  }

  // Then check for thumbnail_url
  if (product.thumbnail_url) {
    return product.thumbnail_url
  }

  // Check for images array with url property
  if (product.images && product.images.length > 0 && product.images[0].url) {
    return product.images[0].url
  }

  // Fallback to placeholder
  return "/placeholder.svg?height=300&width=300"
}

// Create a skeleton loader component
const FlashSalesSkeleton = () => (
  <section className="w-full mb-8">
    <div className="w-full">
      <div className="bg-red-600 text-white flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-white/20 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-32 bg-white/20 rounded animate-pulse"></div>
        </div>
        <div className="h-5 w-16 bg-white/20 rounded animate-pulse"></div>
      </div>

      <div className="p-2">
        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white p-4">
              <Skeleton className="aspect-[4/3] w-full mb-2" />
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

export function FlashSales() {
  const [flashSales, setFlashSales] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState({
    hours: 1,
    minutes: 17,
    seconds: 1,
  })
  const router = useRouter()

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchFlashSales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use the correct API endpoint for flash sale products
      const products = await productService.getFlashSaleProducts()

      if (products && products.length > 0) {
        setFlashSales(products.slice(0, 6)) // Limit to 6 products
      } else {
        // Fallback to regular products if no flash sale products
        const regularProducts = await productService.getProducts({ limit: 6 })
        setFlashSales(regularProducts || [])
      }
    } catch (error) {
      console.error("Error fetching flash sales:", error)
      setError("Failed to load flash sales")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Use AbortController for cleanup
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        await fetchFlashSales()
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in flash sales fetch:", error)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [fetchFlashSales])

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

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/flash-sales")
  }

  if (loading) {
    return <FlashSalesSkeleton />
  }

  if (error) {
    return (
      <section className="w-full mb-8">
        <div className="w-full p-2">
          <div className="mb-2 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Flash Sales</h2>
          </div>
          <div className="bg-red-50 p-4 rounded-md text-red-600 text-center">{error}</div>
        </div>
      </section>
    )
  }

  if (!flashSales || flashSales.length === 0) {
    return null
  }

  return (
    <section className="w-full mb-8">
      <div className="w-full">
        {/* Jumia-style Flash Sale Header */}
        <div className="bg-cherry-900 text-white flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-300" />
            <h2 className="text-sm sm:text-base font-bold whitespace-nowrap">Flash Sales | Don't Miss Out!</h2>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="hidden sm:inline">Time Left:</span>
            <div className="flex items-center gap-1 font-semibold">
              <span>{String(timeLeft.hours).padStart(2, "0")}</span>
              <span>h</span>
              <span>:</span>
              <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
              <span>m</span>
              <span>:</span>
              <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
              <span>s</span>
            </div>
          </div>

          <button
            onClick={handleViewAll}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium hover:underline whitespace-nowrap"
          >
            See All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2">
          <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <AnimatePresence mode="popLayout">
              {flashSales.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
