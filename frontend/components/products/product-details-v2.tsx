"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Heart,
  Share2,
  Minus,
  Plus,
  ChevronRight,
  Star,
  Check,
  ShoppingCart,
  Loader2,
  ZoomIn,
  Facebook,
  Twitter,
  ChevronLeft,
  Truck,
  ShieldCheck,
  Clock,
  MapPin,
  Award,
  ThumbsUp,
  Shield,
  Zap,
  Phone,
  MessageSquare,
  Mail,
  FileText,
  Video,
  PenToolIcon as Tool,
  ChevronDown,
  Sparkles,
  Crown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart/cart-context"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"
import { productService } from "@/services/product"
import type { Product, ProductVariant } from "@/types"
import { useProducts } from "@/contexts/product/product-context"
import { ImageZoomModal } from "./image-zoom-modal"
import { formatPrice } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/use-media-query"

// Helper function to determine if a product is a luxury product
const isLuxuryProduct = (product: Product): boolean => {
  // Check for luxury indicators in the product
  return Boolean(
    product.category_id === "luxury" ||
      product.category_id === "premium" ||
      (typeof product.category === "object" &&
        (product.category?.name?.toLowerCase().includes("luxury") ||
          product.category?.name?.toLowerCase().includes("premium"))) ||
      product.tags?.some((tag) => tag.toLowerCase().includes("luxury") || tag.toLowerCase().includes("premium")),
  )
}

// Helper function to determine if a product is a flash sale product
const isFlashSaleProduct = (product: Product): boolean => {
  // Check for flash sale indicators in the product
  return Boolean(
    product.sale_price &&
      product.sale_price < product.price &&
      (product.tags?.some((tag) => tag.toLowerCase().includes("flash")) || product.is_flash_sale),
  )
}

interface ProductDetailsV2Props {
  product: Product
}

export function ProductDetailsV2({ product: initialProduct }: { product: Product }) {
  const [product, setProduct] = useState<Product>(initialProduct)
  const { refreshProduct } = useProducts()
  const { toast } = useToast()
  const { addToCart, isUpdating: isCartUpdating } = useCart()
  const { isInWishlist, addToWishlist, removeProductFromWishlist, isUpdating: isWishlistUpdating } = useWishlist()
  const { isAuthenticated } = useAuth()
  const thumbnailsRef = useRef<HTMLDivElement>(null)
  const mainImageRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Essential state variables
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false)
  const { items: cartItems } = useCart()
  const [cartState, setCartState] = useState({ items: cartItems })
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [activeTab, setActiveTab] = useState("description")
  const [expandedSection, setExpandedSection] = useState<string | null>("description")
  const [flashSaleEndsIn, setFlashSaleEndsIn] = useState({ hours: 5, minutes: 30, seconds: 0 })

  // Update countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setFlashSaleEndsIn((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Update product when initialProduct changes
  useEffect(() => {
    setProduct(initialProduct)
  }, [initialProduct])

  // Update cartState when cartItems changes
  useEffect(() => {
    setCartState({ items: cartItems })
  }, [cartItems])

  // Fetch related products
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (product.category_id) {
        setIsLoadingRelated(true)
        try {
          const products = await productService.getProductsByCategory(product.category_id.toString())
          // Filter out current product and limit to 6 items
          const filtered = products
            .filter((p) => p.id !== product.id && p.name !== "Diamond Tennis rizwan")
            .sort(() => 0.5 - Math.random()) // Simple shuffle
            .slice(0, 6)
          setRelatedProducts(filtered)
        } catch (error) {
          console.error("Error fetching related products:", error)
        } finally {
          setIsLoadingRelated(false)
        }
      }
    }

    fetchRelatedProducts()
  }, [product.id, product.category_id])

  // Calculate prices and discounts
  const currentPrice = selectedVariant?.price || product.sale_price || product.price
  const originalPrice = product.price
  const discountPercentage =
    originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0
  const isProductInWishlist = isInWishlist(Number(product.id))

  // Handle variant selection
  const handleVariantSelection = (variant: ProductVariant | null) => {
    setSelectedVariant(variant)
  }

  // Scroll thumbnails
  const scrollThumbnails = (direction: "left" | "right") => {
    if (thumbnailsRef.current) {
      const scrollAmount = direction === "left" ? -80 : 80
      thumbnailsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  // Add to cart function
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

    // Check if item already exists in cart
    const currentCartItem = cartState.items.find(
      (item) =>
        item.product_id === product.id &&
        (selectedVariant?.id === undefined ? item.variant_id === null : item.variant_id === selectedVariant?.id),
    )

    const currentQuantityInCart = currentCartItem?.quantity || 0

    // If item exists in cart, show a different message
    if (currentQuantityInCart > 0) {
      toast({
        title: "Item already in cart",
        description: `You already have ${currentQuantityInCart} of this item in your cart.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar-cart"))}
          >
            View Cart
          </Button>
        ),
      })
      return
    }

    // Check if adding the requested quantity would exceed available stock
    if (currentQuantityInCart + quantity > product.stock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${product.stock} items available. You already have ${currentQuantityInCart} in your cart.`,
        variant: "destructive",
      })
      return
    }

    setIsAddingToCart(true)

    try {
      // Call addToCart with the variant ID if it exists
      const success = await addToCart(
        Number(product.id),
        quantity,
        typeof selectedVariant?.id === "number" ? selectedVariant.id : undefined,
      )

      if (success) {
        toast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart.`,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar-cart"))}
            >
              View Cart
            </Button>
          ),
        })

        // Trigger a cart refresh
        document.dispatchEvent(new CustomEvent("cart-updated"))
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Toggle wishlist function
  const handleToggleWishlist = async () => {
    setIsTogglingWishlist(true)
    try {
      if (isProductInWishlist) {
        await removeProductFromWishlist(Number(product.id))
        toast({
          description: "Removed from wishlist",
        })
      } else {
        await addToWishlist(Number(product.id))
        toast({
          description: "Added to wishlist",
        })
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTogglingWishlist(false)
    }
  }

  // Share product function
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

  // Format specifications for display
  const specifications = [
    { label: "SKU", value: product.sku || "N/A" },
    { label: "Weight", value: product.weight ? `${product.weight} kg` : "N/A" },
    {
      label: "Dimensions",
      value: product.dimensions
        ? `${product.dimensions.length} × ${product.dimensions.width} × ${product.dimensions.height} cm`
        : "N/A",
    },
    { label: "Brand", value: product.brand_id || "Mizizzi" },
    { label: "Material", value: product.material || "Premium Quality" },
    { label: "Warranty", value: product.warranty || "2 Years Official Warranty" },
  ]

  // Key features for display
  const keyFeatures = product.features || [
    "Premium quality materials for durability",
    "Ergonomic design for comfort",
    "Versatile for everyday use",
    "Modern aesthetic that complements any style",
    "Easy to clean and maintain",
  ]

  // What's in the box
  const inTheBox = ["1 x " + product.name, "User Manual", "Warranty Card"]

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null): number => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Delivery estimates
  const today = new Date()
  const tomorrowDate = new Date(today)
  tomorrowDate.setDate(today.getDate() + 1)

  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(today.getDate() + 2)

  // Format date as "Mon, Apr 15"
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  const pickupStations = [
    {
      name: "Nairobi CBD Pickup Station",
      address: "Moi Avenue, Nairobi",
      hours: "Mon-Sat: 8:00 AM - 6:00 PM",
    },
    {
      name: "Westlands Pickup Station",
      address: "Parklands Road, Westlands",
      hours: "Mon-Sat: 9:00 AM - 5:00 PM",
    },
    {
      name: "Karen Pickup Station",
      address: "Karen Road, Karen",
      hours: "Mon-Sat: 8:30 AM - 5:30 PM",
    },
  ]

  // Determine if this is a luxury product
  const isLuxury = isLuxuryProduct(product)
  // Determine if this is a flash sale product
  const isFlashSale = isFlashSaleProduct(product)
  // Determine if we should show a banner (only for flash sales)
  const showBanner = isFlashSale && discountPercentage > 0

  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center space-x-1 bg-white px-4 py-3 text-sm text-gray-500 rounded-md shadow-sm">
        <Link href="/" className="hover:text-cherry-700">
          Home
        </Link>
        <ChevronRight className="mx-1 h-3 w-3" />
        {/* Fix the category name access issue by checking if category is an object */}
        <Link href={`/category/${product.category_id}`} className="hover:text-cherry-700">
          {typeof product.category === "object" && product.category?.name
            ? product.category.name
            : product.category_id || "Category"}
        </Link>
        <ChevronRight className="mx-1 h-3 w-3" />
        <span className="truncate font-medium text-gray-700">{product.name}</span>
      </nav>

      {/* Flash Sale Banner - Only show for flash sale products */}
      {showBanner && (
        <div className="mb-4 bg-gradient-to-r from-cherry-700 to-cherry-800 rounded-lg p-3 text-white shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center mb-2 sm:mb-0">
              <Zap className="h-5 w-5 mr-2 animate-pulse" />
              <span className="font-bold">FLASH SALE!</span>
              <span className="ml-2 bg-white text-cherry-800 text-xs font-bold px-2 py-0.5 rounded-full">
                SAVE {discountPercentage}%
              </span>
            </div>
            <div className="flex items-center text-sm">
              <span className="mr-2">Ends in:</span>
              <div className="flex space-x-1">
                <span className="bg-black/20 px-2 py-1 rounded">{String(flashSaleEndsIn.hours).padStart(2, "0")}</span>
                <span>:</span>
                <span className="bg-black/20 px-2 py-1 rounded">
                  {String(flashSaleEndsIn.minutes).padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="bg-black/20 px-2 py-1 rounded">
                  {String(flashSaleEndsIn.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Product Section */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column - Product Images */}
        <div className="md:col-span-5 lg:col-span-5">
          {/* Luxury Badge - Only for luxury products */}
          {isLuxury && (
            <div className="mb-4 flex items-center">
              <div className="flex items-center bg-gradient-to-r from-indigo-900 to-purple-900 text-white px-4 py-2 rounded-full shadow-md">
                <Crown className="h-5 w-5 mr-2 text-yellow-300" />
                <span className="font-serif text-sm uppercase tracking-wider">Luxury Collection</span>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border bg-white p-2 shadow-sm">
            {/* Main Image */}
            <div
              className="relative mb-3 aspect-square overflow-hidden rounded-md bg-white cursor-zoom-in"
              ref={mainImageRef}
              onClick={() => setIsZoomModalOpen(true)}
            >
              <Image
                src={(product.image_urls ?? [])[selectedImage] || "/placeholder.svg?height=500&width=500&query=product"}
                alt={product.name}
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 30vw"
                priority
              />
              {product.sale_price && product.sale_price < product.price && (
                <div className="absolute left-2 top-2 bg-cherry-700 px-2 py-0.5 text-[10px] font-semibold text-white rounded-full shadow-sm">
                  -{calculateDiscount(Number(product.price), product.sale_price ? Number(product.sale_price) : null)}%
                </div>
              )}

              {product.is_new && (
                <div className="absolute right-3 top-3 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  NEW
                </div>
              )}

              <button
                className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsZoomModalOpen(true)
                }}
              >
                <ZoomIn className="h-4 w-4 text-cherry-800" />
              </button>
            </div>

            {/* Thumbnails */}
            {(product.image_urls?.length || 0) > 1 && (
              <div className="relative px-4">
                <button
                  onClick={() => scrollThumbnails("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow-sm z-10 hover:bg-gray-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                <div
                  className="no-scrollbar flex gap-2 overflow-x-auto py-1 scroll-smooth"
                  ref={thumbnailsRef}
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {(product.image_urls ?? []).map((image, index) => (
                    <button
                      key={index}
                      className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                        selectedImage === index
                          ? "border-cherry-700 shadow-sm"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <Image
                        src={image || "/placeholder.svg?height=80&width=80&query=product thumbnail"}
                        alt={`${product.name} - View ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => scrollThumbnails("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow-sm z-10 hover:bg-gray-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            )}

            {/* Official Store Badge */}
            <div className="mt-4 flex items-center justify-center border-t border-gray-100 pt-4">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1.5 px-3 py-1.5"
              >
                <Award className="h-3.5 w-3.5" />
                <span className="font-medium">Official Store</span>
                <Check className="h-3.5 w-3.5 ml-0.5" />
              </Badge>
            </div>

            {/* Social Share */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">SHARE THIS PRODUCT</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, "_blank")
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Share on Facebook"
                >
                  <Facebook className="h-4 w-4 text-blue-600" />
                </button>
                <button
                  onClick={() => {
                    window.open(`https://twitter.com/intent/tweet?url=${window.location.href}`, "_blank")
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Share on Twitter"
                >
                  <Twitter className="h-4 w-4 text-sky-500" />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    toast({
                      description: "Link copied to clipboard",
                    })
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Copy link"
                >
                  <Share2 className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <button
                onClick={() => {
                  toast({
                    description: "Report submitted. Thank you for your feedback.",
                  })
                }}
                className="mt-3 inline-block text-xs text-cherry-700 hover:underline"
              >
                Report incorrect product information
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="md:col-span-7 lg:col-span-7 space-y-4">
          {/* Product Header */}
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            {/* Shipping Badge */}
            {(product as any).is_imported ? (
              <div className="border-b border-gray-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700">
                <span className="flex items-center">
                  <Truck className="mr-1.5 h-3.5 w-3.5" /> International Product
                </span>
              </div>
            ) : null}

            <div className="p-4">
              {/* Luxury Header - Only for luxury products */}
              {isLuxury && (
                <div className="mb-4">
                  <div className="flex items-center">
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-indigo-200 to-transparent"></div>
                    <div className="px-3 flex items-center">
                      <Sparkles className="h-4 w-4 text-indigo-600 mr-1.5" />
                      <span className="text-sm font-serif text-indigo-800 uppercase tracking-wider">
                        Exclusive Luxury Item
                      </span>
                    </div>
                    <div className="h-0.5 flex-1 bg-gradient-to-l from-indigo-200 to-transparent"></div>
                  </div>
                </div>
              )}

              <h1 className="mb-3 text-xl font-bold text-gray-900 leading-tight">{product.name}</h1>

              {/* Rating Summary */}
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < (product.rating || 4) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                    }
                  />
                ))}
                <span className="ml-1.5 text-sm font-medium text-gray-700">{product.rating || 4} / 5</span>
                <span className="mx-1 text-gray-300">|</span>
                <Link href="#reviews" className="text-sm text-cherry-700 hover:underline">
                  {product.reviews?.length || 24} verified ratings
                </Link>
                <span className="mx-1 text-gray-300">|</span>
                <span className="text-sm text-green-600 flex items-center">
                  <ThumbsUp className="h-3 w-3 mr-1" /> 98% Positive Feedback
                </span>
              </div>

              {/* Brand */}
              <div className="mb-4">
                <span className="text-sm text-gray-500">Brand: </span>
                <Link
                  href={`/brand/${product.brand_id}`}
                  className="text-sm font-medium text-cherry-700 hover:underline"
                >
                  {product.brand_id || "Mizizzi"}
                </Link>
                <span className="ml-2 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Check className="mr-0.5 h-3 w-3" />
                  Verified
                </span>
              </div>

              {/* Price Section */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${isLuxury ? "text-indigo-800" : "text-cherry-800"}`}>
                    {formatPrice(currentPrice)}
                  </span>
                  {currentPrice < originalPrice && (
                    <span className="text-base text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                  )}
                  {discountPercentage > 0 && (
                    <span
                      className={`rounded-md ${isLuxury ? "bg-indigo-50 text-indigo-700" : "bg-cherry-50 text-cherry-700"} px-2 py-0.5 text-sm font-medium`}
                    >
                      Save {discountPercentage}%
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">VAT included • Free shipping on orders over KSh 2,000</p>
              </div>

              {/* Stock Status */}
              <div className="mb-3 flex items-center gap-2">
                {product.stock > 10 ? (
                  <span className="inline-flex items-center text-sm font-medium text-green-600">
                    <Check className="mr-1 h-4 w-4" /> In stock
                  </span>
                ) : product.stock > 0 ? (
                  <span className="inline-flex items-center text-sm font-medium text-amber-600">
                    <Clock className="mr-1 h-4 w-4" /> Only {product.stock} left
                  </span>
                ) : (
                  <span className="inline-flex items-center text-sm font-medium text-red-600">Out of stock</span>
                )}

                {product.stock > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    <span className="font-medium text-green-600">Order now</span> and receive by{" "}
                    <span className="font-medium text-green-600">
                      {new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>{" "}
                    with express delivery
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Luxury Product Highlight - Only for luxury products */}
          {isLuxury && (
            <div className="rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-indigo-100 p-2">
                  <Award className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-indigo-900">Premium Craftsmanship</h3>
                  <p className="mt-1 text-sm text-indigo-700">
                    This exclusive item is part of our luxury collection, featuring exceptional quality materials and
                    meticulous attention to detail.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white/80 border-indigo-200 text-indigo-800">
                      Handcrafted
                    </Badge>
                    <Badge variant="outline" className="bg-white/80 border-indigo-200 text-indigo-800">
                      Premium Materials
                    </Badge>
                    <Badge variant="outline" className="bg-white/80 border-indigo-200 text-indigo-800">
                      Limited Edition
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Information */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-medium text-gray-800 flex items-center">
              <Truck className="mr-2 h-4 w-4 text-cherry-700" />
              DOOR-TO-DOOR DELIVERY
            </h3>

            <div className="space-y-3">
              {/* Express Delivery Option */}
              <div className="flex items-start gap-3 p-3 border border-green-100 bg-green-50 rounded-md">
                <Zap className="mt-0.5 h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Express Delivery ({formatDate(tomorrowDate)})</p>
                  <p className="text-xs text-gray-600">
                    Order within{" "}
                    <span className="font-semibold text-green-700">
                      {flashSaleEndsIn.hours}h {flashSaleEndsIn.minutes}m
                    </span>{" "}
                    and get it delivered tomorrow to your doorstep
                  </p>
                  <p className="text-xs font-medium text-green-700 mt-1">FREE Delivery on this item!</p>
                </div>
              </div>

              {/* Standard Delivery Option */}
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <Truck className="mt-0.5 h-5 w-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Standard Delivery ({formatDate(dayAfterTomorrow)})
                  </p>
                  <p className="text-xs text-gray-600">
                    Delivered directly to your home or office - {currentPrice > 2000 ? "FREE" : "KSh 200"}
                  </p>
                </div>
              </div>

              {/* Nationwide Delivery */}
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <MapPin className="mt-0.5 h-5 w-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Nationwide Delivery</p>
                  <p className="text-xs text-gray-600">We deliver to all major cities and towns across Kenya</p>
                  <button
                    className="text-xs text-cherry-700 font-medium mt-1 flex items-center"
                    onClick={() => toast({ description: "Delivery coverage information shown" })}
                  >
                    Check delivery coverage <ChevronRight className="h-3 w-3 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Return Policy */}
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Easy Returns</p>
                  <p className="text-xs text-gray-600">
                    Free returns within 15 days for eligible items.{" "}
                    <Link href="/returns" className="text-cherry-700 hover:underline">
                      See details
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Variant Selection */}
          {(variantColors.length > 0 || variantSizes.length > 0) && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-medium text-gray-800">SELECT OPTIONS</h3>

              {variantColors.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-700">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {variantColors.map((color) => (
                      <button
                        key={color}
                        className={`px-4 py-2 border rounded-md text-sm transition-all ${
                          selectedVariant?.color === color
                            ? isLuxury
                              ? "border-indigo-700 bg-indigo-50 text-indigo-800 font-medium"
                              : "border-cherry-700 bg-cherry-50 text-cherry-800 font-medium"
                            : "border-gray-300 hover:border-gray-400 text-gray-700"
                        }`}
                        onClick={() => {
                          const variant = product.variants?.find((v: ProductVariant) => v.color === color) || null
                          handleVariantSelection(variant)
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {variantSizes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm text-gray-700">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {variantSizes.map((size) => (
                      <button
                        key={size}
                        className={`px-4 py-2 border rounded-md text-sm transition-all ${
                          selectedVariant?.size === size
                            ? isLuxury
                              ? "border-indigo-700 bg-indigo-50 text-indigo-800 font-medium"
                              : "border-cherry-700 bg-cherry-50 text-cherry-800 font-medium"
                            : "border-gray-300 hover:border-gray-400 text-gray-700"
                        }`}
                        onClick={() => {
                          const variant = product.variants?.find((v: ProductVariant) => v.size === size) || null
                          handleVariantSelection(variant)
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

          {/* Quantity and Add to Cart */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="mr-3 text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex h-10 items-center overflow-hidden rounded-md border border-gray-300">
                  <button
                    className="flex h-full w-10 items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isAddingToCart}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    className="h-full w-12 border-none bg-transparent p-0 text-center text-sm outline-none"
                    value={quantity}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value)
                      if (!isNaN(value) && value > 0) {
                        setQuantity(Math.min(product.stock || 10, value))
                      }
                    }}
                    min="1"
                    max={product.stock || 10}
                  />
                  <button
                    className="flex h-full w-10 items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                    onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                    disabled={quantity >= (product.stock || 10) || isAddingToCart}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {product.stock > 0 && <span className="ml-3 text-xs text-gray-500">({product.stock} available)</span>}
              </div>

              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Button
                  className={`h-12 w-full ${
                    isLuxury ? "bg-indigo-800 hover:bg-indigo-700" : "bg-cherry-800 hover:bg-cherry-700"
                  } text-white rounded-md shadow-sm transition-colors`}
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0 || isAddingToCart || isCartUpdating}
                >
                  {isAddingToCart || isCartUpdating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-5 w-5" />
                  )}
                  ADD TO CART
                </Button>

                <Button
                  variant="outline"
                  className={`h-12 flex-1 rounded-md border transition-colors ${
                    isProductInWishlist
                      ? isLuxury
                        ? "border-indigo-700 bg-indigo-50 text-indigo-800"
                        : "border-cherry-700 bg-cherry-50 text-cherry-800"
                      : "border-gray-300 text-gray-700 hover:border-cherry-700 hover:text-cherry-800"
                  }`}
                  onClick={handleToggleWishlist}
                  disabled={isTogglingWishlist || isWishlistUpdating}
                >
                  {isTogglingWishlist || isWishlistUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`mr-2 h-4 w-4 ${isProductInWishlist ? (isLuxury ? "fill-indigo-700" : "fill-cherry-700") : ""}`}
                    />
                  )}
                  {isProductInWishlist ? "SAVED" : "SAVE"}
                </Button>
              </div>
            </div>

            {/* Secure Shopping Guarantee */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-md bg-gray-50 px-4 py-3">
              <div className="flex items-center text-xs text-gray-600">
                <ShieldCheck className="mr-1.5 h-4 w-4 text-cherry-700" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <Truck className="mr-1.5 h-4 w-4 text-cherry-700" />
                <span>Fast Delivery</span>
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <Check className="mr-1.5 h-4 w-4 text-cherry-700" />
                <span>Authentic Products</span>
              </div>
            </div>
          </div>

          {/* Customer Assistance */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-medium text-gray-800 flex items-center">
              <MessageSquare className="mr-2 h-4 w-4 text-cherry-700" />
              CUSTOMER ASSISTANCE
            </h3>
            <div className="space-y-3">
              {/* Live Chat & Call Support */}
              <div className="flex items-start gap-2 text-sm border-l-4 border-green-500 bg-green-50 p-3 rounded-r-md">
                <MessageSquare className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900">Questions about this product?</p>
                  <p className="text-xs text-green-700 mb-1">Our product experts are ready to help</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toast({ description: "Live chat initiated" })}
                      className="text-xs font-medium text-green-800 bg-green-200/50 px-2 py-1 rounded hover:bg-green-200 transition-colors flex items-center"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" /> Live Chat
                    </button>
                    <button
                      onClick={() => toast({ description: "WhatsApp support initiated" })}
                      className="text-xs font-medium text-green-800 bg-green-200/50 px-2 py-1 rounded hover:bg-green-200 transition-colors flex items-center"
                    >
                      <Phone className="h-3 w-3 mr-1" /> Call Us
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Protection */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-medium text-gray-800 flex items-center">
              <Shield className="mr-2 h-4 w-4 text-cherry-700" />
              BUYER PROTECTION
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600" />
                <p className="text-gray-700">Money back guarantee if item not as described</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600" />
                <p className="text-gray-700">Secure payments via M-Pesa, Airtel Money, and major cards</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600" />
                <p className="text-gray-700">24/7 customer support via WhatsApp and phone</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Information Tabs */}
      <div className="mt-8">
        <Tabs defaultValue="description" className="w-full">
          {/* Mobile Tabs - Scrollable */}
          <div className="md:hidden overflow-x-auto no-scrollbar">
            <TabsList className="flex w-max bg-white rounded-t-lg border border-b-0 border-gray-200 px-1">
              <TabsTrigger
                value="description"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none px-3"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="specifications"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none px-3"
              >
                Specs
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none px-3"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none px-3"
              >
                Shipping
              </TabsTrigger>
              <TabsTrigger
                value="help"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none px-3"
              >
                Help
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop Tabs - Grid */}
          <div className="hidden md:block">
            <TabsList className="grid w-full grid-cols-5 bg-white rounded-t-lg border border-b-0 border-gray-200">
              <TabsTrigger
                value="description"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="specifications"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none"
              >
                Specifications
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none"
              >
                Shipping
              </TabsTrigger>
              <TabsTrigger
                value="help"
                className="data-[state=active]:border-b-2 data-[state=active]:border-cherry-700 data-[state=active]:text-cherry-800 rounded-none"
              >
                Help & Support
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="rounded-b-lg border border-t-0 border-gray-200 bg-white">
            <TabsContent value="description" className="p-6">
              <div className="prose prose-sm max-w-none text-gray-700">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Product Description</h3>
                <div className="leading-relaxed">
                  {product.description && product.description.length > 0 ? (
                    <p>{product.description}</p>
                  ) : (
                    <p>
                      Experience premium quality with our {product.name}. This product combines elegant design with
                      exceptional functionality to deliver an unparalleled user experience. Crafted with attention to
                      detail and built using high-quality materials, this product is designed to last in Kenya's diverse
                      climate conditions.
                    </p>
                  )}
                </div>

                <h4 className="text-base font-medium text-gray-900 mt-6 mb-3">Key Features</h4>
                <ul className="space-y-2 list-disc pl-5">
                  {keyFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>

                <h4 className="text-base font-medium text-gray-900 mt-6 mb-3">What's in the Box</h4>
                <ul className="space-y-1 list-disc pl-5">
                  {inTheBox.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="specifications" className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Specifications</h3>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 divide-y divide-gray-200">
                  {specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-2 px-4 py-3 text-sm">
                      <div className="font-medium text-gray-700">{spec.label}</div>
                      <div className="text-gray-700">{spec.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="p-6" id="reviews">
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Reviews</h3>

                <div className="grid md:grid-cols-12 gap-6">
                  <div className="md:col-span-4 rounded-lg bg-gray-50 p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-500 mb-1">
                      {product.rating?.toFixed(1) || "4.8"}/5
                    </div>
                    <div className="flex justify-center mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">{product.reviews?.length || 24} verified ratings</div>

                    {/* Rating Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right font-medium">
                          5<span className="sr-only"> stars</span>
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "75%" }}></div>
                        </div>
                        <span className="text-gray-500 w-8">(18)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right font-medium">
                          4<span className="sr-only"> stars</span>
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "25%" }}></div>
                        </div>
                        <span className="text-gray-500 w-8">(6)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right font-medium">
                          3<span className="sr-only"> stars</span>
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                        <span className="text-gray-500 w-8">(0)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right font-medium">
                          2<span className="sr-only"> stars</span>
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                        <span className="text-gray-500 w-8">(0)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right font-medium">
                          1<span className="sr-only"> stars</span>
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                        <span className="text-gray-500 w-8">(0)</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8">
                    <div className="space-y-4">
                      {/* Review Cards */}
                      <div className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-sm">
                        <div className="flex items-center mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm font-semibold mb-1 text-gray-900">Excellent quality and fast delivery</p>
                        <p className="text-sm text-gray-700 mb-2">
                          The product is exactly as described. Great value for money and arrived within 24 hours to
                          Westlands. Very impressed with the service!
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>07-04-2025 by Geoffrey K. from Nairobi</span>
                          <span className="flex items-center text-green-600">
                            <Check className="h-3 w-3 mr-1" /> Verified Purchase
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-sm">
                        <div className="flex items-center mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm font-semibold mb-1 text-gray-900">Amazing product and service</p>
                        <p className="text-sm text-gray-700 mb-2">
                          Exceeded my expectations in every way. The quality is top-notch and delivery was super fast to
                          Kilimani. The delivery guy was very professional too.
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>28-03-2025 by Nabz from Nairobi</span>
                          <span className="flex items-center text-green-600">
                            <Check className="h-3 w-3 mr-1" /> Verified Purchase
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-sm">
                        <div className="flex items-center mb-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                          ))}
                          {Array.from({ length: 1 }).map((_, i) => (
                            <Star key={i} size={14} className="fill-gray-200 text-gray-200" />
                          ))}
                        </div>
                        <p className="text-sm font-semibold mb-1 text-gray-900">Good product, fast shipping</p>
                        <p className="text-sm text-gray-700 mb-2">
                          The product is good for the price. Shipping to Karen was surprisingly fast - ordered in the
                          morning and received it the same day!
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>15-03-2025 by Owen M. from Nairobi</span>
                          <span className="flex items-center text-green-600">
                            <Check className="h-3 w-3 mr-1" /> Verified Purchase
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <Button variant="outline" className="border-cherry-700 text-cherry-800 hover:bg-cherry-50">
                        See All Reviews
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="p-4 md:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Door-to-Door Delivery</h3>

              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-3 md:p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Delivery Options</h4>
                  <div className="overflow-x-auto -mx-3 px-3">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium text-gray-700">Delivery Method</th>
                          <th className="py-2 text-left font-medium text-gray-700">Estimated Time</th>
                          <th className="py-2 text-left font-medium text-gray-700">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2.5">Express Delivery</td>
                          <td className="py-2.5">Same Day or Next Day</td>
                          <td className="py-2.5">KSh 300</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2.5">Standard Delivery</td>
                          <td className="py-2.5">1-2 Business Days</td>
                          <td className="py-2.5">KSh 200</td>
                        </tr>
                        <tr>
                          <td className="py-2.5">Nationwide Delivery</td>
                          <td className="py-2.5">2-5 Business Days</td>
                          <td className="py-2.5">KSh 350-700</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Door-to-Door Delivery Details</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Truck className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Nairobi Metropolitan Area</p>
                        <p className="text-xs text-gray-600">
                          Same-day delivery available for orders placed before 11 AM
                        </p>
                        <p className="text-xs text-gray-600">Delivery hours: 9 AM - 7 PM, 7 days a week</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Truck className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Major Towns</p>
                        <p className="text-xs text-gray-600">
                          Next-day delivery to Mombasa, Kisumu, Nakuru, and Eldoret
                        </p>
                        <p className="text-xs text-gray-600">Delivery hours: 9 AM - 6 PM, Monday to Saturday</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Truck className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Other Locations</p>
                        <p className="text-xs text-gray-600">2-5 business days depending on location</p>
                        <p className="text-xs text-gray-600">
                          Our delivery partners will contact you to arrange delivery
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Delivery Process</h4>
                  <ol className="space-y-2 text-sm text-gray-700 list-decimal pl-5">
                    <li>Order confirmation sent via SMS and email</li>
                    <li>Delivery scheduling call from our logistics team</li>
                    <li>Day-of-delivery SMS with estimated delivery window</li>
                    <li>Call from driver when they're 30 minutes away</li>
                    <li>Contactless delivery with digital proof of delivery</li>
                  </ol>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Shipping Policies</h4>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                    <li>Orders are processed and shipped on business days (Monday to Saturday, excluding holidays)</li>
                    <li>Tracking information will be provided via email, SMS and WhatsApp once your order ships</li>
                    <li>
                      For orders with multiple items, all items may ship together or separately depending on
                      availability
                    </li>
                    <li>Delivery times may vary based on your location and weather conditions</li>
                    <li>Free shipping on all orders above KSh 2,000</li>
                    <li>Signature required upon delivery for items valued over KSh 5,000</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="help" className="p-4 md:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Help & Support</h3>

              <div className="space-y-4">
                {/* Keep the existing content but adjust some spacing */}
                <div className="rounded-lg border border-gray-200 p-3 md:p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Customer Support</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Call Center</p>
                        <p className="text-xs text-gray-600">0800-MIZIZZI (0800-123-4567)</p>
                        <p className="text-xs text-gray-600">Available 8 AM - 8 PM, 7 days a week</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">WhatsApp Support</p>
                        <p className="text-xs text-gray-600">+254 712 345 678</p>
                        <p className="text-xs text-gray-600">Available 24/7 for chat support</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Email Support</p>
                        <p className="text-xs text-gray-600">help@mizizzi.co.ke</p>
                        <p className="text-xs text-gray-600">Response within 24 hours</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Frequently Asked Questions</h4>
                  <div className="space-y-3">
                    <div className="border-b pb-2">
                      <button
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => toggleSection("faq1")}
                      >
                        <span className="text-sm font-medium">How do I track my order?</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expandedSection === "faq1" ? "rotate-180" : ""}`}
                        />
                      </button>
                      {expandedSection === "faq1" && (
                        <p className="mt-2 text-xs text-gray-600">
                          You can track your order by clicking on the tracking link in your order confirmation email or
                          by logging into your account and viewing your order history.
                        </p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <button
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => toggleSection("faq2")}
                      >
                        <span className="text-sm font-medium">What is your return policy?</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expandedSection === "faq2" ? "rotate-180" : ""}`}
                        />
                      </button>
                      {expandedSection === "faq2" && (
                        <p className="mt-2 text-xs text-gray-600">
                          We offer a 15-day return policy for most items. Products must be in original condition with
                          all packaging and accessories. Some items like electronics may have specific return
                          conditions.
                        </p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <button
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => toggleSection("faq3")}
                      >
                        <span className="text-sm font-medium">How do I set up or install this product?</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expandedSection === "faq3" ? "rotate-180" : ""}`}
                        />
                      </button>
                      {expandedSection === "faq3" && (
                        <p className="mt-2 text-xs text-gray-600">
                          This product comes with a detailed installation guide. For additional help, we offer video
                          tutorials on our website or you can contact our technical support team.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Setup & Installation</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Product Manual</p>
                        <p className="text-xs text-gray-600">
                          Download the detailed product manual with setup instructions
                        </p>
                        <button className="mt-1 text-xs font-medium text-cherry-700 hover:underline">
                          Download PDF
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Video className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Video Tutorials</p>
                        <p className="text-xs text-gray-600">Watch step-by-step setup and usage videos</p>
                        <button className="mt-1 text-xs font-medium text-cherry-700 hover:underline">
                          Watch Videos
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Tool className="h-4 w-4 mt-0.5 text-cherry-700" />
                      <div>
                        <p className="text-sm font-medium">Professional Installation</p>
                        <p className="text-xs text-gray-600">Book our expert installation service</p>
                        <button className="mt-1 text-xs font-medium text-cherry-700 hover:underline">
                          Book Service
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center">
                    <Award className="h-4 w-4 mr-2" />
                    Mizizzi Care Package
                  </h4>
                  <p className="text-sm text-green-700 mb-2">
                    Get premium support, extended returns, and priority service with our Care Package.
                  </p>
                  <Button variant="outline" className="mt-2 border-green-600 text-green-700 hover:bg-green-100 text-sm">
                    Add Care Package (+KSh 1,499)
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* You May Also Like - Luxury Style */}
      <div className="mt-10 mb-12">
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-cherry-900 to-cherry-800 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center">
              <Award className="h-5 w-5 mr-2" />
              LUXURY PICKS FOR YOU
            </h2>
            <Link
              href="/luxury"
              className="text-sm text-white hover:underline flex items-center bg-black/20 px-3 py-1 rounded-full"
            >
              Explore Luxury <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              <AnimatePresence mode="popLayout">
                {relatedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link href={`/product/${product.id}`} className="block h-full">
                      <Card className="group h-full overflow-hidden border border-gray-100 bg-white shadow-none transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                        <div className="relative aspect-square overflow-hidden bg-gray-50">
                          <Image
                            src={
                              product.image_urls?.[0] || "/placeholder.svg?height=200&width=200&query=luxury product"
                            }
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {product.sale_price && product.sale_price < product.price && (
                            <div className="absolute left-2 top-2 bg-cherry-700 px-2 py-0.5 text-[10px] font-semibold text-white rounded-full shadow-sm">
                              -
                              {calculateDiscount(
                                Number(product.price),
                                product.sale_price ? Number(product.sale_price) : null,
                              )}
                              %
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <div className="mb-1">
                            <span className="inline-block rounded-sm bg-cherry-50 px-1.5 py-0.5 text-[10px] font-medium text-cherry-700 border border-cherry-200">
                              PREMIUM
                            </span>
                          </div>
                          <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-700 group-hover:text-gray-900 min-h-[32px]">
                            {product.name}
                          </h3>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="text-sm font-semibold text-cherry-700">
                              KSh {(Number(product.sale_price) || Number(product.price)).toLocaleString()}
                            </span>
                            {product.sale_price && product.sale_price < product.price && (
                              <span className="text-[11px] text-gray-500 line-through">
                                KSh {Number(product.price).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        product={product}
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        selectedImageIndex={selectedImage}
      />
    </div>
  )
}
