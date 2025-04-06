"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Sparkles, ChevronRight } from "lucide-react"
import Image from "next/image"
import { productService } from "@/services/product"
import type { Product } from "@/types"

export function LuxuryDeals() {
  const [luxuryDeals, setLuxuryDeals] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLuxuryDeals = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await productService.getLuxuryDealProducts()
        setLuxuryDeals(response || [])
      } catch (error) {
        console.error("Error fetching luxury deals:", error)
        setError("Failed to load luxury deals")
        setLuxuryDeals([])
      } finally {
        setLoading(false)
      }
    }

    fetchLuxuryDeals()
  }, [])

  if (loading) {
    return (
      <section className="w-full mb-8">
        <div className="w-full p-2">
          <div className="mb-4 flex justify-between items-center">
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white p-2">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse mb-2"></div>
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="w-full mb-8">
        <div className="w-full p-2">
          <div className="flex justify-center items-center min-h-[200px] rounded-lg border border-red-100 bg-red-50 p-4">
            <div className="text-center">
              <p className="text-red-500 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-gray-600 underline hover:text-gray-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!luxuryDeals || luxuryDeals.length === 0) {
    return null
  }

  const calculateDiscount = (price: number, salePrice: number | null) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  return (
    <section className="w-full mb-8">
      <div className="w-full">
        {/*  Flash Sale Header */}
        <div className="bg-cherry-700 text-white flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <h2 className="text-sm sm:text-base font-bold whitespace-nowrap">Luxury Deals | Limited Time</h2>
          </div>

          <Link
            href="/luxury"
            className="flex items-center gap-1 text-xs sm:text-sm font-medium hover:underline whitespace-nowrap"
          >
            See All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="p-2">
          <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <AnimatePresence mode="popLayout">
              {luxuryDeals.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link href={`/product/${product.id}`}>
                    <Card className="group h-full overflow-hidden border border-gray-100 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <Image
                          src={product.image_urls?.[0] || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        {product.sale_price && product.sale_price < product.price && (
                          <motion.div
                            className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                          >
                            {calculateDiscount(product.price, product.sale_price)}% OFF
                          </motion.div>
                        )}
                      </div>
                      <CardContent className="space-y-1.5 p-2">
                        <div className="mb-1">
                          <span className="inline-block rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Luxury
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-600 group-hover:text-gray-900">
                          {product.name}
                        </h3>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold text-gray-900">
                            KSh {(product.sale_price || product.price).toLocaleString()}
                          </span>
                          {product.sale_price && product.sale_price < product.price && (
                            <span className="text-[11px] text-gray-500 line-through">
                              KSh {product.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
