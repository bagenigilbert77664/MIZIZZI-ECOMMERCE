"use client"

import Link from "next/link"
import { Heart, Star, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptimizedImage } from "@/components/optimized-image"
import { cn } from "@/lib/utils"
import { useStateContext } from "@/components/providers"
import type React from "react"

interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number | null
  image: string
  rating?: number
  reviews?: number
  express?: boolean
  discount?: number
}

interface ProductCardProps {
  product: Product
  viewMode?: "grid" | "list"
}

export function ProductCard({ product, viewMode = "grid" }: ProductCardProps) {
  const { state, dispatch } = useStateContext()
  const isInWishlist = state.wishlist.some((item) => item.id === product.id)

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    // Add haptic feedback for mobile devices
    if (window.navigator.vibrate) {
      window.navigator.vibrate(50)
    }

    dispatch({
      type: "TOGGLE_WISHLIST",
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      },
    })
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden bg-white border border-gray-100 transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        viewMode === "list" && "flex-row gap-2 sm:gap-3",
      )}
    >
      {/* Image Container */}
      <div
        className={cn(
          "relative aspect-square overflow-hidden bg-muted/30",
          viewMode === "list" && "aspect-[4/3] w-1/3",
        )}
      >
        <OptimizedImage
          src={product.image}
          alt={product.name}
          width={300}
          height={300}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />

        {/* Discount Badge */}
        {product.discount && (
          <span className="absolute left-2 top-2 rounded-full bg-cherry-900 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            -{product.discount}% OFF
          </span>
        )}

        {/* Wishlist Button */}
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "absolute right-2 top-2 h-10 w-10 rounded-full bg-background/80 p-0 shadow-sm backdrop-blur-sm transition-colors hover:bg-background",
            isInWishlist ? "text-red-500" : "text-muted-foreground",
          )}
          onClick={handleAddToWishlist}
        >
          <Heart className={`h-5 w-5 ${isInWishlist ? "fill-current" : ""}`} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "absolute right-12 top-2 h-10 w-10 rounded-full bg-background/80 p-0 shadow-sm backdrop-blur-sm transition-colors hover:bg-background",
          )}
          onClick={(e) => {
            e.preventDefault()
            // Add to comparison logic here
          }}
        >
          <Scale className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-1.5">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground sm:min-h-[40px]">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-auto space-y-1 pt-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-bold text-foreground sm:text-lg">KSh {product.price.toLocaleString()}</span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                KSh {product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Rating */}
        {product.rating > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3.5 w-3.5",
                    i < product.rating ? "fill-cherry-500 text-cherry-500" : "fill-muted text-muted",
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({product.reviews})</span>
          </div>
        )}

        {/* Express Badge */}
        {product.express && (
          <div className="mt-2 flex items-center gap-1">
            <span className="flex items-center gap-1 text-xs font-medium text-cherry-500">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <path d="M13 8L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 16L11 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
                <circle cx="15" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
              EXPRESS
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

