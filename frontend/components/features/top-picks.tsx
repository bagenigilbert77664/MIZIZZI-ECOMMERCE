"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Star } from 'lucide-react'
import Link from "next/link"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { PromoProductCard } from "@/components/products/cards/promo-product-card"
import { Skeleton } from "@/components/ui/skeleton"

const TopPicksSkeleton = () => (
  <section className="w-full mb-8">
    <div className="bg-cherry-900 text-white flex items-center justify-between px-4 py-2">
      <div className="h-5 w-32 bg-white/20 rounded animate-pulse" />
      <div className="h-5 w-16 bg-white/20 rounded animate-pulse" />
    </div>
    <div className="p-2">
      <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-2">
            <Skeleton className="aspect-[4/3] w-full mb-2" />
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  </section>
)

export function TopPicks() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTop = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res =
        (await productService.getProducts({ limit: 6, sort_by: "rating", sort_order: "desc" })) ||
        (await productService.getProducts({ limit: 6 }))
      setProducts(res || [])
    } catch (e) {
      console.error("Top picks fetch error:", e)
      setError("Failed to load top picks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTop()
  }, [fetchTop])

  if (loading) return <TopPicksSkeleton />
  if (error) {
    return (
      <section className="w-full mb-8">
        <div className="p-2">
          <div className="rounded-md border border-red-100 bg-red-50 p-4 text-center text-red-600">{error}</div>
        </div>
      </section>
    )
  }
  if (!products.length) return null

  return (
    <section className="w-full mb-8">
      <div className="bg-cherry-900 text-white flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
          <h2 className="text-sm sm:text-base font-bold whitespace-nowrap">Top Picks For You</h2>
        </div>
        <Link href="/products?sort=rating" className="flex items-center gap-1 text-xs sm:text-sm font-medium hover:underline">
          See All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <PromoProductCard product={product} badgeText="Top Pick" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
