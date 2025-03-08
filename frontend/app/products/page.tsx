"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { productService } from "@/services/product"
import type { Product } from "@/types"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const fetchedProducts = await productService.getProducts({ limit: 100 })
        setProducts(fetchedProducts)
        setFilteredProducts(fetchedProducts)
      } catch (err) {
        console.error("Error fetching products:", err)
        setError("Failed to load products")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.category_id && product.category_id.toString().toLowerCase().includes(query)),
    )
    setFilteredProducts(filtered)
  }, [searchQuery, products])

  if (loading) {
    return (
      <div className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">All Products</h1>
          <div className="relative w-64">
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-200"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(24)].map((_, index) => (
            <div key={index} className="bg-white p-2">
              <div className="aspect-[4/3] animate-pulse bg-gray-200"></div>
              <div className="mt-2 h-4 w-2/3 animate-pulse bg-gray-200"></div>
              <div className="mt-1 h-3 w-1/2 animate-pulse bg-gray-200"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">All Products</h1>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Products</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No products found matching your search.</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Link href={`/product/${product.id}`}>
                <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <Image
                      src={product.image_urls?.[0] || product.thumbnail_url || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {product.sale_price && product.sale_price < product.price && (
                      <div className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white">
                        {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
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
        </div>
      )}
    </div>
  )
}
