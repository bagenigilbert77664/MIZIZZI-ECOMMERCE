"use client"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface Product {
  id: string
  name: string
  units_sold: number
  revenue: number
  thumbnail_url?: string
}

interface BestSellingProductsProps {
  products: Product[]
}

export function BestSellingProducts({ products }: BestSellingProductsProps) {
  const router = useRouter()
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (error) {
      // Log the error to an error reporting service
      console.error(error)
    }
  }, [error])

  if (!products || products.length === 0) {
    return (
      <div>
        <CardHeader>
          <CardTitle>Best Selling Products</CardTitle>
          <CardDescription>No product sales data available</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          <p>Product sales data will appear here</p>
        </CardContent>
      </div>
    )
  }

  return (
    <div>
      <CardHeader>
        <CardTitle>Best Selling Products</CardTitle>
        <CardDescription>Your top performing products by sales</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {products.slice(0, 5).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url || "/placeholder.svg"}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.units_sold} units sold</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(product.revenue)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.push(`/admin/products/${product.id}`)}
                >
                  <span className="sr-only">View product</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                  >
                    <path
                      d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/products?sort=best_selling")}>
            View all products
          </Button>
        </div>
      </CardContent>
    </div>
  )
}
