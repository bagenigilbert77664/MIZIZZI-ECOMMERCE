"use client"

import { useState, useEffect, useCallback, useRef, memo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { productService } from "@/services/product"
import { ShoppingBag } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"
import type { Product as BaseProduct } from "@/types"

type Product = BaseProduct & { color_options?: string[]; stock?: number }

// Branded placeholder while images load
const MizizziPlaceholder = ({ productName }: { productName: string }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-cherry-50 to-cherry-100">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="text-center"
    >
      <div className="mb-2 text-lg font-bold tracking-wider text-cherry-700 sm:text-2xl">MIZIZZI</div>
      <div className="text-[10px] font-medium text-cherry-600 sm:text-xs">Premium Fashion</div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="mx-auto mt-3 h-4 w-4 rounded-full border-2 border-cherry-300 border-t-cherry-600 sm:h-5 sm:w-5"
      />
      <div className="mt-2 line-clamp-1 max-w-[140px] text-[10px] text-cherry-600/70 sm:text-xs">{productName}</div>
    </motion.div>
  </div>
)

// Clean, professional card with subtle hover on pointer devices only
const ProductCard = memo(({ product }: { product: Product }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [canHover, setCanHover] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Detect hover-capable devices (avoid hover animations on touch)
  useEffect(() => {
    if (typeof window !== "undefined" && "matchMedia" in window) {
      const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
      setCanHover(mq.matches)
      const handler = (e: MediaQueryListEvent) => setCanHover(e.matches)
      mq.addEventListener?.("change", handler)
      return () => mq.removeEventListener?.("change", handler)
    }
  }, [])

  // Colors
  const colorOptions = product.color_options || []
  const hasMoreColors = colorOptions.length > 3
  const displayColors = colorOptions.slice(0, 3)
  const additionalColors = hasMoreColors ? colorOptions.length - 3 : 0

  // Sale
  const isOnSale = typeof product.sale_price === "number" && product.sale_price < product.price
  const discount = isOnSale ? Math.round(((product.price - (product.sale_price as number)) / product.price) * 100) : 0

  // Reset load state when product changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [product.id])

  const imageScale = canHover && !prefersReducedMotion && isHovering ? 1.012 : 1

  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      className="h-full"
    >
      <Link href={`/product/${product.id}`} prefetch={false} className="block h-full">
        <div
          className={[
            "group relative h-full overflow-hidden rounded-md bg-white",
            // Subtle, clean elevation on hover (no borders)
            "transition-shadow duration-200 ease-out",
            "hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]",
          ].join(" ")}
        >
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
            <motion.div
              style={{ willChange: "transform" }}
              animate={{ scale: imageScale }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={
                  (product.image_urls && product.image_urls[0]) ||
                  product.thumbnail_url ||
                  "/placeholder.svg?height=400&width=600&query=fashion%20product"
                }
                alt={product.name}
                fill
                sizes="(max-width: 420px) 50vw, (max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                className={`object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />

              {!imageLoaded && !imageError && <MizizziPlaceholder productName={product.name} />}

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
                        <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500">Image not available</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Sale Badge (subtle orange) */}
            {isOnSale && (
              <div className="absolute left-2 top-2 rounded-full bg-[#f68b1e] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm sm:left-3 sm:top-3 sm:px-2">
                -{discount}%
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-2 sm:p-3">
            <div className="space-y-1">
              <h3 className="line-clamp-2 text-[13px] font-medium leading-tight text-gray-900 sm:text-sm">{product.name}</h3>
              <div className="text-[13px] font-semibold text-gray-900 sm:text-sm">
                {"KSh " +
                  ((typeof product.sale_price === "number" ? product.sale_price : product.price) as number).toLocaleString()}
              </div>
              {isOnSale && <div className="text-[11px] text-gray-500 line-through sm:text-xs">KSh {product.price.toLocaleString()}</div>}
            </div>

            {/* Colors */}
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

            {/* Availability */}
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

// Skeletons
const ProductGridSkeleton = ({ count = 12 }: { count?: number }) => (
  <div
    role="list"
    className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3 2xl:grid-cols-6 2xl:gap-4"
  >
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
)

interface ProductGridProps {
  categorySlug?: string
  limit?: number
}

export function ProductGrid({ categorySlug, limit = 24 }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      let fetched: Product[] = []
      if (categorySlug) {
        fetched = await productService.getProductsByCategory(categorySlug)
      } else {
        fetched = await productService.getProducts({ limit })
      }

      const unique = fetched.filter((p, i, arr) => i === arr.findIndex((x) => x.id === p.id))
      setProducts(unique)
      setHasMore(unique.length >= Math.min(limit, 12))
      setPage(1)
    } catch (e) {
      console.error("Error fetching products:", e)
      setError("Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [categorySlug, limit])

  // Load more (infinite scroll)
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore) return
    try {
      setLoadingMore(true)
      const nextPage = page + 1
      const more = await productService.getProducts({
        page: nextPage,
        limit: 12,
        category_slug: categorySlug,
      })
      if (!more.length) {
        setHasMore(false)
      } else {
        setProducts((prev) => {
          const combined = [...prev, ...more]
          return combined.filter((p, i, arr) => i === arr.findIndex((x) => x.id === p.id))
        })
        setPage(nextPage)
      }
    } catch (e) {
      console.error("Error loading more products:", e)
    } finally {
      setLoadingMore(false)
    }
  }, [categorySlug, hasMore, loadingMore, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // IntersectionObserver (preload a bit earlier on mobile)
  useEffect(() => {
    if (loadMoreRef.current && !loading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMoreProducts()
          }
        },
        { threshold: 0.1, rootMargin: "200px 0px" }
      )
      observerRef.current.observe(loadMoreRef.current)
    }
    return () => observerRef.current?.disconnect()
  }, [hasMore, loadingMore, loading, loadMoreProducts])

  // UI states
  if (loading) return <ProductGridSkeleton count={limit > 12 ? 12 : limit} />

  if (error) {
    return (
      <div className="w-full p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 text-cherry-600">
          <ShoppingBag className="h-full w-full" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-gray-900">Oops! Something went wrong</h3>
        <p className="mb-4 text-gray-500">{error}</p>
        <button
          onClick={fetchProducts}
          className="rounded-md bg-cherry-600 px-4 py-2 text-white transition-colors hover:bg-cherry-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="w-full py-12 text-center">
        <div className="mx-auto mb-4 h-16 w-16 text-gray-300">
          <ShoppingBag className="h-full w-full" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-gray-900">No products found</h3>
        <p className="text-gray-500">We couldn&apos;t find any products in this category.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <motion.div
        role="list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-5 xl:gap-3 2xl:grid-cols-6 2xl:gap-4"
      >
        {products.map((product, index) => (
          <ProductCard key={`${product.id}-${index}`} product={product} />
        ))}
      </motion.div>

      {hasMore && (
        <div ref={loadMoreRef} className="mt-6 flex items-center justify-center py-4">
          {loadingMore ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-gray-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-500"
              />
              <span className="text-sm font-medium">Loading more products</span>
            </motion.div>
          ) : (
            <div className="h-8 w-full max-w-sm rounded-full bg-[#f5f5f7]" />
          )}
        </div>
      )}
    </div>
  )
}
