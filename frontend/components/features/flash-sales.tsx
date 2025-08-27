'use client'

import type React from 'react'
import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, Zap } from 'lucide-react'
import Image from 'next/image'
import type { Product } from '@/types'
import { productService } from '@/services/product'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useMediaQuery } from '@/hooks/use-media-query'

// Mizizzi Logo Component for loading state - Flash Sale version (not currently used but kept for parity)
const MizizziFlashSalePlaceholder = ({
  productName,
  isMobile,
}: {
  productName: string
  isMobile: boolean
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-cherry-100">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        className="mb-2"
      >
        <div className={`font-bold tracking-wider text-red-700 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
          {'MIZIZZI'}
        </div>
        <div className={`mt-1 font-medium text-red-600 ${isMobile ? 'text-[8px]' : 'text-xs'}`}>{'Flash Sale'}</div>
      </motion.div>

      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        className="mb-2"
      >
        <Zap className={`mx-auto text-yellow-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        className={`mx-auto rounded-full border-2 border-red-300 border-t-red-600 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`}
      />

      <div
        className={`mt-1 max-w-[100px] line-clamp-1 text-red-600/70 ${isMobile ? 'text-[8px]' : 'text-xs'}`}
      >
        {productName}
      </div>
    </motion.div>
  </div>
)

// Card for a single Flash Sale product (minimal, professional)
const ProductCard = memo(function ProductCard({
  product,
  isMobile,
}: {
  product: Product
  isMobile: boolean
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const discountPercentage = product.sale_price
    ? Math.max(0, Math.round(((product.price - product.sale_price) / product.price) * 100))
    : 0

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [product.id])

  const handleImageLoad = () => setImageLoaded(true)
  const handleImageError = () => setImageError(true)

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
          <div className={`relative overflow-hidden bg-[#f5f5f7] ${isMobile ? 'aspect-square' : 'aspect-[4/3]'}`}>
            {/* Product Image with subtle transitions */}
            <motion.div
              animate={{ scale: isHovering && !isMobile ? 1.03 : 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl || '/placeholder.svg?height=300&width=300&query=product-image'}
                alt={product.name}
                fill
                sizes={
                  isMobile
                    ? '50vw'
                    : '(max-width: 640px) 40vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 16vw'
                }
                className={`object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                </div>
              )}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="text-center">
                    <div className="mb-1 text-gray-400">
                      <svg className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className={`text-gray-500 ${isMobile ? 'text-[8px]' : 'text-xs'}`}>Image not available</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Sale Badge */}
            {product.sale_price && discountPercentage > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className={`absolute left-0 top-1 z-20 rounded-full bg-[#fa5252] px-1 py-0.5 font-medium text-white ${
                  isMobile ? 'text-[8px]' : 'text-[10px]'
                }`}
              >
                -{discountPercentage}%
              </motion.div>
            )}
          </div>

          <div className={`space-y-0.5 ${isMobile ? 'p-1' : 'p-3'}`}>
            {/* Flash Sale Badge */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.3 }} className="mb-1">
              <span
                className={`inline-block rounded-sm bg-red-100 px-1 py-0.5 font-medium text-red-700 ${
                  isMobile ? 'text-[8px]' : 'text-[10px]'
                }`}
              >
                FLASH SALE
              </span>
            </motion.div>

            {/* Details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.3 }} className="space-y-1">
              <h3 className={`line-clamp-2 font-medium leading-tight text-gray-900 ${isMobile ? 'text-xs' : 'text-sm'}`}>{product.name}</h3>
              <div className={`font-semibold text-gray-900 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                {'KSh ' + (product.sale_price || product.price).toLocaleString()}
              </div>
              {product.sale_price && (
                <div className={`line-through text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  {'KSh ' + product.price.toLocaleString()}
                </div>
              )}
            </motion.div>

            {/* Availability */}
            {(product.stock ?? 0) > 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.3 }} className="mt-1 flex items-center">
                <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className={`text-gray-500 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Available</span>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.3 }} className="mt-1 flex items-center">
                <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-gray-300" />
                <span className={`text-gray-500 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Out of stock</span>
              </motion.div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

// Helper function to get the best available product image URL
function getProductImageUrl(product: Product): string {
  if (Array.isArray((product as any).image_urls) && (product as any).image_urls.length > 0) {
    return (product as any).image_urls[0] as string
  }
  if ((product as any).thumbnail_url) {
    return (product as any).thumbnail_url as string
  }
  const anyProd = product as any
  if (Array.isArray(anyProd.images) && anyProd.images.length > 0 && anyProd.images[0]?.url) {
    return anyProd.images[0].url as string
  }
  return '/diverse-products-still-life.png'
}

// Enhanced skeleton loader with Apple-like styling matching ProductGrid
const FlashSalesSkeleton = ({ isMobile }: { isMobile: boolean }) => (
  <section className="mb-4 w-full sm:mb-8">
    <div className="w-full">
      <div className="flex items-center justify-between bg-cherry-900 px-2 py-1.5 text-white sm:px-4 sm:py-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={`${isMobile ? 'h-4 w-16' : 'h-5 w-20'} animate-pulse rounded bg-white/20`}></div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={`${isMobile ? 'h-4 w-24' : 'h-5 w-32'} animate-pulse rounded bg-white/20`}></div>
        </div>
        <div className={`${isMobile ? 'h-4 w-12' : 'h-5 w-16'} animate-pulse rounded bg-white/20`}></div>
      </div>

      <div className={isMobile ? 'p-1' : 'p-2'}>
        <div className="flex gap-[1px] bg-gray-100">
          {Array.from({ length: isMobile ? 4 : 6 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`flex-shrink-0 bg-white ${isMobile ? 'w-[calc(25%-1px)] p-1' : 'w-[200px] p-3'}`}
            >
              <div className={`relative mb-2 w-full overflow-hidden bg-[#f5f5f7] ${isMobile ? 'aspect-square' : 'aspect-[4/3]'}`}>
                <motion.div
                  animate={{ backgroundPosition: ['0% 0%', '100% 100%'], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-[#f5f5f7] via-[#e0e0e3] to-[#f5f5f7] bg-[length:400%_400%]"
                />
              </div>
              <div className="space-y-1">
                <Skeleton className={`${isMobile ? 'h-2' : 'h-3'} w-1/3 rounded-full bg-[#f5f5f7]`} />
                <Skeleton className={`${isMobile ? 'h-2' : 'h-3'} w-2/3 rounded-full bg-[#f5f5f7]`} />
                <Skeleton className={`${isMobile ? 'h-3' : 'h-4'} w-1/2 rounded-full bg-[#f5f5f7]`} />
                <div className="flex items-center gap-1 pt-1">
                  <Skeleton className={`${isMobile ? 'h-1 w-1' : 'h-1.5 w-1.5'} rounded-full bg-[#f5f5f7]`} />
                  <Skeleton className={`${isMobile ? 'h-2 w-8' : 'h-2 w-12'} rounded-full bg-[#f5f5f7]`} />
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
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 17, seconds: 1 })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const carouselRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Responsive settings
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isSmallMobile = useMediaQuery('(max-width: 480px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  // Reduce item width for mobile to fit more naturally and avoid overflow
  const itemsPerView = isSmallMobile ? 2 : isMobile ? 2.2 : isTablet ? 5 : 6
  const itemWidthPx = isSmallMobile ? 140 : isMobile ? 150 : 180

  // Track scroll position for mobile indicator (optional, currently unused)
  const [, setMobileScrollIndex] = useState(0)
  useEffect(() => {
    if (!isMobile || !carouselRef.current) return
    const handleScroll = () => {
      const scrollLeft = carouselRef.current!.scrollLeft
      setMobileScrollIndex(Math.round(scrollLeft / itemWidthPx))
    }
    const el = carouselRef.current
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [isMobile, itemWidthPx])

  // Fetch data
  const fetchFlashSales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const products = await productService.getFlashSaleProducts()
      if (products && products.length > 0) {
        setFlashSales(products.slice(0, 12))
      } else {
        const regularProducts = await productService.getProducts({ limit: 12 })
        setFlashSales(regularProducts || [])
      }
    } catch (err) {
      console.error('Error fetching flash sales:', err)
      setError('Failed to load flash sales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        await fetchFlashSales()
      } catch (e) {
        // ignore abort
      }
    })()
    return () => controller.abort()
  }, [fetchFlashSales])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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
    router.push('/flash-sales')
  }

  // Carousel navigation (desktop)
  const maxIndex = Math.max(0, Math.ceil(flashSales.length - itemsPerView))
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [])
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1))
  }, [maxIndex])

  // Mouse hover zones (desktop only)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!carouselRef.current || isDragging || isMobile) return
      const rect = carouselRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const leftHalf = x < rect.width / 2
      setHoverSide(leftHalf ? 'left' : 'right')
    },
    [isDragging, isMobile],
  )
  const handleMouseEnter = useCallback(() => {
    if (!isMobile) setIsHovering(true)
  }, [isMobile])
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    setHoverSide(null)
  }, [])

  // Touch handlers (mobile)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return
      const touch = e.touches[0]
      setTouchStart({ x: touch.clientX, y: touch.clientY })
      setTouchEnd(null)
      setIsDragging(true)
    },
    [isMobile],
  )
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !touchStart) return
      const touch = e.touches[0]
      setTouchEnd({ x: touch.clientX, y: touch.clientY })
      const deltaX = Math.abs(touch.clientX - touchStart.x)
      const deltaY = Math.abs(touch.clientY - touchStart.y)
      if (deltaX > deltaY && deltaX > 10) e.preventDefault()
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
        if (currentIndex < maxIndex) goToNext()
      } else {
        if (currentIndex > 0) goToPrevious()
      }
    }
    setTouchStart(null)
    setTouchEnd(null)
    setIsDragging(false)
  }, [isMobile, touchStart, touchEnd, currentIndex, maxIndex, goToPrevious, goToNext])

  // Desktop drag handlers
  const handleDragStart = useCallback(() => {
    if (isMobile) return
    setIsDragging(true)
    setHoverSide(null)
  }, [isMobile])
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isMobile) return
      setIsDragging(false)
      const threshold = 50
      const velocity = info.velocity.x
      const offset = info.offset.x
      if (Math.abs(offset) > threshold || Math.abs(velocity) > 300) {
        if (offset > 0 || velocity > 0) {
          if (currentIndex > 0) goToPrevious()
        } else {
          if (currentIndex < maxIndex) goToNext()
        }
      }
    },
    [isMobile, currentIndex, maxIndex, goToPrevious, goToNext],
  )

  // Desktop horizontal wheel navigation
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
            if (currentIndex < maxIndex) goToNext()
          } else {
            if (currentIndex > 0) goToPrevious()
          }
        }
      }
    }
    currentCarousel.addEventListener('wheel', handleWheelEvent, { passive: false })
    return () => currentCarousel.removeEventListener('wheel', handleWheelEvent)
  }, [currentIndex, maxIndex, goToPrevious, goToNext, isMobile])

  if (loading) return <FlashSalesSkeleton isMobile={isMobile} />
  if (error) {
    return (
      <section className="mb-4 w-full sm:mb-8">
        <div className="w-full p-1 sm:p-2">
          <div className="mb-2 sm:mb-4">
            <h2 className="text-base font-bold sm:text-lg lg:text-xl">Flash Sales</h2>
          </div>
          <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-600 sm:p-4">
            <div className="mx-auto mb-2 h-12 w-12 text-red-400">
              <Zap className="h-full w-full" />
            </div>
            <p className="mb-2">{error}</p>
            <button
              onClick={fetchFlashSales}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    )
  }
  if (!flashSales || flashSales.length === 0) return null

  return (
    // Remove extra section/wrapper so it fits inside the parent page
    <div className="w-full">
      {/* Flash Sale Header - align and share bg with parent */}
      <div className="flex items-center justify-between px-2 py-1.5 sm:px-4 sm:py-2 bg-cherry-900 text-white rounded-t-md">
        <div className="flex items-center gap-1 sm:gap-2">
          <Zap className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-300`} />
          <h2 className={`whitespace-nowrap font-bold ${isMobile ? 'text-xs' : 'text-sm sm:text-base'}`}>
            {isMobile ? 'Flash Sales' : "Flash Sales | Don't Miss Out!"}
          </h2>
        </div>
        <div className={`flex items-center font-semibold ${isMobile ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
          <span className="hidden sm:inline">Time Left:</span>
          <div className="ml-1 flex items-center gap-0.5 sm:ml-2 sm:gap-1">
            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
            <span>h</span>
            <span>:</span>
            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span>m</span>
            <span>:</span>
            <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span>s</span>
          </div>
        </div>
        <button
          onClick={handleViewAll}
          className={`flex items-center whitespace-nowrap font-medium hover:underline ${isMobile ? 'gap-0.5 text-[10px]' : 'gap-1 text-xs sm:text-sm'}`}
        >
          See All
          <ChevronRight className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
        </button>
      </div>

      {/* Carousel Container - align and share bg with parent */}
      <div className={isMobile ? 'p-1' : 'p-2'}>
        <div
          ref={carouselRef}
          className={`relative bg-gray-100 rounded-b-md ${isMobile ? 'overflow-hidden' : 'overflow-hidden'}`}
          style={{ maxWidth: isMobile ? '100vw' : undefined, width: isMobile ? '100vw' : undefined }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isMobile ? (
            <div
              className="scrollbar-hide flex w-full gap-2 overflow-x-auto"
              style={{
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                maxWidth: '100vw',
                width: '100vw',
                paddingBottom: '8px',
              }}
            >
              {flashSales.map(product => (
                <div
                  key={product.id}
                  className="pointer-events-auto flex-shrink-0"
                  style={{
                    width: itemWidthPx,
                    minWidth: itemWidthPx,
                    maxWidth: itemWidthPx,
                    scrollSnapAlign: 'start',
                  }}
                >
                  <ProductCard product={product} isMobile={true} />
                </div>
              ))}
            </div>
          ) : (
            // Desktop: draggable track
            <motion.div
              className="flex gap-[1px]"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              animate={{ x: `-${currentIndex * (isTablet ? 20 : 16.666)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {flashSales.map((product, index) => (
                <motion.div
                  key={product.id}
                  className="pointer-events-auto flex-shrink-0"
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
            {!isMobile && isHovering && !isDragging && hoverSide === 'left' && currentIndex > 0 && (
              <motion.button
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 p-2 text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-gray-900"
                aria-label="Previous products"
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!isMobile && isHovering && !isDragging && hoverSide === 'right' && currentIndex < maxIndex && (
              <motion.button
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={goToNext}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 p-2 text-gray-700 shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-gray-900"
                aria-label="Next products"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
