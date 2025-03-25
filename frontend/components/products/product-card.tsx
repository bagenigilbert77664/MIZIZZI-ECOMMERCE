"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useCart } from "@/contexts/cart/cart-context"
import { toast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"
import { WishlistButton } from "./wishlist-button"

interface ProductCardProps {
  product: {
    id: number
    name: string
    slug: string
    price: number
    sale_price?: number
    image_urls: string[]
    category_id?: string
    stock?: number
    is_new?: boolean
    is_sale?: boolean
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)

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

  // Calculate discount percentage
  const discountPercentage =
    product.sale_price && product.price > product.sale_price
      ? Math.round(((product.price - product.sale_price) / product.price) * 100)
      : 0

  return (
    <Card className="group overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md">
      <Link href={`/product/${product.slug || product.id}`} className="relative block">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={product.image_urls[0] || "/placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />

          {/* Product badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {discountPercentage > 0 && (
              <Badge className="bg-cherry-600 text-white border-0 px-2 py-1">-{discountPercentage}%</Badge>
            )}
            {product.is_new && !discountPercentage && (
              <Badge className="bg-emerald-600 text-white border-0 px-2 py-1">NEW</Badge>
            )}
            {product.is_sale && !discountPercentage && (
              <Badge className="bg-amber-500 text-white border-0 px-2 py-1">SALE</Badge>
            )}
          </div>

          {/* Quick action buttons */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-white shadow-md hover:bg-gray-100"
              asChild
            >
              <Link href={`/product/${product.slug || product.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9 rounded-full bg-white shadow-md hover:bg-gray-100"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            </Button>
            <WishlistButton
              productId={product.id}
              variant="default"
              className="h-9 w-9 rounded-full bg-white shadow-md hover:bg-gray-100"
            />
          </div>
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="mb-1 text-xs text-gray-500">{product.category_id || "Uncategorized"}</div>
        <Link href={`/product/${product.slug || product.id}`} className="block">
          <h3 className="line-clamp-2 h-10 text-sm font-medium text-gray-700 hover:text-cherry-600">{product.name}</h3>
          <div className="mt-2 flex items-center justify-between">
            <div>
              {product.sale_price ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-cherry-600">{formatPrice(product.sale_price)}</span>
                  <span className="text-xs line-through text-gray-400">{formatPrice(product.price)}</span>
                </div>
              ) : (
                <span className="text-sm font-bold">{formatPrice(product.price)}</span>
              )}
            </div>
            {(product.stock === 0 || product.stock === undefined) && (
              <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                Out of Stock
              </Badge>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}