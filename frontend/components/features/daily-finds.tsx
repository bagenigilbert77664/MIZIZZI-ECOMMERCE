"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import Image from "next/image"
import type { Product as BaseProduct } from "@/types"
import { productService } from "@/services/product"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

type Product = BaseProduct & { color_options?: string[]; stock?: number }

function getValidImageUrl(product: Product): string {
  const validUrls = Array.isArray(product.image_urls)
    ? product.image_urls.filter((url) => {
        if (typeof url !== "string") return false
        return (
          !url.startsWith("blob:") && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))
        )
      })
    : []

  if (validUrls.length > 0) {
    return validUrls[0]
  }

  if (product.thumbnail_url && !product.thumbnail_url.startsWith("blob:")) {
    return product.thumbnail_url
  }

  return "/diverse-fashion-display.png"
}

const LogoPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative h-16 w-16 sm:h-20 sm:w-20"
    >
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
        alt="Loading"
        fill
        className="object-contain"
        priority
      />
    </motion.div>
  </div>
)

const ProductCard = memo(({ product }: { product: Product }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [canHover, setCanHover] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const imageUrl = getValidImageUrl(product)

  useEffect(() => {
    if (typeof window !== "undefined" && "matchMedia" in window) {
      const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
      setCanHover(mq.matches)
      const handler = (e: MediaQueryListEvent) => setCanHover(e.matches)
      mq.addEventListener?.("change", handler)
      return () => mq.removeEventListener?.("change", handler)
    }
  }, [])

  const colorOptions = product.color_options || []
  const hasMoreColors = colorOptions.length > 3
  const displayColors = colorOptions.slice(0, 3)
  const additionalColors = hasMoreColors ? colorOptions.length - 3 : 0

  const isOnSale = typeof product.sale_price === "number" && product.sale_price < product.price
  const discount = isOnSale ? Math.round(((product.price - (product.sale_price as number)) / product.price) * 100) : 0

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [product.id])

  const imageScale = canHover && !prefersReducedMotion && isHovering ? 1.05 : 1

  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      className="h-full"
    >
      <Link href={`/product/${product.id}`} prefetch={false} className="block h-full">
        <div
          className={[
            "group relative h-full overflow-hidden bg-white",
            "rounded-sm border border-gray-100",
            "transition-all duration-200 ease-out",
            "hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-gray-200",
          ].join(" ")}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
            <motion.div
              style={{ willChange: "transform" }}
              animate={{ scale: imageScale }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes="(max-width: 420px) 50vw, (max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                className={`object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />

              {!imageLoaded && !imageError && <LogoPlaceholder />}

              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="text-center">
                    <div className="mb-1 text-gray-400">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div className="absolute left-2 top-2 rounded-full bg-[#f68b1e] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm sm:left-3 sm:top-3 sm:px-2">
                -{discount}%
              </div>
            )}
          </div>

          <div className="p-2 sm:p-3">
            <div className="space-y-1">
              <h3 className="line-clamp-2 text-[13px] font-medium leading-tight text-gray-900 sm:text-sm">
                {product.name}
              </h3>
              <div className="text-[13px] font-semibold text-gray-900 sm:text-sm">
                {"KSh " +
                  (
                    (typeof product.sale_price === "number" ? product.sale_price : product.price) as number
                  ).toLocaleString()}
              </div>
              {isOnSale && (
                <div className="text-[11px] text-gray-500 line-through sm:text-xs">
                  KSh {product.price.toLocaleString()}
                </div>
              )}
            </div>

            {displayColors.length > 0 && (
              <div className="mt-2 flex gap-1.5">
                {displayColors.map((color: string, idx: number) => (
                  <motion.div
                    key={`${color}-${idx}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.04 + idx * 0.04, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-2.5 w-2.5 rounded-full border border-gray-200 shadow-sm sm:h-3 sm:w-3"
                    style={{ backgroundColor: color.toLowerCase() }}
                    aria-label={`Color ${color}`}
                    title={color}
                  />
                ))}
                {hasMoreColors && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.2 }}
                    className="self-center text-[10px] text-gray-500"
                  >
                    +{additionalColors}
                  </motion.span>
                )}
              </div>
            )}

            {(product.stock ?? 0) > 0 && (
              <div className="mt-2 flex items-center">
                <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-gray-500">Available</span>
              </div>
            )}
            {(product.stock ?? 0) === 0 && (
              <div className="mt-2 flex items-center">
                <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-gray-300" />
                <span className="text-[10px] text-gray-500">Out of stock</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

ProductCard.displayName = "ProductCard"

const DailyFindsSkeleton = ({ count = 12 }: { count?: number }) => (
  <section className="w-full mb-4 sm:mb-8">
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="bg-white flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-100">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse sm:h-6" />
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse sm:h-5 sm:w-20" />
      </div>

      <div className="p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3 2xl:grid-cols-6 2xl:gap-4">
          {[...Array(count)].map((_, i) => (
            <motion.div
              key={i}
              role="listitem"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col bg-white"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f5f5f7]">
                <motion.div
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%"], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-[#f5f5f7] via-[#e0e0e3] to-[#f5f5f7] bg-[length:400%_400%]"
                />
              </div>
              <div className="space-y-2 p-2 sm:p-3">
                <Skeleton className="h-3 w-3/4 rounded-full bg-[#f5f5f7]" />
                <Skeleton className="h-3 w-1/2 rounded-full bg-[#f5f5f7]" />
                <Skeleton className="h-4 w-1/3 rounded-full bg-[#f5f5f7]" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-3 w-3 rounded-full bg-[#f5f5f7]" />
                  <Skeleton className="h-3 w-3 rounded-full bg-[#f5f5f7]" />
                  <Skeleton className="h-3 w-3 rounded-full bg-[#f5f5f7]" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

export function DailyFinds() {
  const [dailyFinds, setDailyFinds] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchDailyFinds = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const products = await productService.getProducts({
        limit: 12,
        sort_by: "created_at",
        sort_order: "desc",
      })

      if (products && products.length > 0) {
        setDailyFinds(products.slice(0, 12))
      }
    } catch (error) {
      console.error("Error fetching daily finds:", error)
      setError("Failed to load daily finds")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        await fetchDailyFinds()
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in daily finds fetch:", error)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [fetchDailyFinds])

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/products")
  }

  if (loading) {
    return <DailyFindsSkeleton count={12} />
  }

  if (error || !dailyFinds || dailyFinds.length === 0) {
    return null
  }

  return (
    <section className="w-full mb-4 sm:mb-8">
      <div className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="bg-white flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 sm:text-base md:text-lg">Daily Finds | Today Only</h2>

          <button
            onClick={handleViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-[#f68b1e] transition-colors hover:text-[#d97a19] sm:text-sm"
          >
            See All
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          <motion.div
            role="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3 2xl:grid-cols-6 2xl:gap-4"
          >
            {dailyFinds.map((product, index) => (
              <ProductCard key={`${product.id}-${index}`} product={product} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
