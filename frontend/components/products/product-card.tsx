"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Eye, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useCart } from "@/contexts/cart/cart-context"
import { toast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"
import { WishlistButton } from "./wishlist-button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProductCardProps {
  product: {
    id: number
    name: string
    slug: string
    price: number
    sale_price?: number
    image_urls: string[]
    category_id?: string
    category?: { name: string }
    stock?: number
    is_new?: boolean
    is_sale?: boolean
    is_featured?: boolean
    rating?: number
    review_count?: number
  }
  variant?: "default" | "compact" | "featured"
  className?: string
}

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function ProductCard({ product, variant = "default", className = "" }: ProductCardProps) {
  const { addToCart } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Calculate discount percentage
  const discountPercentage =
    product.sale_price && product.price > product.sale_price
      ? Math.round(((product.price - product.sale_price) / product.price) * 100)
      : 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsAddingToCart(true)
    try {
      await addToCart(product.id, 1)
      toast({
        description: "Product added to cart",
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast({
        title: "Error",
        description: "Failed to add product to cart",
        variant: "destructive",
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleImageHover = () => {
    if (product.image_urls.length > 1) {
      setCurrentImageIndex(1)
    }
  }

  const handleImageLeave = () => {
    setCurrentImageIndex(0)
  }

  // Star rating component
  const StarRating = ({ rating = 0 }) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-3 w-3 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ))}
        {product.review_count && <span className="ml-1 text-xs text-muted-foreground">({product.review_count})</span>}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <motion.div initial="hidden" animate="visible" variants={variants} className={`group ${className}`}>
        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-cherry-50 transition-colors border border-transparent hover:border-cherry-100">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
            <Image
              src={product.image_urls[0] || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium line-clamp-1 group-hover:text-cherry-700">{product.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              {product.sale_price ? (
                <>
                  <span className="text-sm font-bold text-cherry-700">{formatPrice(product.sale_price)}</span>
                  <span className="text-xs line-through text-gray-400">{formatPrice(product.price)}</span>
                </>
              ) : (
                <span className="text-sm font-medium">{formatPrice(product.price)}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  if (variant === "featured") {
    return (
      <motion.div initial="hidden" animate="visible" variants={variants} className={`group ${className}`}>
        <Card className="overflow-hidden border-cherry-100 hover:shadow-lg transition-all duration-300 h-full">
          <div className="relative aspect-[4/5] bg-white">
            <Image
              src={product.image_urls[currentImageIndex] || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-all duration-500"
              onMouseEnter={handleImageHover}
              onMouseLeave={handleImageLeave}
            />
            <div className="absolute left-3 top-3 flex flex-col gap-1 z-10">
              {discountPercentage > 0 && (
                <Badge className="bg-cherry-600 text-white border-0 px-2 py-1 rounded-md">-{discountPercentage}%</Badge>
              )}
              {product.is_new && <Badge className="bg-emerald-600 text-white border-0 px-2 py-1 rounded-md">NEW</Badge>}
              {product.is_featured && (
                <Badge className="bg-purple-600 text-white border-0 px-2 py-1 rounded-md">FEATURED</Badge>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <div className="w-full">
                <h3 className="text-white font-semibold line-clamp-1 text-lg mb-1">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {product.sale_price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{formatPrice(product.sale_price)}</span>
                        <span className="text-white/70 line-through text-sm">{formatPrice(product.price)}</span>
                      </div>
                    ) : (
                      <span className="text-white font-bold">{formatPrice(product.price)}</span>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-white text-cherry-800 hover:bg-cherry-50"
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || product.stock === 0}
                  >
                    {isAddingToCart ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : product.stock === 0 ? (
                      "Out of Stock"
                    ) : (
                      "Add to Cart"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Default variant
  return (
    <motion.div initial="hidden" animate="visible" variants={variants} className={`group ${className}`}>
      <Card className="overflow-hidden border-cherry-100 hover:shadow-lg transition-all duration-300 h-full">
        <div className="relative">
          <Link href={`/product/${product.slug || product.id}`} className="block">
            <div className="relative aspect-square overflow-hidden bg-white">
              <Image
                src={product.image_urls[currentImageIndex] || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-all duration-500 group-hover:scale-105"
                onMouseEnter={handleImageHover}
                onMouseLeave={handleImageLeave}
              />

              {/* Product badges */}
              <div className="absolute left-3 top-3 flex flex-col gap-1">
                {discountPercentage > 0 && (
                  <Badge className="bg-cherry-600 text-white border-0 px-2 py-1 rounded-md">
                    -{discountPercentage}%
                  </Badge>
                )}
                {product.is_new && !discountPercentage && (
                  <Badge className="bg-emerald-600 text-white border-0 px-2 py-1 rounded-md">NEW</Badge>
                )}
                {product.is_sale && !discountPercentage && (
                  <Badge className="bg-amber-500 text-white border-0 px-2 py-1 rounded-md">SALE</Badge>
                )}
              </div>

              {/* Quick action buttons */}
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 translate-y-10 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-white shadow-md hover:bg-cherry-50 border-cherry-100"
                        asChild
                      >
                        <Link href={`/product/${product.slug || product.id}`}>
                          <Eye className="h-5 w-5 text-cherry-700" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quick view</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-cherry-700 text-white shadow-md hover:bg-cherry-800"
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || product.stock === 0}
                      >
                        {isAddingToCart ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-5 w-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{product.stock === 0 ? "Out of stock" : "Add to cart"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <WishlistButton
                        productId={product.id}
                        variant="outline"
                        className="h-10 w-10 rounded-full bg-white shadow-md hover:bg-cherry-50 border-cherry-100"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to wishlist</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </Link>

          <div className="p-4">
            <div className="mb-1 text-xs text-cherry-600 font-medium">
              {product.category?.name || product.category_id || "Uncategorized"}
            </div>

            <Link href={`/product/${product.slug || product.id}`} className="block">
              <h3 className="line-clamp-2 h-10 text-sm font-medium text-gray-800 group-hover:text-cherry-700 transition-colors">
                {product.name}
              </h3>

              <div className="mt-1.5">
                <StarRating rating={product.rating || 0} />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div>
                  {product.sale_price ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-cherry-700">{formatPrice(product.sale_price)}</span>
                      <span className="text-xs line-through text-gray-400">{formatPrice(product.price)}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                  )}
                </div>
                {(product.stock === 0 || product.stock === undefined) && (
                  <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                    Out of Stock
                  </Badge>
                )}
              </div>
            </Link>

            <div className="mt-4 pt-3 border-t border-cherry-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-cherry-100 hover:bg-cherry-50 hover:text-cherry-700 font-medium transition-all"
                onClick={handleAddToCart}
                disabled={isAddingToCart || product.stock === 0}
              >
                {isAddingToCart ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...
                  </div>
                ) : product.stock === 0 ? (
                  <span className="text-muted-foreground">Out of Stock</span>
                ) : (
                  <div className="flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
