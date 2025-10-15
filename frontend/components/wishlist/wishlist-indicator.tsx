"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, X, ShoppingCart, Loader2, ChevronRight, RefreshCw, Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"

export function WishlistIndicator({ trigger }: { trigger?: React.ReactNode }) {
  const {
    state: wishlistState,
    removeProductFromWishlist,
    isUpdating: isWishlistUpdating,
    refreshWishlist,
  } = useWishlist()
  const { addToCart, isUpdating: isCartUpdating } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set())

  // Auto-open the wishlist when a new item is added
  const [prevCount, setPrevCount] = useState(wishlistState.itemCount)

  // Listen for wishlist events
  useEffect(() => {
    const handleWishlistEvents = (event: CustomEvent) => {
      switch (event.type) {
        case "wishlist-item-added":
          showSuccessNotification("Added to wishlist")
          break
        case "wishlist-item-removed":
          showSuccessNotification("Removed from wishlist")
          break
        case "wishlist-cleared":
          showSuccessNotification("Wishlist cleared")
          break
        case "open-wishlist":
          setIsOpen(true)
          break
      }
    }

    const events = ["wishlist-item-added", "wishlist-item-removed", "wishlist-cleared", "open-wishlist"]
    events.forEach((event) => {
      document.addEventListener(event, handleWishlistEvents as EventListener)
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleWishlistEvents as EventListener)
      })
    }
  }, [])

  useEffect(() => {
    // If the count increased, show notification but don't auto-open
    if (wishlistState.itemCount > prevCount) {
      // Only show notification, don't auto-open
      showSuccessNotification("Product added to wishlist")

      // Dispatch a custom event that other components can listen for
      const event = new CustomEvent("wishlist-updated", {
        detail: { action: "add", count: wishlistState.itemCount },
      })
      document.dispatchEvent(event)
    }
    setPrevCount(wishlistState.itemCount)
  }, [wishlistState.itemCount, prevCount])

  // Handle success message visibility
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message)
    setShowSuccess(true)
  }

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshWishlist()
    } catch (error) {
      console.error("Error refreshing wishlist:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshWishlist])

  const handleAddToCart = async (productId: number, name: string) => {
    setLoadingItems((prev) => ({ ...prev, [productId]: true }))

    try {
      await addToCart(productId, 1)
      await removeProductFromWishlist(productId)
      showSuccessNotification(`${name} moved to cart`)
    } catch (error: any) {
      console.error("Error moving to cart:", error)

      // Handle network errors gracefully
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        toast({
          title: "Network Error",
          description: "Unable to connect to server. Changes saved locally.",
          variant: "default",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to move item to cart",
          variant: "destructive",
        })
      }
    } finally {
      setLoadingItems((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const handleRemoveFromWishlist = async (productId: number) => {
    // Add to removing items for immediate UI feedback
    setRemovingItems((prev) => new Set(prev).add(productId))
    setLoadingItems((prev) => ({ ...prev, [productId]: true }))

    try {
      await removeProductFromWishlist(productId)

      // Show success message
      toast({
        description: "Product removed from wishlist",
      })

      // Dispatch a custom event that other components can listen for
      const event = new CustomEvent("wishlist-updated", {
        detail: { action: "remove", productId },
      })
      document.dispatchEvent(event)
    } catch (error: any) {
      console.error("Error removing from wishlist:", error)

      // Handle network errors gracefully
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        toast({
          title: "Network Error",
          description: "Unable to connect to server. Item removed locally.",
          variant: "default",
        })

        // Still dispatch the event since local state was updated
        const event = new CustomEvent("wishlist-updated", {
          detail: { action: "remove", productId },
        })
        document.dispatchEvent(event)
      } else {
        toast({
          title: "Error",
          description: "Failed to remove item from wishlist",
          variant: "destructive",
        })
      }
    } finally {
      setLoadingItems((prev) => ({ ...prev, [productId]: false }))
      setRemovingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  const defaultTrigger = (
    <Button
      variant="ghost"
      className="relative h-10 flex items-center gap-2 px-3 rounded-full transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <div className="relative">
        <Heart className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {wishlistState.itemCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center"
          >
            <span className="text-[10px] font-medium text-white">
              {wishlistState.itemCount > 99 ? "99+" : wishlistState.itemCount}
            </span>
          </motion.div>
        )}
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">Wishlist</span>
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              className="bg-green-500 text-white px-6 py-3 flex items-center gap-3 text-sm font-medium"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
                <Check className="h-4 w-4" />
              </motion.div>
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Wishlist</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {wishlistState.itemCount} {wishlistState.itemCount === 1 ? "item" : "items"} saved
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing || isWishlistUpdating}
              className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 text-gray-500 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isWishlistUpdating && !isRefreshing ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-t-gray-100 rounded-full mx-auto mb-3"
              />
              <p className="text-sm text-gray-500">Loading wishlist...</p>
            </div>
          </div>
        ) : wishlistState.itemCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6"
            >
              <Heart className="h-10 w-10 text-gray-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs leading-relaxed">
              Save items you love to your wishlist and never lose track of them.
            </p>
            <Button
              asChild
              className="bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-full px-6 py-2 font-medium"
              onClick={() => setIsOpen(false)}
            >
              <Link href="/products" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Browse Products
              </Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {wishlistState.items.map((item) => {
                  // Type guard: ensure product_id is a number and product exists
                  if (
                    !item ||
                    typeof item.product_id !== "number" ||
                    !item.product ||
                    removingItems.has(item.product_id)
                  )
                    return null

                  return (
                    <motion.div
                      key={`${item.id}-${item.product_id}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                      className="flex gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white dark:bg-gray-700">
                        <Image
                          src={
                            item.product.thumbnail_url ||
                            (Array.isArray(item.product.image_urls) && item.product.image_urls.length > 0
                              ? item.product.image_urls[0]
                              : "/placeholder.svg")
                          }
                          alt={item.product.name || "Product image"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <Link
                            href={`/product/${item.product.slug ?? item.product_id}`}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-gray-900 dark:hover:text-gray-100 transition-colors line-clamp-2"
                            onClick={() => setIsOpen(false)}
                          >
                            {item.product.name || "Unknown Product"}
                          </Link>
                          <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                            {formatPrice(item.product.sale_price ?? item.product.price ?? 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-medium rounded-full border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            onClick={() => {
                              if (typeof item.product_id === "number") {
                                handleAddToCart(item.product_id, item.product?.name || "Product")
                              }
                            }}
                            disabled={loadingItems[item.product_id] || isCartUpdating}
                          >
                            {loadingItems[item.product_id] || isCartUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <ShoppingCart className="mr-1 h-3 w-3" />
                                Add to Cart
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                            onClick={() => {
                              if (typeof item.product_id === "number") {
                                handleRemoveFromWishlist(item.product_id)
                              }
                            }}
                            disabled={loadingItems[item.product_id]}
                          >
                            {loadingItems[item.product_id] ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {wishlistState.itemCount > 0 && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800">
            <Button
              asChild
              className="w-full bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-full py-3 font-medium"
              onClick={() => setIsOpen(false)}
            >
              <Link href="/wishlist" className="flex items-center justify-center gap-2">
                View All Items
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
