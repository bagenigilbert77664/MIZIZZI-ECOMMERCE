"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, Share2, Star, Truck, ShieldCheck, RotateCcw, Minus, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStateContext } from "@/components/providers"

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
  stock?: number
  discount?: number
  sku?: string
  brand?: string
}

interface ProductDetailsV2Props {
  product: Product
}

export function ProductDetailsV2({ product }: ProductDetailsV2Props) {
  const { dispatch } = useStateContext()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const originalPrice = product.discount ? Math.round(product.price / (1 - product.discount / 100)) : undefined

  const handleAddToCart = () => {
    if (!selectedColor) {
      return
    }

    if (!selectedSize) {
      return
    }

    dispatch({
      type: "ADD_TO_CART",
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity,
      },
    })
  }

  const handleAddToWishlist = () => {
    dispatch({
      type: "TOGGLE_WISHLIST",
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
      },
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        })
        .catch((error) => console.log("Error sharing", error))
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-4 sm:gap-8 md:grid-cols-2 lg:grid-cols-[1fr,1.5fr]">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-white">
            <Image
              src={product.images[selectedImage] || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
            {product.discount && (
              <Badge className="absolute left-4 top-4 bg-cherry-600 px-2 py-1 text-white">
                {product.discount}% OFF
              </Badge>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {product.images.map((image, index) => (
              <button
                key={index}
                className={`relative aspect-square w-16 sm:w-20 flex-shrink-0 overflow-hidden rounded-md border snap-center ${
                  selectedImage === index ? "border-cherry-600" : "border-gray-200"
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <Image
                  src={image || "/placeholder.svg"}
                  alt={`${product.name} - View ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
            <a href="/" className="hover:text-cherry-600">
              Home
            </a>
            <ChevronRight className="h-4 w-4" />
            <a href={`/category/${product.category.toLowerCase()}`} className="hover:text-cherry-600">
              {product.category}
            </a>
            <ChevronRight className="h-4 w-4" />
            <span className="truncate">{product.name}</span>
          </nav>

          {/* Title and Rating */}
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cherry-900">KSh {product.price.toLocaleString()}</span>
            {originalPrice && (
              <span className="text-lg text-muted-foreground line-through">KSh {originalPrice.toLocaleString()}</span>
            )}
            {product.discount && <Badge className="ml-2 bg-cherry-50 text-cherry-600">Save {product.discount}%</Badge>}
          </div>

          {/* Short Description */}
          <p className="text-muted-foreground">{product.description.split(".")[0]}.</p>

          {/* Color Selection */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Color</h3>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  className={`relative h-10 rounded-md border px-3 py-1 text-sm ${
                    selectedColor === color
                      ? "border-cherry-600 bg-cherry-50 text-cherry-900"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedColor(color)}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Size</h3>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  className={`relative h-10 w-10 rounded-md border text-sm ${
                    selectedSize === size
                      ? "border-cherry-600 bg-cherry-50 text-cherry-900"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Quantity</h3>
            <div className="flex w-32 items-center">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-r-none"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex h-10 w-12 items-center justify-center border-y border-input bg-transparent text-sm">
                {quantity}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-l-none"
                onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                disabled={quantity >= (product.stock || 10)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Availability:</span>
            {(product.stock || 0) > 0 ? (
              <span className="text-green-600">In Stock ({product.stock || "Limited"} available)</span>
            ) : (
              <span className="text-red-600">Out of Stock</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:flex-1 bg-cherry-600 hover:bg-cherry-700"
              size="lg"
              onClick={handleAddToCart}
              disabled={(product.stock || 0) <= 0}
            >
              Add to Cart
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:flex-1" onClick={handleAddToWishlist}>
              <Heart className="mr-2 h-4 w-4" />
              Add to Wishlist
            </Button>
            <Button variant="outline" size="icon" className="hidden sm:inline-flex h-12 w-12" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Delivery and Returns */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Free Delivery</p>
                  <p className="text-xs text-muted-foreground">Orders over KSh 10,000</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Authentic Products</p>
                  <p className="text-xs text-muted-foreground">100% Genuine Guarantee</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Easy Returns</p>
                  <p className="text-xs text-muted-foreground">14-Day Return Policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="details">
          <TabsList className="w-full justify-start border-b bg-transparent p-0">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Product Details
            </TabsTrigger>
            <TabsTrigger
              value="specifications"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Specifications
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Reviews ({product.reviews})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-6">
            <div className="prose max-w-none">
              <p>{product.description}</p>
              <p>
                This exquisite piece exemplifies the perfect blend of traditional craftsmanship and contemporary design.
                Each detail has been meticulously crafted to ensure both aesthetic appeal and lasting quality.
              </p>
              <p>
                Whether you're looking to make a statement at a special event or add a touch of elegance to your
                everyday style, this piece is versatile enough to complement any occasion.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="specifications" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border">
                <div className="bg-muted px-3 sm:px-4 py-2 font-medium text-sm">Product Information</div>
                <div className="divide-y">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-2 px-3 sm:px-4 py-2 text-sm">
                      <span className="text-muted-foreground">{spec.name}</span>
                      <span>{spec.value}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 px-4 py-3">
                    <span className="text-sm text-muted-foreground">SKU</span>
                    <span className="text-sm">
                      {product.sku || `MZ-${product.id}-${product.category.substring(0, 3).toUpperCase()}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Brand</span>
                    <span className="text-sm">{product.brand || "Mizizzi"}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Customer Reviews</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">Based on {product.reviews} reviews</span>
                  </div>
                </div>
                <Button className="bg-cherry-600 hover:bg-cherry-700">Write a Review</Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-cherry-100 text-cherry-600 flex items-center justify-center font-medium">
                        JD
                      </div>
                      <div>
                        <p className="font-medium">Jane Doe</p>
                        <p className="text-xs text-muted-foreground">2 days ago</p>
                      </div>
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm">
                    Absolutely love this piece! The quality is exceptional and it looks even better in person than in
                    the photos. Fast shipping too!
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-cherry-100 text-cherry-600 flex items-center justify-center font-medium">
                        MK
                      </div>
                      <div>
                        <p className="font-medium">Michael Kim</p>
                        <p className="text-xs text-muted-foreground">1 week ago</p>
                      </div>
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm">
                    Great product overall. The craftsmanship is excellent and it feels very premium. Took off one star
                    because the delivery was a bit delayed.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-cherry-100 text-cherry-600 flex items-center justify-center font-medium">
                        SW
                      </div>
                      <div>
                        <p className="font-medium">Sarah Wong</p>
                        <p className="text-xs text-muted-foreground">3 weeks ago</p>
                      </div>
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < 5 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm">
                    This is my second purchase from Mizizzi and I'm once again impressed. The attention to detail is
                    remarkable and customer service was excellent when I had questions.
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline">Load More Reviews</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

