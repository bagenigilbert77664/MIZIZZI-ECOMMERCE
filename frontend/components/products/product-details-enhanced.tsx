"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  Share2,
  ChevronRight,
  Star,
  Check,
  ShoppingCart,
  Loader2,
  MessageCircle,
  Truck,
  Clock,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  MinusCircle,
  PlusCircle,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart/cart-context"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"
import inventoryService from "@/services/inventory-service"
import { productService } from "@/services/product"

interface ProductDetailsEnhancedProps {
  product: any
}

export function ProductDetailsEnhanced({ product: initialProduct }: ProductDetailsEnhancedProps) {
  const [product, setProduct] = useState<any>(initialProduct)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [activeTab, setActiveTab] = useState("product-details")
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const [showNotification, setShowNotification] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showCompareProducts, setShowCompareProducts] = useState(false)
  const [compareList, setCompareList] = useState<any[]>([])
  const [showDeliveryMap, setShowDeliveryMap] = useState(false)
  const [showSpecsComparison, setShowSpecsComparison] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const [expandedSpecs, setExpandedSpecs] = useState<string[]>([])
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [stockLeft, setStockLeft] = useState(Math.floor(Math.random() * 20) + 5)

  const imageRef = useRef<HTMLDivElement>(null)
  const { addToCart, items: cartItems } = useCart()
  const { isInWishlist, addToWishlist, removeProductFromWishlist } = useWishlist()
  const { toast } = useToast()
  const isProductInWishlist = isInWishlist(Number(product.id))

  // Calculate prices and discounts
  const currentPrice = selectedVariant?.price || product.sale_price || product.price
  const originalPrice = product.price
  const discountPercentage =
    originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0

  // Update product when initialProduct changes
  useEffect(() => {
    setProduct(initialProduct)
  }, [initialProduct])

  // Fetch related products
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (product.category_id) {
        setIsLoadingRelated(true)
        try {
          const products = await productService.getProductsByCategory(product.category_id.toString())
          // Filter out current product and limit to 6 items
          const filtered = products
            .filter((p) => p.id !== product.id)
            .sort(() => 0.5 - Math.random()) // Simple shuffle
            .slice(0, 6)
          setRelatedProducts(filtered)

          // Generate compare list from related products
          setCompareList(filtered.slice(0, 3))
        } catch (error) {
          console.error("Error fetching related products:", error)
        } finally {
          setIsLoadingRelated(false)
        }
      }
    }

    fetchRelatedProducts()

    // Save to recently viewed in localStorage
    const saveToRecentlyViewed = () => {
      try {
        const recentItems = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
        // Check if product already exists
        const exists = recentItems.some((item: any) => item.id === product.id)
        if (!exists) {
          // Add current product to the beginning
          const updatedItems = [
            {
              id: product.id,
              name: product.name,
              price: currentPrice,
              image: product.image_urls?.[0] || "/placeholder.svg",
              slug: product.slug || product.id,
            },
            ...recentItems,
          ].slice(0, 6) // Keep only 6 items
          localStorage.setItem("recentlyViewed", JSON.stringify(updatedItems))
          setRecentlyViewed(updatedItems)
        } else {
          setRecentlyViewed(recentItems)
        }
      } catch (error) {
        console.error("Error saving to recently viewed:", error)
      }
    }

    saveToRecentlyViewed()

    // Simulate decreasing stock and viewing count changes
    const stockInterval = setInterval(() => {
      // Only occasionally decrease stock (10% chance every 30 seconds)
      if (Math.random() > 0.9 && stockLeft > 1) {
        setStockLeft((prev) => prev - 1)

        // Announce purchase with toast
        toast({
          title: "Someone just purchased this item!",
          description: `1 × ${product.name}`,
          duration: 3000,
        })
      }
    }, 30000) // Every 30 seconds

    // No need for separate purchase interval since we're handling it in the stock interval

    return () => {
      clearInterval(stockInterval)
    }
  }, [product.id, product.category_id, product.name, product.image_urls, product.slug, currentPrice, toast, stockLeft])

  // Handle variant selection
  const handleVariantSelection = (variant: any) => {
    setSelectedVariant(variant)
  }

  // Handle image zoom
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return

    const { left, top, width, height } = imageRef.current.getBoundingClientRect()

    // Calculate position with boundaries to prevent white edges when zooming
    const x = Math.max(0, Math.min(1, (e.clientX - left) / width))
    const y = Math.max(0, Math.min(1, (e.clientY - top) / height))

    setZoomPosition({ x, y })
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

    // Check stock availability using inventory service
    try {
      const availabilityCheck = await inventoryService.checkAvailability(
        typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id,
        quantity,
        typeof selectedVariant?.id === "number" ? selectedVariant.id : undefined,
      )

      if (!availabilityCheck.is_available) {
        toast({
          title: "Limited stock available",
          description:
            availabilityCheck.available_quantity > 0
              ? `Only ${availabilityCheck.available_quantity} items available`
              : "This product is currently out of stock",
          variant: "destructive",
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
        })
      } else {
        // Update the stock and purchase counts
        if (stockLeft > quantity) {
          setStockLeft((prev) => prev - quantity)
        }

        // Dispatch event to update cart indicator
        document.dispatchEvent(new CustomEvent("open-sidebar-cart"))
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error)

      toast({
        title: "Error",
        description: "There was a problem adding this item to your cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Toggle wishlist function
  const handleToggleWishlist = async () => {
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

  // Toggle specification expansion
  const toggleSpecExpansion = (category: string) => {
    setExpandedSpecs((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
    )
  }

  // Format specifications for display
  const specifications = [
    { category: "PRODUCT TYPE", items: ["Premium Leather Bag"] },
    { category: "MATERIAL", items: ["Genuine Full-Grain Leather"] },
    { category: "DIMENSIONS", items: ["30cm (L) x 22cm (H) x 10cm (W)"] },
    { category: "WEIGHT", items: ["0.8 kg"] },
    {
      category: "FEATURES",
      items: [
        "Adjustable shoulder strap",
        "Interior zip pocket",
        "Two slip pockets",
        "Magnetic snap closure",
        "Handcrafted in Kenya",
      ],
    },
    {
      category: "CAPACITY",
      items: ["Fits up to 13-inch laptop", "8L capacity"],
    },
    {
      category: "CARE INSTRUCTIONS",
      items: [
        "Clean with a soft, dry cloth",
        "Apply leather conditioner every 3-6 months",
        "Keep away from direct sunlight when not in use",
        "Avoid contact with water and harsh chemicals",
      ],
    },
    {
      category: "WARRANTY",
      items: ["2-year manufacturer warranty", "Lifetime repair service available"],
    },
    {
      category: "COLORS",
      items: ["Tan Brown", "Classic Black", "Burgundy Red", "Navy Blue"],
    },
  ]

  // Add smooth scrolling CSS to the component
  useEffect(() => {
    // Add smooth scrolling to the document
    document.documentElement.style.scrollBehavior = "smooth"

    return () => {
      // Clean up
      document.documentElement.style.scrollBehavior = ""
    }
  }, [])

  // Render the enhanced product details page
  return (
    <div className="min-h-screen pb-8 bg-gray-100 text-gray-900">
      {/* Breadcrumbs */}
      <div className="py-2 px-4 text-xs border-b border-gray-200">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-red-800">
              Home
            </Link>
            <ChevronRight className="h-3 w-3 mx-1" />
            <Link href="/products" className="hover:text-red-800">
              Products
            </Link>
            <ChevronRight className="h-3 w-3 mx-1" />
            <Link href="/products/bags" className="hover:text-red-800">
              Bags
            </Link>
            <ChevronRight className="h-3 w-3 mx-1" />
            <span className="text-gray-500 truncate max-w-[200px]">Mizizzi Premium Bag</span>
          </div>
        </div>
      </div>

      {/* Social Proof Notification */}

      <div className="container mx-auto max-w-7xl px-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column - Product Images and Info */}
          <div className="md:col-span-8">
            <div className="p-4 mb-4 relative bg-white border border-gray-200 rounded-lg">
              {/* Official Store Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 flex-shrink-0 border border-gray-200 rounded-md p-1 bg-white shadow-sm">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                      alt="Mizizzi Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-red-800 text-white text-xs px-2 py-1 rounded-md">Official Store</span>
                    {product.is_flash_sale && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-md animate-pulse">
                        FLASH SALE
                      </span>
                    )}
                    {product.is_luxury_deal && (
                      <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-md">PREMIUM</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleWishlist}
                    className="text-gray-400 hover:text-red-800 transition-colors"
                    aria-label={isProductInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart className={isProductInWishlist ? `fill-red-800 text-red-800` : ""} size={24} />
                  </button>
                  <button
                    onClick={() => setShowCompareProducts(!showCompareProducts)}
                    className="text-gray-400 hover:text-red-800 transition-colors"
                    aria-label="Compare products"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M9 15H3V21H9V15Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 15H15V21H21V15Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15 3H9V9H15V3Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Product Title */}
              <h1 className="text-xl md:text-2xl font-medium mb-2">{product.name}</h1>

              {/* Brand */}
              {/* Brand Logo */}

              {/* Image View Selector */}
              <div className="flex items-center gap-4 mb-4 border-b border-gray-200 pb-3">
                <button className="text-sm font-medium pb-2 border-b-2 text-red-800 border-red-800">Gallery</button>
              </div>

              {/* Product Images */}
              <div className="grid grid-cols-12 gap-2">
                {/* Thumbnails */}
                <div className="col-span-2 flex flex-col gap-2">
                  {(product.image_urls || []).map((image: string, index: number) => (
                    <button
                      key={index}
                      className={`border ${
                        selectedImage === index ? "border-red-800" : "border-gray-200"
                      } p-1 h-16 w-full rounded-md overflow-hidden`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <div className="relative h-full w-full">
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`${product.name} - thumbnail ${index + 1}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Main Image Display */}
                <div className="col-span-10">
                  <div
                    className="border border-gray-200 p-2 h-[400px] rounded-lg relative overflow-hidden cursor-zoom-in"
                    ref={imageRef}
                    onMouseMove={handleImageMouseMove}
                    onMouseEnter={() => setIsZoomed(true)}
                    onMouseLeave={() => setIsZoomed(false)}
                    onClick={() => {
                      // Open full-screen image modal
                      document.dispatchEvent(
                        new CustomEvent("open-image-zoom-modal", {
                          detail: { imageIndex: selectedImage },
                        }),
                      )
                    }}
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={(product.image_urls || [])[selectedImage] || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-contain transition-transform duration-200"
                        priority
                      />

                      {isZoomed && (
                        <div
                          className="absolute inset-0 pointer-events-none bg-white"
                          style={{
                            backgroundImage: `url(${(product.image_urls || [])[selectedImage] || "/placeholder.svg"})`,
                            backgroundPosition: `${zoomPosition.x * 100}% ${zoomPosition.y * 100}%`,
                            backgroundSize: "120%", // Changed from 100% to 120% for better zoom
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      )}
                    </div>

                    {/* Image navigation buttons */}
                    {product.image_urls && product.image_urls.length > 1 && (
                      <>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center shadow-md z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedImage((prev) => (prev === 0 ? product.image_urls.length - 1 : prev - 1))
                          }}
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center shadow-md z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedImage((prev) => (prev === product.image_urls.length - 1 ? 0 : prev + 1))
                          }}
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {/* Zoom indicator */}
                    <div className="absolute bottom-2 right-2 text-xs text-gray-900 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                      Click to expand • Hover to zoom
                    </div>
                  </div>
                </div>
              </div>

              {/* Share buttons */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">SHARE THIS PRODUCT</p>
                <div className="flex gap-2">
                  <button
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-blue-100"
                    onClick={() => {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, "_blank")
                    }}
                    aria-label="Share on Facebook"
                  >
                    <span className="text-blue-600 font-bold text-sm">f</span>
                  </button>
                  <button
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-blue-100"
                    onClick={() => {
                      window.open(`https://twitter.com/intent/tweet?url=${window.location.href}`, "_blank")
                    }}
                    aria-label="Share on Twitter"
                  >
                    <span className="text-blue-400 font-bold text-sm">t</span>
                  </button>
                  <button
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-green-100"
                    onClick={() => {
                      window.open(
                        `https://api.whatsapp.com/send?text=${product.name} ${window.location.href}`,
                        "_blank",
                      )
                    }}
                    aria-label="Share on WhatsApp"
                  >
                    <span className="text-green-600 font-bold text-sm">w</span>
                  </button>
                  <button
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    onClick={handleShare}
                    aria-label="Share"
                  >
                    <Share2 className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Compare Products Panel */}
              <AnimatePresence>
                {showCompareProducts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 overflow-hidden bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Compare with similar products</h3>
                        <button
                          onClick={() => setShowCompareProducts(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        {/* Current product */}
                        <div className="border border-gray-200 rounded-lg p-3">
                          <div className="relative h-24 mb-2">
                            <Image
                              src={product.image_urls?.[0] || "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <h4 className="text-sm font-medium line-clamp-2 h-10">{product.name}</h4>
                          <p className="text-sm font-bold text-red-800 mt-1">{formatPrice(currentPrice)}</p>
                          <Badge className="mt-2 bg-blue-100 text-blue-800 hover:bg-blue-100">Current</Badge>
                        </div>

                        {/* Comparable products */}
                        {compareList.map((item, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3">
                            <div className="relative h-24 mb-2">
                              <Image
                                src={item.image_urls?.[0] || "/placeholder.svg"}
                                alt={item.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <h4 className="text-sm font-medium line-clamp-2 h-10">{item.name}</h4>
                            <p className="text-sm font-bold text-red-800 mt-1">
                              {formatPrice(item.sale_price || item.price)}
                            </p>
                            <Link href={`/product/${item.slug || item.id}`}>
                              <Button variant="outline" size="sm" className="mt-2 w-full text-xs">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="link"
                        className="mt-4 text-red-800 p-0 h-auto"
                        onClick={() => setShowSpecsComparison(!showSpecsComparison)}
                      >
                        {showSpecsComparison ? "Hide detailed comparison" : "Show detailed comparison"}
                      </Button>

                      {showSpecsComparison && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2">Specification</th>
                                <th className="text-left py-2">{product.name}</th>
                                {compareList.map((item, index) => (
                                  <th key={index} className="text-left py-2">
                                    {item.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-200">
                                <td className="py-2 font-medium">Price</td>
                                <td className="py-2">{formatPrice(currentPrice)}</td>
                                {compareList.map((item, index) => (
                                  <td key={index} className="py-2">
                                    {formatPrice(item.sale_price || item.price)}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200">
                                <td className="py-2 font-medium">Display</td>
                                <td className="py-2">6.78" AMOLED, 120Hz</td>
                                {compareList.map((item, index) => (
                                  <td key={index} className="py-2">
                                    {index === 0
                                      ? '6.67" AMOLED, 90Hz'
                                      : index === 1
                                        ? '6.5" LCD, 60Hz'
                                        : '6.8" AMOLED, 120Hz'}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200">
                                <td className="py-2 font-medium">Camera</td>
                                <td className="py-2">108MP + 2MP + 2MP</td>
                                {compareList.map((item, index) => (
                                  <td key={index} className="py-2">
                                    {index === 0
                                      ? "64MP + 8MP + 2MP"
                                      : index === 1
                                        ? "48MP + 5MP"
                                        : "108MP + 12MP + 5MP"}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200">
                                <td className="py-2 font-medium">Battery</td>
                                <td className="py-2">5000mAh, 70W Fast Charging</td>
                                {compareList.map((item, index) => (
                                  <td key={index} className="py-2">
                                    {index === 0
                                      ? "4500mAh, 33W Fast Charging"
                                      : index === 1
                                        ? "4000mAh, 18W Charging"
                                        : "5000mAh, 65W Fast Charging"}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-gray-200">
                                <td className="py-2 font-medium">Memory</td>
                                <td className="py-2">256GB + 8GB RAM</td>
                                {compareList.map((item, index) => (
                                  <td key={index} className="py-2">
                                    {index === 0
                                      ? "128GB + 6GB RAM"
                                      : index === 1
                                        ? "64GB + 4GB RAM"
                                        : "256GB + 12GB RAM"}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Product Tabs */}
            <div className="mb-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <Tabs defaultValue="product-details" className="w-full">
                <TabsList className="w-full rounded-none bg-gray-50">
                  <TabsTrigger
                    value="product-details"
                    className="flex-1 data-[state=active]:text-red-800 data-[state=active]:border-b-2 data-[state=active]:border-red-800 rounded-none"
                  >
                    Product details
                  </TabsTrigger>
                  <TabsTrigger
                    value="specifications"
                    className="flex-1 data-[state=active]:text-red-800 data-[state=active]:border-b-2 data-[state=active]:border-red-800 rounded-none"
                  >
                    Specifications
                  </TabsTrigger>
                  <TabsTrigger
                    value="customer-feedback"
                    className="flex-1 data-[state=active]:text-red-800 data-[state=active]:border-b-2 data-[state=active]:border-red-800 rounded-none"
                  >
                    Customer Feedback
                  </TabsTrigger>
                  <TabsTrigger
                    value="questions"
                    className="flex-1 data-[state=active]:text-red-800 data-[state=active]:border-b-2 data-[state=active]:border-red-800 rounded-none"
                  >
                    Q&A
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="product-details" className="p-4">
                  <div className="prose max-w-none text-sm">
                    {product.description ? (
                      <div dangerouslySetInnerHTML={{ __html: product.description }} />
                    ) : (
                      <div>
                        <p>
                          Experience premium quality with our {product.name}. This product combines elegant design with
                          exceptional functionality to deliver an unparalleled user experience.
                        </p>
                        <p className="mt-4">
                          Crafted with attention to detail and built using high-quality materials, this product is
                          designed to last. The {product.material || "premium"} material ensures durability while
                          maintaining its elegant appearance over time.
                        </p>
                        <p className="mt-4">
                          This {product.name} is perfect for everyday use, special occasions, or as a thoughtful gift.
                          Its versatile design complements any style, making it a must-have addition to your collection.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Key Features */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Key Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(product.features || [])
                        .slice(0, showAllFeatures ? undefined : 6)
                        .map((feature: string, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <Check className="h-5 w-5 text-red-800" />
                            </div>
                            <p className="text-sm">{feature}</p>
                          </div>
                        ))}
                    </div>

                    {product.features && product.features.length > 6 && (
                      <Button
                        variant="link"
                        className="mt-4 text-red-800 p-0 h-auto"
                        onClick={() => setShowAllFeatures(!showAllFeatures)}
                      >
                        {showAllFeatures ? "Show less features" : "Show all features"}
                      </Button>
                    )}
                  </div>

                  {/* Product Images */}
                  {product.image_urls && product.image_urls.length > 1 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">Product Gallery</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {product.image_urls.slice(1, 5).map((image: string, index: number) => (
                          <div
                            key={index}
                            className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                          >
                            <div className="relative aspect-[4/3] w-full">
                              <Image
                                src={image || "/placeholder.svg"}
                                alt={`${product.name} - View ${index + 1}`}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <div className="p-3 border-t border-gray-100 bg-gray-50">
                              <p className="text-sm text-gray-600 text-center">
                                {index === 0
                                  ? "Front View"
                                  : index === 1
                                    ? "Side View"
                                    : index === 2
                                      ? "Detail View"
                                      : "Additional View"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Package Contents */}
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">What's in the Box</h3>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <ul className="space-y-2">
                        {(
                          product.package_contents || [
                            `1 x ${product.name}`,
                            "User Manual",
                            "Warranty Card",
                            "Charging Cable",
                            "Power Adapter",
                          ]
                        ).map((item: string, index: number) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="specifications" className="p-4">
                  <h2 className="text-lg font-medium mb-4">SPECIFICATIONS</h2>
                  <div className="space-y-4">
                    {specifications.map((spec, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div
                          className={`flex items-center justify-between p-3 cursor-pointer ${
                            expandedSpecs.includes(spec.category) ? "bg-red-50" : "bg-gray-50"
                          }`}
                          onClick={() => toggleSpecExpansion(spec.category)}
                        >
                          <h3 className="font-medium">{spec.category}</h3>
                          {expandedSpecs.includes(spec.category) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>

                        {expandedSpecs.includes(spec.category) && (
                          <div className="p-3">
                            <ul className="space-y-2">
                              {spec.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-2 text-sm">
                                  <div className="w-1 h-1 rounded-full bg-red-800 mt-2 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="customer-feedback" className="p-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3">
                      <h2 className="text-lg font-medium mb-4">CUSTOMER FEEDBACK</h2>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="text-3xl font-bold">{product.rating || 4.7}</div>
                          <div className="flex-1">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={
                                    i < Math.floor(product.rating || 4)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }
                                />
                              ))}
                            </div>
                            <p className="text-sm text-gray-500">Based on {product.reviews?.length || 24} reviews</p>
                          </div>
                        </div>

                        {/* Rating breakdown */}
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const percentage =
                              rating === 5 ? 70 : rating === 4 ? 20 : rating === 3 ? 7 : rating === 2 ? 2 : 1
                            return (
                              <div key={rating} className="flex items-center gap-2">
                                <div className="flex items-center gap-1 w-8">
                                  <span className="text-sm">{rating}</span>
                                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                </div>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }}></div>
                                </div>
                                <div className="text-xs text-gray-500 w-8 text-right">{percentage}%</div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Write a review button */}
                        <Button
                          className="w-full mt-4 bg-red-800 hover:bg-red-900 text-white"
                          onClick={() => setShowReviewForm(!showReviewForm)}
                        >
                          Write a Review
                        </Button>
                      </div>
                    </div>

                    <div className="md:w-2/3">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Customer Reviews</h3>
                        <div className="flex gap-2">
                          <select className="text-sm border border-gray-200 rounded-md p-1">
                            <option>Most Recent</option>
                            <option>Highest Rated</option>
                            <option>Lowest Rated</option>
                            <option>Most Helpful</option>
                          </select>
                        </div>
                      </div>

                      {/* Review form */}
                      <AnimatePresence>
                        {showReviewForm && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mb-4 overflow-hidden border border-gray-200 rounded-lg p-4"
                          >
                            <h4 className="font-medium mb-3">Write Your Review</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm mb-1">Rating</label>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button key={rating} className="text-gray-300 hover:text-yellow-400">
                                      <Star size={24} className="fill-current" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm mb-1">Review Title</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-200 rounded-md"
                                  placeholder="Summarize your experience"
                                />
                              </div>
                              <div>
                                <label className="block text-sm mb-1">Your Review</label>
                                <textarea
                                  className="w-full p-2 border border-gray-200 rounded-md min-h-[100px]"
                                  placeholder="What did you like or dislike about this product?"
                                ></textarea>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                                  Cancel
                                </Button>
                                <Button className="bg-red-800 hover:bg-red-900 text-white">Submit Review</Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Reviews list */}
                      <div className="space-y-4">
                        {(
                          product.reviews || [
                            {
                              id: 1,
                              rating: 5,
                              reviewer_name: "Jane Doe",
                              comment:
                                "Excellent product! I love the quality and design. The material feels premium and it's exactly as described. The camera quality is outstanding, especially in low light conditions. Battery life exceeds expectations - I can go almost two full days on a single charge with moderate use.",
                              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                              verified_purchase: true,
                              helpful_count: 12,
                            },
                            {
                              id: 2,
                              rating: 4,
                              reviewer_name: "John Smith",
                              comment:
                                "Good product overall. Shipping was fast and the item matches the description. The only reason I'm giving 4 stars instead of 5 is because the color is slightly different from what I expected. Otherwise, the quality is excellent and it works perfectly for my needs.",
                              date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                              verified_purchase: true,
                              helpful_count: 5,
                            },
                            {
                              id: 3,
                              rating: 5,
                              reviewer_name: "Mary Johnson",
                              comment:
                                "I'm extremely satisfied with this purchase! The product arrived earlier than expected and was packaged very securely. The quality exceeds what I expected for the price point. I've already recommended it to several friends who were impressed when they saw it.",
                              date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
                              verified_purchase: true,
                              helpful_count: 8,
                            },
                            {
                              id: 4,
                              rating: 3,
                              reviewer_name: "Alex Johnson",
                              comment:
                                "Average product for the price. It works as expected but nothing exceptional. Delivery was on time and the packaging was adequate. Might be good for someone looking for a basic option.",
                              date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                              verified_purchase: false,
                              helpful_count: 2,
                            },
                          ]
                        )
                          .slice(0, showAllReviews ? undefined : 3)
                          .map((review: any) => (
                            <div key={review.id} className="border border-gray-200 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                    <span className="font-medium text-red-800">{review.reviewer_name.charAt(0)}</span>
                                  </div>
                                  <span className="font-medium">{review.reviewer_name}</span>
                                  {review.verified_purchase && (
                                    <Badge
                                      variant="outline"
                                      className="ml-2 text-green-600 border-green-200 bg-green-50"
                                    >
                                      <Check className="h-3 w-3 mr-1" /> Verified Purchase
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(review.date).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="flex items-center mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={16}
                                    className={
                                      i < review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "fill-gray-200 text-gray-200"
                                    }
                                  />
                                ))}
                              </div>

                              <p className="text-sm mb-3">{review.comment}</p>

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  <button className="flex items-center gap-1 hover:text-gray-700">
                                    <ThumbsUp className="h-3 w-3" />
                                    Helpful ({review.helpful_count})
                                  </button>
                                  <button className="flex items-center gap-1 hover:text-gray-700">
                                    <MessageCircle className="h-3 w-3" />
                                    Reply
                                  </button>
                                </div>
                                <button className="hover:text-gray-700">Report</button>
                              </div>
                            </div>
                          ))}
                      </div>

                      {product.reviews && product.reviews.length > 3 && (
                        <Button
                          variant="link"
                          className="mt-4 text-red-800 p-0 h-auto"
                          onClick={() => setShowAllReviews(!showAllReviews)}
                        >
                          {showAllReviews ? "Show less reviews" : "Show all reviews"}
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="questions" className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium">Questions & Answers</h2>
                    <Button className="bg-red-800 hover:bg-red-900 text-white" onClick={() => setShowQA(!showQA)}>
                      Ask a Question
                    </Button>
                  </div>

                  {/* Question form */}
                  <AnimatePresence>
                    {showQA && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-6 overflow-hidden border border-gray-200 rounded-lg p-4"
                      >
                        <h4 className="font-medium mb-3">Ask a Question</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm mb-1">Your Question</label>
                            <textarea
                              className="w-full p-2 border border-gray-200 rounded-md min-h-[100px]"
                              placeholder="Ask a question about this product..."
                            ></textarea>
                          </div>
                          <p className="text-xs text-gray-500">
                            Your question will be answered by the seller or other customers who have purchased this
                            product.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowQA(false)}>
                              Cancel
                            </Button>
                            <Button className="bg-red-800 hover:bg-red-900 text-white">Submit Question</Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Q&A list */}
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="font-medium text-red-800 text-sm">Q</span>
                          </div>
                          <div>
                            <p className="font-medium">Is this bag water-resistant?</p>
                            <p className="text-xs text-gray-500 mt-1">Asked by Michael • 2 weeks ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="font-medium text-blue-600 text-sm">A</span>
                          </div>
                          <div>
                            <p>
                              The bag is made from genuine leather which has some natural water resistance, but it's not
                              fully waterproof. We recommend using a leather protector spray for additional protection
                              against light rain.
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">Answered by Seller • 1 week ago</p>
                              <div className="flex items-center gap-2 text-xs">
                                <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                                  <ThumbsUp className="h-3 w-3" />
                                  Helpful (8)
                                </button>
                                <button className="text-gray-500 hover:text-gray-700">Report</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="font-medium text-red-800 text-sm">Q</span>
                          </div>
                          <div>
                            <p className="font-medium">Can this bag fit a 15-inch laptop?</p>
                            <p className="text-xs text-gray-500 mt-1">Asked by Sarah • 1 month ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="font-medium text-blue-600 text-sm">A</span>
                          </div>
                          <div>
                            <p>
                              This bag is designed to fit laptops up to 13 inches comfortably. A 15-inch laptop would be
                              too large for this particular model. We do have larger bags in our collection that can
                              accommodate 15-inch laptops.
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                Answered by John (Verified Purchase) • 3 weeks ago
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                                  <ThumbsUp className="h-3 w-3" />
                                  Helpful (12)
                                </button>
                                <button className="text-gray-500 hover:text-gray-700">Report</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="font-medium text-red-800 text-sm">Q</span>
                          </div>
                          <div>
                            <p className="font-medium">How do I care for this leather bag?</p>
                            <p className="text-xs text-gray-500 mt-1">Asked by David • 2 months ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="font-medium text-blue-600 text-sm">A</span>
                          </div>
                          <div>
                            <p>
                              We recommend cleaning with a soft, dry cloth regularly. Apply a leather conditioner every
                              3-6 months to maintain the leather's suppleness. Keep away from direct sunlight when not
                              in use and avoid contact with water and harsh chemicals.
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">Answered by Seller • 7 weeks ago</p>
                              <div className="flex items-center gap-2 text-xs">
                                <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                                  <ThumbsUp className="h-3 w-3" />
                                  Helpful (15)
                                </button>
                                <button className="text-gray-500 hover:text-gray-700">Report</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <Button variant="outline">View All Questions (24)</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Recently Viewed Products */}
            {recentlyViewed.length > 0 && (
              <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-4">Recently Viewed</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {recentlyViewed.map((item, index) => (
                    <Link href={`/product/${item.slug}`} key={index} className="group">
                      <div className="relative aspect-square mb-2 overflow-hidden rounded-md">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <h4 className="text-xs font-medium line-clamp-2 h-8 group-hover:text-red-800">{item.name}</h4>
                      <p className="text-xs font-bold text-red-800 mt-1">{formatPrice(item.price)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Price, Cart, Delivery */}
          <div className="md:col-span-4">
            {/* Product Summary Card */}
            <div className="sticky top-4 space-y-4">
              {/* Price Card */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-medium">{formatPrice(currentPrice)}</span>
                  {currentPrice < originalPrice && (
                    <span className="text-gray-500 line-through text-sm">{formatPrice(originalPrice)}</span>
                  )}
                  {discountPercentage > 0 && (
                    <Badge className="bg-red-500 text-white hover:bg-red-600">-{discountPercentage}%</Badge>
                  )}
                </div>

                {/* Stock status */}
                <div className="flex items-center gap-2 mb-3">
                  {stockLeft > 10 ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      In Stock
                    </Badge>
                  ) : stockLeft > 0 ? (
                    <Badge variant="outline" className="text-red-800 border-red-200 bg-red-50 font-medium">
                      Low Stock - Only {stockLeft} left
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      Out of Stock
                    </Badge>
                  )}

                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                    Free Returns
                  </Badge>
                </div>

                {/* Shipping Info */}
                <div className="text-sm text-gray-600 mb-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Truck className="h-4 w-4 mt-0.5 text-red-800" />
                    <div>
                      <p>Free shipping on orders over {formatPrice(5000)}</p>
                      <p className="text-xs text-gray-500">+ shipping from KSh 90 to CBD - UON/Globe/Koja/River Road</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 text-red-800" />
                    <div>
                      <p>Delivery by Tomorrow, May 19</p>
                      <p className="text-xs text-gray-500">Order within the next 2 hours 35 minutes</p>
                    </div>
                  </div>
                </div>

                {/* Variant Selection */}
                {product.variants && product.variants.length > 0 && (
                  <div className="mb-6 space-y-4">
                    {/* Color Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Color</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(Array.from(new Set(product.variants.map((v: any) => v.color))) as string[])
                          .filter(Boolean)
                          .map((color, index) => {
                            const isSelected = selectedVariant?.color === color
                            return (
                              <button
                                key={index}
                                className={`flex flex-col items-center justify-center p-2 rounded-md border ${
                                  isSelected
                                    ? "border-red-800 bg-red-50"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                } transition-all duration-200`}
                                onClick={() => {
                                  const variantWithColor = product.variants.find((v: any) => v.color === color)
                                  if (variantWithColor) handleVariantSelection(variantWithColor)
                                }}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full mb-1 border border-gray-200 ${isSelected ? "ring-2 ring-red-800" : ""}`}
                                  style={{ backgroundColor: color || "#f3f4f6" }}
                                />
                                <span className="text-xs text-center truncate w-full">{color}</span>
                              </button>
                            )
                          })}
                      </div>
                    </div>

                    {/* Size Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Size</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(Array.from(new Set(product.variants.map((v: any) => v.size))) as string[])
                          .filter(Boolean)
                          .map((size, index) => {
                            const isSelected = selectedVariant?.size === size
                            return (
                              <button
                                key={index}
                                className={`py-2 px-3 rounded-md border text-center ${
                                  isSelected
                                    ? "border-red-800 bg-red-50 text-red-800 font-medium"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                } transition-all duration-200`}
                                onClick={() => {
                                  // Find a variant with this size and the currently selected color if possible
                                  let variantToSelect
                                  if (selectedVariant?.color) {
                                    variantToSelect = product.variants.find(
                                      (v: any) => v.size === size && v.color === selectedVariant.color,
                                    )
                                  }
                                  // If no variant with current color and this size, just find one with this size
                                  if (!variantToSelect) {
                                    variantToSelect = product.variants.find((v: any) => v.size === size)
                                  }
                                  if (variantToSelect) handleVariantSelection(variantToSelect)
                                }}
                              >
                                {size}
                              </button>
                            )
                          })}
                      </div>
                    </div>

                    {/* Selected Variant Summary */}
                    {selectedVariant && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <p className="text-sm font-medium">
                          Selected: {[selectedVariant.color, selectedVariant.size].filter(Boolean).join(", ")}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-600">
                            {selectedVariant.sku && (
                              <span className="text-xs text-gray-500">SKU: {selectedVariant.sku}</span>
                            )}
                          </p>
                          <p className="text-sm font-medium text-red-800">{formatPrice(selectedVariant.price)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Quantity</label>
                  <div className="flex items-center">
                    <button
                      className={`w-10 h-10 border border-gray-200 rounded-l-lg flex items-center justify-center ${
                        quantity <= 1 ? "text-gray-300" : "text-gray-600"
                      }`}
                      onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <MinusCircle className="h-5 w-5" />
                    </button>
                    <input
                      type="number"
                      className="w-16 h-10 border-gray-200 border-x-0 text-center focus:ring-0 focus:outline-none"
                      value={quantity}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value)
                        if (!isNaN(val) && val > 0) {
                          setQuantity(val)
                        }
                      }}
                      min="1"
                      max={stockLeft || 99}
                    />
                    <button
                      className={`w-10 h-10 border border-gray-200 rounded-r-lg flex items-center justify-center ${
                        quantity >= (stockLeft || 99) ? "text-gray-300" : "text-gray-600"
                      }`}
                      onClick={() => quantity < (stockLeft || 99) && setQuantity(quantity + 1)}
                      disabled={quantity >= (stockLeft || 99)}
                      aria-label="Increase quantity"
                    >
                      <PlusCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className="w-full bg-red-800 hover:bg-red-900 text-white h-12 rounded-md"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || stockLeft === 0}
                >
                  {isAddingToCart ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-5 w-5" />
                  )}
                  {stockLeft === 0 ? "OUT OF STOCK" : "ADD TO CART"}
                </Button>

                {/* Payment Methods */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium mb-2">ACCEPTED PAYMENT METHODS</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none">
                        <rect width="24" height="24" rx="4" fill="#1A1F71" />
                        <path d="M9.5 8.5H14.5L12 15.5H7L9.5 8.5Z" fill="#FFFFFF" />
                        <path d="M15 8.5H19L16.5 15.5H12.5L15 8.5Z" fill="#FFFFFF" />
                      </svg>
                      Visa/Mastercard
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none">
                        <rect width="24" height="24" rx="4" fill="#4CAF50" />
                        <path
                          d="M12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12C16.5 14.4853 14.4853 16.5 12 16.5Z"
                          fill="white"
                        />
                      </svg>
                      M-Pesa
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none">
                        <rect width="24" height="24" rx="4" fill="#FF9800" />
                        <path
                          d="M17 9H7V15H17V9Z"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Cash on Delivery
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Delivery & Returns */}
              {/* Additional Product Information */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-red-800" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">100% Authentic Products</p>
                    <p className="text-xs text-gray-600">All our products are original and verified</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-5 w-5 text-red-800" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Secure Shopping</p>
                    <p className="text-xs text-gray-600">Your data is protected with industry-standard encryption</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
