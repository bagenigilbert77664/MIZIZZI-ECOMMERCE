"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

interface Product {
  id: number
  name: string
  slug: string
  description: string
  price: number
  sale_price: number | null
  stock: number
  category_id: number
  brand_id: number | null
  image_urls: string[]
  thumbnail_url: string | null
  is_featured: boolean
  is_new: boolean
  is_sale: boolean
  is_flash_sale: boolean
  is_luxury_deal: boolean
}

interface ApiResponse {
  items: Product[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
}

export function LuxuryDeals() {
  const [luxuryDeals, setLuxuryDeals] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLuxuryDeals = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("http://localhost:5000/api/products?luxury_deal=true&per_page=6")
        if (!response.ok) {
          throw new Error("Failed to fetch luxury deals")
        }

        const data: ApiResponse = await response.json()
        setLuxuryDeals(data.items || [])
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
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="w-full mb-8">
        <div className="w-full p-2">
          <div className="flex justify-center items-center min-h-[200px] text-red-500">{error}</div>
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
      <div className="w-full p-2">
        <div className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1">
            <h2 className="text-lg sm:text-xl font-bold">Luxury For Less</h2>
            <p className="text-xs sm:text-sm text-gray-500">Save up to 70% Today</p>
          </div>
          <Link href="/products?luxury_deal=true" className="flex items-center gap-1 text-sm font-medium text-gray-600">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

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
                        <div className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white">
                          {calculateDiscount(product.price, product.sale_price)}% OFF
                        </div>
                      )}
                    </div>
                    <CardContent className="space-y-1.5 p-2">
                      <div className="mb-1">
                        <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
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
    </section>
  )
}

