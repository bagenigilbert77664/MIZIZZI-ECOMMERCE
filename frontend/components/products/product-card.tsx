"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/hooks/use-cart"
import { formatPrice } from "@/lib/utils"

interface ProductCardProps {
  product: {
    id: number
    name: string
    slug: string
    price: number
    discount_price?: number
    image_url: string
    is_new?: boolean
    is_sale?: boolean
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsAddingToCart(true)
    await addItem(product.id, 1)
    setIsAddingToCart(false)
  }

  const discountPercentage =
    product.discount_price && product.price
      ? Math.round(((product.price - product.discount_price) / product.price) * 100)
      : 0

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <Link href={`/product/${product.slug}`} className="relative block">
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={product.image_url || `/placeholder.svg?height=300&width=300`}
            alt={product.name}
            fill
            className="object-cover transition-transform hover:scale-105"
          />
        </div>
        {(product.is_new || product.is_sale) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.is_new && <Badge className="bg-blue-500">New</Badge>}
            {product.is_sale && <Badge className="bg-red-500">Sale</Badge>}
          </div>
        )}
        {product.discount_price && discountPercentage > 0 && (
          <Badge className="absolute top-2 right-2 bg-red-500">-{discountPercentage}%</Badge>
        )}
      </Link>
      <CardContent className="flex-grow p-4">
        <Link href={`/product/${product.slug}`} className="block">
          <h3 className="font-medium line-clamp-2 hover:underline">{product.name}</h3>
          <div className="mt-2 flex items-center">
            {product.discount_price ? (
              <>
                <span className="font-semibold">{formatPrice(product.discount_price)}</span>
                <span className="ml-2 text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
              </>
            ) : (
              <span className="font-semibold">{formatPrice(product.price)}</span>
            )}
          </div>
        </Link>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" size="sm" onClick={handleAddToCart} disabled={isAddingToCart}>
          {isAddingToCart ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

