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

// Mizizzi Logo Component for loading state - Flash Sale version
const MizizziFlashSalePlaceholder = ({ productName, isMobile }: { productName: string; isMobile: boolean }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-cherry-100">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-center"
    >
      {/* Mizizzi Logo/Brand with Flash Sale styling */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="mb-2"
      >
        <div className={`font-bold text-red-700 tracking-wider ${isMobile ? "text-lg" : "text-2xl"}`}>MIZIZZI</div>
        <div className={`text-red-600 font-medium mt-1 ${isMobile ? "text-[8px]" : "text-xs"}`}>Flash Sale</div>
      </motion.div>

      {/* Flash Sale Lightning Effect */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 1,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="mb-2"
      >
        <Zap className={`text-yellow-500 mx-auto ${isMobile ? "h-3 w-3" : "h-4 w-4"}`} />
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className={`border-2 border-red-300 border-t-red-600 rounded-full mx-auto ${isMobile ? "w-4 h-4" : "w-5 h-5"}`}
      />

      {/* Product name hint */}
      <div className={`mt-1 text-red-600/70 max-w-[100px] line-clamp-1 ${isMobile ? "text-[8px]" : "text-xs"}`}>
        {productName}
      </div>
    </motion.div>
  </div>
)

// Enhanced Product Card with Apple-like styling matching ProductGrid
const ProductCard = memo(({ product, isMobile }: { product: Product; isMobile: boolean }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const discountPercentage = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  // Handle image load error
  const handleImageError = () => {
    setImageError(true)
  }

  // Reset states when product changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [product.id])

  // Determine the image URL to use
  const imageUrl = getProductImageUrl(product)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      whileHover={{ y: isMobile ? 0 : -4 }}
      className="h-full"
    >
      <Link href={`/product/${product.id}`} prefetch={false} className="block h-full">
        <div className="group h-full overflow-hidden bg-white transition-all duration-300 ease-out">
          <div className={`relative overflow-hidden bg-[#f5f5f7] ${isMobile ? "aspect-square" : "aspect-[4/3]"}`}>
            {/* Product Image with Apple-like transitions */}
            <motion.div
              animate={{
                scale: isHovering && !isMobile ? 1.03 : 1,
              }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes={
                  isMobile ? "25vw" : "(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 16vw, 14vw"
                }
                className={`object-cover transition-opacity duration-700 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />

              {/* Image loading placeholder */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div
                    className={`rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin ${isMobile ? "h-4 w-4" : "h-6 w-6"}`}
                  ></div>
                </div>
              )}

              {/* Image error placeholder */}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="text-center">
                    <div className="text-gray-400 mb-1">
                      <svg
                        className={isMobile ? "w-4 h-4" : "w-6 h-6"}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
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
                    <span className={`text-gray-500 ${isMobile ? "text-[8px]" : "text-xs"}`}>Image not available</span>
                  </div>
                </div>
              )}
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
            {/* Flash Sale Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mb-1"
            >
              <span
                className={`inline-block rounded-sm bg-red-100 px-1 py-0.5 font-medium text-red-700 ${
                  isMobile ? "text-[8px]" : "text-[10px]"
                }`}
              >
                FLASH SALE
              </span>
            </motion.div>

            {/* Product details with Apple-like typography */}
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
              <div className={`font-semibold text-gray-900 ${isMobile ? "text-sm" : "text-sm"}`}>
                KSh {(product.sale_price || product.price).toLocaleString()}
              </div>

              {product.sale_price && (
                <div className={`text-gray-500 line-through ${isMobile ? "text-xs" : "text-xs"}`}>
                  KSh {product.price.toLocaleString()}
                </div>
              )}
            </motion.div>

            {/* Apple-like "Available" indicator */}
            {(product.stock ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center mt-1"
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
                className="flex items-center mt-1"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-1.5"></div>
                <span className={`text-gray-500 ${isMobile ? "text-[8px]" : "text-[10px]"}`}>Out of stock</span>
              </motion.div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
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

// Enhanced skeleton loader with Apple-like styling matching ProductGrid
const FlashSalesSkeleton = ({ isMobile }: { isMobile: boolean }) => (
  <section className="w-full mb-4 sm:mb-8">
    <div className="w-full">
      <div className="bg-cherry-900 text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={`bg-white/20 rounded animate-pulse ${isMobile ? "h-4 w-16" : "h-5 w-20"}`}></div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={`bg-white/20 rounded animate-pulse ${isMobile ? "h-4 w-24" : "h-5 w-32"}`}></div>
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
              className={`bg-white flex-shrink-0 ${isMobile ? "p-1 w-[calc(25%-1px)]" : "p-3 w-[200px]"}`}
            >
              <div
                className={`w-full mb-2 bg-[#f5f5f7] relative overflow-hidden ${isMobile ? "aspect-square" : "aspect-[4/3]"}`}
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
              </div>
              <div className="space-y-1">
                <Skeleton className={`w-1/3 rounded-full bg-[#f5f5f7] ${isMobile ? "h-2" : "h-3"}`} />
                <Skeleton className={`w-2/3 rounded-full bg-[#f5f5f7] ${isMobile ? "h-2" : "h-3"}`} />
                <Skeleton className={`w-1/2 rounded-full bg-[#f5f5f7] ${isMobile ? "h-3" : "h-4"}`} />
                <div className="flex items-center gap-1 pt-1">
                  <Skeleton className={`rounded-full bg-[#f5f5f7] ${isMobile ? "h-1 w-1" : "h-1.5 w-1.5"}`} />
                  <Skeleton className={`rounded-full bg-[#f5f5f7] ${isMobile ? "h-2 w-8" : "h-2 w-12"}`} />
                </div>
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
  const [timeLeft, setTimeLeft] = useState({
    hours: 1,
    minutes: 17,
    seconds: 1,
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Enhanced responsive settings
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isSmallMobile = useMediaQuery("(max-width: 480px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // More granular responsive settings
  const itemsPerView = isSmallMobile ? 4 : isMobile ? 4 : isTablet ? 5 : 6
  const itemWidth = isSmallMobile ? 25 : isMobile ? 25 : isTablet ? 20 : 16.666 // percentage

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchFlashSales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use the correct API endpoint for flash sale products
      const products = await productService.getFlashSaleProducts()

      if (products && products.length > 0) {
        setFlashSales(products.slice(0, 12)) // Limit to 12 products max
      } else {
        // Fallback to regular products if no flash sale products
        const regularProducts = await productService.getProducts({ limit: 12 })
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

  // Carousel navigation functions
  const maxIndex = Math.max(0, flashSales.length - itemsPerView)

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }, [maxIndex])

  // Handle mouse movement for hover detection (desktop only)
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

  // Enhanced touch handling for mobile
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

  // Handle drag/swipe functionality for desktop
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

  // Handle manual horizontal scrolling with wheel (desktop only)
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
          <div className="bg-red-50 p-3 sm:p-4 rounded-md text-red-600 text-center text-sm">
            <div className="mx-auto w-12 h-12 mb-2 text-red-400">
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
        {/* Jumia-style Flash Sale Header - Responsive */}
        <div className="bg-cherry-900 text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Zap className={`text-yellow-300 ${isMobile ? "h-4 w-4" : "h-5 w-5"}`} />
            <h2 className={`font-bold whitespace-nowrap ${isMobile ? "text-xs" : "text-sm sm:text-base"}`}>
              {isMobile ? "Flash Sales" : "Flash Sales | Don't Miss Out!"}
            </h2>
          </div>

          <div className={`flex items-center gap-1 sm:gap-2 ${isMobile ? "text-[10px]" : "text-xs sm:text-sm"}`}>
            <span className="hidden sm:inline">Time Left:</span>
            <div className="flex items-center gap-0.5 sm:gap-1 font-semibold">
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
            className={`relative overflow-hidden bg-gray-100 ${
              isMobile ? "touch-pan-y" : "cursor-grab active:cursor-grabbing"
            }`}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              touchAction: isMobile ? "pan-y" : "auto",
            }}
          >
            {/* Carousel Track */}
            <motion.div
              className="flex gap-[1px]"
              drag={!isMobile ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              animate={{
                x: `-${currentIndex * itemWidth}%`,
              }}
              transition={{
                type: "spring",
                stiffness: isMobile ? 400 : 300,
                damping: isMobile ? 35 : 30,
                mass: 0.8,
              }}
              style={{
                cursor: !isMobile && isDragging ? "grabbing" : !isMobile ? "grab" : "default",
              }}
            >
              {flashSales.map((product, index) => (
                <motion.div
                  key={product.id}
                  className="flex-shrink-0 pointer-events-auto"
                  style={{ width: `${itemWidth}%` }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ProductCard product={product} isMobile={isMobile} />
                </motion.div>
              ))}
            </motion.div>

            {/* Navigation Arrows - Hidden on mobile, visible on desktop */}
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

            {/* Mobile swipe indicator */}
            {isMobile && flashSales.length > itemsPerView && (
              <div className="absolute bottom-1 right-1 flex space-x-1">
                {Array.from({ length: Math.ceil(flashSales.length / itemsPerView) }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                      Math.floor(currentIndex / itemsPerView) === index ? "bg-cherry-600" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
