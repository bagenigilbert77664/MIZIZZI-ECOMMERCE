"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Clock } from "lucide-react"
import Image from "next/image"
import type { Product } from "@/types"

export function FlashSales() {
  const [flashSales, setFlashSales] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setLoading(true)
        const response = await fetch("http://localhost:5000/api/products?flash_sale=true&per_page=6")
        const data = await response.json()
        setFlashSales(data.items || [])
      } catch (error) {
        console.error("Error fetching flash sales:", error)
        setError("Failed to load flash sales")
      } finally {
        setLoading(false)
      }
    }

    fetchFlashSales()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds - 1
        if (totalSeconds <= 0) {
          clearInterval(timer)
          return { hours: 0, minutes: 0, seconds: 0 }
        }
        return {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
        }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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

  if (!flashSales || flashSales.length === 0) {
    return null
  }

  return (
    <section className="w-full mb-8">
      <div className="w-full p-2">
        <div className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2 className="text-lg sm:text-xl font-bold">Flash Sales</h2>
            <motion.div
              className="flex items-center gap-2 rounded-full bg-gray-100 px-3 sm:px-4 py-1 sm:py-2"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <Clock className="h-4 w-4 text-cherry-900" />
              <div className="flex items-center gap-1 text-sm font-semibold text-cherry-900">
                <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                <span>:</span>
                <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span>:</span>
                <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
              </div>
            </motion.div>
          </div>
          <Link
            href="/flash-sales"
            className="group flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-cherry-900"
          >
            View All
            <motion.span
              className="inline-block"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              →
            </motion.span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {flashSales.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={`/product/${product.id}`}>
                  <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <Image
                        src={product.image_urls?.[0] || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {product.sale_price && (
                        <motion.div
                          className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
                        </motion.div>
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
                        <motion.span
                          className="text-sm font-semibold text-cherry-900"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          KSh {(product.sale_price || product.price).toLocaleString()}
                        </motion.span>
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
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

