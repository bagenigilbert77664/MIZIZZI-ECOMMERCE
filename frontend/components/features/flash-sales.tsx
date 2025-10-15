"use client"

import type React from "react"
import { useState, useEffect, useCallback, memo, useRef } from "react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Zap } from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cloudinaryService } from "@/services/cloudinary-service"

const LogoPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative h-12 w-12 sm:h-16 sm:w-16"
    >
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
        alt="Loading"
        fill
        className="object-contain"
      />
    </motion.div>
  </div>
)

const ProductCard = memo(({ product, isMobile }: { product: Product; isMobile: boolean }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [isHovering, setIsHovering] = useState(false)

  const discountPercentage = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true)
    // Add a small delay to show the smooth transition
    setTimeout(() => {
      setShowPlaceholder(false)
    }, 400)
  }

  // Handle image load error
  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
    // Keep placeholder visible on error
  }

  // Reset states when product changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setShowPlaceholder(true)
  }, [product.id])

  // Determine the image URL to use
  const imageUrl = getProductImageUrl(product)

  return (
    <Link href={`/product/${product.slug || product.id}`} prefetch={false}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onHoverStart={() => setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
        whileHover={{ y: -4, scale: 1.02 }}
        className="h-full"
      >
        <div className="group h-full overflow-hidden bg-white rounded-lg border border-gray-100 transition-all duration-300 ease-out hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-gray-200 flex-shrink-0">
          <div className={`relative overflow-hidden bg-[#f5f5f7] ${isMobile ? "aspect-square" : "aspect-[4/3]"}`}>
            <AnimatePresence>
              {(showPlaceholder || imageError) && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 1.1,
                    transition: { duration: 0.6, ease: "easeInOut" },
                  }}
                  className="absolute inset-0 z-10"
                >
                  <LogoPlaceholder />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{
                opacity: imageLoaded ? 1 : 0,
                scale: imageLoaded ? (isHovering ? 1.05 : 1) : 1.1,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes={
                  isMobile ? "25vw" : "(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 16vw, 14vw"
                }
                className="object-cover transition-opacity duration-300"
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxuczpsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSMjZWVlZWVlIiAvPjwvc3ZnPg=="
              />
            </motion.div>

            {/* Sale Badge with Apple-like styling */}
            {product.sale_price && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className={`absolute left-0 top-1 rounded-full bg-[#fa5252] px-1 py-0.5 font-medium text-white z-20 ${
                  isMobile ? "text-[8px]" : "text-[10px]"
                }`}
              >
                -{discountPercentage}%
              </motion.div>
            )}
          </div>

          <div className={`space-y-0.5 ${isMobile ? "p-1" : "p-3"}`}>
            {/* Flash Sale Badge with Apple-like styling */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mb-1"
            >
              <span
                className={`inline-block rounded-sm bg-red-50 px-1 py-0.5 font-medium text-red-700 ${
                  isMobile ? "text-[8px]" : "text-[10px]"
                }`}
              >
                FLASH SALE
              </span>
            </motion.div>

            {/* Product details with Apple-like typography and staggered animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="space-y-1"
            >
              <h3
                className={`line-clamp-2 font-medium leading-tight text-gray-900 ${isMobile ? "text-xs" : "text-sm"}`}
              >
                {product.name}
              </h3>

              {/* Pricing with Apple-like styling */}
              <div>
                <motion.span
                  className={`font-semibold text-gray-900 ${isMobile ? "text-sm" : "text-base"}`}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  KSh {(product.sale_price || product.price).toLocaleString()}
                </motion.span>
                {product.sale_price && (
                  <div className={`text-gray-500 line-through ${isMobile ? "text-xs" : "text-sm"}`}>
                    KSh {product.price.toLocaleString()}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Apple-like "Available" indicator */}
            {(product.stock ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center mt-2"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5"></div>
                <span className={`text-gray-500 ${isMobile ? "text-[8px]" : "text-[10px]"}`}>Available</span>
              </motion.div>
            )}

            {/* Out of stock indicator */}
            {(product.stock ?? 0) === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center mt-2"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-1.5"></div>
                <span className={`text-gray-500 ${isMobile ? "text-[8px]" : "text-[10px]"}`}>Out of stock</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
})

ProductCard.displayName = "ProductCard"

function getProductImageUrl(product: Product): string {
  // Check for image_urls array first
  if (product.image_urls && product.image_urls.length > 0) {
    // If it's a Cloudinary public ID, generate URL:
    if (typeof product.image_urls[0] === "string" && !product.image_urls[0].startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.image_urls[0])
    }
    return product.image_urls[0]
  }

  // Then check for thumbnail_url
  if (product.thumbnail_url) {
    // If it's a Cloudinary public ID, generate URL:
    if (typeof product.thumbnail_url === "string" && !product.thumbnail_url.startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.thumbnail_url)
    }
    return product.thumbnail_url
  }

  // Check for images array with url property
  if (product.images && product.images.length > 0 && product.images[0].url) {
    // If it's a Cloudinary public ID, generate URL:
    if (typeof product.images[0].url === "string" && !product.images[0].url.startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.images[0].url)
    }
    return product.images[0].url
  }

  // Fallback to placeholder
  return "/placeholder.svg?height=300&width=300"
}

const FlashSalesSkeleton = ({ isMobile }: { isMobile: boolean }) => (
  <section className="w-full mb-4 sm:mb-8">
    <div className="w-full">
      <div className="bg-cherry-900 text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={`bg-white/20 rounded animate-pulse ${isMobile ? "h-4 w-16" : "h-5 w-20"}`}></div>
        </div>
        <div className={`bg-white/20 rounded animate-pulse ${isMobile ? "h-4 w-12" : "h-5 w-16"}`}></div>
      </div>

      <div className={isMobile ? "p-1" : "p-2"}>
        <div className="flex gap-[1px] bg-gray-100">
          {[...Array(isMobile ? 4 : 6)].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`bg-white flex-shrink-0 ${isMobile ? "p-2 w-[calc(25%-1px)]" : "p-4 w-[200px]"}`}
            >
              <div
                className={`w-full mb-2 bg-[#f5f5f7] flex items-center justify-center relative overflow-hidden ${isMobile ? "aspect-square" : "aspect-[4/3]"}`}
              >
                <motion.div
                  animate={{
                    backgroundPosition: ["0% 0%", "100% 100%"],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-[#f5f5f7] via-[#e0e0e3] to-[#f5f5f7] bg-[length:400%_400%]"
                />
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="text-center z-10"
                >
                  <Zap className={`text-red-400 mx-auto ${isMobile ? "h-4 w-4" : "h-6 w-6"}`} />
                </motion.div>
              </div>
              <Skeleton className={`w-1/3 mb-2 bg-[#f5f5f7] rounded-full ${isMobile ? "h-3" : "h-4"}`} />
              <Skeleton className={`w-2/3 bg-[#f5f5f7] rounded-full ${isMobile ? "h-3" : "h-4"}`} />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className={`bg-[#f5f5f7] rounded-full ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
              </div>
            </motion.div>
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
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 17, seconds: 1 })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const isMobile = useMediaQuery("(max-width: 640px)")
  const isSmallMobile = useMediaQuery("(max-width: 480px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // Reduce item width for mobile to fit more naturally and avoid overflow
  const itemsPerView = isSmallMobile ? 2 : isMobile ? 2.2 : isTablet ? 5 : 6
  const itemWidthPx = isSmallMobile ? 140 : isMobile ? 150 : 180

  // Track scroll position for mobile indicator
  const [mobileScrollIndex, setMobileScrollIndex] = useState(0)
  useEffect(() => {
    if (!isMobile || !carouselRef.current) return
    const handleScroll = () => {
      const scrollLeft = carouselRef.current!.scrollLeft
      setMobileScrollIndex(Math.round(scrollLeft / itemWidthPx))
    }
    const el = carouselRef.current
    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [isMobile, itemWidthPx])

  const fetchFlashSales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use the correct API endpoint for flash sale products
      const products = await productService.getFlashSaleProducts()

      if (products && products.length > 0) {
        const processedProducts = products.map((product) => ({
          ...product,
          image_urls: (product.image_urls || []).map((url) => {
            // If it's a Cloudinary public ID, generate URL:
            if (typeof url === "string" && !url.startsWith("http")) {
              return cloudinaryService.generateOptimizedUrl(url)
            }
            return url
          }),
        }))
        setFlashSales(processedProducts.slice(0, 12)) // Limit to 12 products max
      } else {
        // Fallback to regular products if no flash sales
        const regularProducts = await productService.getProducts({
          limit: 12,
          sort_by: "price",
          sort_order: "asc",
        })
        const processedProducts = regularProducts.map((product) => ({
          ...product,
          image_urls: (product.image_urls || []).map((url) => {
            // If it's a Cloudinary public ID, generate URL:
            if (typeof url === "string" && !url.startsWith("http")) {
              return cloudinaryService.generateOptimizedUrl(url)
            }
            return url
          }),
        }))
        setFlashSales(processedProducts || [])
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
    const handleProductImagesUpdated = (event: CustomEvent) => {
      const { productId } = event.detail
      console.log("[v0] Flash Sales: Product images updated event received for product:", productId)

      // This ensures we get fresh data from the database
      console.log("[v0] Flash Sales: Refetching all products due to image update")

      // Clear the flash sales state first to force a fresh fetch
      setFlashSales([])
      setLoading(true)

      // Refetch after a small delay to ensure database is updated
      setTimeout(() => {
        fetchFlashSales()
      }, 500)
    }

    window.addEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)

    return () => {
      window.removeEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)
    }
  }, [fetchFlashSales])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const total = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1
        if (total <= 0) {
          clearInterval(timer)
          return { hours: 0, minutes: 0, seconds: 0 }
        }
        return {
          hours: Math.floor(total / 3600),
          minutes: Math.floor((total % 3600) / 60),
          seconds: total % 60,
        }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/flash-sales")
  }

  // Carousel navigation functions
  const maxIndex = Math.max(0, flashSales.length - itemsPerView)

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }, [maxIndex])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!carouselRef.current || isDragging || isMobile) return

      const rect = carouselRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const width = rect.width
      const leftHalf = x < width / 2

      setHoverSide(leftHalf ? "left" : "right")
    },
    [isDragging, isMobile],
  )

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setIsHovering(true)
    }
  }, [isMobile])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    setHoverSide(null)
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return

      const touch = e.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
      })
      setTouchEnd(null)
      setIsDragging(true)
    },
    [isMobile],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !touchStart) return

      const touch = e.touches[0]
      setTouchEnd({
        x: touch.clientX,
        y: touch.clientY,
      })

      // Prevent vertical scrolling if horizontal swipe is detected
      const deltaX = Math.abs(touch.clientX - touchStart.x)
      const deltaY = Math.abs(touch.clientY - touchStart.y)

      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault()
      }
    },
    [isMobile, touchStart],
  )

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !touchStart || !touchEnd) {
      setIsDragging(false)
      return
    }

    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y
    const minSwipeDistance = 50

    // Check if it's a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swiped left, go to next
        if (currentIndex < maxIndex) {
          goToNext()
        }
      } else {
        // Swiped right, go to previous
        if (currentIndex > 0) {
          goToPrevious()
        }
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
    setIsDragging(false)
  }, [isMobile, touchStart, touchEnd, currentIndex, maxIndex, goToPrevious, goToNext])

  const handleDragStart = useCallback(() => {
    if (isMobile) return // Use touch events for mobile
    setIsDragging(true)
    setHoverSide(null) // Hide arrows while dragging
  }, [isMobile])

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isMobile) return // Use touch events for mobile
      setIsDragging(false)

      const threshold = 50 // Minimum drag distance to trigger navigation
      const velocity = info.velocity.x
      const offset = info.offset.x

      // Determine direction based on drag distance and velocity
      if (Math.abs(offset) > threshold || Math.abs(velocity) > 300) {
        if (offset > 0 || velocity > 0) {
          // Dragged right, go to previous
          if (currentIndex > 0) {
            goToPrevious()
          }
        } else {
          // Dragged left, go to next
          if (currentIndex < maxIndex) {
            goToNext()
          }
        }
      }
    },
    [currentIndex, maxIndex, goToPrevious, goToNext, isMobile],
  )

  useEffect(() => {
    const currentCarousel = carouselRef.current
    if (!currentCarousel || isMobile) return

    // Handle wheel event with proper passive option
    const handleWheelEvent = (e: WheelEvent) => {
      // Only handle horizontal scrolling or when shift is pressed for vertical scrolling
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault()

        const threshold = 10 // Minimum scroll amount to trigger navigation
        const delta = e.deltaX || e.deltaY

        if (Math.abs(delta) > threshold) {
          if (delta > 0) {
            // Scrolled right, go to next
            if (currentIndex < maxIndex) {
              goToNext()
            }
          } else {
            // Scrolled left, go to previous
            if (currentIndex > 0) {
              goToPrevious()
            }
          }
        }
      }
    }

    // Add event listener with { passive: false } to allow preventDefault()
    currentCarousel.addEventListener("wheel", handleWheelEvent, { passive: false })

    // Clean up
    return () => {
      currentCarousel.removeEventListener("wheel", handleWheelEvent)
    }
  }, [currentIndex, maxIndex, goToPrevious, goToNext, isMobile])

  if (loading) {
    return <FlashSalesSkeleton isMobile={isMobile} />
  }

  if (error) {
    return (
      <section className="w-full mb-4 sm:mb-8">
        <div className="w-full p-1 sm:p-2">
          <div className="mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold">Flash Sales</h2>
          </div>
          <div className="bg-red-50 p-3 sm:p-4 rounded-md text-red-700 text-center text-sm">
            <div className="mx-auto w-12 h-12 mb-2 text-red-500">
              <Zap className="w-full h-full" />
            </div>
            <p className="mb-2">{error}</p>
            <button
              onClick={fetchFlashSales}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (!flashSales || flashSales.length === 0) {
    return null
  }

  return (
    <section className="w-full mb-4 sm:mb-8">
      <div className="w-full">
        {/* Jumia-style Flash Sales Header - Responsive */}
        <div className="bg-cherry-900 text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Zap className={`text-yellow-300 ${isMobile ? "h-4 w-4" : "h-5 w-5"}`} />
            <h2 className={`font-bold whitespace-nowrap ${isMobile ? "text-xs" : "text-sm sm:text-base"}`}>
              {isMobile ? "Flash Sales" : "Flash Sales | Don't Miss Out!"}
            </h2>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:gap-2 sm:text-xs md:text-sm">
            <span className="hidden sm:inline">Time Left:</span>
            <div className="flex items-center gap-0.5 font-semibold sm:gap-1">
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
            className={`flex items-center gap-0.5 sm:gap-1 font-medium hover:underline whitespace-nowrap ${
              isMobile ? "text-[10px]" : "text-xs sm:text-sm"
            }`}
          >
            See All
            <ChevronRight className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
          </button>
        </div>

        {/* Carousel Container - Responsive */}
        <div className={isMobile ? "p-1" : "p-2"}>
          <div
            ref={carouselRef}
            className={`relative bg-gray-100 ${isMobile ? "overflow-hidden" : "overflow-hidden"}`}
            style={{
              maxWidth: isMobile ? "100vw" : undefined,
              width: isMobile ? "100vw" : undefined,
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Carousel Track */}
            {isMobile ? (
              <div
                className="flex gap-2 w-full overflow-x-auto scrollbar-hide"
                style={{
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  maxWidth: "100vw",
                  width: "100vw",
                  paddingBottom: "8px",
                }}
              >
                {flashSales.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 pointer-events-auto"
                    style={{
                      width: itemWidthPx,
                      minWidth: itemWidthPx,
                      maxWidth: itemWidthPx,
                      scrollSnapAlign: "start",
                    }}
                  >
                    <ProductCard product={product} isMobile={true} />
                  </div>
                ))}
              </div>
            ) : (
              // Desktop carousel
              <motion.div
                className="flex gap-[1px]"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                animate={{
                  x: `-${currentIndex * (isTablet ? 20 : 16.666)}%`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                }}
                style={{
                  cursor: isDragging ? "grabbing" : "grab",
                }}
              >
                {flashSales.map((product, index) => (
                  <motion.div
                    key={product.id}
                    className="flex-shrink-0 pointer-events-auto"
                    style={{ width: `${isTablet ? 20 : 16.666}%` }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <ProductCard product={product} isMobile={false} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Navigation Arrows - Desktop only */}
            <AnimatePresence>
              {!isMobile && isHovering && !isDragging && hoverSide === "left" && currentIndex > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-gray-200 text-gray-700 hover:text-gray-900 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:shadow-xl"
                  aria-label="Previous products"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!isMobile && isHovering && !isDragging && hoverSide === "right" && currentIndex < maxIndex && (
                <motion.button
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white border border-gray-200 text-gray-700 hover:text-gray-900 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:shadow-xl"
                  aria-label="Next products"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
