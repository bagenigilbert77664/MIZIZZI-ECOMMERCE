"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import {
  Heart,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  ChevronRight,
  Star,
  Check,
  ShoppingCart,
  Loader2,
  X,
  LogIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCart } from "@/contexts/cart/cart-context"
import { useToast } from "@/components/ui/use-toast"
import { ReviewsSection } from "@/components/reviews/reviews-section"
import { useAuth } from "@/contexts/auth/auth-context"
import Link from "next/link"
import type { Product, ProductVariant } from "@/types"

interface ProductDetailsV2Props {
  product: Product
}

export function ProductDetailsV2({ product }: ProductDetailsV2Props) {
  const { addToCart, isUpdating } = useCart()
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [authError, setAuthError] = useState(false)

  // Use sale_price if available, otherwise use regular price
  const currentPrice = selectedVariant?.price || product.sale_price || product.price
  const originalPrice = product.price
  const discountPercentage =
    originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0

  const hideSuccessMessage = useCallback(() => {
    setShowSuccess(false)
  }, [])

  const hideAuthError = useCallback(() => {
    setAuthError(false)
  }, [])

  const openSidebarCart = useCallback(() => {
    // Dispatch event to open sidebar cart
    document.dispatchEvent(new CustomEvent("open-sidebar-cart"))
  }, [])

  // Add to cart with localStorage fallback
  const handleAddToCart = async () => {
    // Validate product selection
    if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
      toast({
        title: "Please select a variant",
        description: "You need to select a variant before adding to cart",
        variant: "destructive",
      })
      return
    }

    // Check stock availability
    if (product.stock <= 0) {
      toast({
        title: "Out of stock",
        description: "This product is currently out of stock",
        variant: "destructive",
      })
      return
    }

    // Check authentication status
    if (!isAuthenticated) {
      // For guest users, we'll use localStorage directly
      try {
        // Create a simple cart item
        const cartItem = {
          id: Date.now(),
          product_id: product.id,
          variant_id: selectedVariant?.id || null,
          quantity,
          price: currentPrice,
          total: currentPrice * quantity,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug || "",
            thumbnail_url: product.image_urls[0] || "",
            image_urls: product.image_urls,
            category: product.category_id,
          },
        }

        // Get existing cart items from localStorage
        const existingItems = JSON.parse(localStorage.getItem("cartItems") || "[]")

        // Check if product already exists in cart
        const existingItemIndex = existingItems.findIndex(
          (item: any) => item.product_id === product.id && item.variant_id === (selectedVariant?.id || null),
        )

        if (existingItemIndex >= 0) {
          // Update quantity if product already exists
          existingItems[existingItemIndex].quantity += quantity
          existingItems[existingItemIndex].total =
            existingItems[existingItemIndex].price * existingItems[existingItemIndex].quantity
        } else {
          // Add new item if product doesn't exist
          existingItems.push(cartItem)
        }

        // Save updated cart to localStorage
        localStorage.setItem("cartItems", JSON.stringify(existingItems))
        localStorage.setItem("cartLastUpdated", new Date().toISOString())

        // Show success message
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
        }, 5000)

        // Trigger cart update event for other components
        document.dispatchEvent(new CustomEvent("cart-updated"))
      } catch (error) {
        console.error("Error adding to cart:", error)
        toast({
          title: "Error",
          description: "Failed to add item to cart. Please try again.",
          variant: "destructive",
        })
      }

      return
    }

    // For authenticated users, use the cart context
    setIsAddingToCart(true)

    try {
      // Add to cart with a small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 800))

      const success = await addToCart(product.id, quantity, selectedVariant?.id || undefined)

      if (success) {
        setShowSuccess(true)
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false)
        }, 5000)

        // Trigger cart update event for other components
        document.dispatchEvent(new CustomEvent("cart-updated"))
      } else {
        // Fallback to localStorage if API call was not successful
        try {
          // Create a simple cart item
          const cartItem = {
            id: Date.now(),
            product_id: product.id,
            variant_id: selectedVariant?.id || null,
            quantity,
            price: currentPrice,
            total: currentPrice * quantity,
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug || "",
              thumbnail_url: product.image_urls[0] || "",
              image_urls: product.image_urls,
              category: product.category_id,
            },
          }

          // Get existing cart items from localStorage
          const existingItems = JSON.parse(localStorage.getItem("cartItems") || "[]")

          // Check if product already exists in cart
          const existingItemIndex = existingItems.findIndex(
            (item: any) => item.product_id === product.id && item.variant_id === (selectedVariant?.id || null),
          )

          if (existingItemIndex >= 0) {
            // Update quantity if product already exists
            existingItems[existingItemIndex].quantity += quantity
            existingItems[existingItemIndex].total =
              existingItems[existingItemIndex].price * existingItems[existingItemIndex].quantity
          } else {
            // Add new item if product doesn't exist
            existingItems.push(cartItem)
          }

          // Save updated cart to localStorage
          localStorage.setItem("cartItems", JSON.stringify(existingItems))
          localStorage.setItem("cartLastUpdated", new Date().toISOString())

          // Show success message
          setShowSuccess(true)
          setTimeout(() => {
            setShowSuccess(false)
          }, 5000)

          // Trigger cart update event for other components
          document.dispatchEvent(new CustomEvent("cart-updated"))
        } catch (localStorageError) {
          console.error("LocalStorage fallback failed:", localStorageError)
          toast({
            title: "Error",
            description: "Failed to add item to cart. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error)

      // Check if it's an authentication error (401)
      if (error.response && error.response.status === 401) {
        setAuthError(true)
        setTimeout(() => {
          setAuthError(false)
        }, 5000)
      } else {
        // Fallback to localStorage if API call failed
        try {
          // Create a simple cart item
          const cartItem = {
            id: Date.now(),
            product_id: product.id,
            variant_id: selectedVariant?.id || null,
            quantity,
            price: currentPrice,
            total: currentPrice * quantity,
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug || "",
              thumbnail_url: product.image_urls[0] || "",
              image_urls: product.image_urls,
              category: product.category_id,
            },
          }

          // Get existing cart items from localStorage
          const existingItems = JSON.parse(localStorage.getItem("cartItems") || "[]")

          // Check if product already exists in cart
          const existingItemIndex = existingItems.findIndex(
            (item: any) => item.product_id === product.id && item.variant_id === (selectedVariant?.id || null),
          )

          if (existingItemIndex >= 0) {
            // Update quantity if product already exists
            existingItems[existingItemIndex].quantity += quantity
            existingItems[existingItemIndex].total =
              existingItems[existingItemIndex].price * existingItems[existingItemIndex].quantity
          } else {
            // Add new item if product doesn't exist
            existingItems.push(cartItem)
          }

          // Save updated cart to localStorage
          localStorage.setItem("cartItems", JSON.stringify(existingItems))
          localStorage.setItem("cartLastUpdated", new Date().toISOString())

          // Show success message
          setShowSuccess(true)
          setTimeout(() => {
            setShowSuccess(false)
          }, 5000)

          // Trigger cart update event for other components
          document.dispatchEvent(new CustomEvent("cart-updated"))
        } catch (localStorageError) {
          console.error("LocalStorage fallback failed:", localStorageError)
          toast({
            title: "Error",
            description: "Failed to add item to cart. Please try again.",
            variant: "destructive",
          })
        }
      }
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleAddToWishlist = () => {
    // Check if user is authenticated before proceeding
    if (!isAuthenticated) {
      setAuthError(true)
      setTimeout(() => {
        setAuthError(false)
      }, 5000)
      return
    }

    toast({
      title: "Added to wishlist",
      description: `${product.name} has been added to your wishlist`,
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
      toast({
        title: "Link copied",
        description: "Product link has been copied to clipboard",
      })
    }
  }

  // Group variants by color and size
  const variantColors = [...new Set((product.variants || []).map((v: ProductVariant) => v.color).filter(Boolean))]
  const variantSizes = [...new Set((product.variants || []).map((v: ProductVariant) => v.size).filter(Boolean))]

  return (
    <div className="mx-auto max-w-7xl relative">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="bg-green-500 text-white py-3 px-4 flex items-center justify-between">
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-2" />
              <span className="font-medium">Product added to cart</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openSidebarCart}
                className="text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm"
              >
                View Cart
              </button>
              <button onClick={hideSuccessMessage} className="text-white hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Error Message */}
      {authError && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className="bg-cherry-600 text-white py-3 px-4 flex items-center justify-between">
            <div className="flex items-center">
              <LogIn className="h-5 w-5 mr-2" />
              <span className="font-medium">Please log in to add items to your wishlist</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm"
              >
                Login
              </Link>
              <button onClick={hideAuthError} className="text-white hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-4 bg-white p-3 rounded-lg shadow-sm">
        <a href="/" className="hover:text-primary">
          Home
        </a>
        <ChevronRight className="h-4 w-4" />
        <a href={`/category/${product.category_id}`} className="hover:text-primary">
          {product.category_id}
        </a>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-gray-700">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr,1.5fr]">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-white shadow-sm">
            <Image
              src={product.image_urls[selectedImage] || "/placeholder.svg?height=500&width=500"}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
            {discountPercentage > 0 && (
              <Badge className="absolute left-4 top-4 bg-cherry-600 text-white border-0 px-2 py-1 rounded-sm">
                -{discountPercentage}%
              </Badge>
            )}
            {product.is_sale && !discountPercentage && (
              <Badge className="absolute left-4 top-4 bg-cherry-600 text-white border-0 px-2 py-1 rounded-sm">
                SALE
              </Badge>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {product.image_urls.map((image, index) => (
              <button
                key={index}
                className={`relative aspect-square w-16 sm:w-20 flex-shrink-0 overflow-hidden rounded-md border snap-center ${
                  selectedImage === index ? "border-cherry-600" : "border-gray-200"
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <Image
                  src={image || "/placeholder.svg?height=80&width=80"}
                  alt={`${product.name} - View ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
          {/* Title and Brand */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs text-gray-600 font-normal">
                {product.brand_id || "Mizizzi"}
              </Badge>
              {product.stock > 0 ? (
                <Badge className="bg-green-100 text-green-800 border-0 text-xs font-normal">In Stock</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-0 text-xs font-normal">Out of Stock</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold sm:text-2xl text-gray-800">{product.name}</h1>

            {/* Rating Summary */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < 4 ? "fill-cherry-500 text-cherry-500" : "fill-gray-200 text-gray-200"}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">4.0 ({product.reviews?.length || 0} reviews)</span>
            </div>

            {/* SKU */}
            <p className="mt-2 text-xs text-gray-500">SKU: {product.sku}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 border-t border-b py-4">
            <span className="text-2xl font-bold text-cherry-600">KSh {currentPrice.toLocaleString()}</span>
            {currentPrice < originalPrice && (
              <span className="text-base text-gray-500 line-through">KSh {originalPrice.toLocaleString()}</span>
            )}
            {discountPercentage > 0 && (
              <Badge className="ml-2 bg-cherry-100 text-cherry-800 border-0">Save {discountPercentage}%</Badge>
            )}
          </div>

          {/* Description */}
          <div className="text-gray-700 text-sm leading-relaxed border-l-2 border-cherry-200 pl-4 italic">
            {product.description}
          </div>

          {/* Variant Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4">
              {/* Color Selection */}
              {variantColors.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Color</h3>
                  <div className="flex flex-wrap gap-2">
                    {variantColors.map((color) => (
                      <button
                        key={color}
                        className={`relative h-10 rounded-md border px-3 py-1 text-sm ${
                          selectedVariant?.color === color
                            ? "border-cherry-600 bg-cherry-50 text-cherry-800"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          const variant = product.variants?.find((v: ProductVariant) => v.color === color) || null
                          setSelectedVariant(variant)
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {variantSizes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {variantSizes.map((size) => (
                      <button
                        key={size}
                        className={`relative h-10 w-10 rounded-md border text-sm ${
                          selectedVariant?.size === size
                            ? "border-cherry-600 bg-cherry-50 text-cherry-800"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          const variant = product.variants?.find((v: ProductVariant) => v.size === size) || null
                          setSelectedVariant(variant)
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">Quantity</h3>
            <div className="flex w-32 items-center">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-r-none border-gray-300 bg-gray-200 hover:bg-gray-300"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || isAddingToCart || isUpdating}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex h-10 w-12 items-center justify-center border-y border-gray-300 bg-transparent text-sm">
                {isAddingToCart || isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-cherry-900" /> : quantity}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-l-none border-gray-300 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                disabled={quantity >= (product.stock || 10) || isAddingToCart || isUpdating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">Availability:</span>
            {product.stock > 0 ? (
              <span className="text-green-600 flex items-center gap-1">
                <Check size={16} /> In Stock ({product.stock} available)
              </span>
            ) : (
              <span className="text-red-600">Out of Stock</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row pt-4">
            <Button
              className="w-full sm:flex-1 bg-cherry-600 hover:bg-cherry-700 text-white border-0"
              size="lg"
              onClick={handleAddToCart}
              disabled={product.stock <= 0 || isAddingToCart || isUpdating}
            >
              {isAddingToCart || isUpdating ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:flex-1 border-cherry-600 text-cherry-600 hover:bg-cherry-50"
              onClick={handleAddToWishlist}
              disabled={isAddingToCart || isUpdating}
            >
              <Heart className="mr-2 h-4 w-4" />
              Add to Wishlist
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden sm:inline-flex h-12 w-12 border-gray-300"
              onClick={handleShare}
              disabled={isAddingToCart || isUpdating}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Delivery and Returns */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Free Delivery</p>
                  <p className="text-xs text-gray-500">Orders over KSh 10,000</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Authentic Products</p>
                  <p className="text-xs text-gray-500">100% Genuine Guarantee</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Easy Returns</p>
                  <p className="text-xs text-gray-500">14-Day Return Policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-8">
        <Tabs defaultValue="details" className="bg-white rounded-lg shadow-sm">
          <TabsList className="w-full justify-start border-b bg-transparent p-0 rounded-t-lg">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:text-cherry-600 data-[state=active]:shadow-none"
            >
              Product Details
            </TabsTrigger>
            <TabsTrigger
              value="specifications"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:text-cherry-600 data-[state=active]:shadow-none"
            >
              Specifications
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:text-cherry-600 data-[state=active]:shadow-none"
            >
              Reviews
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="p-6">
            <div className="max-w-none">
              <div className="mb-6 text-gray-700 leading-relaxed">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Product Overview</h3>
                <p className="mb-4">{product.description}</p>

                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-cherry-600" />
                    <span className="text-sm">Quality Guaranteed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-cherry-600" />
                    <span className="text-sm">Fast Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-cherry-600" />
                    <span className="text-sm">Easy Returns</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="specifications" className="p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-cherry-700 to-cherry-600 px-5 py-3.5 text-white">
                  <h3 className="font-medium text-sm">Product Specifications</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {product.sku && (
                    <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                      <span className="text-sm font-medium text-gray-600">Reference Code</span>
                      <span className="text-sm text-gray-800">{product.sku}</span>
                    </div>
                  )}
                  {product.weight && (
                    <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                      <span className="text-sm font-medium text-gray-600">Weight</span>
                      <span className="text-sm text-gray-800">{product.weight} kg</span>
                    </div>
                  )}
                  {product.dimensions && (
                    <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                      <span className="text-sm font-medium text-gray-600">Dimensions</span>
                      <span className="text-sm text-gray-800">
                        {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">Crafted By</span>
                    <span className="text-sm text-gray-800">{product.brand_id || "Mizizzi"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-cherry-700 to-cherry-600 px-5 py-3.5 text-white">
                  <h3 className="font-medium text-sm">Materials & Care</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">Material</span>
                    <span className="text-sm text-gray-800">{product.material || "Premium Quality"}</span>
                  </div>
                  <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">Care Instructions</span>
                    <span className="text-sm text-gray-800">Gentle cleaning recommended</span>
                  </div>
                  <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">Sustainability</span>
                    <span className="text-sm text-gray-800">Eco-friendly production</span>
                  </div>
                  <div className="grid grid-cols-2 px-5 py-3.5 hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">Origin</span>
                    <span className="text-sm text-gray-800">Expertly crafted in Kenya</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="p-6">
            <ReviewsSection productId={product.id} initialReviews={product.reviews || []} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 text-sm mb-2">Our Guarantee</h4>
        <p className="text-sm text-gray-700">
          We stand behind our products with a 24-month warranty and hassle-free returns.
        </p>
      </div>
    </div>
  )
}

