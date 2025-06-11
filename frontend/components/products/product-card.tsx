"use client"

import type React from "react"

import { useState } from "react"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import { WishlistButton } from "./wishlist-button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"

export type ProductCardProps = {
  product: Product
  variant?: "default" | "compact" | "featured"
  className?: string
}

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

// In the main component export, ensure the key is unique
// Change from using just product.id to a more unique identifier
export function ProductCard({ product, variant = "default", className = "" }: ProductCardProps) {
  const { addToCart } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { items: cartItems } = useCart()
  const { toast } = useToast()

  const getImageUrl = (product: Product, index = 0): string => {
    // First check if there's a valid thumbnail URL
    if (
      product.thumbnail_url &&
      typeof product.thumbnail_url === "string" &&
      !product.thumbnail_url.includes("placeholder.svg") &&
      (product.thumbnail_url.startsWith("http") || product.thumbnail_url.startsWith("/"))
    ) {
      return product.thumbnail_url
    }

    // Handle image_urls parsing
    let imageUrls: string[] = []

    if (product.image_urls) {
      if (Array.isArray(product.image_urls)) {
        // Check if it's a malformed character array
        if (
          product.image_urls.length > 0 &&
          typeof product.image_urls[0] === "string" &&
          product.image_urls[0].length === 1
        ) {
          // Try to reconstruct from character array
          try {
            const reconstructed = product.image_urls.join("")
            const parsed = JSON.parse(reconstructed)
            if (Array.isArray(parsed)) {
              imageUrls = parsed.filter(
                (url): url is string =>
                  typeof url === "string" &&
                  url.trim() !== "" &&
                  url !== "/" &&
                  (url.startsWith("http") || url.startsWith("/")),
              )
            }
          } catch (e) {
            console.warn("Failed to reconstruct image URLs for product", product.id)
            imageUrls = []
          }
        } else {
          // Normal array
          imageUrls = product.image_urls.filter(
            (url): url is string =>
              typeof url === "string" &&
              url.trim() !== "" &&
              url !== "/" &&
              (url.startsWith("http") || url.startsWith("/")),
          )
        }
      } else if (typeof product.image_urls === "string") {
        try {
          const parsed = JSON.parse(product.image_urls)
          imageUrls = Array.isArray(parsed)
            ? parsed.filter(
                (url): url is string =>
                  typeof url === "string" &&
                  url.trim() !== "" &&
                  url !== "/" &&
                  (url.startsWith("http") || url.startsWith("/")),
              )
            : []
        } catch (error) {
          // If parsing fails, check if it's a single valid URL
          let cleanUrl = ""
          if (typeof product.image_urls === "string") {
            cleanUrl = (product.image_urls as string).trim()
            if (cleanUrl && cleanUrl !== "/" && (cleanUrl.startsWith("http") || cleanUrl.startsWith("/"))) {
              imageUrls = [cleanUrl]
            }
          }
        }
      }
    }

    // Find the first valid image URL
    if (imageUrls.length > index && imageUrls[index]) {
      return imageUrls[index]
    }

    // Return placeholder
    return `/placeholder.svg?height=300&width=300&text=${encodeURIComponent(product.name || "Product")}`
  }

  const calculateDiscount = (price: number | undefined, salePrice: number | null | undefined) => {
    // Ensure price is a valid number
    const validPrice = typeof price === "number" ? price : 0

    // Ensure salePrice is either a valid number or null
    const validSalePrice = typeof salePrice === "number" ? salePrice : null

    if (!validSalePrice || validSalePrice >= validPrice || validPrice === 0) return 0
    return Math.round(((validPrice - validSalePrice) / validPrice) * 100)
  }

  const discountPercentage = calculateDiscount(product.price, product.sale_price)

  // Handle adding to cart with improved UX
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Convert product.id to number for comparison
    const productIdNum = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id

    // Check if product is already in cart
    const isInCart = cartItems.some(
      (item) => item.product_id !== null && item.product_id !== undefined && item.product_id === productIdNum,
    )

    setIsAddingToCart(true)
    try {
      if (isInCart) {
        toast({
          title: "Already in Cart",
          description: (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                <Image
                  src={getImageUrl(product) || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=48&width=48"
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-sm text-muted-foreground">This item is already in your cart</p>
              </div>
            </div>
          ),
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                document.dispatchEvent(new CustomEvent("open-sidebar-cart"))
              }}
              className="border-cherry-200 hover:bg-cherry-50 hover:text-cherry-700"
            >
              View Cart
            </Button>
          ),
          className: "animate-in slide-in-from-bottom-5 duration-300",
          variant: "default",
          duration: 4000,
        })
      } else {
        const result = await addToCart(productIdNum, 1)
        if (result?.success) {
          // Toast is now handled by the CartIndicator component
          // The cart-updated event will trigger the notification
        }
      }
    } catch (error) {
      console.error("Failed to add product to cart:", error)
      toast({
        title: "Error",
        description: "Failed to add product to cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  const StarRating = ({ rating = 0 }: { rating?: number }) => {
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
        {product.review_count && product.review_count > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">({product.review_count})</span>
        )}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <motion.div initial="hidden" animate="visible" variants={variants} className={`group ${className}`}>
        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-cherry-50 transition-colors border border-transparent hover:border-cherry-100">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
            <Image
              src={getImageUrl(product) || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=64&width=64"
              }}
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
              src={getImageUrl(product) || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-all duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=400&width=320"
              }}
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

  // Default variant - redesigned for better visual appeal
  return (
    <motion.div
      key={`product-${product.id}-${variant}`} // Add unique key
      initial="hidden"
      animate="visible"
      variants={variants}
      className={`group ${className}`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 h-full bg-white">
        <div className="relative">
          <Link href={`/product/${product.slug || product.id}`} className="block">
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src={getImageUrl(product) || "/placeholder.svg"}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover transition-all duration-500 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  console.error(`Image failed to load for product ${product.id}:`, target.src)
                  target.src = `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(product.name)}`
                }}
              />

              {/* Product badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {product.is_new && (
                  <span className="inline-block bg-white px-2 py-1 text-xs font-medium text-gray-900">New</span>
                )}
                {discountPercentage > 0 && (
                  <span className="inline-block bg-black px-2 py-1 text-xs font-medium text-white">
                    -{discountPercentage}%
                  </span>
                )}
                {product.is_featured && (
                  <span className="inline-block bg-gray-900/80 px-2 py-1 text-xs font-medium text-white">Featured</span>
                )}
                {product.badge_text && (
                  <span
                    className={cn(
                      "inline-block px-2 py-1 text-xs font-medium text-white",
                      product.badge_color || "bg-gray-900",
                    )}
                  >
                    {product.badge_text}
                  </span>
                )}
              </div>

              <WishlistButton
                productId={product.id}
                className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-sm"
              />
            </div>
          </Link>

          <div className="p-4">
            {/* Category tag */}
            {(product.category?.name || product.category_id) && (
              <div className="mb-1">
                <span className="text-xs text-gray-500">
                  {product.category?.name || `Category ${product.category_id}` || "Uncategorized"}
                </span>
              </div>
            )}

            {/* Product name */}
            <Link href={`/product/${product.slug || product.id}`} className="block">
              <h3 className="line-clamp-2 h-10 text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
                {product.name}
              </h3>

              {/* Rating */}
              {product.rating && product.rating > 0 && (
                <div className="mt-1.5">
                  <StarRating rating={product.rating} />
                </div>
              )}

              {/* Price section */}
              <div className="mt-2">
                {product.sale_price ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{formatPrice(product.sale_price)}</span>
                    <span className="text-xs line-through text-gray-400">{formatPrice(product.price)}</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                )}
              </div>
            </Link>

            {/* Add to cart button */}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full font-medium border-gray-200 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors"
                onClick={handleAddToCart}
                disabled={isAddingToCart || product.stock === 0}
              >
                {isAddingToCart ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...
                  </div>
                ) : product.stock === 0 ? (
                  <span className="text-muted-foreground">Out of Stock</span>
                ) : cartItems.some((item) =>
                    item.product_id !== null && item.product_id !== undefined
                      ? item.product_id ===
                        (typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id)
                      : false,
                  ) ? (
                  <div className="flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 mr-2" /> View in Cart
                  </div>
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
