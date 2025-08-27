"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  Share2,
  ChevronRight,
  Star,
  Check,
  Truck,
  Clock,
  ThumbsUp,
  Shield,
  Zap,
  Home,
  ArrowLeft,
  ArrowRight,
  Package,
  Award,
  RefreshCw,
  Minus,
  Plus,
  ShoppingCart,
  CreditCard,
  Maximize2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice, cn } from "@/lib/utils"
import { productService } from "@/services/product"
import { inventoryService } from "@/services/inventory-service"
import { cloudinaryService } from "@/services/cloudinary-service"
import { ImageZoomModal } from "./image-zoom-modal"

interface ProductDetailsEnhancedProps {
  product: any
}

interface Review {
  id: number
  rating: number
  reviewer_name: string
  comment: string
  date: string
  verified_purchase: boolean
  helpful_count: number
}

const variants = {
  fadeIn: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.2, 0.6, 0.2, 1] },
  },
}

export function ProductDetailsEnhanced({ product: initialProduct }: ProductDetailsEnhancedProps) {
  const router = useRouter()

  // State
  const [product, setProduct] = useState<any>(initialProduct)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [isImageZoomModalOpen, setIsImageZoomModalOpen] = useState(false)
  const [zoomSelectedImage, setZoomSelectedImage] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [showCartNotification, setShowCartNotification] = useState(false)
  const [cartNotificationData, setCartNotificationData] = useState<any>(null)

  // Inventory state
  const [inventoryData, setInventoryData] = useState<{
    available_quantity: number
    is_in_stock: boolean
    is_low_stock: boolean
    stock_status: "in_stock" | "low_stock" | "out_of_stock"
    last_updated?: string
  } | null>({
    available_quantity: 0,
    is_in_stock: false,
    is_low_stock: false,
    stock_status: "out_of_stock",
    last_updated: undefined,
  })
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  // Refs
  const addToCartInProgress = useRef(false)
  const lastAddToCartTime = useRef(0)
  const imageRef = useRef<HTMLDivElement>(null)

  // Contexts
  const { addToCart, items: cartItems } = useCart()
  const { isInWishlist, addToWishlist, removeProductFromWishlist } = useWishlist()
  const { toast } = useToast()
  const isProductInWishlist = isInWishlist(Number(product?.id))

  // Derived pricing
  const currentPrice = selectedVariant?.price ?? product?.sale_price ?? product?.price
  const originalPrice = product?.price
  const discountPercentage =
    originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0

  // Helpers
  const getProductImageUrl = (p: any, index = 0, highQuality = false): string => {
    if (p?.image_urls && p.image_urls.length > index) {
      const url = p.image_urls[index]
      if (typeof url === "string" && !url.startsWith("http")) {
        if (highQuality) {
          return cloudinaryService.generateOptimizedUrl(url, {
            width: 2048,
            height: 2048,
            quality: 100,
            format: "auto",
            crop: "fit",
          })
        }
        return cloudinaryService.generateOptimizedUrl(url)
      }
      return url
    }
    return "/generic-product-display.png"
  }

  const getProductImages = (p: any): string[] => {
    let imageUrls: string[] = []
    if (p?.image_urls) {
      if (Array.isArray(p.image_urls)) {
        if (p.image_urls.length > 0 && typeof p.image_urls[0] === "string" && p.image_urls[0].length === 1) {
          try {
            const reconstructed = p.image_urls.join("")
            const parsed = JSON.parse(reconstructed)
            if (Array.isArray(parsed)) {
              imageUrls = parsed
                .filter((u: unknown): u is string => typeof u === "string" && u.trim() !== "")
                .map((u: string) => (u.startsWith("http") ? u : cloudinaryService.generateOptimizedUrl(u)))
            }
          } catch {
            imageUrls = []
          }
        } else {
          imageUrls = p.image_urls
            .filter((u: string): u is string => typeof u === "string" && u.trim() !== "")
            .map((u: string) => (u.startsWith("http") ? u : cloudinaryService.generateOptimizedUrl(u)))
        }
      } else if (typeof p.image_urls === "string") {
        try {
          const parsed = JSON.parse(p.image_urls)
          if (Array.isArray(parsed)) {
            imageUrls = parsed
              .filter((u): u is string => typeof u === "string" && u.trim() !== "")
              .map((u) => (u.startsWith("http") ? u : cloudinaryService.generateOptimizedUrl(u)))
          }
        } catch {}
      }
    }
    const valid = imageUrls.filter((u): u is string => Boolean(u && typeof u === "string" && u.trim() !== ""))
    return valid.length ? valid : ["/clean-product-shot.png"]
  }

  const productImages = useMemo(() => getProductImages(product), [product])

  // Effects
  useEffect(() => {
    setProduct(initialProduct)
  }, [initialProduct])

  const fetchInventoryData = useCallback(async () => {
    if (!product?.id) return
    setIsLoadingInventory(true)
    setInventoryError(null)
    try {
      console.log("[v0] Fetching inventory for product:", product.id)
      const summary = await inventoryService.getProductInventorySummary(Number(product.id), selectedVariant?.id)
      const available = summary.total_available_quantity ?? 0
      const stock_status: "in_stock" | "low_stock" | "out_of_stock" =
        available === 0 ? "out_of_stock" : summary.is_low_stock ? "low_stock" : "in_stock"

      setInventoryData({
        available_quantity: available,
        is_in_stock: !!summary.is_in_stock,
        is_low_stock: !!summary.is_low_stock,
        stock_status,
        last_updated: summary.items?.[0]?.last_updated,
      })
      console.log("[v0] Inventory data updated successfully")
    } catch (error: any) {
      console.error("[v0] Inventory fetch error:", error)
      setInventoryError(error?.message || "Failed to load inventory data")
      const fallbackStock = product?.stock || 0
      setInventoryData({
        available_quantity: fallbackStock,
        is_in_stock: fallbackStock > 0,
        is_low_stock: fallbackStock > 0 && fallbackStock <= 5,
        stock_status: fallbackStock === 0 ? "out_of_stock" : fallbackStock <= 5 ? "low_stock" : "in_stock",
      })
    } finally {
      setIsLoadingInventory(false)
    }
  }, [product?.id, selectedVariant?.id])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  useEffect(() => {
    const run = async () => {
      if (!product?.category_id) return
      setIsLoadingRelated(true)
      try {
        const products = await productService.getProductsByCategory(String(product.category_id))
        setRelatedProducts(
          products
            .filter((p: any) => p.id !== product.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 6),
        )
      } finally {
        setIsLoadingRelated(false)
      }
    }
    run()

    // Recently viewed
    try {
      const recentItems = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
      const exists = recentItems.some((i: any) => i.id === product.id)
      if (!exists) {
        const updated = [
          {
            id: product.id,
            name: product.name,
            price: currentPrice,
            image: productImages[0] || "/placeholder-rhtiu.png",
            slug: product.slug || product.id,
            image_urls: productImages,
            thumbnail_url: product.thumbnail_url,
          },
          ...recentItems,
        ].slice(0, 6)
        localStorage.setItem("recentlyViewed", JSON.stringify(updated))
        setRecentlyViewed(updated)
      } else {
        setRecentlyViewed(recentItems)
      }
    } catch {}
  }, [product.id, product.category_id, product.name, currentPrice, product.slug, product.thumbnail_url, productImages])

  useEffect(() => {
    const refreshInventory = () => {
      if (product?.id && !isLoadingInventory) {
        console.log("[v0] Refreshing inventory data")
        fetchInventoryData()
      }
    }
    const handleInventoryUpdate = (event: CustomEvent<{ productId: number }>) => {
      const { productId } = event.detail
      if (productId === Number(product.id)) refreshInventory()
    }
    const handleOrderCompleted = (
      event: CustomEvent<{ orderId: string; items: Array<{ product_id: number; quantity: number }> }>,
    ) => {
      const { items } = event.detail
      const affected = items?.some((i) => i.product_id === Number(product.id))
      if (affected) setTimeout(refreshInventory, 1000)
    }
    document.addEventListener("inventory-updated", handleInventoryUpdate as EventListener)
    document.addEventListener("order-completed", handleOrderCompleted as EventListener)

    const id = setInterval(refreshInventory, 300000) // 5 minutes instead of 30 seconds

    return () => {
      document.removeEventListener("inventory-updated", handleInventoryUpdate as EventListener)
      document.removeEventListener("order-completed", handleOrderCompleted as EventListener)
      clearInterval(id)
    }
  }, [product?.id, isLoadingInventory, fetchInventoryData])

  // Actions
  const handleVariantSelection = (variant: any) => setSelectedVariant(variant)
  const handleImageClick = () => {
    setZoomSelectedImage(selectedImage)
    setIsImageZoomModalOpen(true)
  }

  const handleAddToCart = async (): Promise<boolean> => {
    if (!inventoryData?.is_in_stock) {
      toast({ title: "Out of Stock", description: "This product is currently out of stock", variant: "destructive" })
      return false
    }

    try {
      const fresh = await inventoryService.checkAvailability(Number(product.id), quantity, selectedVariant?.id)
      if (!fresh.is_available || quantity > fresh.available_quantity) {
        setInventoryData({
          available_quantity: fresh.available_quantity,
          is_in_stock: fresh.available_quantity > 0,
          is_low_stock: !!fresh.is_low_stock,
          stock_status: fresh.available_quantity === 0 ? "out_of_stock" : fresh.is_low_stock ? "low_stock" : "in_stock",
        })
        toast({
          title: "Stock Updated",
          description:
            fresh.available_quantity === 0
              ? "This item just went out of stock."
              : `Only ${fresh.available_quantity} items available`,
          variant: "destructive",
        })
        return false
      }
    } catch {}

    if (quantity > (inventoryData?.available_quantity ?? 0)) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${inventoryData?.available_quantity ?? 0} items available`,
        variant: "destructive",
      })
      return false
    }

    if (addToCartInProgress.current || isAddingToCart) return false
    const now = Date.now()
    if (now - lastAddToCartTime.current < 1200) return false

    if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
      toast({
        title: "Select Options",
        description: "Please choose the required product options before adding to cart",
        variant: "destructive",
      })
      return false
    }

    if (quantity <= 0) {
      toast({ title: "Invalid quantity", description: "Please select at least 1 item", variant: "destructive" })
      return false
    }

    try {
      addToCartInProgress.current = true
      lastAddToCartTime.current = now
      setIsAddingToCart(true)
      const productId = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id
      const result = await addToCart(
        productId,
        quantity,
        typeof selectedVariant?.id === "number" ? selectedVariant.id : undefined,
      )
      if (result.success) {
        await fetchInventoryData()
        setCartNotificationData({
          name: product.name,
          price: currentPrice,
          quantity,
          thumbnail_url: productImages[0] || "/shopping-cart-thumbnail.png",
        })
        setShowCartNotification(true)
        setTimeout(() => setShowCartNotification(false), 4500)
        return true
      } else {
        toast({ title: "Error", description: result.message || "Failed to add item to cart", variant: "destructive" })
        return false
      }
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to add to cart", variant: "destructive" })
      return false
    } finally {
      setTimeout(() => {
        addToCartInProgress.current = false
        setIsAddingToCart(false)
      }, 1200)
    }
  }

  const handleToggleWishlist = async () => {
    try {
      if (isProductInWishlist) {
        await removeProductFromWishlist(Number(product.id))
        toast({ description: "Removed from wishlist" })
      } else {
        await addToWishlist({ product_id: product.id })
        toast({ description: "Added to wishlist" })
      }
    } catch {}
  }

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    if ((navigator as any).share) {
      ;(navigator as any).share({ title: product.name, text: product.description, url }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "Product link copied to clipboard" })
    }
  }

  // Specs builder
  const getProductSpecifications = (p: any) => {
    const specs: Array<{ category: string; items: Array<{ label: string; value: string }> }> = []
    specs.push({
      category: "BASIC INFORMATION",
      items: [
        { label: "Brand", value: p?.brand?.name || "Generic" },
        { label: "Model", value: p?.name },
        { label: "SKU", value: p?.sku || `MZ-${p?.id}` },
        { label: "Condition", value: "New" },
        { label: "Warranty", value: "1 Year Manufacturer Warranty" },
      ],
    })
    const physical: Array<{ label: string; value: string }> = []
    if (p?.weight) physical.push({ label: "Weight", value: `${p.weight}kg` })
    if (p?.dimensions) {
      if (typeof p.dimensions === "object" && p.dimensions !== null) {
        const { height, length, width } = p.dimensions as any
        if (height && length && width)
          physical.push({ label: "Dimensions", value: `${length} x ${width} x ${height} cm` })
      } else if (typeof p.dimensions === "string") {
        physical.push({ label: "Dimensions", value: p.dimensions })
      }
    }
    if (p?.material) physical.push({ label: "Material", value: p.material })
    if (!physical.length) {
      physical.push(
        { label: "Weight", value: "0.5kg" },
        { label: "Dimensions", value: "25 x 15 x 10 cm" },
        { label: "Material", value: "High-quality materials" },
      )
    }
    specs.push({ category: "PHYSICAL SPECIFICATIONS", items: physical })
    if (p?.category_id === "electronics" || p?.name?.toLowerCase().includes("electronic")) {
      specs.push({
        category: "TECHNICAL SPECIFICATIONS",
        items: [
          { label: "Power Source", value: "AC/DC Adapter" },
          { label: "Operating Temperature", value: "0°C to 40°C" },
          { label: "Connectivity", value: "USB, Bluetooth" },
          { label: "Compatibility", value: "Universal" },
        ],
      })
    }
    specs.push({
      category: "PACKAGE CONTENTS",
      items: [
        { label: "Main Product", value: `1 x ${p?.name}` },
        { label: "User Manual", value: "1 x User Guide" },
        { label: "Warranty Card", value: "1 x Warranty Documentation" },
        { label: "Accessories", value: "As specified in product description" },
      ],
    })
    if (p?.variants && p.variants.length) {
      const colors = [...new Set(p.variants.map((v: any) => v.color).filter(Boolean))]
      const sizes = [...new Set(p.variants.map((v: any) => v.size).filter(Boolean))]
      const items: Array<{ label: string; value: string }> = []
      if (colors.length) items.push({ label: "Available Colors", value: colors.join(", ") })
      if (sizes.length) items.push({ label: "Available Sizes", value: sizes.join(", ") })
      if (items.length) specs.push({ category: "AVAILABLE OPTIONS", items })
    }
    return specs
  }
  const specifications = getProductSpecifications(product)

  const calculateAverageRating = (reviews: Review[] | undefined) => {
    if (!reviews?.length) return 0
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    return Number((sum / reviews.length).toFixed(1))
  }

  // Stock display
  const stockDisplay = (() => {
    if (isLoadingInventory)
      return {
        icon: Info,
        text: "Checking availability...",
        cls: "text-gray-600 bg-gray-50 border-gray-200",
        ic: "text-gray-600",
      }
    if (inventoryError)
      return {
        icon: AlertTriangle,
        text: "Unable to check stock",
        cls: "text-lux-700 bg-lux-50 border-lux-200",
        ic: "text-lux-600",
      }
    if (!inventoryData)
      return {
        icon: XCircle,
        text: "Stock information unavailable",
        cls: "text-gray-600 bg-gray-50 border-gray-200",
        ic: "text-gray-600",
      }
    switch (inventoryData.stock_status) {
      case "in_stock":
        return {
          icon: CheckCircle,
          text: `${inventoryData.available_quantity} in stock`,
          cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
          ic: "text-emerald-600",
        }
      case "low_stock":
        return {
          icon: AlertTriangle,
          text: `Only ${inventoryData.available_quantity} left`,
          cls: "text-lux-700 bg-lux-50 border-lux-200",
          ic: "text-lux-600",
        }
      case "out_of_stock":
        return { icon: XCircle, text: "Out of stock", cls: "text-red-700 bg-red-50 border-red-200", ic: "text-red-600" }
      default:
        return {
          icon: Info,
          text: "Stock status unknown",
          cls: "text-gray-600 bg-gray-50 border-gray-200",
          ic: "text-gray-600",
        }
    }
  })()

  // Small UI helpers
  const LuxuryPill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", className)}>
      {children}
    </span>
  )

  const SectionCard = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm", className)}>
      {children}
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Cart Toast */}
      <AnimatePresence>
        {showCartNotification && cartNotificationData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm"
            role="status"
            aria-live="polite"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-emerald-600/95 text-white p-3 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span className="text-sm font-semibold">Added to Cart</span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                    <Image
                      src={cartNotificationData?.thumbnail_url || "/placeholder.svg?height=48&width=48&query=thumb"}
                      alt={cartNotificationData?.name || "Product"}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2">{cartNotificationData?.name}</p>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className="font-semibold">{formatPrice(cartNotificationData?.price || 0)}</span>
                      <span className="text-gray-500">Qty: {cartNotificationData?.quantity || 1}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowCartNotification(false)}
                    className="flex-1 h-9 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Continue Shopping
                  </button>
                  <Link href="/cart" className="flex-1">
                    <button className="w-full h-9 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition">
                      View Cart ({cartItems.length})
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs */}
      <motion.div {...variants.fadeIn} className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center text-sm text-gray-600 overflow-x-auto" aria-label="Breadcrumb">
            <Link href="/" className="flex items-center hover:text-black whitespace-nowrap">
              <Home className="mr-1.5 h-3.5 w-3.5" />
              <span className="font-medium">Home</span>
            </Link>
            <ChevronRight className="mx-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <Link href="/products" className="hover:text-black whitespace-nowrap font-medium">
              Products
            </Link>
            <ChevronRight className="mx-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-black truncate font-semibold">{product?.name}</span>
          </nav>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Gallery + Continuous Details */}
          <motion.div {...variants.fadeIn} className="lg:col-span-7">
            <SectionCard>
              {/* Seller header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex-shrink-0 border border-gray-200 rounded-lg p-2 bg-white">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-MOEe1fCrhHZWMGZxGP23s9Y8Ht8sQC.png"
                        alt="Store logo"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <LuxuryPill className="bg-lux-50 border-lux-200 text-lux-700">
                          <Shield className="w-3.5 h-3.5 mr-1" />
                          Official Store
                        </LuxuryPill>
                        {product?.is_luxury_deal && (
                          <LuxuryPill className="bg-purple-50 border-purple-200 text-purple-700">
                            <Award className="w-3.5 h-3.5 mr-1" />
                            Premium
                          </LuxuryPill>
                        )}
                        {product?.is_flash_sale && (
                          <LuxuryPill className="bg-orange-50 border-orange-200 text-orange-700">
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            Flash Sale
                          </LuxuryPill>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                        <span className="font-medium">Verified Seller</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{product?.rating || 4.7}</span>
                          <span className="text-gray-400">({product?.reviews?.length || 24})</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      aria-label={isProductInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                      onClick={handleToggleWishlist}
                      className={cn(
                        "p-2.5 rounded-full transition",
                        isProductInWishlist
                          ? "text-red-500 bg-red-50"
                          : "text-gray-500 hover:text-red-500 hover:bg-red-50",
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isProductInWishlist && "fill-red-500")} />
                    </button>
                    <button
                      aria-label="Share product"
                      onClick={handleShare}
                      className="p-2.5 rounded-full text-gray-500 hover:text-lux-700 hover:bg-lux-50 transition"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Thumbnails */}
                  <div className="hidden md:block md:col-span-3">
                    <div className="space-y-2">
                      {productImages.map((img, i) => (
                        <button
                          key={i}
                          className={cn(
                            "relative w-full aspect-square border-2 rounded-xl overflow-hidden transition",
                            selectedImage === i ? "border-lux-600" : "border-gray-200 hover:border-gray-300",
                          )}
                          onClick={() => setSelectedImage(i)}
                          aria-label={`Thumbnail ${i + 1}`}
                        >
                          <Image
                            src={img || "/placeholder.svg?height=120&width=120&query=thumb"}
                            alt={`${product?.name} thumbnail ${i + 1}`}
                            fill
                            sizes="(max-width: 768px) 20vw, 10vw"
                            className="object-cover w-full h-full"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main image */}
                  <div className="md:col-span-9">
                    <div
                      className={cn(
                        "relative border border-gray-200 rounded-2xl overflow-hidden bg-white group cursor-zoom-in",
                        "aspect-[1/1] md:aspect-[4/3] lg:aspect-[1/1]",
                        "min-h-[360px] md:min-h-[480px] lg:min-h-[520px] max-h-[680px]",
                      )}
                      ref={imageRef}
                      onClick={handleImageClick}
                    >
                      <Image
                        src={
                          getProductImageUrl(product, selectedImage) ||
                          "/placeholder.svg?height=520&width=520&query=main" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={product?.name || "Product image"}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 65vw, 60vw"
                        className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-[1.01]"
                        priority
                      />
                      {productImages.length > 1 && (
                        <>
                          <button
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur border border-gray-200 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedImage((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))
                            }}
                          >
                            <ArrowLeft className="h-4 w-4 text-gray-700" />
                          </button>
                          <button
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur border border-gray-200 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedImage((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))
                            }}
                          >
                            <ArrowRight className="h-4 w-4 text-gray-700" />
                          </button>
                        </>
                      )}

                      {discountPercentage > 0 && (
                        <div className="absolute top-3 left-3 bg-lux-600 text-white text-sm font-semibold px-2.5 py-1 rounded-lg shadow">
                          -{discountPercentage}%
                        </div>
                      )}

                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition bg-black/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Maximize2 className="h-3.5 w-3.5" />
                        Tap to zoom
                      </div>
                    </div>

                    {/* Mobile thumbnails */}
                    <div className="md:hidden mt-3">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {productImages.map((img, i) => (
                          <button
                            key={i}
                            className={cn(
                              "relative w-16 h-16 flex-shrink-0 border-2 rounded-xl overflow-hidden transition",
                              selectedImage === i ? "border-lux-600" : "border-gray-200 hover:border-gray-300",
                            )}
                            onClick={() => setSelectedImage(i)}
                            aria-label={`Thumbnail ${i + 1}`}
                          >
                            <Image
                              src={img || "/placeholder.svg?height=64&width=64&query=thumb"}
                              alt={`Thumbnail ${i + 1}`}
                              fill
                              className="object-cover w-full h-full"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Continuous Details Page (no tabs): Overview -> Specifications -> Reviews */}
            <motion.div {...variants.fadeIn} className="mt-5 space-y-5">
              {/* Overview / Product Details */}
              <SectionCard id="overview">
                <div className="p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-3 leading-tight">Product Details</h2>

                  {/* Optional detail images */}
                  <div className="grid md:grid-cols-4 gap-4 mb-5">
                    {productImages.slice(0, 4).map((img, i) => (
                      <div
                        key={i}
                        className="relative aspect-square border border-gray-200 rounded-xl overflow-hidden bg-white"
                      >
                        <Image
                          src={img || "/placeholder.svg?height=240&width=240&query=detail"}
                          alt={`${product?.name} detail ${i + 1}`}
                          fill
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div className="prose max-w-none">
                    {product?.description ? (
                      <div dangerouslySetInnerHTML={{ __html: product.description }} />
                    ) : (
                      <div className="space-y-4 text-sm text-gray-700">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2 leading-tight">Description</h3>
                          <p>
                            {product?.name} is crafted with attention to detail and premium materials for a refined,
                            luxurious experience. Built to last, designed to impress.
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-tight">Key Features</h4>
                          <ul className="space-y-2">
                            {(
                              product?.features || [
                                "Premium build quality",
                                "Refined, minimalist design",
                                "Durable materials",
                                "Excellent value",
                                "Reliable performance",
                              ]
                            ).map((f: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-emerald-600 mt-0.5" />
                                <span className="font-medium">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-tight">What's in the Box</h4>
                          <ul className="space-y-2">
                            {(
                              product?.package_contents || [`1 x ${product?.name}`, "User Manual", "Warranty Card"]
                            ).map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Package className="h-4 w-4 text-lux-600 mt-0.5" />
                                <span className="font-medium">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Specifications */}
              <SectionCard id="specs">
                <div className="p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-3 leading-tight">Technical Specifications</h2>
                  <div className="space-y-4">
                    {specifications.map((spec, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50/50 p-4 border-b border-gray-200">
                          <h3 className="font-semibold text-sm text-gray-900">{spec.category}</h3>
                        </div>
                        <div className="p-4">
                          <div className="grid sm:grid-cols-2 gap-3">
                            {spec.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0"
                              >
                                <span className="text-sm font-medium text-gray-700">{it.label}</span>
                                <span className="text-sm text-gray-600 font-medium">{String(it.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              {/* Reviews */}
              <SectionCard id="reviews">
                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div>
                      <h2 className="text-base font-semibold mb-3 text-gray-900 leading-tight">Customer Reviews</h2>
                      <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-2xl font-semibold text-gray-900">
                            {product?.reviews?.length ? calculateAverageRating(product.reviews) : "0.0"}
                          </div>
                          <div className="flex-1">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={
                                    i <
                                    Math.floor(
                                      Number(product?.reviews?.length ? calculateAverageRating(product.reviews) : 0),
                                    )
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }
                                />
                              ))}
                            </div>
                            <p className="text-sm text-gray-600">Based on {product?.reviews?.length || 0} reviews</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowReviewForm((s) => !s)}
                          className="w-full h-10 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition"
                        >
                          Write a Review
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <AnimatePresence>
                        {showReviewForm && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="mb-5 border border-gray-200 rounded-xl p-4 bg-gray-50/50"
                          >
                            <h4 className="font-semibold mb-3 text-sm text-gray-900">Write Your Review</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm mb-1.5 font-medium text-gray-700">Rating</label>
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map((r) => (
                                    <button key={r} className="text-gray-300 hover:text-yellow-400 transition">
                                      <Star size={20} className="fill-current" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm mb-1.5 font-medium text-gray-700">Review Title</label>
                                <input
                                  type="text"
                                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-lux-600 focus:border-lux-600 text-sm"
                                  placeholder="Summarize your experience"
                                />
                              </div>
                              <div>
                                <label className="block text-sm mb-1.5 font-medium text-gray-700">Your Review</label>
                                <textarea
                                  className="w-full p-3 border border-gray-200 rounded-lg min-h-[100px] focus:ring-2 focus:ring-lux-600 focus:border-lux-600 text-sm"
                                  placeholder="What did you like or dislike about this product?"
                                ></textarea>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setShowReviewForm(false)}
                                  className="px-4 h-9 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-800"
                                >
                                  Cancel
                                </button>
                                <button className="px-4 h-9 bg-black text-white hover:bg-gray-800 rounded-lg text-sm font-semibold">
                                  Submit Review
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {product?.reviews?.length ? (
                        <div className="space-y-4">
                          {product.reviews.slice(0, showAllReviews ? undefined : 3).map((review: any, idx: number) => (
                            <div key={review.id ?? idx} className="border border-gray-200 p-4 rounded-xl bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <span className="font-semibold text-gray-600 text-sm">
                                      {review.user?.first_name ? review.user.first_name.charAt(0).toUpperCase() : "U"}
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-semibold text-gray-900">
                                      {review.user?.first_name || "Anonymous User"}
                                    </span>
                                    {review.is_verified_purchase && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 text-green-700 border border-green-200 bg-green-50 text-xs font-medium rounded-full">
                                        <Check className="h-3 w-3 mr-1" />
                                        Verified Purchase
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
                                </span>
                              </div>
                              <div className="flex items-center mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={14}
                                    className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                                  />
                                ))}
                              </div>
                              {review.title && (
                                <h4 className="font-semibold text-gray-900 mb-1 text-sm">{review.title}</h4>
                              )}
                              <p className="text-sm text-gray-700 mb-3">{review.comment}</p>
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <button className="flex items-center gap-1.5 hover:text-gray-700 transition font-medium">
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                  Helpful ({review.likes_count || 0})
                                </button>
                              </div>
                            </div>
                          ))}
                          {product.reviews.length > 3 && (
                            <button
                              className="mt-1 text-sm font-semibold text-lux-700 hover:text-lux-800"
                              onClick={() => setShowAllReviews((s) => !s)}
                            >
                              {showAllReviews ? "Show less" : "Show all reviews"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                            <Star className="h-6 w-6 text-gray-400" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900">No reviews yet</h3>
                          <p className="text-sm text-gray-600 mb-3">Be the first to review this product</p>
                          <button
                            className="px-4 h-9 bg-black text-white hover:bg-gray-800 rounded-lg text-sm font-semibold"
                            onClick={() => setShowReviewForm(true)}
                          >
                            Write the first review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </motion.div>

            {/* Recently Viewed */}
            {!!recentlyViewed.length && (
              <motion.div {...variants.fadeIn} className="mt-5">
                <SectionCard>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 text-base mb-3 leading-tight">Recently Viewed</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {recentlyViewed.map((item, i) => (
                        <Link href={`/product/${item.slug || item.id}`} key={i} className="group">
                          <div className="relative aspect-square mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <Image
                              src={
                                item.image || item.thumbnail_url || "/placeholder.svg?height=180&width=180&query=recent"
                              }
                              alt={item.name}
                              fill
                              className="object-cover w-full h-full group-hover:scale-105 transition"
                            />
                          </div>
                          <h4 className="text-sm font-medium line-clamp-2 h-8 group-hover:text-gray-900 text-gray-800">
                            {item.name}
                          </h4>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{formatPrice(item.price)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* Related */}
            {!!relatedProducts.length && (
              <motion.div {...variants.fadeIn} className="mt-5">
                <SectionCard>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">You Might Also Like</h3>
                      <Link href="/products" className="text-sm font-semibold text-lux-700 hover:text-lux-800">
                        View All →
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {relatedProducts.slice(0, 6).map((rp, i) => (
                        <Link href={`/product/${rp.id}`} key={i} className="group">
                          <div className="relative aspect-square mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <Image
                              src={getProductImageUrl(rp) || "/placeholder.svg?height=180&width=180&query=related"}
                              alt={rp.name}
                              fill
                              className="object-cover w-full h-full group-hover:scale-105 transition"
                            />
                            {rp.sale_price && rp.sale_price < rp.price && (
                              <div className="absolute top-1.5 left-1.5 bg-lux-600 text-white text-xs px-1.5 py-0.5 rounded-md font-semibold">
                                -{Math.round(((rp.price - rp.sale_price) / rp.price) * 100)}%
                              </div>
                            )}
                          </div>
                          <h4 className="text-sm font-medium line-clamp-2 h-8 group-hover:text-gray-900 text-gray-800">
                            {rp.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatPrice(rp.sale_price || rp.price)}
                            </p>
                            {rp.sale_price && rp.sale_price < rp.price && (
                              <p className="text-xs text-gray-400 line-through">{formatPrice(rp.price)}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}
          </motion.div>

          {/* RIGHT: Price + Purchase */}
          <motion.div {...variants.fadeIn} className="lg:col-span-5">
            <div className="sticky top-4 space-y-4">
              <SectionCard>
                <div className="p-5">
                  {/* Mobile title */}
                  <h1 className="text-lg font-semibold text-gray-900 mb-2 lg:hidden leading-tight">{product?.name}</h1>

                  {/* Price */}
                  <div className="flex items-end gap-3 mb-4">
                    <span className="text-2xl font-semibold text-gray-900">{formatPrice(currentPrice)}</span>
                    {currentPrice < originalPrice && (
                      <span className="text-gray-500 line-through text-lg font-medium">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                    {discountPercentage > 0 && (
                      <span className="text-xs font-semibold bg-lux-600 text-white px-2 py-0.5 rounded-full">
                        -{discountPercentage}%
                      </span>
                    )}
                  </div>

                  {/* Stock pill */}
                  <div
                    className={cn(
                      "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border mb-4",
                      stockDisplay.cls,
                    )}
                    aria-live="polite"
                  >
                    <stockDisplay.icon className={cn("h-4 w-4 mr-2", stockDisplay.ic)} />
                    {stockDisplay.text}
                    {inventoryData?.last_updated && (
                      <span className="ml-2 text-xs opacity-75">
                        • Updated {new Date(inventoryData.last_updated).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Delivery & returns */}
                  <div className="space-y-2 mb-5">
                    {[
                      { icon: Truck, title: "Delivery", desc: "From KSh 150 | Free over KSh 3,000" },
                      { icon: Clock, title: "Dispatch", desc: "Same-day for orders before 2pm" },
                      { icon: RefreshCw, title: "Returns", desc: "14-day hassle-free returns" },
                    ].map((it, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100"
                      >
                        <it.icon className="h-4 w-4 mt-0.5 text-gray-600" />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{it.title}</p>
                          <p className="text-sm text-gray-600">{it.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Variants */}
                  {product?.variants?.length > 0 && (
                    <div className="space-y-4 mb-5">
                      {/* Colors */}
                      {Array.from(new Set(product.variants.map((v: any) => v.color))).filter(Boolean).length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-900">Color</label>
                          <div className="flex flex-wrap gap-2">
                            {(Array.from(new Set(product.variants.map((v: any) => v.color))) as string[])
                              .filter(Boolean)
                              .map((color, i) => {
                                const active = selectedVariant?.color === color
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      const v = product.variants.find((x: any) => x.color === color)
                                      if (v) handleVariantSelection(v)
                                    }}
                                    className={cn(
                                      "px-3 h-9 rounded-lg border text-sm font-medium transition",
                                      active
                                        ? "border-lux-600 bg-lux-600 text-white"
                                        : "border-gray-200 bg-white hover:border-gray-300",
                                    )}
                                  >
                                    {color}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* Sizes */}
                      {Array.from(new Set(product.variants.map((v: any) => v.size))).filter(Boolean).length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-900">Size</label>
                          <div className="flex flex-wrap gap-2">
                            {(Array.from(new Set(product.variants.map((v: any) => v.size))) as string[])
                              .filter(Boolean)
                              .map((size, i) => {
                                const active = selectedVariant?.size === size
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      const v = product.variants.find((x: any) => x.size === size)
                                      if (v) handleVariantSelection(v)
                                    }}
                                    className={cn(
                                      "px-3 h-9 rounded-lg border text-sm font-medium transition",
                                      active
                                        ? "border-lux-600 bg-lux-600 text-white"
                                        : "border-gray-200 bg-white hover:border-gray-300",
                                    )}
                                  >
                                    {size}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold mb-2 text-gray-900">Quantity</label>
                    <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        aria-label="Decrease quantity"
                        className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="w-12 h-10 flex items-center justify-center border-x border-gray-300 bg-white">
                        <span className="font-semibold text-gray-900 text-sm">{quantity}</span>
                      </div>
                      <button
                        aria-label="Increase quantity"
                        className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        onClick={() => setQuantity((q) => Math.min(inventoryData?.available_quantity || 0, q + 1))}
                        disabled={!inventoryData?.is_in_stock || quantity >= (inventoryData?.available_quantity || 0)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {inventoryData && inventoryData.available_quantity > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Max available: {inventoryData.available_quantity}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={handleAddToCart}
                      disabled={isAddingToCart || !inventoryData?.is_in_stock}
                      className={cn(
                        "w-full h-12 rounded-lg text-white text-sm font-semibold transition flex items-center justify-center",
                        isAddingToCart || !inventoryData?.is_in_stock
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-black hover:bg-gray-800",
                      )}
                    >
                      {isAddingToCart ? (
                        <>
                          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {inventoryData?.is_in_stock ? "Add to Cart" : "Out of Stock"}
                        </>
                      )}
                    </button>
                    <button
                      className="w-full h-12 rounded-lg border border-lux-600 text-lux-700 hover:bg-lux-50 text-sm font-semibold transition"
                      onClick={async () => {
                        const ok = await handleAddToCart()
                        if (ok) router.push("/checkout")
                      }}
                      disabled={isAddingToCart || !inventoryData?.is_in_stock}
                    >
                      Buy Now
                    </button>
                  </div>

                  {/* Payment */}
                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <p className="text-sm font-semibold mb-2 text-gray-900">Secure Payment Options</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="h-4 w-4" />
                      <span>Visa, Mastercard, M-Pesa, Airtel Money</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Trust & Assurance */}
              <SectionCard>
                <div className="p-5 grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Genuine Products</p>
                      <p className="text-xs text-gray-600">Verified authenticity and quality</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-lux-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Easy Returns</p>
                      <p className="text-xs text-gray-600">14-day hassle-free returns</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </motion.div>

          {/* RIGHT column end */}
        </div>

        {/* Low stock notice */}
        {inventoryData && inventoryData.available_quantity > 0 && inventoryData.available_quantity <= 10 && (
          <motion.div {...variants.fadeIn} className="mt-4 p-3 bg-lux-50 rounded-xl border border-lux-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-lux-700" />
              <p className="text-sm font-medium text-lux-800">
                Only {inventoryData.available_quantity} left in stock — order soon!
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky Mobile CTA — Jumia-style */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || !inventoryData?.is_in_stock}
            className={cn(
              "flex-1 h-11 rounded-lg text-white text-sm font-semibold transition flex items-center justify-center",
              isAddingToCart || !inventoryData?.is_in_stock ? "bg-gray-400" : "bg-black hover:bg-gray-800",
            )}
          >
            {isAddingToCart ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Adding...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {inventoryData?.is_in_stock ? "Add to Cart" : "Out of Stock"}
              </>
            )}
          </button>
          <button
            onClick={async () => {
              const ok = await handleAddToCart()
              if (ok) router.push("/checkout")
            }}
            disabled={isAddingToCart || !inventoryData?.is_in_stock}
            className={cn(
              "flex-1 h-11 rounded-lg text-white text-sm font-semibold transition",
              isAddingToCart || !inventoryData?.is_in_stock ? "bg-gray-300" : "bg-lux-600 hover:bg-lux-700",
            )}
          >
            Buy Now
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Zoom Modal */}
      <ImageZoomModal
        product={product}
        isOpen={isImageZoomModalOpen}
        onClose={() => setIsImageZoomModalOpen(false)}
        selectedImageIndex={zoomSelectedImage}
      />
    </div>
  )
}
