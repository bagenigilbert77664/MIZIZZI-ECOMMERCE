"use client"

import { useState, useEffect, useCallback, useRef, memo } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { productService } from "@/services/product"
import { ShoppingBag } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Product } from "@/types"

// Create a memoized product card component to prevent unnecessary re-renders
const ProductCard = memo(({ product }: { product: Product }) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Link href={`/product/${product.id}`} prefetch={false}>
        <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
            <Image
              src={(product.image_urls && product.image_urls[0]) || product.thumbnail_url || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlZWVlIiAvPjwvc3ZnPg=="
            />
            {product.is_sale && (
              <div className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white">
                {Math.round(((product.price - (product.sale_price || product.price)) / product.price) * 100)}% OFF
              </div>
            )}
          </div>
          <CardContent className="space-y-1.5 p-2">
            <div className="mb-1">
              <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                {typeof product.category === "object" && product.category
                  ? product.category.name
                  : product.category || product.category_id}
              </span>
            </div>
            <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-600 group-hover:text-gray-900">
              {product.name}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-gray-900">
                KSh {(product.sale_price || product.price).toLocaleString()}
              </span>
              {product.sale_price && (
                <span className="text-[11px] text-gray-500 line-through">KSh {product.price.toLocaleString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
})

ProductCard.displayName = "ProductCard"

// Create a skeleton loader component
const ProductGridSkeleton = ({ count = 12 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="flex flex-col gap-2">
        <Skeleton className="aspect-[4/3] w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
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
  const loadMoreRef = useRef<HTMLDivElement>(null)
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

      setProducts(fetchedProducts)
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
        setProducts((prev) => [...prev, ...moreProducts])
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
    return <div className="w-full p-8 text-center text-red-500">{error}</div>
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
      <div className="grid grid-cols-2 gap-x-[1px] gap-y-6 bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Load more indicator */}
      {hasMore && (
        <div ref={loadMoreRef} className="mt-8 flex items-center justify-center py-4">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-cherry-600"></div>
              <span>Loading more products...</span>
            </div>
          ) : (
            <div className="h-8 w-full max-w-sm rounded-full bg-gray-100"></div>
          )}
        </div>
      )}
    </div>
  )
}