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
  Award,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Sparkles,
  FlameIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter } from "next/navigation"
import { ProductAvailability } from "@/components/products/product-availability"
import inventoryService from "@/services/inventory-service"

// Product with recommendation type
type ProductWithRecommendation = Product & {
  recommendation_reason?: string
  score?: number
}

// Helper function to determine if a product is a luxury product
const isLuxuryProduct = (product: Product): boolean => {
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
  return Boolean(
    product.sale_price &&
      product.sale_price < product.price &&
      (product.tags?.some((tag) => tag.toLowerCase().includes("flash")) || product.is_flash_sale),
  )
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
  const router = useRouter()

  // Essential state variables
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false)
  const { items: cartItems } = useCart()
  const [cartState, setCartState] = useState({ items: cartItems })
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<ProductWithRecommendation[]>([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [activeTab, setActiveTab] = useState("description")
  const [expandedSection, setExpandedSection] = useState<string | null>("description")
  const [personalizedProducts, setPersonalizedProducts] = useState<ProductWithRecommendation[]>([])

  // Determine if product is flash sale or luxury
  const isFlashSale = isFlashSaleProduct(product)
  const isLuxury = isLuxuryProduct(product)

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
          setRelatedProducts(filtered as ProductWithRecommendation[])
        } catch (error) {
          console.error("Error fetching related products:", error)
        } finally {
          setIsLoadingRelated(false)
        }
      }
    }

    fetchRelatedProducts()
  }, [product.id, product.category_id])

  // Add a function to get personalized recommendations
  const getPersonalizedRecommendations = async () => {
    try {
      // Get cart items
      const cartProductIds = cartItems
        .filter((item) => item.product_id !== null && item.product_id !== undefined)
        .map((item) => item.product_id as number)

      // Get browsing history from localStorage
      const storedHistory = typeof window !== "undefined" ? localStorage.getItem("browsing_history") : null
      const browsingHistory = storedHistory ? JSON.parse(storedHistory) : []

      // Add current product to browsing history if not already there
      if (!browsingHistory.includes(product.id)) {
        const updatedHistory = [product.id, ...browsingHistory].slice(0, 10) // Keep last 10 items
        localStorage.setItem("browsing_history", JSON.stringify(updatedHistory))
      }

      // Fetch all available products for recommendation
      let allProducts = await productService.getProducts({ limit: 30 })

      // Filter out the current product
      allProducts = allProducts.filter((p) => p.id !== product.id)

      // Create a scoring system for recommendations
      const scoredProducts = allProducts.map((p) => {
        let score = 0
        const productWithRec = p as ProductWithRecommendation

        // Boost score for luxury products
        if (
          p.is_luxury_deal ||
          (typeof p.category === "object" && p.category?.name?.toLowerCase().includes("luxury")) ||
          (p.tags && p.tags.some((tag) => tag.toLowerCase().includes("luxury")))
        ) {
          score += 30
          productWithRec.recommendation_reason = "LUXURY PICK"
        }

        // Boost score for flash sale products
        if (p.is_flash_sale) {
          score += 20
          productWithRec.recommendation_reason = "FLASH SALE"
        }

        // Boost score for products in the same category
        if (p.category_id === product.category_id) {
          score += 15
          productWithRec.recommendation_reason = "SIMILAR STYLE"
        }

        // Boost score for products with similar price range (±30%)
        const priceToCompare = product.sale_price || product.price
        const productPrice = p.sale_price || p.price
        if (productPrice >= priceToCompare * 0.7 && productPrice <= priceToCompare * 1.3) {
          score += 10
        }

        // Boost score for products from the same brand
        if (p.brand_id === product.brand_id) {
          score += 10
          productWithRec.recommendation_reason = "SAME BRAND"
        }

        // Boost score for products with similar tags
        if (p.tags && product.tags) {
          const commonTags = p.tags.filter((tag) => product.tags?.includes(tag))
          score += commonTags.length * 5
          if (commonTags.length > 0) {
            productWithRec.recommendation_reason = "MATCHING STYLE"
          }
        }

        // Boost score for products in the cart (complementary items)
        const productId = typeof p.id === "string" ? Number.parseInt(p.id, 10) : p.id
        if (cartProductIds.includes(productId)) {
          score -= 50 // Lower score for items already in cart
        }

        // Boost score for products in browsing history
        if (browsingHistory.includes(p.id)) {
          score += 5
          productWithRec.recommendation_reason = "RECENTLY VIEWED"
        }

        return { ...productWithRec, score }
      })

      // Sort by score and take top 6-12 items
      const sortedProducts = scoredProducts.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 12)

      // Ensure diversity in recommendations (mix of categories, price points, etc.)
      const diverseRecommendations = ensureDiversity(sortedProducts)

      // Update state with personalized recommendations
      setPersonalizedProducts(diverseRecommendations.slice(0, 6))
    } catch (error) {
      console.error("Error generating personalized recommendations:", error)
      // Fallback to related products if recommendation fails
      setPersonalizedProducts(relatedProducts)
    }
  }

  // Helper function to ensure diversity in recommendations
  const ensureDiversity = (products: ProductWithRecommendation[]) => {
    const categories = new Set()
    const diverseProducts: ProductWithRecommendation[] = []
    const luxuryProducts: ProductWithRecommendation[] = []
    const flashSaleProducts: ProductWithRecommendation[] = []
    const regularProducts: ProductWithRecommendation[] = []

    // Separate products by type
    products.forEach((product) => {
      if (
        product.is_luxury_deal ||
        (typeof product.category === "object" && product.category?.name?.toLowerCase().includes("luxury")) ||
        (product.tags && product.tags.some((tag) => tag.toLowerCase().includes("luxury")))
      ) {
        luxuryProducts.push(product)
      } else if (product.is_flash_sale) {
        flashSaleProducts.push(product)
      } else {
        regularProducts.push(product)
      }
    })

    // Ensure we have at least 2 luxury products if available
    const luxuryCount = Math.min(luxuryProducts.length, 3)
    for (let i = 0; i < luxuryCount; i++) {
      diverseProducts.push(luxuryProducts[i])
      if (luxuryProducts[i].category_id) {
        categories.add(luxuryProducts[i].category_id)
      }
    }

    // Add 1-2 flash sale products if available
    const flashSaleCount = Math.min(flashSaleProducts.length, 2)
    for (let i = 0; i < flashSaleCount; i++) {
      // Avoid duplicate categories if possible
      if (!categories.has(flashSaleProducts[i].category_id) || diverseProducts.length < 3) {
        diverseProducts.push(flashSaleProducts[i])
        if (flashSaleProducts[i].category_id) {
          categories.add(flashSaleProducts[i].category_id)
        }
      }
    }

    // Fill remaining slots with regular products
    let remainingSlots = 6 - diverseProducts.length
    let regularIndex = 0

    while (remainingSlots > 0 && regularIndex < regularProducts.length) {
      // Prioritize products from different categories
      if (
        !categories.has(regularProducts[regularIndex].category_id) ||
        remainingSlots <= regularProducts.length - regularIndex
      ) {
        diverseProducts.push(regularProducts[regularIndex])
        if (regularProducts[regularIndex].category_id) {
          categories.add(regularProducts[regularIndex].category_id)
        }
        remainingSlots--
      }
      regularIndex++
    }

    // If we still have slots to fill, add any remaining products
    if (diverseProducts.length < 6) {
      // Combine all products and filter out ones already added
      const allProductIds = diverseProducts.map((p) => p.id)
      const remainingProducts = products.filter((p) => !allProductIds.includes(p.id))

      // Add remaining products up to 6 total
      diverseProducts.push(...remainingProducts.slice(0, 6 - diverseProducts.length))
    }

    return diverseProducts
  }

  // Fetch personalized recommendations
  useEffect(() => {
    if (product.id) {
      getPersonalizedRecommendations()
    }
  }, [product.id, cartItems])

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
        className: "animate-in slide-in-from-bottom-5 duration-300",
      })
      return
    }

    // Check stock availability using inventory service
    try {
      const availabilityCheck = await inventoryService.checkAvailability(
        typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id,
        quantity,
        typeof selectedVariant?.id === "number" ? selectedVariant.id : undefined,
      )

      if (!availabilityCheck.is_available) {
        toast({
          title: "Out of stock",
          description:
            availabilityCheck.available_quantity > 0
              ? `Only ${availabilityCheck.available_quantity} items available`
              : "This product is currently out of stock",
          variant: "destructive",
          className: "animate-in slide-in-from-bottom-5 duration-300",
        })
        return
      }
    } catch (error) {
      console.error("Error checking availability:", error)
      // Continue with adding to cart, but log the error
    }

    setIsAddingToCart(true)

    try {
      // Convert product.id to a number if it's a string
      const productId = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id

      // Call addToCart with the variant ID if it exists
      const result = await addToCart(
        productId,
        quantity,
        typeof selectedVariant?.id === "number" ? selectedVariant.id : undefined,
      )

      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to add item to cart",
          variant: "destructive",
          className: "animate-in slide-in-from-bottom-5 duration-300",
        })
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error)

      // Show a more user-friendly error message
      toast({
        title: "Error",
        description: "There was a problem adding this item to your cart. Please try again.",
        variant: "destructive",
        className: "animate-in slide-in-from-bottom-5 duration-300",
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Buy now function
  const handleBuyNow = async () => {
    try {
      await handleAddToCart()
      router.push("/checkout")
    } catch (error) {
      console.error("Error with buy now:", error)
    }
  }

  // Toggle wishlist function
  const handleToggleWishlist = async () => {
    setIsTogglingWishlist(true)
    try {
      if (isProductInWishlist) {
        try {
          await removeProductFromWishlist(Number(product.id))
          toast({
            description: "Removed from wishlist",
          })
        } catch (error) {
          console.error("Error removing from wishlist:", error)
          // Show toast but continue - we've already handled the fallback in the context
          toast({
            description: "Removed from wishlist (sync pending)",
          })
        }
      } else {
        try {
          await addToWishlist(Number(product.id))
          toast({
            description: "Added to wishlist",
          })
        } catch (error) {
          console.error("Error adding to wishlist:", error)
          toast({
            title: "Error",
            description: "Failed to update wishlist. Please try again.",
            variant: "destructive",
          })
        }
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

  // Flash sale end time (mock data)
  const flashSaleEndTime = new Date()
  flashSaleEndTime.setHours(flashSaleEndTime.getHours() + 8)

  // Format time remaining for flash sale
  const formatTimeRemaining = () => {
    const now = new Date()
    const diff = flashSaleEndTime.getTime() - now.getTime()

    if (diff <= 0) return "Sale ended"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m remaining`
  }

  return (
    <div className="mx-auto max-w-7xl bg-gray-50">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1 text-xs text-gray-500 overflow-x-auto whitespace-nowrap py-2 px-4 bg-white border-b">
        <Link href="/" className="hover:text-cherry-600">
          Home
        </Link>
        <ChevronRight className="mx-1 h-3 w-3 flex-shrink-0" />
        <Link href={`/category/${product.category_id}`} className="hover:text-cherry-600">
          {typeof product.category === "object" && product.category?.name
            ? product.category.name
            : product.category_id || "Category"}
        </Link>
        <ChevronRight className="mx-1 h-3 w-3 flex-shrink-0" />
        <span className="truncate font-medium text-gray-700 max-w-[200px] md:max-w-none">{product.name}</span>
      </nav>

      {/* Flash Sale Banner */}
      {isFlashSale && (
        <div className="bg-gradient-to-r from-cherry-700 to-cherry-600 text-white py-2 px-4 flex items-center justify-between">
          <div className="flex items-center">
            <FlameIcon className="h-4 w-4 mr-2 animate-pulse" />
            <span className="font-medium text-sm">FLASH SALE</span>
          </div>
          <div className="flex items-center text-xs">
            <Clock className="h-3 w-3 mr-1" />
            <span>{formatTimeRemaining()}</span>
          </div>
        </div>
      )}

      {/* Luxury Deal Banner */}
      {isLuxury && !isFlashSale && (
        <div className="bg-gradient-to-r from-[#2c0a0e] to-cherry-800 text-white py-2 px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="font-medium text-sm">LUXURY COLLECTION</span>
          </div>
          <div className="text-xs">
            <span>Premium Quality Guaranteed</span>
          </div>
        </div>
      )}

      {/* Main Product Section */}
      <div className="bg-white mb-2">
        <div className="flex flex-col md:flex-row">
          {/* Left Column - Product Images */}
          <div className="w-full md:w-[40%] p-4 border-b md:border-b-0 md:border-r border-gray-100">
            {/* Main Image */}
            <div
              className="relative aspect-square overflow-hidden bg-white cursor-zoom-in"
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
              {discountPercentage > 0 && (
                <div className="absolute left-2 top-2 rounded-sm bg-cherry-600 px-2 py-0.5 text-xs font-medium text-white">
                  -{discountPercentage}%
                </div>
              )}

              <button
                className="absolute bottom-2 right-2 rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsZoomModalOpen(true)
                }}
                aria-label="Zoom image"
              >
                <ZoomIn className="h-4 w-4 text-gray-700" />
              </button>
            </div>

            {/* Thumbnails */}
            {(product.image_urls?.length || 0) > 1 && (
              <div className="relative mt-4">
                <button
                  onClick={() => scrollThumbnails("left")}
                  className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-sm hover:bg-gray-100 border border-gray-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
                </button>

                <div className="hide-scrollbar flex gap-2 overflow-x-auto py-1 scroll-smooth px-6" ref={thumbnailsRef}>
                  {(product.image_urls ?? []).map((image, index) => (
                    <button
                      key={index}
                      className={`relative h-16 w-16 flex-shrink-0 overflow-hidden border transition-all ${
                        selectedImage === index
                          ? "border-cherry-600 shadow-sm"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View image ${index + 1}`}
                      aria-current={selectedImage === index ? "true" : "false"}
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
                  className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-1 shadow-sm hover:bg-gray-100 border border-gray-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>
            )}

            {/* Share buttons */}
            <div className="mt-4 flex items-center justify-center gap-2">
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
                onClick={handleShare}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="w-full md:w-[60%] p-4">
            {/* Product Header */}
            <div>
              {/* Brand */}
              <div className="mb-1">
                <Link href={`/brand/${product.brand_id}`} className="text-xs text-cherry-600 hover:underline">
                  {product.brand_id || "Mizizzi"}
                </Link>
              </div>

              {/* Product title */}
              <h1 className="text-xl font-medium text-gray-900 leading-tight mb-2">{product.name}</h1>

              {/* Rating summary */}
              <div className="mb-3 flex items-center">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < (product.rating || 4) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                      }
                    />
                  ))}
                </div>
                <span className="ml-2 text-xs text-gray-600">{product.rating || 4}/5</span>
                <span className="mx-2 text-gray-300">|</span>
                <Link href="#reviews" className="text-xs text-cherry-600 hover:underline">
                  {product.reviews?.length || 24} ratings
                </Link>
              </div>

              {/* Price section */}
              <div className="mb-4 bg-cherry-50 p-3 rounded-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-medium text-cherry-600">{formatPrice(currentPrice)}</span>
                  {currentPrice < originalPrice && (
                    <span className="text-base text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                  )}
                  {discountPercentage > 0 && (
                    <span className="rounded-sm bg-cherry-600 text-white px-2 py-0.5 text-xs font-medium">
                      -{discountPercentage}%
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-600">VAT included • Free shipping on orders over KSh 2,000</p>
              </div>

              {/* Availability */}
              <div className="mb-4">
                <ProductAvailability
                  productId={Number(product.id)}
                  variantId={selectedVariant?.id}
                  quantity={quantity}
                  size="lg"
                />
              </div>

              {/* Variant Selection */}
              {(variantColors.length > 0 || variantSizes.length > 0) && (
                <div className="mb-4">
                  {variantColors.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium text-gray-700">COLOR</p>
                      <div className="flex flex-wrap gap-2">
                        {variantColors.map((color) => (
                          <button
                            key={color}
                            className={`px-3 py-1.5 border rounded-sm text-xs transition-all ${
                              selectedVariant?.color === color
                                ? "border-cherry-600 bg-cherry-50 text-cherry-600 font-medium"
                                : "border-gray-300 hover:border-cherry-300 text-gray-700"
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
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium text-gray-700">SIZE</p>
                      <div className="flex flex-wrap gap-2">
                        {variantSizes.map((size) => (
                          <button
                            key={size}
                            className={`px-3 py-1.5 border rounded-sm text-xs transition-all ${
                              selectedVariant?.size === size
                                ? "border-cherry-600 bg-cherry-50 text-cherry-600 font-medium"
                                : "border-gray-300 hover:border-cherry-300 text-gray-700"
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

              {/* Quantity */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-gray-700">QUANTITY</p>
                <div className="flex items-center">
                  <div className="flex items-center border border-gray-300 rounded-sm overflow-hidden">
                    <button
                      className="flex h-9 w-9 items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isAddingToCart}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      className="h-9 w-12 border-x border-gray-300 bg-white p-0 text-center text-sm font-medium outline-none"
                      value={quantity}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value)
                        if (!isNaN(value) && value > 0) {
                          setQuantity(Math.min(product.stock ?? 10, value))
                        }
                      }}
                      min="1"
                      max={product.stock ?? 10}
                    />
                    <button
                      className="flex h-9 w-9 items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      onClick={() => setQuantity(Math.min(product.stock ?? 10, quantity + 1))}
                      disabled={quantity >= (product.stock ?? 10) || isAddingToCart}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Add to Cart button */}
              <div className="mb-4">
                <Button
                  className="h-12 w-full bg-cherry-600 hover:bg-cherry-700 text-white rounded-sm shadow-sm transition-all text-base font-medium"
                  onClick={handleAddToCart}
                  disabled={(product.stock ?? 0) <= 0 || isAddingToCart || isCartUpdating}
                >
                  {isAddingToCart || isCartUpdating ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-5 w-5" />
                  )}
                  ADD TO CART
                </Button>
              </div>

              {/* Wishlist button */}
              <Button
                variant="outline"
                className={`mb-4 h-10 w-full rounded-sm border shadow-sm transition-colors text-sm ${
                  isProductInWishlist
                    ? "border-cherry-600 bg-cherry-50 text-cherry-600"
                    : "border-gray-300 text-gray-700 hover:border-cherry-600 hover:text-cherry-600"
                }`}
                onClick={handleToggleWishlist}
                disabled={isTogglingWishlist || isWishlistUpdating}
              >
                {isTogglingWishlist || isWishlistUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`mr-2 h-4 w-4 ${isProductInWishlist ? "fill-cherry-600" : ""}`} />
                )}
                {isProductInWishlist ? "SAVED IN WISHLIST" : "SAVE TO WISHLIST"}
              </Button>

              {/* Delivery info */}
              <div className="bg-gray-50 p-3 rounded-sm mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <Truck className="h-4 w-4 mt-0.5 text-cherry-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Free Delivery</p>
                    <p className="text-xs text-gray-600">Free delivery on orders above KSh 2,000</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-cherry-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Return Policy</p>
                    <p className="text-xs text-gray-600">Free returns within 15 days for eligible items</p>
                  </div>
                </div>
              </div>

              {/* Seller info */}
              <div className="bg-gray-50 p-3 rounded-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-cherry-600" />
                    <span className="text-xs font-medium">Sold by Mizizzi Official Store</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">
                    <Check className="mr-1 h-3 w-3" /> Official
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Information Tabs */}
      <div className="bg-white mb-2">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="flex w-full bg-gray-100 rounded-none border-b border-gray-200 p-0">
            <TabsTrigger
              value="description"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:text-cherry-600 data-[state=active]:border-b-2 data-[state=active]:border-cherry-600 rounded-none px-3 py-2.5 text-xs"
            >
              Product Details
            </TabsTrigger>
            <TabsTrigger
              value="specifications"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:text-cherry-600 data-[state=active]:border-b-2 data-[state=active]:border-cherry-600 rounded-none px-3 py-2.5 text-xs"
            >
              Specifications
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:text-cherry-600 data-[state=active]:border-b-2 data-[state=active]:border-cherry-600 rounded-none px-3 py-2.5 text-xs"
            >
              Reviews
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:text-cherry-600 data-[state=active]:border-b-2 data-[state=active]:border-cherry-600 rounded-none px-3 py-2.5 text-xs"
            >
              Shipping
            </TabsTrigger>
          </TabsList>

          <div>
            <TabsContent value="description" className="p-4">
              <div className="prose max-w-none text-gray-700">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Product Description</h3>
                <div className="text-sm leading-relaxed">
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

                <h4 className="text-base font-semibold text-gray-900 mt-4 mb-2">Key Features</h4>
                <ul className="space-y-1 list-disc pl-5 text-sm">
                  {keyFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>

                <h4 className="text-base font-semibold text-gray-900 mt-4 mb-2">What's in the Box</h4>
                <ul className="space-y-1 list-disc pl-5 text-sm">
                  {inTheBox.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="specifications" className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Product Specifications</h3>

              <div className="overflow-hidden border border-gray-200">
                <div className="divide-y divide-gray-200">
                  {specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-2 px-4 py-2 text-sm">
                      <div className="font-medium text-gray-700">{spec.label}</div>
                      <div className="text-gray-700">{spec.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="p-4" id="reviews">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Customer Reviews</h3>

                <div className="grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 bg-gray-50 p-3 text-center">
                    <div className="text-2xl font-bold text-cherry-600 mb-1">
                      {product.rating?.toFixed(1) || "4.8"}/5
                    </div>
                    <div className="flex justify-center mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="text-xs text-gray-600 mb-3">{product.reviews?.length || 24} verified ratings</div>

                    {/* Rating Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right font-medium">5★</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "75%" }}></div>
                        </div>
                        <span className="text-gray-500 w-6">(18)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right font-medium">4★</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "25%" }}></div>
                        </div>
                        <span className="text-gray-500 w-6">(6)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right font-medium">3★</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                        <span className="text-gray-500 w-6">(0)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right font-medium">2★</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                        <span className="text-gray-500 w-6">(0)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right font-medium">1★</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                        <span className="text-gray-500 w-6">(0)</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8">
                    <div className="space-y-3">
                      {/* Review Cards */}
                      <div className="border border-gray-200 p-3 hover:shadow-sm">
                        <div className="flex items-center mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-xs font-medium mb-1 text-gray-900">Excellent quality and fast delivery</p>
                        <p className="text-xs text-gray-700 mb-2">
                          The product is exactly as described. Great value for money and arrived within 24 hours to
                          Westlands. Very impressed with the service!
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>07-04-2025 by Geoffrey K.</span>
                          <span className="flex items-center text-green-600">
                            <Check className="h-3 w-3 mr-1" /> Verified Purchase
                          </span>
                        </div>
                      </div>

                      <div className="border border-gray-200 p-3 hover:shadow-sm">
                        <div className="flex items-center mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-xs font-medium mb-1 text-gray-900">Amazing product and service</p>
                        <p className="text-xs text-gray-700 mb-2">
                          Exceeded my expectations in every way. The quality is top-notch and delivery was super fast to
                          Kilimani. The delivery guy was very professional too.
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>28-03-2025 by Nabz</span>
                          <span className="flex items-center text-green-600">
                            <Check className="h-3 w-3 mr-1" /> Verified Purchase
                          </span>
                        </div>
                      </div>

                      <div className="border border-gray-200 p-3 hover:shadow-sm">
                        <div className="flex items-center mb-1">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                          ))}
                          {Array.from({ length: 1 }).map((_, i) => (
                            <Star key={i} size={12} className="fill-gray-200 text-gray-200" />
                          ))}
                        </div>
                        <p className="text-xs font-medium mb-1 text-gray-900">Good product, fast shipping</p>
                        <p className="text-xs text-gray-700 mb-2">
                          The product is good for the price. Shipping to Karen was surprisingly fast - ordered in the
                          morning and received it the same day!
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>15-03-2025 by Owen M.</span>
                          <span className="flex items-center text-green-600">
                            <Check className="h-3 w-3 mr-1" /> Verified Purchase
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        className="border-cherry-600 text-cherry-600 hover:bg-cherry-50 text-xs"
                      >
                        See All Reviews
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Delivery Information</h3>

              <div className="space-y-3">
                <div className="border border-gray-200 p-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Delivery Options</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium text-gray-700">Delivery Method</th>
                          <th className="py-2 text-left font-medium text-gray-700">Estimated Time</th>
                          <th className="py-2 text-left font-medium text-gray-700">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2">Express Delivery</td>
                          <td className="py-2">Same Day or Next Day</td>
                          <td className="py-2">KSh 300</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Standard Delivery</td>
                          <td className="py-2">1-2 Business Days</td>
                          <td className="py-2">KSh 200</td>
                        </tr>
                        <tr>
                          <td className="py-2">Nationwide Delivery</td>
                          <td className="py-2">2-5 Business Days</td>
                          <td className="py-2">KSh 350-700</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-gray-200 p-3">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Return Policy</h4>
                  <p className="text-xs text-gray-700 mb-2">
                    Easy returns within 15 days of delivery. Please keep the original packaging.
                  </p>
                  <Button variant="outline" className="text-xs border-cherry-600 text-cherry-600 hover:bg-cherry-50">
                    Return Policy Details
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Similar Products */}
      <div className="bg-white mb-2">
        <div className="border-b border-gray-200 px-4 py-2">
          <h2 className="text-base font-medium text-gray-900">Similar Products</h2>
        </div>

        <div className="p-4">
          {isLoadingRelated ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cherry-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {personalizedProducts.map((product, index) => (
                <Link key={product.id} href={`/product/${product.id}`} className="block">
                  <div className="group h-full overflow-hidden border border-gray-200 bg-white transition-all duration-200 hover:shadow-md">
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      <Image
                        src={product.image_urls?.[0] || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {product.sale_price && product.sale_price < product.price && (
                        <div className="absolute left-1 top-1 bg-cherry-600 px-1.5 py-0.5 text-xs font-medium text-white">
                          -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-700 min-h-[32px]">
                        {product.name}
                      </h3>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-sm font-medium text-cherry-600">
                          KSh {(product.sale_price || product.price).toLocaleString()}
                        </span>
                        {product.sale_price && product.sale_price < product.price && (
                          <span className="text-xs text-gray-400 line-through">
                            KSh {product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Support */}
      <div className="bg-white mb-2">
        <div className="border-b border-gray-200 px-4 py-2">
          <h2 className="text-base font-medium text-gray-900">Need Help?</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 border border-gray-200 p-3">
              <Phone className="h-4 w-4 text-cherry-600" />
              <div>
                <p className="font-medium text-gray-900 text-xs">Call Us</p>
                <p className="text-xs text-gray-600">0800-123-4567</p>
                <p className="text-xs text-gray-500">8 AM - 8 PM, 7 days</p>
              </div>
            </div>
            <div className="flex items-start gap-2 border border-gray-200 p-3">
              <MessageSquare className="h-4 w-4 text-cherry-600" />
              <div>
                <p className="font-medium text-gray-900 text-xs">Chat Support</p>
                <p className="text-xs text-gray-600">Live chat available</p>
                <p className="text-xs text-gray-500">24/7 support</p>
              </div>
            </div>
            <div className="flex items-start gap-2 border border-gray-200 p-3">
              <Mail className="h-4 w-4 text-cherry-600" />
              <div>
                <p className="font-medium text-gray-900 text-xs">Email Us</p>
                <p className="text-xs text-gray-600">help@mizizzi.co.ke</p>
                <p className="text-xs text-gray-500">Response within 24h</p>
              </div>
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
