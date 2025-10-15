"use client"

import type React from "react"
import { useState, useEffect, useCallback, memo, useRef } from "react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Star } from "lucide-react"
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

  const discountPercentage = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0

  const handleImageLoad = () => {
    setImageLoaded(true)
    setTimeout(() => {
      setShowPlaceholder(false)
    }, 400)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setShowPlaceholder(true)
  }, [product.id])

  const imageUrl = getProductImageUrl(product)

  return (
    <Link href={`/product/${product.slug || product.id}`} prefetch={false}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
        className="h-full"
      >
        <div className="group h-full overflow-hidden bg-white transition-all duration-300 ease-out flex-shrink-0 rounded-sm border border-gray-100 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-gray-200">
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
                scale: imageLoaded ? 1 : 1.1,
              }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-hidden"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative w-full h-full"
              >
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  sizes={
                    isMobile
                      ? "25vw"
                      : "(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 16vw, 14vw"
                  }
                  className="object-cover transition-opacity duration-700"
                  loading="lazy"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxuczpsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSMjZWVlZWVlIiAvPjwvc3ZnPg=="
                />
              </motion.div>
            </motion.div>

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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mb-1"
            >
              <span
                className={`inline-block rounded-sm bg-yellow-50 px-1 py-0.5 font-medium text-yellow-700 ${
                  isMobile ? "text-[8px]" : "text-[10px]"
                }`}
              >
                TOP PICK
              </span>
            </motion.div>

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

              <div>
                <span className={`font-semibold text-gray-900 ${isMobile ? "text-sm" : "text-base"}`}>
                  KSh {(product.sale_price || product.price).toLocaleString()}
                </span>
                {product.sale_price && (
                  <div className={`text-gray-500 line-through ${isMobile ? "text-xs" : "text-sm"}`}>
                    KSh {product.price.toLocaleString()}
                  </div>
                )}
              </div>
            </motion.div>

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
  if (product.image_urls && product.image_urls.length > 0) {
    if (typeof product.image_urls[0] === "string" && !product.image_urls[0].startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.image_urls[0])
    }
    return product.image_urls[0]
  }

  if (product.thumbnail_url) {
    if (typeof product.thumbnail_url === "string" && !product.thumbnail_url.startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.thumbnail_url)
    }
    return product.thumbnail_url
  }

  if (product.images && product.images.length > 0 && product.images[0].url) {
    if (typeof product.images[0].url === "string" && !product.images[0].url.startsWith("http")) {
      return cloudinaryService.generateOptimizedUrl(product.images[0].url)
    }
    return product.images[0].url
  }

  return "/placeholder.svg?height=300&width=300"
}

const TopPicksSkeleton = ({ isMobile }: { isMobile: boolean }) => (
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
                  className="relative z-10"
                >
                  <div className={`relative ${isMobile ? "h-6 w-6" : "h-8 w-8"}`}>
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                      alt="Loading"
                      fill
                      className="object-contain opacity-60"
                    />
                  </div>
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

export function TopPicks() {
  const [topPicks, setTopPicks] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  const itemsPerView = isSmallMobile ? 2 : isMobile ? 2.2 : isTablet ? 5 : 6
  const itemWidthPx = isSmallMobile ? 140 : isMobile ? 150 : 180

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

  const fetchTopPicks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const products = await productService.getProducts({
        limit: 12,
        sort_by: "rating",
        sort_order: "desc",
      })

      if (products && products.length > 0) {
        const processedProducts = products.map((product) => ({
          ...product,
          image_urls: (product.image_urls || []).map((url) => {
            if (typeof url === "string" && !url.startsWith("http")) {
              return cloudinaryService.generateOptimizedUrl(url)
            }
            return url
          }),
        }))
        setTopPicks(processedProducts.slice(0, 12))
      } else {
        const regularProducts = await productService.getProducts({
          limit: 12,
          sort_by: "price",
          sort_order: "asc",
        })
        const processedProducts = regularProducts.map((product) => ({
          ...product,
          image_urls: (product.image_urls || []).map((url) => {
            if (typeof url === "string" && !url.startsWith("http")) {
              return cloudinaryService.generateOptimizedUrl(url)
            }
            return url
          }),
        }))
        setTopPicks(processedProducts || [])
      }
    } catch (error) {
      console.error("Error fetching top picks:", error)
      setError("Failed to load top picks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        await fetchTopPicks()
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in top picks fetch:", error)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [fetchTopPicks])

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/products?sort=rating")
  }

  const maxIndex = Math.max(0, topPicks.length - itemsPerView)

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

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        if (currentIndex < maxIndex) {
          goToNext()
        }
      } else {
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
    if (isMobile) return
    setIsDragging(true)
    setHoverSide(null)
  }, [isMobile])

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isMobile) return
      setIsDragging(false)

      const threshold = 50
      const velocity = info.velocity.x
      const offset = info.offset.x

      if (Math.abs(offset) > threshold || Math.abs(velocity) > 300) {
        if (offset > 0 || velocity > 0) {
          if (currentIndex > 0) {
            goToPrevious()
          }
        } else {
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

    const handleWheelEvent = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault()

        const threshold = 10
        const delta = e.deltaX || e.deltaY

        if (Math.abs(delta) > threshold) {
          if (delta > 0) {
            if (currentIndex < maxIndex) {
              goToNext()
            }
          } else {
            if (currentIndex > 0) {
              goToPrevious()
            }
          }
        }
      }
    }

    currentCarousel.addEventListener("wheel", handleWheelEvent, { passive: false })

    return () => {
      currentCarousel.removeEventListener("wheel", handleWheelEvent)
    }
  }, [currentIndex, maxIndex, goToPrevious, goToNext, isMobile])

  if (loading) {
    return <TopPicksSkeleton isMobile={isMobile} />
  }

  if (error) {
    return (
      <section className="w-full mb-4 sm:mb-8">
        <div className="w-full p-1 sm:p-2">
          <div className="mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold">Top Picks</h2>
          </div>
          <div className="bg-yellow-50 p-3 sm:p-4 rounded-md text-yellow-700 text-center text-sm">
            <div className="mx-auto w-12 h-12 mb-2 text-yellow-500">
              <Star className="w-full h-full fill-yellow-500" />
            </div>
            <p className="mb-2">{error}</p>
            <button
              onClick={fetchTopPicks}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (!topPicks || topPicks.length === 0) {
    return null
  }

  return (
    <section className="w-full mb-4 sm:mb-8">
      <div className="w-full">
        <div className="bg-cherry-900 text-white flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Star className={`text-yellow-300 fill-yellow-300 ${isMobile ? "h-4 w-4" : "h-5 w-5"}`} />
            <h2 className={`font-bold whitespace-nowrap ${isMobile ? "text-xs" : "text-sm sm:text-base"}`}>
              {isMobile ? "Top Picks" : "Top Picks For You | Highly Rated!"}
            </h2>
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
                {topPicks.map((product, index) => (
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
                {topPicks.map((product, index) => (
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
