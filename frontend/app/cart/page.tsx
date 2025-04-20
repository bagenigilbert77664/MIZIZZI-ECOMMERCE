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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
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
import { formatPrice } from "@/lib/utils"
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
  const router = useRouter()
  const { wishlist, addToWishlist, removeFromWishlist, isUpdating: isWishlistUpdating } = useWishlistHook()

  // Ref to track if initial load is complete
  const initialLoadComplete = useRef(false)
  const refreshingRef = useRef(false)

  // Modify the useEffect that handles initial loading to better handle cart state
  useEffect(() => {
    setMounted(true)

    // Set a timeout only for the initial page load
    const timer = setTimeout(() => {
      if (!isLoading) {
        setPageLoading(false)
        initialLoadComplete.current = true
      }
    }, 1000) // Increased from 600ms to 1000ms

    return () => clearTimeout(timer)
  }, [isLoading])

  // Update the useEffect that validates the cart to handle errors better
  useEffect(() => {
    if (mounted && !refreshingRef.current) {
      const validateCartItems = async () => {
        setIsValidatingCart(true)
        try {
          // First ensure cart is refreshed - with error handling
          if (!initialLoadComplete.current) {
            await refreshCart().catch((err) => {
              console.warn("Error refreshing cart, will continue with validation:", err)
            })
          }

          // Wait a moment to ensure cart data is stable
          await new Promise((resolve) => setTimeout(resolve, 500))

          // Then validate the cart with proper error handling
          const result = await validateCart().catch((error) => {
            console.error("Error validating cart:", error)
            return {
              isValid: true, // Assume valid to prevent blocking the user
              stockIssues: [],
              priceChanges: [],
              invalidItems: [],
              errors: [],
              warnings: [],
            }
          })

          // Update state with validation results
          if (result) {
            setStockIssues(result.stockIssues || [])
            setPriceChanges(result.priceChanges || [])
            setInvalidItems(result.invalidItems || [])
          }
        } catch (error) {
          console.error("Error in cart validation flow:", error)
          // Don't block the user from seeing their cart if validation fails
        } finally {
          // Ensure we exit loading state even if there's an error
          setPageLoading(false)
          setIsValidatingCart(false)
          setLastRefreshed(new Date())
        }
      }

      validateCartItems()
    }
  }, [refreshCart, mounted, validateCart, initialLoadComplete])

  // Add a debug log to check items when they change
  useEffect(() => {
    if (mounted && items) {
      console.log("Cart items updated:", items)
    }
  }, [items, mounted])

  // Fetch recommended products based on cart items
  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      if (!items.length || !mounted) return

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

    if (mounted && items.length > 0 && !pageLoading) {
      fetchRecommendedProducts()
    }
  }, [items, mounted, pageLoading])

  const handleClearCart = async () => {
    setIsClearingCart(true)
    try {
      await clearCart()
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      })
    } catch (error) {
      console.error("Failed to clear cart:", error)
      toast({
        title: "Error",
        description: "Failed to clear your cart. Please try again.",
        variant: "destructive",
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
                price: item.product?.price || item.price,
                sale_price: item.product?.sale_price,
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

  const handleRefreshCart = async () => {
    // Prevent multiple simultaneous refreshes
    if (refreshingRef.current || pendingOperations.size > 0) return

    try {
      refreshingRef.current = true
      setIsRefreshing(true)

      await refreshCart()
      const result = await validateCart().catch((error) => {
        console.error("Error validating cart during refresh:", error)
        return {
          stockIssues: [],
          priceChanges: [],
          invalidItems: [],
        }
      })

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

  // Calculate tax amount for display
  const taxAmount = Math.round(subtotal * 0.16)

  // Also update the loading condition to ensure we show cart items even if validation fails
  if (pageLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-6 px-4">
        <div className="mb-6">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden mb-6">
              <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b px-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-9 w-28" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <Skeleton className="h-24 w-24 rounded-md" />
                      <div className="flex-1 space-y-3 py-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex items-center gap-3 pt-2">
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-8 w-20 ml-auto" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between px-6 py-4 bg-gray-50 border-t">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-5 w-24" />
              </CardFooter>
            </Card>
          </div>
          <div>
            <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden sticky top-6">
              <CardHeader className="bg-gray-50 border-b px-6">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="px-6 py-4">
                <div className="flex gap-2 mb-6">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-20" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-gray-50 border-t">
                <Skeleton className="h-12 w-full" />
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="container max-w-6xl mx-auto py-10 px-4"
      >
        <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6"
            >
              <ShoppingBag className="h-12 w-12 text-gray-400" />
            </motion.div>
            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold mb-2 text-gray-800"
            >
              Your cart is empty
            </motion.h2>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-500 mb-8 max-w-md"
            >
              Looks like you haven't added anything to your cart yet. Browse our products and find something you'll
              love!
            </motion.p>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
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
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Check if there are any validation issues
  const hasValidationIssues = stockIssues.length > 0 || priceChanges.length > 0 || invalidItems.length > 0

  // Check if any items are out of stock
  const hasOutOfStockItems = items.some(
    (item) => item.product?.stock !== undefined && (item.product.stock <= 0 || item.quantity > item.product.stock),
  )

  // Render cart with items - Jumia-style design
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-100 min-h-screen py-6"
    >
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
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
                onClick={handleRefreshCart}
                disabled={isRefreshing || refreshingRef.current || pendingOperations.size > 0}
                className="flex items-center gap-1.5 text-cherry-700 border-cherry-200 hover:bg-cherry-50"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh Cart</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Main Cart Column */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
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
                  <AlertDialogContent>
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
                              <Badge variant="warning" className="bg-amber-500 text-white text-xs px-2 py-0.5">
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
                            item={item}
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
                    disabled={isApplyingCoupon}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim()}
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
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Shipping</p>
                    <p className="font-medium">{shipping === 0 ? "Free" : formatPrice(shipping)}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">VAT (16%)</p>
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
                    <p className="text-cherry-800 font-bold text-xl">{formatPrice(total)}</p>
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
                <ShoppingBag className="h-5 w-5 text-yellow-300" />
                <h2 className="text-sm sm:text-base font-bold whitespace-nowrap">You Might Also Like</h2>
              </div>

              <Link
                href="/products"
                className="flex items-center gap-1 text-xs sm:text-sm font-medium hover:underline whitespace-nowrap"
              >
                See All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-white p-4 rounded-b-lg shadow-sm">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                <AnimatePresence mode="popLayout">
                  {isLoadingRecommendations ? (
                    // Loading skeletons
                    Array(6)
                      .fill(0)
                      .map((_, index) => (
                        <div key={index} className="bg-white p-2 border rounded-md">
                          <Skeleton className="aspect-[4/3] w-full mb-2" />
                          <Skeleton className="h-3 w-16 mb-2" />
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))
                  ) : recommendedProducts.length > 0 ? (
                    // Actual product recommendations
                    recommendedProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Link href={`/product/${product.id}`}>
                          <div className="group h-full overflow-hidden border border-gray-200 bg-white rounded-md shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                              <Image
                                src={
                                  product.image_urls?.[0] ||
                                  product.thumbnail_url ||
                                  `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(product.name) || "/placeholder.svg"}`
                                }
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                                className="object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              {product.sale_price && product.sale_price < product.price && (
                                <motion.div
                                  className="absolute left-0 top-2 bg-cherry-700 px-2 py-1 text-[10px] font-semibold text-white"
                                  animate={{ scale: [1, 1.05, 1] }}
                                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                                >
                                  {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
                                </motion.div>
                              )}
                            </div>
                            <div className="space-y-1.5 p-3">
                              <div className="mb-1">
                                <span className="inline-block rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                  Recommended
                                </span>
                              </div>
                              <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-600 group-hover:text-gray-900">
                                {product.name}
                              </h3>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-semibold text-cherry-800">
                                  KSh {(product.sale_price || product.price).toLocaleString()}
                                </span>
                                {product.sale_price && product.sale_price < product.price && (
                                  <span className="text-[11px] text-gray-500 line-through">
                                    KSh {product.price.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))
                  ) : (
                    // Fallback message when no recommendations are available
                    <div className="col-span-full text-center py-8 text-gray-500 bg-white">
                      No product recommendations available at this time.
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
