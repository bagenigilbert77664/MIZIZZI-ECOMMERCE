"use client"

import Image from "next/image"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStateContext } from "@/components/providers"
import { toast } from "@/components/ui/use-toast"

interface Product {
  id: number
  name: string
  price: number
  description: string
  images: string[]
  category: string
  rating: number
  reviews: number
  sizes: string[]
  colors: string[]
  specifications: { name: string; value: string }[]
}

interface ProductDetailsProps {
  product: Product
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const { dispatch } = useStateContext()

  const handleAddToCart = () => {
    dispatch({
      type: "ADD_TO_CART",
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity: 1,
      },
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex items-center justify-center">
          <Image
            src={product.images[0] || "/placeholder.svg"}
            alt={product.name}
            width={500}
            height={500}
            className="h-auto max-w-full rounded-lg"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="mt-4 flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${i < Math.floor(product.rating) ? "text-yellow-400" : "text-gray-300"}`}
              />
            ))}
            <span className="text-sm text-muted-foreground">({product.reviews})</span>
          </div>
          <p className="mt-4 text-lg font-bold">KSh {product.price.toLocaleString()}</p>
          <p className="mt-4 text-gray-700">{product.description}</p>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium">Size</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <Button
                    key={size}
                    variant="outline"
                    className="min-w-[60px] rounded-full hover:bg-cherry-50 hover:text-cherry-900"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium">Color</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <Button
                    key={color}
                    variant="outline"
                    className="min-w-[80px] rounded-full hover:bg-cherry-50 hover:text-cherry-900"
                  >
                    {color}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-xl font-bold">Specifications</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {product.specifications.map((spec) => (
                <div key={spec.name} className="sm:col-span-1">
                  <dt className="font-medium text-gray-900">{spec.name}</dt>
                  <dd className="mt-1 text-gray-700">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-8 flex gap-4">
            <Button size="lg" className="bg-cherry-600 hover:bg-cherry-700" onClick={handleAddToCart}>
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

