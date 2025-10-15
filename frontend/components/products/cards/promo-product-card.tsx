"use client"

import { useState, useEffect, memo } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Product } from "@/types"
import { motion } from "framer-motion"

type Props = {
  product: Product
  badgeText?: string
}

export const PromoProductCard = memo(function PromoProductCard({ product, badgeText }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const isOnSale = typeof product.sale_price === "number" && product.sale_price! > 0 && product.sale_price! < product.price
  const discountPct =
    isOnSale && product.price > 0 ? Math.round(((product.price - (product.sale_price as number)) / product.price) * 100) : 0
  const displayPrice = (product.sale_price ?? product.price) || 0

  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [product?.id])

  return (
    <Link href={`/product/${product.id}`} prefetch={false} className="block h-full">
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="h-full bg-white"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f7]">
          {(badgeText || isOnSale) && (
            <div className="absolute left-2 top-2 z-10 flex gap-1">
              {badgeText && (
                <span className="rounded-full bg-cherry-900/90 px-2 py-0.5 text-[10px] font-medium text-white">{badgeText}</span>
              )}
              {isOnSale && (
                <span className="rounded-full bg-[#fa5252] px-2 py-0.5 text-[10px] font-medium text-white">-{discountPct}%</span>
              )}
            </div>
          )}
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center text-xs text-gray-500">Image not available</div>
          )}
          <Image
            src={(product.image_urls && product.image_urls[0]) || product.thumbnail_url || "/placeholder.svg?height=480&width=640&query=product%20image"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className={`object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
          />
        </div>

        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight text-gray-900">{product.name}</h3>
          <div className="text-sm font-semibold text-gray-900">KSh {displayPrice.toLocaleString()}</div>
          {isOnSale && (
            <div className="text-xs text-gray-500 line-through">KSh {product.price.toLocaleString()}</div>
          )}
        </div>
      </motion.article>
    </Link>
  )
})
