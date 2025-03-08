"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { productService } from "@/services/product"
import type { Product } from "@/types"

interface ProductGridProps {
  categorySlug?: string
  limit?: number
}

export function ProductGrid({ categorySlug, limit = 24 }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
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
    }

    fetchProducts()
  }, [categorySlug, limit])

  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      </div>
    )
  }

  if (error) {
    return <div className="w-full p-8 text-center text-red-500">{error}</div>
  }

  if (!products || products.length === 0) {
    return <div className="w-full p-8 text-center text-gray-500">No products available</div>
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-x-[1px] gap-y-6 bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product) => (
          <motion.div key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Link href={`/product/${product.id}`}>
              <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <Image
                    src={product.image_urls[0] || product.thumbnail_url || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
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
                      {product.category_id}
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
      </div>
    </div>
  )
}