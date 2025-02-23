"use client"

import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  rating?: number
  reviews?: number
}

interface ProductCardSimpleProps {
  product: Product
}

export function ProductCardSimple({ product }: ProductCardSimpleProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="group h-full overflow-hidden border border-gray-100 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
          {product.originalPrice && (
            <div className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white">
              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
            </div>
          )}
        </div>
        <CardContent className="space-y-1 p-1.5">
          <div className="mb-1">
            <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {product.category}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-medium leading-tight text-gray-700 group-hover:text-gray-900">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-gray-900">KSh {product.price.toLocaleString()}</span>
            {product.originalPrice && (
              <span className="text-[11px] text-gray-500 line-through">
                KSh {product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

