"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Truck,
  Clock,
  ChevronRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Heart,
  Tag,
  ShoppingBasket,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice, formatCurrency } from "@/lib/utils"
import { CartItem } from "@/components/cart/cart-item"
import { toast } from "@/components/ui/use-toast"
import { productService } from "@/services/product"
import type { Product } from "@/types"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useCartValidation } from "@/hooks/use-cart-validation"
import { Badge } from "@/components/ui/badge"
import { useWishlistHook } from "@/hooks/use-wishlist"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CartItem as CartItemType } from "@/services/cart-service"
import { cleanupCartData, forceCleanCart, isCartDataCorrupted, autoCleanupOnLoad } from "@/lib/cart-cleanup"
import { CartCorruptionDetector } from "@/components/cart/cart-corruption-detector"

// Define the custom event interface
interface CartItemUpdatedEvent extends CustomEvent {
  detail: {
    productId: number
    variantId?: number
    newQuantity: number
    availableStock: number
  }
}

export default function CartPage() {
  const {
    items,
    subtotal,
    shipping,
    total,
    clearCart,
    applyCoupon,
    validation,
    refreshCart,
    isLoading,
    pendingOperations,
    cart,
  } = useCart()
  const { validateCart, isValidating, validationResult } = useCartValidation()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearingCart, setIsClearingCart] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [processingItems, setProcessingItems] = useState<Record<number, boolean>>({})
  const [pageLoading, setPageLoading] = useState(true)
  const [isCartEmpty, setIsCartEmpty] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [isValidatingCart, setIsValidatingCart] = useState(false)
  const [stockIssues, setStockIssues] = useState<any[]>([])
  const [priceChanges, setPriceChanges] = useState<any[]>([])
  const [invalidItems, setInvalidItems] = useState<any[]>([])
  const [isSavingAllToWishlist, setIsSavingAllToWishlist] = useState(false)
  const [dataCorruption, setDataCorruption] = useState(false)
  const router = useRouter()
  const { wishlist, addToWishlist, removeFromWishlist, isUpdating: isWishlistUpdating } = useWishlistHook()

  // Ref to track if initial load is complete
  const initialLoadComplete = useRef(false)
  const refreshingRef = useRef(false)
  const cleanupPerformed = useRef(false)
  const corruptionCheckCount = useRef(0)
  const lastCorruptionCheck = useRef<number>(0)

  // Determine if there's a coupon applied
  const hasCoupon = cart?.coupon_code && (cart.discount ?? 0) > 0

  // Determine if there's a discount
  const hasDiscount = (cart?.discount ?? 0) > 0

  // Apple-style spring animation config - more subtle
  const springConfig = {
    type: "spring",
    stiffness: 250,
    damping: 25,
  }

  // Auto-cleanup cart data on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !cleanupPerformed.current) {
      cleanupPerformed.current = true
      autoCleanupOnLoad()
    }
  }, [])

  // Listen for cleanup notifications
  useEffect(() => {
    const handleCleanupNotification = (event: CustomEvent) => {
      const { message } = event.detail
      toast({
        title: "Cart Updated",
        description: message,
        variant: "default",
      })
    }

    window.addEventListener("cart:cleanup-notification", handleCleanupNotification as EventListener)

    return () => {
      window.removeEventListener("cart:cleanup-notification", handleCleanupNotification as EventListener)
    }
  }, [])

  // Handle corruption detection
  const handleCorruptionDetected = () => {
    setDataCorruption(true)
  }

  const handleCleanupComplete = () => {
    setDataCorruption(false)
    refreshCart()
  }

  // Modify the useEffect that handles initial loading to better handle cart state
  useEffect(() => {
    setMounted(true)

    // Set a timeout only for the initial page load
    const timer = setTimeout(() => {
      if (!isLoading && !dataCorruption) {
        setPageLoading(false)
        initialLoadComplete.current = true
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [isLoading, dataCorruption])

  // Modify the useEffect that validates the cart to handle errors better
  useEffect(() => {
    if (mounted && !refreshingRef.current && !dataCorruption && initialLoadComplete.current) {
      const validateCartItems = async () => {
        // Check if user is authenticated first
        const token = localStorage.getItem("mizizzi_token")
        if (!token || token === "null" || token === "undefined") {
          console.log("User not authenticated, skipping server-side cart validation")
          setPageLoading(false)
          setIsValidatingCart(false)
          setLastRefreshed(new Date())
          return
        }

        // Prevent multiple simultaneous validations
        if (isValidatingCart) {
          return
        }

        setIsValidatingCart(true)
        try {
          // First ensure cart is refreshed - with error handling
          if (!initialLoadComplete.current) {
            try {
              await refreshCart()
              initialLoadComplete.current = true
            } catch (err) {
              console.warn("Error refreshing cart, will continue with validation:", err)
            }
          }

          // Wait a moment to ensure cart data is stable
          await new Promise((resolve) => setTimeout(resolve, 1000)) // Increased from 800ms

          // Then validate the cart with proper error handling - but only once
          let result
          try {
            result = await validateCart()
          } catch (error) {
            console.error("Error validating cart:", error)
            result = {
              isValid: true,
              stockIssues: [],
              priceChanges: [],
              invalidItems: [],
              errors: [],
              warnings: [],
            }
          }

          // Update state with validation results
          if (result) {
            setStockIssues(result.stockIssues || [])
            setPriceChanges(result.priceChanges || [])
            setInvalidItems(result.invalidItems || [])
          }
        } catch (error) {
          console.error("Error in cart validation flow:", error)
        } finally {
          setPageLoading(false)
          setIsValidatingCart(false)
          setLastRefreshed(new Date())
        }
      }

      // Only validate once per mount and add debouncing
      if (!pageLoading) {
        // Add a longer delay to prevent excessive calls
        const validationTimer = setTimeout(() => {
          validateCartItems()
        }, 2000) // 2 second delay

        return () => clearTimeout(validationTimer)
      }
    }
  }, [mounted, dataCorruption]) // Keep minimal dependencies

  // Add this after the existing useEffect hooks, around line 150

  // Improved duplicate detection and corruption handling
  useEffect(() => {
    if (mounted && items && items.length > 0) {
      console.log("Cart items updated:", items)

      // Prevent infinite loops by limiting corruption checks
      const now = Date.now()
      if (now - lastCorruptionCheck.current < 15000) {
        // Increased from 10 seconds to 15 seconds
        return
      }

      corruptionCheckCount.current++
      if (corruptionCheckCount.current > 1) {
        // Reduced from 2 to 1 check
        console.log("Corruption check limit reached, stopping checks")
        return
      }

      lastCorruptionCheck.current = now

      // CRITICAL: Check for duplicate items with same product_id and variant_id
      const duplicateItems = items.filter(
        (item, index, arr) =>
          arr.findIndex((other) => other.product_id === item.product_id && other.variant_id === item.variant_id) !==
          index,
      )

      if (duplicateItems.length > 0) {
        console.warn("Detected duplicate items in cart:", duplicateItems)

        // Remove duplicates by keeping only the first occurrence of each product+variant combination
        const uniqueItems = items.filter(
          (item, index, arr) =>
            arr.findIndex((other) => other.product_id === item.product_id && other.variant_id === item.variant_id) ===
            index,
        )

        console.log("Removing duplicates, keeping unique items:", uniqueItems)

        // Force update with unique items
        const result = cleanupCartData()
        if (result.success) {
          toast({
            title: "Cart Data Fixed",
            description: "Duplicate items have been removed from your cart",
            variant: "default",
          })
        }

        // Update localStorage with unique items
        if (typeof window !== "undefined") {
          localStorage.setItem("cartItems", JSON.stringify(uniqueItems))
        }

        // Force refresh the cart with a longer delay
        setTimeout(() => {
          refreshCart().finally(() => {
            setDataCorruption(false)
          })
        }, 5000) // Increased delay to 5 seconds

        return
      }

      // Check for any remaining corruption in items - more conservative but less frequent
      const hasCorruption = items.some((item) => {
        if (!item || typeof item !== "object") return true

        const priceStr = String(item.price || 0)
        const quantityStr = String(item.quantity || 0)
        const totalStr = String(item.total || 0)

        return (
          priceStr.includes("e+") ||
          quantityStr.includes("e+") ||
          totalStr.includes("e+") ||
          item.price > 1000000000 || // More conservative: 1B instead of 100M
          item.quantity > 50000 || // More conservative: 50k instead of 10k
          item.total > 10000000000 || // More conservative: 10B instead of 1B
          isNaN(item.price) ||
          isNaN(item.quantity) ||
          isNaN(item.total) ||
          item.quantity <= 0 ||
          item.price < 0 ||
          !isFinite(item.price) ||
          !isFinite(item.quantity) ||
          !isFinite(item.total)
        )
      })

      if (hasCorruption) {
        console.warn("Detected corruption in cart items, running cleanup...")
        setDataCorruption(true)

        // Force cleanup and refresh
        const result = cleanupCartData()
        if (result.success) {
          toast({
            title: "Cart Data Fixed",
            description: "Corrupted cart data has been cleaned up",
            variant: "default",
          })
        } else {
          forceCleanCart()
          toast({
            title: "Cart Reset",
            description: "Your cart was reset due to data corruption",
            variant: "destructive",
          })
        }

        // Force refresh the cart with a longer delay
        setTimeout(() => {
          refreshCart().finally(() => {
            setDataCorruption(false)
          })
        }, 5000) // Increased delay to 5 seconds
      }
    }
  }, [items, mounted]) // Removed refreshCart from dependencies to prevent loops

  // Add a debug log to check items when they change - with more aggressive cleanup but prevent infinite loops
  useEffect(() => {
    if (mounted && items && items.length > 0) {
      console.log("Cart items updated:", items)

      // Prevent infinite loops by limiting corruption checks
      const now = Date.now()
      if (now - lastCorruptionCheck.current < 10000) {
        // Don't check more than once every 10 seconds
        return
      }

      corruptionCheckCount.current++
      if (corruptionCheckCount.current > 2) {
        // Don't check more than 2 times
        console.log("Corruption check limit reached, stopping checks")
        return
      }

      lastCorruptionCheck.current = now

      // CRITICAL: Check for duplicate items with same product_id and variant_id
      const duplicateItems = items.filter(
        (item, index, arr) =>
          arr.findIndex((other) => other.product_id === item.product_id && other.variant_id === item.variant_id) !==
          index,
      )

      if (duplicateItems.length > 0) {
        console.warn("Detected duplicate items in cart:", duplicateItems)

        // Remove duplicates by keeping only the first occurrence of each product+variant combination
        const uniqueItems = items.filter(
          (item, index, arr) =>
            arr.findIndex((other) => other.product_id === item.product_id && other.variant_id === item.variant_id) ===
            index,
        )

        console.log("Removing duplicates, keeping unique items:", uniqueItems)

        // Force update with unique items
        const result = cleanupCartData()
        if (result.success) {
          toast({
            title: "Cart Data Fixed",
            description: "Duplicate items have been removed from your cart",
            variant: "default",
          })
        }

        // Update localStorage with unique items
        if (typeof window !== "undefined") {
          localStorage.setItem("cartItems", JSON.stringify(uniqueItems))
        }

        // Force refresh the cart with a longer delay
        setTimeout(() => {
          refreshCart().finally(() => {
            setDataCorruption(false)
          })
        }, 3000) // Increased delay to 3 seconds

        return
      }

      // Check for any remaining corruption in items - more comprehensive check
      const hasCorruption = items.some((item) => {
        const priceStr = item.price?.toString() || ""
        const quantityStr = item.quantity?.toString() || ""
        const totalStr = item.total?.toString() || ""

        return (
          priceStr.includes("e") ||
          quantityStr.includes("e") ||
          totalStr.includes("e") ||
          item.price > 999999999 ||
          item.quantity > 100 || // More aggressive quantity check
          item.total > 999999999 ||
          isNaN(item.price) ||
          isNaN(item.quantity) ||
          isNaN(item.total) ||
          item.quantity <= 0 ||
          item.price < 0
        )
      })

      if (hasCorruption) {
        console.warn("Detected corruption in cart items, running immediate cleanup...")
        setDataCorruption(true)

        // Force cleanup and refresh
        const result = cleanupCartData()
        if (result.success) {
          toast({
            title: "Cart Data Fixed",
            description: "Corrupted cart data has been cleaned up",
            variant: "default",
          })
        } else {
          forceCleanCart()
          toast({
            title: "Cart Reset",
            description: "Your cart was reset due to data corruption",
            variant: "destructive",
          })
        }

        // Force refresh the cart with a longer delay
        setTimeout(() => {
          refreshCart().finally(() => {
            setDataCorruption(false)
          })
        }, 3000) // Increased delay to 3 seconds
      }
    }
  }, [items, mounted]) // Removed refreshCart from dependencies to prevent loops

  // Fetch recommended products based on cart items
  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      if (!items.length || !mounted || dataCorruption) return

      setIsLoadingRecommendations(true)
      try {
        // Get product IDs from cart items
        const productIds = items.map((item) => item.product_id)

        // Fetch recommended products based on cart items
        const products = await productService
          .getProducts({
            limit: 6,
            is_featured: true,
            exclude_ids: productIds.join(","),
          })
          .catch(() => [])

        setRecommendedProducts(products || [])
      } catch (error) {
        console.error("Failed to fetch recommended products:", error)
      } finally {
        setIsLoadingRecommendations(false)
      }
    }

    if (mounted && items.length > 0 && !pageLoading && !dataCorruption) {
      fetchRecommendedProducts()
    }
  }, [items, mounted, pageLoading, dataCorruption])

  const handleClearCart = async () => {
    setIsClearingCart(true)
    try {
      await clearCart()
      // Also clear localStorage to prevent corruption
      forceCleanCart()
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      })
    } catch (error) {
      console.error("Failed to clear cart:", error)
      // Force clear if normal clear fails
      forceCleanCart()
      toast({
        title: "Cart cleared",
        description: "Your cart has been cleared",
      })
    } finally {
      setIsClearingCart(false)
    }
  }

  // Update the handleItemAction function to better handle item updates
  const handleItemAction = (action: "update" | "remove", itemId: number) => {
    // Ensure itemId is a valid number
    if (typeof itemId !== "number" || isNaN(itemId)) {
      console.error("Invalid item ID:", itemId)
      return
    }

    // Mark item as processing
    setProcessingItems((prev) => ({
      ...prev,
      [itemId]: true,
    }))

    // After a short delay, refresh the cart and remove the processing state
    setTimeout(() => {
      refreshCart()
        .then(() => {
          setProcessingItems((prev) => ({
            ...prev,
            [itemId]: false,
          }))

          // Re-validate cart after update
          validateCart()
            .then((result) => {
              if (result) {
                setStockIssues(result.stockIssues || [])
                setPriceChanges(result.priceChanges || [])
                setInvalidItems(result.invalidItems || [])
              }
            })
            .catch((error) => {
              console.error("Error validating cart after update:", error)
            })
        })
        .catch((error) => {
          console.error("Error refreshing cart after item action:", error)
          setProcessingItems((prev) => ({
            ...prev,
            [itemId]: false,
          }))
        })
    }, 300)
  }

  // Add this new function for "Save All for Later"
  const handleSaveAllToWishlist = async () => {
    if (items.length === 0 || isSavingAllToWishlist) return

    setIsSavingAllToWishlist(true)

    try {
      // Create an array of promises to add each item to wishlist
      const savePromises = items.map(async (item) => {
        // Only try to save items with valid product IDs
        if (item.product_id !== null && item.product_id !== undefined) {
          try {
            // Check if the item is already in the wishlist
            const isInWishlist = wishlist.some((wishlistItem) => wishlistItem.id === item.product_id)
            if (!isInWishlist) {
              await addToWishlist(item.product_id, {
                name: item.product?.name || `Product ${item.product_id}`,
                slug: item.product?.slug || `product-${item.product_id}`,
                price: item.price, // Use item.price instead of item.product?.price
                sale_price: undefined, // Set undefined as fallback
                thumbnail_url: item.product?.thumbnail_url || item.product?.image_urls?.[0] || "/placeholder.svg",
                image_urls: item.product?.image_urls || [item.product?.thumbnail_url || "/placeholder.svg"],
              })
            }
          } catch (err) {
            console.error(`Failed to save item ${item.product_id} to wishlist:`, err)
          }
        }
      })

      // Wait for all save operations to complete
      await Promise.all(savePromises)

      // Show success message
      toast({
        title: "Items Saved",
        description: "All items have been saved to your wishlist",
      })

      // Clear the cart after saving all items
      await clearCart()
    } catch (error) {
      console.error("Error saving all items to wishlist:", error)
      toast({
        title: "Error",
        description: "There was a problem saving your items. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingAllToWishlist(false)
    }
  }

  // Update the handleApplyCoupon function to better handle backend validation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsApplyingCoupon(true)

    try {
      const success = await applyCoupon(couponCode)
      if (success) {
        setCouponCode("")
        toast({
          title: "Coupon Applied",
          description: "Your coupon has been applied successfully",
        })
      }
    } catch (error: any) {
      console.error("Failed to apply coupon:", error)

      // Check for specific error types from backend validation
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors
        toast({
          title: "Invalid Coupon",
          description: errors[0]?.message || "Failed to apply coupon. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Invalid Coupon",
          description: "Failed to apply coupon. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  // Update the cart page to properly handle stock validation updates

  // Add this near the top of the component, after the useState declarations
  useEffect(() => {
    // Listen for cart item updates to refresh validation
    const handleCartItemUpdated = (event: Event) => {
      // Cast the event to our custom event type
      const customEvent = event as CartItemUpdatedEvent
      const { productId, variantId, newQuantity, availableStock } = customEvent.detail

      // If the new quantity is within stock limits, clear any validation errors for this product
      if (newQuantity <= availableStock) {
        console.log(
          `Clearing validation for product ${productId} - quantity ${newQuantity} is within stock limit ${availableStock}`,
        )

        // Update the stock issues array to remove this product
        setStockIssues((prev) =>
          prev.filter(
            (issue) => !(issue.product_id === productId && (!issue.variant_id || issue.variant_id === variantId)),
          ),
        )

        // After a short delay, re-validate the cart to ensure everything is in sync
        setTimeout(() => {
          validateCart().catch((error) => {
            console.error("Error validating cart after item update:", error)
          })
        }, 500)
      }
    }

    window.addEventListener("cart-item-updated", handleCartItemUpdated as EventListener)

    return () => {
      window.removeEventListener("cart-item-updated", handleCartItemUpdated as EventListener)
    }
  }, [validateCart])

  // Update the handleRefreshCart function to better handle errors
  const handleRefreshCart = async () => {
    // Prevent multiple simultaneous refreshes
    if (refreshingRef.current || pendingOperations.size > 0) return

    try {
      refreshingRef.current = true
      setIsRefreshing(true)

      // Check for corruption before refresh
      if (isCartDataCorrupted()) {
        console.log("Detected corruption during refresh, cleaning up...")
        cleanupCartData()
      }

      try {
        await refreshCart()
      } catch (error) {
        console.error("Error refreshing cart:", error)
        // Continue with validation even if refresh fails
      }

      // Clear all validation results before re-validating
      setStockIssues([])
      setPriceChanges([])
      setInvalidItems([])

      // Force a complete validation with a fresh cart state
      let result
      try {
        result = await validateCart(2, true)
      } catch (error) {
        console.error("Error validating cart during refresh:", error)
        result = {
          stockIssues: [],
          priceChanges: [],
          invalidItems: [],
          errors: [],
          warnings: [],
        }
      }

      // Update state with validation results
      if (result) {
        setStockIssues(result.stockIssues || [])
        setPriceChanges(result.priceChanges || [])
        setInvalidItems(result.invalidItems || [])
      }

      setLastRefreshed(new Date())
      toast({
        title: "Cart Updated",
        description: "Your cart has been refreshed with the latest information.",
      })
    } catch (error) {
      console.error("Error refreshing cart:", error)
      toast({
        title: "Update Failed",
        description: "Could not refresh your cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      refreshingRef.current = false
      setIsRefreshing(false)
    }
  }

  // If not mounted yet, return null to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  // Show loading state during data corruption cleanup
  if (dataCorruption) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cherry-700" />
          <h2 className="text-lg font-semibold mb-2">Cleaning up cart data...</h2>
          <p className="text-gray-600">Please wait while we fix any data issues.</p>
        </div>
      </div>
    )
  }

  // Calculate tax amount for display (16% of subtotal)
  const taxAmount = Math.round(subtotal * 0.16)

  // Apple-style loading skeleton - more compact
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          {/* Header Skeleton */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content Skeleton */}
            <div className="md:col-span-2 space-y-4">
              {/* Cart Items Skeleton */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="p-4 space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-24 w-24 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex items-center gap-3 pt-2">
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features Skeleton */}
              <div className="grid md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                    <Skeleton className="h-10 w-10 rounded-full mb-2" />
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-sm sticky top-6">
                <div className="p-4 border-b">
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="p-4">
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-20" />
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                    <Skeleton className="h-12 w-full mt-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty cart state with Apple design - more compact
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-4xl mx-auto px-4 py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springConfig}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-10 text-center">
              {/* Animated Shopping Bag */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, ...springConfig }}
                className="relative mb-6"
              >
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-12 w-12 text-gray-400" />
                </div>
              </motion.div>

              {/* Content */}
              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, ...springConfig }}
                className="text-2xl font-bold mb-2 text-gray-800"
              >
                Your cart is empty
              </motion.h2>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, ...springConfig }}
                className="text-gray-500 mb-8 max-w-md mx-auto"
              >
                Looks like you haven't added anything to your cart yet. Browse our products and find something you'll
                love!
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, ...springConfig }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  asChild
                  size="lg"
                  className="px-8 py-6 h-auto text-base font-medium bg-cherry-700 hover:bg-cherry-800"
                >
                  <Link href="/products">Start Shopping</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Check if there are any validation issues
  const hasValidationIssues = stockIssues.length > 0 || priceChanges.length > 0 || invalidItems.length > 0

  // Check if any items are out of stock
  const hasOutOfStockItems = items.some(
    (item) => item.product?.stock !== undefined && (item.product.stock <= 0 || item.quantity > item.product.stock),
  )

  // Main cart interface with Apple design - more compact and using project colors
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Corruption Detector */}
        <CartCorruptionDetector
          onCorruptionDetected={handleCorruptionDetected}
          onCleanupComplete={handleCleanupComplete}
        />

        {/* Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, ...springConfig }}
          className="bg-white p-4 rounded-lg shadow-sm mb-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5 text-cherry-700" />
                Shopping Cart ({items.length})
              </h1>
              <p className="text-sm text-gray-500 mt-1">Review your items and proceed to checkout</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-2">
              <span className="text-xs text-gray-500">Last updated: {lastRefreshed.toLocaleTimeString()}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDataCorruption(true)
                  const result = cleanupCartData()
                  if (result.success) {
                    toast({
                      title: "Cart Cleaned",
                      description: "Cart data has been cleaned up",
                    })
                  }
                  refreshCart().finally(() => {
                    setDataCorruption(false)
                  })
                }}
                className="flex items-center gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Fix Cart</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Data Corruption Warning - add this after the header section */}
        {dataCorruption && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Fixing Cart Data</h3>
                <p className="text-sm text-red-700">
                  We detected some corrupted data in your cart and are cleaning it up. Please wait...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {/* Main Cart Column */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springConfig }}
            className="md:col-span-2"
          >
            {/* Validation Issues Section */}
            {hasValidationIssues && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-4 rounded-lg shadow-sm mb-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-amber-800">Cart validation issues detected</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={handleRefreshCart}
                        disabled={isValidatingCart}
                      >
                        {isValidatingCart ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh Cart
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Stock Issues */}
                    {stockIssues.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-700">Stock Issues:</p>
                        <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
                          {stockIssues.map((issue, index) => (
                            <li key={`stock-${index}`}>{issue.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Price Changes */}
                    {priceChanges.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-700">Price Changes:</p>
                        <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
                          {priceChanges.map((change, index) => (
                            <li key={`price-${index}`}>{change.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Invalid Items */}
                    {invalidItems.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-700">Unavailable Items:</p>
                        <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
                          {invalidItems.map((item, index) => (
                            <li key={`invalid-${index}`}>{item.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Cart Items */}
            <div className="bg-white rounded-lg shadow-sm mb-4">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Cart Items ({items.length})</h2>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-cherry-700 border-cherry-200 hover:bg-cherry-50 hover:text-cherry-800"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Cart
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white rounded-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all items from your cart. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearCart}
                        className="bg-cherry-700 hover:bg-cherry-800"
                        disabled={isClearingCart}
                      >
                        {isClearingCart ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          "Clear Cart"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <AnimatePresence mode="popLayout">
                <div className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    // Check if this item has stock issues
                    const itemStockIssue = stockIssues.find(
                      (issue) =>
                        issue.product_id === item.product_id &&
                        (issue.variant_id ? issue.variant_id === item.variant_id : true),
                    )

                    // Check if this item has price changes
                    const itemPriceChange = priceChanges.find(
                      (change) =>
                        change.product_id === item.product_id &&
                        (change.variant_id ? change.variant_id === item.variant_id : true),
                    )

                    // Check if this item is invalid/unavailable
                    const isItemInvalid = invalidItems.some(
                      (invalid) =>
                        invalid.product_id === item.product_id &&
                        (invalid.variant_id ? invalid.variant_id === item.variant_id : true),
                    )

                    return (
                      <motion.div
                        key={`${item.id}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.05,
                          exit: { duration: 0.2 },
                        }}
                        className={isItemInvalid ? "opacity-70" : ""}
                      >
                        <div className="relative">
                          {/* Stock Issue Badge */}
                          {itemStockIssue && (
                            <div className="absolute -top-2 right-0 z-10">
                              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                {itemStockIssue.code === "out_of_stock" ? "Out of Stock" : "Stock Issue"}
                              </Badge>
                            </div>
                          )}

                          {/* Price Change Badge */}
                          {itemPriceChange && !itemStockIssue && (
                            <div className="absolute -top-2 right-0 z-10">
                              <Badge
                                variant="outline"
                                className="bg-amber-500 text-white border-amber-500 text-xs px-2 py-0.5"
                              >
                                Price Changed
                              </Badge>
                            </div>
                          )}

                          {/* Invalid Item Badge */}
                          {isItemInvalid && !itemStockIssue && !itemPriceChange && (
                            <div className="absolute -top-2 right-0 z-10">
                              <Badge variant="outline" className="border-red-300 text-red-600 text-xs px-2 py-0.5">
                                Unavailable
                              </Badge>
                            </div>
                          )}

                          <CartItem
                            item={
                              item as CartItemType & {
                                product?: {
                                  name?: string
                                  description?: string
                                  sku?: string
                                  stock?: number
                                  slug?: string
                                  image_urls?: string[]
                                  thumbnail_url?: string
                                  price?: number
                                  sale_price?: number | null
                                  category?: string
                                  color?: string
                                  size?: string
                                }
                              }
                            }
                            onSuccess={handleItemAction}
                            className={processingItems[item.id] ? "opacity-70" : ""}
                            stockIssue={itemStockIssue}
                            priceChange={itemPriceChange}
                            isInvalid={isItemInvalid}
                          />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </AnimatePresence>

              <div className="p-4 border-t flex justify-between items-center">
                <Button
                  variant="outline"
                  asChild
                  className="gap-2 text-cherry-700 border-cherry-200 hover:bg-cherry-50 hover:text-cherry-800"
                >
                  <Link href="/products">
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    Continue Shopping
                  </Link>
                </Button>
                <span className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? "item" : "items"} in your cart
                </span>
              </div>
            </div>

            {/* Reservation Information Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-4 rounded-lg shadow-sm mb-4"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-50 p-2 mt-1">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Items Reserved</h3>
                  <p className="text-sm text-gray-600">
                    Items in your cart are reserved for you for 30 minutes. Complete your purchase to secure these
                    items.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Shipping & Delivery Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
            >
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-50 p-2 mt-1">
                    <Truck className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Free Shipping</h3>
                    <p className="text-sm text-gray-600">On orders over {formatPrice(10000)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-50 p-2 mt-1">
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Delivery Time</h3>
                    <p className="text-sm text-gray-600">2-3 business days</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-purple-50 p-2 mt-1">
                    <ShieldCheck className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Secure Checkout</h3>
                    <p className="text-sm text-gray-600">Your data is protected</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Order Summary Column */}
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm sticky top-6">
              <div className="bg-cherry-800 text-white p-4 rounded-t-lg">
                <h2 className="text-lg font-bold">Order Summary</h2>
              </div>
              <div className="p-4">
                {/* Coupon Code */}
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                    disabled={isApplyingCoupon || Boolean(hasCoupon)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim() || Boolean(hasCoupon)}
                    className="text-cherry-700 border-cherry-200 hover:bg-cherry-50"
                  >
                    {isApplyingCoupon ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Subtotal</p>
                    <p className="font-medium">{formatPrice(subtotal)}</p>
                  </div>

                  {/* Show discount if applied */}
                  {hasDiscount && (
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center">
                        <p className="text-green-600 flex items-center">
                          <Tag className="h-3.5 w-3.5 mr-1.5" />
                          Discount
                          {cart?.coupon_code && (
                            <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                              {cart.coupon_code}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="font-medium text-green-600">-{formatPrice(cart?.discount ?? 0)}</p>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Shipping</p>
                    <p className="font-medium">{shipping === 0 ? "Free" : formatPrice(shipping)}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center text-gray-600">
                          <span>VAT (16%)</span>
                          <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">16% Value Added Tax applied to all purchases</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="font-medium">{formatPrice(taxAmount)}</p>
                  </div>

                  <Separator className="my-3" />

                  <motion.div
                    className="flex justify-between text-base font-medium"
                    animate={{
                      scale: [1, 1.03, 1],
                      transition: { duration: 0.5, delay: 0.5 },
                    }}
                  >
                    <p className="text-gray-800">Total</p>
                    <p className="text-cherry-800 font-bold text-xl">{formatCurrency(total)}</p>
                  </motion.div>
                </div>

                {shipping > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700 flex items-start gap-2"
                  >
                    <Truck className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p>
                      Add <span className="font-semibold">{formatPrice(10000 - subtotal)}</span> more to your cart for
                      FREE shipping!
                    </p>
                  </motion.div>
                )}

                {/* Stock Warning */}
                {hasOutOfStockItems && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p>
                      Some items in your cart are out of stock or have insufficient stock. Please update or remove these
                      items before checkout.
                    </p>
                  </div>
                )}

                {/* Checkout Button */}
                <motion.div className="mt-6" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    asChild
                    className="w-full h-12 text-base font-medium gap-2 bg-cherry-700 hover:bg-cherry-800"
                    disabled={hasOutOfStockItems || hasValidationIssues || isValidatingCart}
                  >
                    <Link href="/checkout">
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>

                {/* Secure Checkout Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span>Secure checkout</span>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full text-cherry-700 border-cherry-200 hover:bg-cherry-50"
                    onClick={handleSaveAllToWishlist}
                    disabled={isSavingAllToWishlist || items.length === 0}
                  >
                    {isSavingAllToWishlist ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-2" />
                        Save All for Later
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recommended Products */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-8 w-full mb-8"
        >
          <div className="w-full">
            {/* Header similar to Luxury Deals */}
            <div className="bg-cherry-800 text-white flex items-center justify-between px-4 py-2 rounded-t-lg">
              <div className="flex items-center gap-2">
                <ShoppingBasket className="h-5 w-5 text-yellow-300" />
                <h2 className="text-sm sm:text-base font-bold whitespace-nowrap">You Might Also Like</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-cherry-200 hidden sm:inline">Recommended for you</span>
                <ChevronRight className="h-4 w-4 text-cherry-200" />
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white rounded-b-lg shadow-sm p-4">
              {isLoadingRecommendations ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-square rounded-md" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : recommendedProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recommendedProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group cursor-pointer"
                    >
                      <Link href={`/product/${product.id}`} className="block">
                        <div className="relative aspect-square rounded-md overflow-hidden bg-gray-100 mb-2">
                          <Image
                            src={product.thumbnail_url || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {product.sale_price && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5">
                                {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
                              </Badge>
                            </div>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{product.name}</h3>
                        <div className="flex items-center gap-1">
                          {product.sale_price ? (
                            <>
                              <span className="text-sm font-bold text-cherry-700">
                                {formatPrice(product.sale_price)}
                              </span>
                              <span className="text-xs text-gray-500 line-through">{formatPrice(product.price)}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-gray-800">{formatPrice(product.price)}</span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingBasket className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No recommendations available</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
