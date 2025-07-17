"use client"

import { useState, useEffect, useCallback, useRef, memo } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { productService } from "@/services/product"
import { ShoppingBag } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Product as BaseProduct } from "@/types"

type Product = BaseProduct & {
  color_options?: string[]
}

// Mizizzi Logo Component for loading state
const MizizziPlaceholder = ({ productName }: { productName: string }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-cherry-50 to-cherry-100">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-center"
    >
      {/* Mizizzi Logo/Brand */}
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
        className="mb-3"
      >
        <div className="text-3xl font-bold text-cherry-700 tracking-wider">MIZIZZI</div>
        <div className="text-xs text-cherry-600 font-medium mt-1">Premium Fashion</div>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="w-6 h-6 border-2 border-cherry-300 border-t-cherry-600 rounded-full mx-auto"
      />

      {/* Product name hint */}
      <div className="mt-2 text-xs text-cherry-600/70 max-w-[120px] line-clamp-1">{productName}</div>
    </motion.div>
  </div>
)

// Enhanced Product Card with Mizizzi branding during loading
const ProductCard = memo(({ product }: { product: Product }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // Ensure we have color options
  const colorOptions = product.color_options || []
  const hasMoreColors = colorOptions.length > 3
  const displayColors = colorOptions.slice(0, 3)
  const additionalColors = colorOptions.length > 3 ? colorOptions.length - 3 : 0

  // Calculate discount percentage
  const calculateDiscount = () => {
    if (!product.sale_price || product.sale_price >= product.price) return 0
    return Math.round(((product.price - product.sale_price) / product.price) * 100)
  }

  // Determine if product is on sale
  const isOnSale = product.sale_price && product.sale_price < product.price

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link href={`/product/${product.id}`} prefetch={false} className="block h-full">
        <div className="group h-full overflow-hidden bg-white transition-all duration-300 ease-out">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
            {/* Product Image with Apple-like transitions */}
            <motion.div
              animate={{
                scale: isHovering ? 1.03 : 1,
              }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={(product.image_urls && product.image_urls[0]) || product.thumbnail_url || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                className={`object-cover transition-opacity duration-700 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />

              {/* Image loading placeholder */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin"></div>
                </div>
              )}

              {/* Image error placeholder */}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <div className="text-center">
                    <div className="text-gray-400 mb-1">
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

            {/* Sale Badge with Apple-like styling */}
            {isOnSale && (
              <div className="absolute left-3 top-3 rounded-full bg-[#fa5252] px-2 py-0.5 text-[10px] font-medium text-white">
                -{calculateDiscount()}%
              </div>
            )}
          </div>

          <div className="p-3">
            {/* Product details with Apple-like typography */}
            <div className="space-y-1">
              <h3 className="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{product.name}</h3>

              {/* Pricing with Apple-like styling */}
              <div className="text-sm font-semibold text-gray-900">
                KSh {(product.sale_price || product.price).toLocaleString()}
              </div>

              {isOnSale && (
                <div className="text-xs text-gray-500 line-through">KSh {product.price.toLocaleString()}</div>
              )}
            </div>

            {/* Color options with Apple-like presentation */}
            {displayColors.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {displayColors.map((color: string, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="h-3 w-3 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: color.toLowerCase() }}
                  />
                ))}
                {hasMoreColors && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    className="text-[10px] text-gray-500 self-center"
                  >
                    +{additionalColors}
                  </motion.span>
                )}
              </div>
            )}

            {/* Apple-like "Available" indicator */}
            {(product.stock ?? 0) > 0 && (
              <div className="mt-2 flex items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5"></div>
                <span className="text-[10px] text-gray-500">Available</span>
              </div>
            )}

            {/* Out of stock indicator */}
            {(product.stock ?? 0) === 0 && (
              <div className="mt-2 flex items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-1.5"></div>
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

// Enhanced skeleton loader with Mizizzi branding
const ProductGridSkeleton = ({ count = 12 }) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col bg-white"
      >
        <div className="aspect-[4/3] w-full bg-[#f5f5f7] relative overflow-hidden">
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
        <div className="p-3 space-y-2">
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

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      let fetchedProducts: Product[] = []

      if (categorySlug) {
        fetchedProducts = await productService.getProductsByCategory(categorySlug)
      } else {
        fetchedProducts = await productService.getProducts({ limit })
      }

      // Remove duplicates based on product ID
      const uniqueProducts = fetchedProducts.filter(
        (product, index, self) => index === self.findIndex((p) => p.id === product.id),
      )

      setProducts(uniqueProducts)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError("Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [categorySlug, limit])

  // Load more products function
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1

      const moreProducts = await productService.getProducts({
        page: nextPage,
        limit: 12,
        category_slug: categorySlug,
      })

      if (moreProducts.length === 0) {
        setHasMore(false)
      } else {
        setProducts((prev) => {
          // Combine previous products with new ones and remove duplicates
          const combined = [...prev, ...moreProducts]
          const uniqueProducts = combined.filter(
            (product, index, self) => index === self.findIndex((p) => p.id === product.id),
          )
          return uniqueProducts
        })
        setPage(nextPage)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore(false)
    }
  }, [categorySlug, loadingMore, hasMore, page])

  // Initial data fetch
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (loadMoreRef.current && !loading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMoreProducts()
          }
        },
        { threshold: 0.1 },
      )

      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadingMore, loading, loadMoreProducts])

  if (loading) {
    return <ProductGridSkeleton count={limit > 12 ? 12 : limit} />
  }

  if (error) {
    return (
      <div className="w-full p-8 text-center">
        <div className="mx-auto w-16 h-16 mb-4 text-cherry-600">
          <ShoppingBag className="w-full h-full" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Oops! Something went wrong</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-cherry-600 text-white rounded-md hover:bg-cherry-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
          <ShoppingBag className="w-full h-full" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
        <p className="text-gray-500">We couldn't find any products in this category.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
        {products.map((product, index) => (
          <ProductCard key={`${product.id}-${index}`} product={product} />
        ))}
      </motion.div>

      {/* Load more indicator with Apple-like styling */}
      {hasMore && (
        <div ref={loadMoreRef} className="mt-8 flex items-center justify-center py-4">
          {loadingMore ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-gray-500"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-500"
              />
              <span className="text-sm font-medium">Loading more products</span>
            </motion.div>
          ) : (
            <div className="h-8 w-full max-w-sm rounded-full bg-[#f5f5f7]"></div>
          )}
        </div>
      )}
    </div>
  )
}
