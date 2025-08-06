"use client"
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
  Verified,
  CreditCard,
  X,
  Maximize2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCart } from "@/contexts/cart/cart-context"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"
import { productService } from "@/services/product"
import { inventoryService } from "@/services/inventory-service"
import { cn } from "@/lib/utils"
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

// Apple-inspired animation variants with refined timing
const appleVariants = {
  fadeInUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  slideIn: {
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const appleSpring = {
  type: "spring",
  stiffness: 400,
  damping: 25,
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
  const [isImageZoomModalOpen, setIsImageZoomModalOpen] = useState(false)
  const [zoomSelectedImage, setZoomSelectedImage] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [showCartNotification, setShowCartNotification] = useState(false)
  const [cartNotificationData, setCartNotificationData] = useState<any>(null)

  // Real inventory state
  const [inventoryData, setInventoryData] = useState<{
    available_quantity: number
    is_in_stock: boolean
    is_low_stock: boolean
    stock_status: "in_stock" | "low_stock" | "out_of_stock"
    last_updated?: string
  } | null>(null)
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  // Add ref to prevent multiple simultaneous add to cart operations
  const addToCartInProgress = useRef(false)
  const lastAddToCartTime = useRef(0)

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

  const getProductImageUrl = (product: any, index = 0, highQuality = false): string => {
    if (product.image_urls && product.image_urls.length > index) {
      const url = product.image_urls[index]
      // Check if the URL is a Cloudinary public ID
      if (typeof url === "string" && !url.startsWith("http")) {
        // For zoom modal, use much higher quality and larger dimensions
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
    return "/placeholder.svg?height=300&width=300"
  }

  // Get all product images as array
  const getProductImages = (product: any): string[] => {
    let imageUrls: string[] = []

    if (product.image_urls) {
      if (Array.isArray(product.image_urls)) {
        // Check if it's a malformed character array
        if (
          product.image_urls.length > 0 &&
          typeof product.image_urls[0] === "string" &&
          product.image_urls[0].length === 1
        ) {
          // Try to reconstruct from character array
          try {
            const reconstructed = product.image_urls.join("")
            const parsed = JSON.parse(reconstructed)
            if (Array.isArray(parsed)) {
              imageUrls = parsed
                .filter((url: unknown): url is string => typeof url === "string" && url.trim() !== "")
                .map((url: string) => {
                  // If it's a Cloudinary public ID, generate URL
                  if (typeof url === "string" && !url.startsWith("http")) {
                    return cloudinaryService.generateOptimizedUrl(url)
                  }
                  return url
                })
            }
          } catch (e) {
            console.warn("Failed to reconstruct image URLs for product", product.id)
            imageUrls = []
          }
        } else {
          // Normal array processing
          imageUrls = product.image_urls
            .filter((url: string): url is string => typeof url === "string" && url.trim() !== "")
            .map((url: string) => {
              // If it's a Cloudinary public ID, generate URL
              if (typeof url === "string" && !url.startsWith("http")) {
                return cloudinaryService.generateOptimizedUrl(url)
              }
              return url
            })
        }
      } else if (typeof product.image_urls === "string") {
        try {
          const parsed = JSON.parse(product.image_urls)
          if (Array.isArray(parsed)) {
            imageUrls = parsed
              .filter((url): url is string => typeof url === "string" && url.trim() !== "")
              .map((url) => {
                // If it's a Cloudinary public ID, generate URL
                if (typeof url === "string" && !url.startsWith("http")) {
                  return cloudinaryService.generateOptimizedUrl(url)
                }
                return url
              })
          }
        } catch (error) {
          console.warn("Failed to parse image URLs:", error)
        }
      }
    }

    // Filter out any null/undefined values and ensure we have at least one image
    const validImages = imageUrls.filter((url): url is string =>
      Boolean(url && typeof url === "string" && url.trim() !== ""),
    )

    return validImages.length > 0 ? validImages : ["/placeholder.svg?height=600&width=600"]
  }

  // Fetch real inventory data
  const fetchInventoryData = async () => {
    if (!product?.id) return

    setIsLoadingInventory(true)
    setInventoryError(null)

    try {
      console.log(`Fetching real inventory for product ${product.id}`)
      const inventorySummary = await inventoryService.getProductInventorySummary(
        Number(product.id),
        selectedVariant?.id,
      )

      console.log(`Real inventory data for product ${product.id}:`, inventorySummary)
      setInventoryData(inventorySummary)
    } catch (error: any) {
      console.error(`Error fetching inventory for product ${product.id}:`, error)
      setInventoryError(error.message || "Failed to load inventory data")

      // Set fallback data based on product stock if available
      const fallbackStock = product.stock || 0
      setInventoryData({
        available_quantity: fallbackStock,
        is_in_stock: fallbackStock > 0,
        is_low_stock: fallbackStock <= 5 && fallbackStock > 0,
        stock_status: fallbackStock === 0 ? "out_of_stock" : fallbackStock <= 5 ? "low_stock" : "in_stock",
      })
    } finally {
      setIsLoadingInventory(false)
    }
  }

  // Update product when initialProduct changes
  useEffect(() => {
    setProduct(initialProduct)
  }, [initialProduct])

  // Fetch inventory data when product or variant changes
  useEffect(() => {
    fetchInventoryData()
  }, [product?.id, selectedVariant?.id])

  // Fetch related products and setup intervals
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (product?.category_id) {
        setIsLoadingRelated(true)
        try {
          const products = await productService.getProductsByCategory(product.category_id.toString())
          const filtered = products
            .filter((p: any) => p.id !== product.id)
            .sort(() => 0.5 - Math.random())
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

    // Save to recently viewed
    const saveToRecentlyViewed = () => {
      try {
        const recentItems = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
        const exists = recentItems.some((item: any) => item.id === product.id)
        if (!exists) {
          const productImages = getProductImages(product)
          const updatedItems = [
            {
              id: product.id,
              name: product.name,
              price: currentPrice,
              image: productImages[0] || "/placeholder.svg",
              slug: product.slug || product.id,
              // Store all images for proper navigation
              image_urls: productImages,
              thumbnail_url: product.thumbnail_url,
            },
            ...recentItems,
          ].slice(0, 6)
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
  }, [product.id, product.category_id, product.name, currentPrice, product.slug, product.thumbnail_url])

  // Handle variant selection
  const handleVariantSelection = (variant: any) => {
    setSelectedVariant(variant)
  }

  // Handle image zoom - pass the current selected image index
  const handleImageClick = () => {
    setZoomSelectedImage(selectedImage)
    setIsImageZoomModalOpen(true)
  }

  // FIXED: Add to cart function with proper debouncing and duplicate prevention
  const handleAddToCart = async () => {
    // Check inventory first with real-time data
    if (!inventoryData?.is_in_stock) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive",
      })
      return
    }

    // Double-check availability with fresh data before adding
    try {
      const freshAvailability = await inventoryService.checkAvailability(
        Number(product.id),
        quantity,
        selectedVariant?.id,
      )

      if (!freshAvailability.is_available) {
        toast({
          title: "Stock Updated",
          description: `Only ${freshAvailability.available_quantity} items available`,
          variant: "destructive",
        })

        // Update local inventory data with fresh info
        setInventoryData({
          available_quantity: freshAvailability.available_quantity,
          is_in_stock: freshAvailability.available_quantity > 0,
          is_low_stock: freshAvailability.is_low_stock || false,
          stock_status:
            freshAvailability.available_quantity === 0
              ? "out_of_stock"
              : freshAvailability.is_low_stock
                ? "low_stock"
                : "in_stock",
        })

        return
      }

      if (quantity > freshAvailability.available_quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${freshAvailability.available_quantity} items available`,
          variant: "destructive",
        })
        return
      }
    } catch (error) {
      console.warn("Could not verify fresh inventory, proceeding with cached data:", error)
    }

    if (quantity > inventoryData.available_quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${inventoryData.available_quantity} items available`,
        variant: "destructive",
      })
      return
    }

    // Prevent multiple simultaneous calls
    if (addToCartInProgress.current || isAddingToCart) {
      console.log("Add to cart already in progress, ignoring duplicate call")
      return
    }

    // Debounce rapid clicks (prevent clicks within 2 seconds)
    const now = Date.now()
    if (now - lastAddToCartTime.current < 2000) {
      console.log("Add to cart called too quickly, ignoring")
      return
    }

    // Check if variants are required but not selected
    if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
      toast({
        title: "Please select options",
        description: "Please select all required product options before adding to cart",
        variant: "destructive",
      })
      return
    }

    // Validate quantity
    if (quantity <= 0 || quantity > inventoryData.available_quantity) {
      toast({
        title: "Invalid quantity",
        description: `Please select a quantity between 1 and ${inventoryData.available_quantity}`,
        variant: "destructive",
      })
      return
    }

    try {
      // Set flags to prevent duplicate calls
      addToCartInProgress.current = true
      lastAddToCartTime.current = now
      setIsAddingToCart(true)

      console.log(
        `Adding to cart: Product ${product.id}, Quantity: ${quantity}, Variant: ${selectedVariant?.id || "none"}`,
      )

      // Add to cart
      const productId = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id
      const result = await addToCart(
        productId,
        quantity,
        typeof selectedVariant?.id === "number" ? selectedVariant.id : undefined,
      )

      if (result.success) {
        // Refresh inventory data after successful add to cart
        await fetchInventoryData()

        // Show custom cart notification instead of toast
        const productImages = getProductImages(product)
        setCartNotificationData({
          name: product.name,
          price: currentPrice,
          quantity: quantity,
          thumbnail_url: productImages[0] || "/placeholder.svg",
        })
        setShowCartNotification(true)

        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowCartNotification(false)
        }, 5000)

        console.log("Successfully added to cart")
      } else {
        console.error("Failed to add to cart:", result.message)
        toast({
          title: "Error",
          description: result.message || "Failed to add item to cart",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive",
      })
    } finally {
      // Reset flags after a delay to prevent rapid successive calls
      setTimeout(() => {
        addToCartInProgress.current = false
        setIsAddingToCart(false)
      }, 2000) // 2 second delay before allowing next add to cart
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

  // Generate realistic specifications from product data
  const getProductSpecifications = (product: any) => {
    const specs = []

    // Basic Information
    specs.push({
      category: "BASIC INFORMATION",
      items: [
        { label: "Brand", value: product.brand?.name || "Generic" },
        { label: "Model", value: product.name },
        { label: "SKU", value: product.sku || `MZ-${product.id}` },
        { label: "Condition", value: "New" },
        { label: "Warranty", value: "1 Year Manufacturer Warranty" },
      ],
    })

    // Physical Specifications
    const physicalSpecs = []
    if (product.weight) physicalSpecs.push({ label: "Weight", value: `${product.weight}kg` })

    // Handle dimensions properly - check if it's an object or string
    if (product.dimensions) {
      if (typeof product.dimensions === "object" && product.dimensions !== null) {
        // If dimensions is an object with height, length, width
        const { height, length, width } = product.dimensions
        if (height && length && width) {
          physicalSpecs.push({ label: "Dimensions", value: `${length} x ${width} x ${height} cm` })
        }
      } else if (typeof product.dimensions === "string") {
        // If dimensions is already a string
        physicalSpecs.push({ label: "Dimensions", value: product.dimensions })
      }
    }

    if (product.material) physicalSpecs.push({ label: "Material", value: product.material })

    // Add default physical specs if none provided
    if (physicalSpecs.length === 0) {
      physicalSpecs.push(
        { label: "Weight", value: "0.5kg" },
        { label: "Dimensions", value: "25 x 15 x 10 cm" },
        { label: "Material", value: "High-quality materials" },
      )
    }

    specs.push({
      category: "PHYSICAL SPECIFICATIONS",
      items: physicalSpecs,
    })

    // Technical Specifications (if applicable)
    if (product.category_id === "electronics" || product.name.toLowerCase().includes("electronic")) {
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

    // Package Contents
    specs.push({
      category: "PACKAGE CONTENTS",
      items: [
        { label: "Main Product", value: `1 x ${product.name}` },
        { label: "User Manual", value: "1 x User Guide" },
        { label: "Warranty Card", value: "1 x Warranty Documentation" },
        { label: "Accessories", value: "As specified in product description" },
      ],
    })

    // Variants (if available)
    if (product.variants && product.variants.length > 0) {
      const colors = [...new Set(product.variants.map((v: any) => v.color).filter(Boolean))]
      const sizes = [...new Set(product.variants.map((v: any) => v.size).filter(Boolean))]

      const variantItems = []
      if (colors.length > 0) variantItems.push({ label: "Available Colors", value: colors.join(", ") })
      if (sizes.length > 0) variantItems.push({ label: "Available Sizes", value: sizes.join(", ") })

      if (variantItems.length > 0) {
        specs.push({
          category: "AVAILABLE OPTIONS",
          items: variantItems,
        })
      }
    }

    return specs
  }

  const specifications = getProductSpecifications(product)

  // Update the calculateAverageRating function:
  const calculateAverageRating = (reviews: Review[] | undefined) => {
    if (!reviews || reviews.length === 0) return 0
    const sum = reviews.reduce((total, review) => total + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  // Get stock status display info
  const getStockStatusDisplay = () => {
    if (isLoadingInventory) {
      return {
        icon: Info,
        text: "Checking availability...",
        className: "text-gray-500 bg-gray-50 border-gray-200",
        iconClassName: "text-gray-500",
      }
    }

    if (inventoryError) {
      return {
        icon: AlertTriangle,
        text: "Unable to check stock",
        className: "text-amber-700 bg-amber-50 border-amber-200",
        iconClassName: "text-amber-600",
      }
    }

    if (!inventoryData) {
      return {
        icon: XCircle,
        text: "Stock information unavailable",
        className: "text-gray-500 bg-gray-50 border-gray-200",
        iconClassName: "text-gray-500",
      }
    }

    switch (inventoryData.stock_status) {
      case "in_stock":
        return {
          icon: CheckCircle,
          text: `${inventoryData.available_quantity} in stock`,
          className: "text-green-700 bg-green-50 border-green-200",
          iconClassName: "text-green-600",
        }
      case "low_stock":
        return {
          icon: AlertTriangle,
          text: `Only ${inventoryData.available_quantity} left`,
          className: "text-amber-700 bg-amber-50 border-amber-200",
          iconClassName: "text-amber-600",
        }
      case "out_of_stock":
        return {
          icon: XCircle,
          text: "Out of stock",
          className: "text-red-700 bg-red-50 border-red-200",
          iconClassName: "text-red-600",
        }
      default:
        return {
          icon: Info,
          text: "Stock status unknown",
          className: "text-gray-500 bg-gray-50 border-gray-200",
          iconClassName: "text-gray-500",
        }
    }
  }

  const stockDisplay = getStockStatusDisplay()

  // Add this new useEffect after the existing inventory fetch effect
  useEffect(() => {
    // Set up real-time inventory updates
    const refreshInventory = () => {
      if (product?.id && !isLoadingInventory) {
        fetchInventoryData()
      }
    }

    // Listen for inventory updates with proper typing
    const handleInventoryUpdate = (event: CustomEvent<{ productId: number; [key: string]: any }>) => {
      const { productId } = event.detail
      if (productId === Number(product.id)) {
        console.log(`Inventory updated for product ${productId}, refreshing...`)
        refreshInventory()
      }
    }

    // Listen for order completion events with proper typing
    const handleOrderCompleted = (
      event: CustomEvent<{ orderId: string; items: Array<{ product_id: number; quantity: number }> }>,
    ) => {
      const { orderId, items } = event.detail
      const affectedItem = items?.find((item: any) => item.product_id === Number(product.id))

      if (affectedItem) {
        console.log(`Order ${orderId} completed, refreshing inventory for product ${product.id}`)
        setTimeout(refreshInventory, 1000) // Small delay to ensure backend processing is complete
      }
    }

    document.addEventListener("inventory-updated", handleInventoryUpdate as EventListener)
    document.addEventListener("order-completed", handleOrderCompleted as EventListener)

    // Refresh inventory every 30 seconds for active products
    const inventoryRefreshInterval = setInterval(refreshInventory, 30000)

    return () => {
      document.removeEventListener("inventory-updated", handleInventoryUpdate as EventListener)
      document.removeEventListener("order-completed", handleOrderCompleted as EventListener)
      clearInterval(inventoryRefreshInterval)
    }
  }, [product?.id, isLoadingInventory])

  return (
    <div className="min-h-screen bg-white font-['SF_Pro_Display','-apple-system','BlinkMacSystemFont','Segoe_UI','Roboto','Helvetica','Arial',sans-serif]">
      {/* Custom Cart Notification with Apple Design */}
      <AnimatePresence>
        {showCartNotification && cartNotificationData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ ...appleSpring, duration: 0.4 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-xl">
              {/* Success header with Apple-style gradient */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 text-white relative overflow-hidden">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, ...appleSpring }}
                  className="absolute top-2 right-2"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </motion.div>
                <h3 className="font-semibold text-base tracking-tight">Added to Cart</h3>
                <p className="text-green-100 text-sm font-medium">Ready for checkout</p>
              </div>

              {/* Product details with refined spacing */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    <Image
                      src={cartNotificationData?.thumbnail_url || "/placeholder.svg"}
                      alt={cartNotificationData?.name || "Product"}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 tracking-tight leading-snug">
                      {cartNotificationData?.name || "Product"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-semibold text-black tracking-tight">
                        {formatPrice(cartNotificationData?.price || 0)}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        Qty: {cartNotificationData?.quantity || 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apple-style action buttons */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCartNotification(false)}
                    className="flex-1 py-2.5 px-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
                  >
                    Continue
                  </motion.button>
                  <Link href="/cart" className="flex-1">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2.5 px-3 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-xl transition-all duration-200"
                    >
                      View Cart ({cartItems.length})
                    </motion.button>
                  </Link>
                </div>
              </div>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowCartNotification(false)}
                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                <X className="w-3 h-3" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs with Apple styling */}
      <motion.div {...appleVariants.fadeInUp} className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center text-sm text-gray-600 overflow-x-auto">
            <Link
              href="/"
              className="flex items-center hover:text-black transition-colors duration-200 whitespace-nowrap"
            >
              <Home className="mr-1.5 h-3.5 w-3.5" />
              <span className="font-medium">Home</span>
            </Link>
            <ChevronRight className="mx-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <Link
              href="/products"
              className="hover:text-black transition-colors duration-200 whitespace-nowrap font-medium"
            >
              Products
            </Link>
            <ChevronRight className="mx-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-black truncate font-semibold">{product.name}</span>
          </nav>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Product Images and Details */}
          <motion.div {...appleVariants.slideIn} className="lg:col-span-8">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {/* Store Badge with refined styling */}
              <motion.div {...appleVariants.fadeInUp} className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex-shrink-0 border border-gray-200 rounded-xl p-2 bg-white shadow-sm">
                      <Image src="/logo.png" alt="Mizizzi Logo" fill className="object-contain" />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="inline-flex items-center px-2.5 py-1 bg-black text-white text-xs font-medium rounded-full"
                        >
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Official Store
                        </motion.div>
                        {product.is_flash_sale && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="inline-flex items-center px-2.5 py-1 bg-orange-500 text-white text-xs font-medium rounded-full animate-pulse"
                          >
                            <Zap className="h-2.5 w-2.5 mr-1" />
                            FLASH SALE
                          </motion.div>
                        )}
                        {product.is_luxury_deal && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="inline-flex items-center px-2.5 py-1 bg-purple-600 text-white text-xs font-medium rounded-full"
                          >
                            <Award className="h-2.5 w-2.5 mr-1" />
                            PREMIUM
                          </motion.div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-2 font-medium">
                        <span>Verified Seller</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          4.8 (2.1k reviews)
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleToggleWishlist}
                      className={cn(
                        "p-2.5 rounded-full transition-all duration-200",
                        isProductInWishlist
                          ? "text-red-500 bg-red-50"
                          : "text-gray-400 hover:text-red-500 hover:bg-red-50",
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isProductInWishlist && "fill-red-500")} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleShare}
                      className="p-2.5 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Share2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Product Title with Apple typography */}
              <motion.div {...appleVariants.fadeInUp} className="p-4 border-b border-gray-100">
                <h1 className="text-xl lg:text-2xl font-semibold text-black mb-3 tracking-tight leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {product.rating || 4.7} ({product.reviews?.length || 24} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-green-500" />
                    <span className="font-medium">Verified Quality</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Verified className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-medium">Authentic Product</span>
                  </div>
                </div>
              </motion.div>

              {/* Product Images with Apple-style interactions */}
              <motion.div {...appleVariants.scaleIn} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Thumbnails */}
                  <div className="hidden md:block md:col-span-2">
                    <div className="space-y-2">
                      {getProductImages(product).map((image: string, index: number) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "relative w-full aspect-square border-2 rounded-xl overflow-hidden transition-all duration-300",
                            selectedImage === index
                              ? "border-black shadow-lg ring-2 ring-black/10"
                              : "border-gray-200 hover:border-gray-300 hover:shadow-md",
                          )}
                          onClick={() => setSelectedImage(index)}
                        >
                          <Image
                            src={image || "/placeholder.svg"}
                            alt={`${product.name} - thumbnail ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 20vw, 10vw"
                            className="object-cover p-1"
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Main Image Display */}
                  <div className="md:col-span-10">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="relative border border-gray-200 rounded-2xl overflow-hidden bg-white cursor-zoom-in group shadow-sm"
                      style={{ height: "350px", minHeight: "350px" }}
                      ref={imageRef}
                      onClick={handleImageClick}
                    >
                      <Image
                        src={getProductImageUrl(product, selectedImage) || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
                        className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                        priority
                      />

                      {/* Navigation arrows with Apple styling */}
                      {getProductImages(product).length > 1 && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.95)" }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                            onClick={(e) => {
                              e.stopPropagation()
                              const images = getProductImages(product)
                              setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                            }}
                          >
                            <ArrowLeft className="h-4 w-4 text-gray-700" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.95)" }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                            onClick={(e) => {
                              e.stopPropagation()
                              const images = getProductImages(product)
                              setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                            }}
                          >
                            <ArrowRight className="h-4 w-4 text-gray-700" />
                          </motion.button>
                        </>
                      )}

                      {/* Enhanced zoom hint */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute bottom-4 right-4 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1.5 backdrop-blur-sm"
                      >
                        <Maximize2 className="h-3 w-3" />
                        Click for HD zoom
                      </motion.div>

                      {/* Discount badge */}
                      {discountPercentage > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, ...appleSpring }}
                          className="absolute top-4 left-4 bg-red-500 text-white text-base font-semibold px-3 py-1.5 rounded-xl shadow-lg"
                        >
                          -{discountPercentage}%
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Mobile Thumbnails */}
                    <div className="md:hidden mt-4">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {getProductImages(product).map((image: string, index: number) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "relative w-14 h-14 flex-shrink-0 border-2 rounded-xl overflow-hidden transition-all duration-300",
                              selectedImage === index
                                ? "border-black shadow-md ring-2 ring-black/10"
                                : "border-gray-200 hover:border-gray-300",
                            )}
                            onClick={() => setSelectedImage(index)}
                          >
                            <Image
                              src={image || "/placeholder.svg"}
                              alt={`Thumbnail ${index + 1}`}
                              fill
                              className="object-cover p-1"
                            />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share buttons with Apple styling */}
                <motion.div {...appleVariants.fadeInUp} className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold mb-3 text-gray-900 tracking-tight">SHARE THIS PRODUCT</p>
                  <div className="flex gap-2">
                    {[
                      {
                        name: "Facebook",
                        color: "bg-blue-600 hover:bg-blue-700",
                        url: `https://www.facebook.com/sharer/sharer.php?u=${typeof window !== "undefined" ? window.location.href : ""}`,
                      },
                      {
                        name: "Twitter",
                        color: "bg-blue-400 hover:bg-blue-500",
                        url: `https://twitter.com/intent/tweet?url=${typeof window !== "undefined" ? window.location.href : ""}`,
                      },
                      {
                        name: "WhatsApp",
                        color: "bg-green-600 hover:bg-green-700",
                        url: `https://api.whatsapp.com/send?text=${product.name} ${typeof window !== "undefined" ? window.location.href : ""}`,
                      },
                    ].map((social, index) => (
                      <motion.button
                        key={social.name}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-3 py-2 text-white text-sm font-medium rounded-xl transition-all duration-200 ${social.color} shadow-sm`}
                        onClick={() => window.open(social.url, "_blank")}
                      >
                        {social.name}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Product Tabs with Apple design */}
            <motion.div
              {...appleVariants.fadeInUp}
              className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
              <Tabs defaultValue="product-details" className="w-full">
                <TabsList className="w-full rounded-none bg-gray-50/50 border-b border-gray-100 h-auto p-0">
                  {[
                    { value: "product-details", label: "Product Details" },
                    { value: "specifications", label: "Specifications" },
                    { value: "customer-feedback", label: `Reviews (${product.reviews?.length || 24})` },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-white rounded-none py-3 font-semibold text-sm tracking-tight transition-all duration-200"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="product-details" className="p-6">
                  <motion.div {...appleVariants.fadeInUp} className="space-y-6">
                    {/* Product Images in Description */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {getProductImages(product)
                        .slice(0, 4)
                        .map((image: string, index: number) => (
                          <motion.div
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            className="relative aspect-square border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                          >
                            <Image
                              src={image || "/placeholder.svg"}
                              alt={`${product.name} - detail ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </motion.div>
                        ))}
                    </div>

                    <div className="prose max-w-none">
                      {product.description ? (
                        <div dangerouslySetInnerHTML={{ __html: product.description }} />
                      ) : (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-black mb-3 tracking-tight">
                              Product Description
                            </h3>
                            <p className="text-gray-700 leading-relaxed text-sm">
                              {product.name} is a high-quality product designed to meet your needs. This item features
                              excellent craftsmanship and attention to detail, ensuring you receive a product that
                              exceeds your expectations.
                            </p>
                          </div>

                          <div>
                            <h4 className="text-base font-semibold text-black mb-3 tracking-tight">Key Features</h4>
                            <ul className="space-y-2">
                              {(
                                product.features || [
                                  "High-quality construction",
                                  "Durable materials",
                                  "Easy to use",
                                  "Reliable performance",
                                  "Great value for money",
                                ]
                              ).map((feature: string, index: number) => (
                                <motion.li
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex items-start gap-2.5"
                                >
                                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700 text-sm font-medium">{feature}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="text-base font-semibold text-black mb-3 tracking-tight">
                              What's in the Box
                            </h4>
                            <ul className="space-y-2">
                              {(
                                product.package_contents || [`1 x ${product.name}`, "User Manual", "Warranty Card"]
                              ).map((item: string, index: number) => (
                                <motion.li
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex items-start gap-2.5"
                                >
                                  <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700 text-sm font-medium">{item}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="specifications" className="p-6">
                  <motion.div {...appleVariants.fadeInUp}>
                    <h2 className="text-base font-semibold mb-6 text-black tracking-tight">Technical Specifications</h2>
                    <div className="space-y-4">
                      {specifications.map((spec, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                        >
                          <div className="bg-gray-50/50 p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-black text-sm tracking-tight">{spec.category}</h3>
                          </div>
                          <div className="p-4 bg-white">
                            <div className="grid grid-cols-1 gap-3">
                              {spec.items.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="text-sm font-medium text-gray-700 tracking-tight">{item.label}</span>
                                  <span className="text-sm text-gray-600 font-medium">{String(item.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="customer-feedback" className="p-6">
                  <motion.div {...appleVariants.fadeInUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <h2 className="text-base font-semibold mb-4 text-black tracking-tight">Customer Reviews</h2>
                      <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="text-2xl font-semibold text-black tracking-tight">
                            {product.reviews && product.reviews.length > 0
                              ? calculateAverageRating(product.reviews)
                              : "0.0"}
                          </div>
                          <div className="flex-1">
                            <div className="flex mb-1.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={
                                    i <
                                    Math.floor(
                                      Number(
                                        product.reviews && product.reviews.length > 0
                                          ? calculateAverageRating(product.reviews)
                                          : 0,
                                      ),
                                    )
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }
                                />
                              ))}
                            </div>
                            <p className="text-sm text-gray-600 font-medium">
                              Based on {product.reviews?.length || 0} reviews
                            </p>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-2.5 px-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-all duration-200 text-sm"
                          onClick={() => setShowReviewForm(!showReviewForm)}
                        >
                          Write a Review
                        </motion.button>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      {/* Review form */}
                      <AnimatePresence>
                        {showReviewForm && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="mb-6 border border-gray-200 rounded-xl p-4 bg-gray-50/50"
                          >
                            <h4 className="font-semibold mb-3 text-sm tracking-tight">Write Your Review</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm mb-1.5 font-medium text-gray-700">Rating</label>
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <motion.button
                                      key={rating}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="text-gray-300 hover:text-yellow-400 transition-colors duration-200"
                                    >
                                      <Star size={20} className="fill-current" />
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm mb-1.5 font-medium text-gray-700">Review Title</label>
                                <input
                                  type="text"
                                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm transition-all duration-200"
                                  placeholder="Summarize your experience"
                                />
                              </div>
                              <div>
                                <label className="block text-sm mb-1.5 font-medium text-gray-700">Your Review</label>
                                <textarea
                                  className="w-full p-3 border border-gray-200 rounded-xl min-h-[100px] focus:ring-2 focus:ring-black focus:border-black text-sm transition-all duration-200"
                                  placeholder="What did you like or dislike about this product?"
                                ></textarea>
                              </div>
                              <div className="flex justify-end gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => setShowReviewForm(false)}
                                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-all duration-200 text-sm"
                                >
                                  Cancel
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-xl font-medium transition-all duration-200 text-sm"
                                >
                                  Submit Review
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Reviews list */}
                      {product.reviews && product.reviews.length > 0 ? (
                        <div className="space-y-4">
                          {product.reviews
                            .slice(0, showAllReviews ? undefined : 3)
                            .map((review: any, index: number) => (
                              <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="border border-gray-200 p-4 rounded-xl bg-white shadow-sm"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                      <span className="font-semibold text-gray-600 text-sm">
                                        {review.user?.first_name ? review.user.first_name.charAt(0).toUpperCase() : "U"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-black text-sm tracking-tight">
                                        {review.user?.first_name || "Anonymous User"}
                                      </span>
                                      {review.is_verified_purchase && (
                                        <div className="inline-flex items-center ml-2 px-2 py-0.5 text-green-600 border border-green-200 bg-green-50 text-xs font-medium rounded-full">
                                          <Check className="h-2.5 w-2.5 mr-1" /> Verified Purchase
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-sm text-gray-500 font-medium">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </span>
                                </div>

                                <div className="flex items-center mb-3">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={14}
                                      className={
                                        i < review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "fill-gray-200 text-gray-200"
                                      }
                                    />
                                  ))}
                                </div>

                                {review.title && (
                                  <h4 className="font-semibold text-black mb-2 text-sm tracking-tight">
                                    {review.title}
                                  </h4>
                                )}

                                <p className="text-sm text-gray-700 mb-3 leading-relaxed font-medium">
                                  {review.comment}
                                </p>

                                <div className="flex items-center justify-between text-sm text-gray-500">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1.5 hover:text-gray-700 transition-colors duration-200 font-medium"
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                    Helpful ({review.likes_count || 0})
                                  </motion.button>
                                </div>
                              </motion.div>
                            ))}

                          {product.reviews.length > 3 && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="mt-4 text-black p-0 h-auto font-semibold text-sm tracking-tight hover:text-gray-700 transition-colors duration-200"
                              onClick={() => setShowAllReviews(!showAllReviews)}
                            >
                              {showAllReviews ? "Show less reviews" : "Show all reviews"}
                            </motion.button>
                          )}
                        </div>
                      ) : (
                        <motion.div {...appleVariants.fadeInUp} className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <Star className="h-6 w-6 text-gray-400" />
                          </div>
                          <h3 className="text-base font-semibold text-black mb-2 tracking-tight">No reviews yet</h3>
                          <p className="text-gray-600 mb-4 text-sm font-medium">Be the first to review this product</p>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-xl font-medium transition-all duration-200 text-sm"
                            onClick={() => setShowReviewForm(true)}
                          >
                            Write the first review
                          </motion.button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Recently Viewed Products */}
            {recentlyViewed.length > 0 && (
              <motion.div
                {...appleVariants.fadeInUp}
                className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
              >
                <h3 className="font-semibold mb-4 text-black text-base tracking-tight">Recently Viewed</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {recentlyViewed.map((item, index) => (
                    <Link href={`/product/${item.slug || item.id}`} key={index} className="group">
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="relative aspect-square mb-2 overflow-hidden rounded-xl border border-gray-200 shadow-sm"
                      >
                        <Image
                          src={item.image || item.thumbnail_url || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg"
                          }}
                        />
                      </motion.div>
                      <h4 className="text-sm font-medium line-clamp-2 h-8 group-hover:text-black transition-colors duration-200 tracking-tight">
                        {item.name}
                      </h4>
                      <p className="text-sm font-semibold text-black mt-1 tracking-tight">{formatPrice(item.price)}</p>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <motion.div
                {...appleVariants.fadeInUp}
                className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-black text-base tracking-tight">You Might Also Like</h3>
                  <Link
                    href="/products"
                    className="text-sm text-black hover:text-gray-700 font-medium tracking-tight transition-colors duration-200"
                  >
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {relatedProducts.slice(0, 6).map((relatedProduct, index) => (
                    <Link href={`/product/${relatedProduct.id}`} key={index} className="group">
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="relative aspect-square mb-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm"
                      >
                        <Image
                          src={getProductImageUrl(relatedProduct) || "/placeholder.svg"}
                          alt={relatedProduct.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {relatedProduct.sale_price && relatedProduct.sale_price < relatedProduct.price && (
                          <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-lg font-semibold">
                            -
                            {Math.round(
                              ((relatedProduct.price - relatedProduct.sale_price) / relatedProduct.price) * 100,
                            )}
                            %
                          </div>
                        )}
                      </motion.div>
                      <h4 className="text-sm font-medium line-clamp-2 h-8 group-hover:text-black transition-colors duration-200 tracking-tight">
                        {relatedProduct.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-sm font-semibold text-black tracking-tight">
                          {formatPrice(relatedProduct.sale_price || relatedProduct.price)}
                        </p>
                        {relatedProduct.sale_price && relatedProduct.sale_price < relatedProduct.price && (
                          <p className="text-sm text-gray-400 line-through">{formatPrice(relatedProduct.price)}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Price, Cart, Delivery */}
          <motion.div {...appleVariants.slideIn} className="lg:col-span-4">
            <div className="sticky top-4 space-y-4">
              {/* Price Card with Apple styling */}
              <motion.div
                whileHover={{ y: -1 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl font-semibold text-black tracking-tight">
                      {formatPrice(currentPrice)}
                    </span>
                    {currentPrice < originalPrice && (
                      <span className="text-gray-500 line-through text-lg font-medium">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                    {discountPercentage > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, ...appleSpring }}
                        className="bg-red-500 text-white font-semibold px-2.5 py-1 text-sm rounded-full"
                      >
                        -{discountPercentage}%
                      </motion.div>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 mb-4 font-medium">
                    <span>Delivery from KSh 150 | Free delivery on orders over KSh 3,000</span>
                  </div>

                  {/* Real Stock Status with Apple Design */}
                  <motion.div
                    {...appleVariants.fadeInUp}
                    className={cn(
                      "inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl border mb-4 transition-all duration-300",
                      stockDisplay.className,
                    )}
                  >
                    <stockDisplay.icon className={cn("h-4 w-4 mr-2", stockDisplay.iconClassName)} />
                    {stockDisplay.text}
                    {inventoryData?.last_updated && (
                      <span className="ml-2 text-xs opacity-75">
                        • Updated {new Date(inventoryData.last_updated).toLocaleTimeString()}
                      </span>
                    )}
                  </motion.div>

                  {/* Shipping Info */}
                  <div className="space-y-3 mb-6">
                    {[
                      { icon: Truck, title: "Standard Delivery", desc: "2-5 business days to major cities" },
                      { icon: Clock, title: "Express Delivery", desc: "Next day delivery available in selected areas" },
                      { icon: RefreshCw, title: "Return Policy", desc: "14-day return policy for unopened items" },
                    ].map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100"
                      >
                        <item.icon className="h-4 w-4 mt-0.5 text-gray-600" />
                        <div>
                          <p className="font-semibold text-black text-sm tracking-tight">{item.title}</p>
                          <p className="text-sm text-gray-600 font-medium">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Variant Selection */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="mb-6 space-y-4">
                      {/* Color Selection */}
                      {Array.from(new Set(product.variants.map((v: any) => v.color))).filter(Boolean).length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-black tracking-tight">Color</label>
                          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                            {(Array.from(new Set(product.variants.map((v: any) => v.color))) as string[])
                              .filter(Boolean)
                              .map((color, index) => {
                                const isSelected = selectedVariant?.color === color
                                return (
                                  <motion.button
                                    key={index}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                      "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 text-sm font-medium",
                                      isSelected
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                                    )}
                                    onClick={() => {
                                      const variantWithColor = product.variants.find((v: any) => v.color === color)
                                      if (variantWithColor) handleVariantSelection(variantWithColor)
                                    }}
                                  >
                                    {color}
                                  </motion.button>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* Size Selection */}
                      {Array.from(new Set(product.variants.map((v: any) => v.size))).filter(Boolean).length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-black tracking-tight">Size</label>
                          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                            {(Array.from(new Set(product.variants.map((v: any) => v.size))) as string[])
                              .filter(Boolean)
                              .map((size, index) => {
                                const isSelected = selectedVariant?.size === size
                                return (
                                  <motion.button
                                    key={index}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                      "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 text-sm font-medium",
                                      isSelected
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                                    )}
                                    onClick={() => {
                                      const variantWithSize = product.variants.find((v: any) => v.size === size)
                                      if (variantWithSize) handleVariantSelection(variantWithSize)
                                    }}
                                  >
                                    {size}
                                  </motion.button>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quantity Selection with Real Stock Limits */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2 text-black tracking-tight">Quantity</label>
                    <div className="flex items-center border border-gray-300 rounded-xl w-fit overflow-hidden">
                      <motion.button
                        whileHover={{ backgroundColor: "rgb(243, 244, 246)" }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </motion.button>

                      <div className="w-12 h-10 flex items-center justify-center border-x border-gray-300 bg-white">
                        <span className="font-semibold text-black text-sm">{quantity}</span>
                      </div>

                      {/* In the quantity selection section, update the max quantity button logic: */}
                      <motion.button
                        whileHover={{ backgroundColor: "rgb(243, 244, 246)" }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() =>
                          setQuantity((prev) => Math.min(inventoryData?.available_quantity || 0, prev + 1))
                        }
                        disabled={!inventoryData?.is_in_stock || quantity >= (inventoryData?.available_quantity || 0)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                    {inventoryData && inventoryData.available_quantity > 0 && (
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Maximum available: {inventoryData.available_quantity}
                      </p>
                    )}
                  </div>

                  {/* Add to Cart Button - Apple Style with Real Stock Validation */}
                  <motion.button
                    whileHover={{ scale: isAddingToCart || !inventoryData?.is_in_stock ? 1 : 1.02 }}
                    whileTap={{ scale: isAddingToCart || !inventoryData?.is_in_stock ? 1 : 0.98 }}
                    className={cn(
                      "w-full text-white font-semibold py-3.5 mb-3 transition-all duration-200 text-sm rounded-xl shadow-sm",
                      isAddingToCart
                        ? "bg-gray-400 cursor-not-allowed"
                        : !inventoryData?.is_in_stock
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-black hover:bg-gray-800 active:bg-gray-900",
                    )}
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || !inventoryData?.is_in_stock}
                  >
                    {isAddingToCart ? (
                      <div className="flex items-center justify-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>ADDING TO CART...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        <span>{!inventoryData?.is_in_stock ? "OUT OF STOCK" : "ADD TO CART"}</span>
                      </div>
                    )}
                  </motion.button>

                  {/* Payment Options */}
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold mb-3 text-black tracking-tight">Secure Payment Options</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span className="font-medium">Visa, Mastercard, M-Pesa, Airtel Money</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add inventory status indicators in the product info section: */}
      {inventoryData && inventoryData.available_quantity > 0 && inventoryData.available_quantity <= 10 && (
        <motion.div {...appleVariants.fadeInUp} className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              Only {inventoryData.available_quantity} left in stock - order soon!
            </p>
          </div>
        </motion.div>
      )}

      {inventoryData && inventoryData.last_updated && (
        <p className="text-xs text-gray-500 mt-2">
          Stock updated: {new Date(inventoryData.last_updated).toLocaleString()}
        </p>
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        product={product}
        isOpen={isImageZoomModalOpen}
        onClose={() => setIsImageZoomModalOpen(false)}
        selectedImageIndex={zoomSelectedImage}
      />
    </div>
  )
}

function generateMockReviews() {
  return [
    {
      id: 1,
      rating: 5,
      reviewer_name: "Jane Doe",
      comment:
        "Excellent product! I love the quality and design. The material feels premium and it's exactly as described. Shipping was fast and the packaging was secure. I would definitely recommend this to anyone looking for a high-quality item. The customer service was also very responsive when I had questions.",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: true,
      helpful_count: 12,
    },
    {
      id: 2,
      rating: 4,
      reviewer_name: "John Smith",
      comment:
        "Good value for money. The product works as expected and the build quality is solid. Delivery was on time and the item was well-packaged. Only minor issue is that it's slightly smaller than I expected, but overall I'm satisfied with the purchase.",
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: true,
      helpful_count: 8,
    },
    {
      id: 3,
      rating: 5,
      reviewer_name: "Sarah Wilson",
      comment:
        "Amazing quality! This exceeded my expectations. The attention to detail is impressive and it feels very durable. I've been using it for a few weeks now and it's holding up perfectly. The color is exactly as shown in the pictures. Highly recommended!",
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: true,
      helpful_count: 15,
    },
    {
      id: 4,
      rating: 3,
      reviewer_name: "Mike Johnson",
      comment:
        "It's okay, but not exceptional. The product does what it's supposed to do, but I was expecting a bit more for the price. The quality is decent but there are some minor flaws in the finish. Shipping was fast though.",
      date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: false,
      helpful_count: 3,
    },
    {
      id: 5,
      rating: 5,
      reviewer_name: "Emily Chen",
      comment:
        "Perfect! This is exactly what I was looking for. The quality is outstanding and it arrived quickly. The seller was very helpful with my questions before purchase. I'm so happy with this buy and will definitely shop here again.",
      date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: true,
      helpful_count: 9,
    },
  ]
}
