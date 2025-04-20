"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, X, ShoppingCart, Loader2, ChevronRight, RefreshCw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
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

  // Auto-open the wishlist when a new item is added
  const [prevCount, setPrevCount] = useState(wishlistState.itemCount)

  useEffect(() => {
    const handleOpenWishlist = () => {
      setIsOpen(true)
    }

    document.addEventListener("open-wishlist", handleOpenWishlist)

    return () => {
      document.removeEventListener("open-wishlist", handleOpenWishlist)
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
    } catch (error) {
      console.error("Error moving to cart:", error)
      toast({
        title: "Error",
        description: "Failed to move item to cart",
        variant: "destructive",
      })
    } finally {
      setLoadingItems((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const handleRemoveFromWishlist = async (productId: number) => {
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

      // Force UI update by closing and reopening the sheet after a short delay
      if (isOpen) {
        setTimeout(() => {
          setIsOpen(false)
          setTimeout(() => setIsOpen(true), 100)
        }, 300)
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive",
      })
    } finally {
      setLoadingItems((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const defaultTrigger = (
    <Button
      variant="ghost"
      className="relative h-8 sm:h-10 flex items-center gap-1.5 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
    >
      <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
      <span className="text-sm hidden sm:inline">Wishlist</span>
      {wishlistState.itemCount > 0 && (
        <Badge className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2 h-3 w-3 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-cherry-600 text-[8px] sm:text-[10px]">
          {wishlistState.itemCount}
        </Badge>
      )}
      <span className="sr-only">Open wishlist</span>
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white">
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-green-500 text-white px-4 py-2 flex items-center gap-2 text-sm"
            >
              <Check className="h-4 w-4" />
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center">
              <Heart className="mr-2 h-5 w-5" />
              My Wishlist ({wishlistState.itemCount})
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing || isWishlistUpdating}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh wishlist</span>
            </Button>
          </div>
          <SheetDescription>Items you've saved for later</SheetDescription>
        </SheetHeader>

        {isWishlistUpdating && !isRefreshing ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cherry-600" />
          </div>
        ) : wishlistState.itemCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 mb-6 max-w-xs">
              Add items to your wishlist to keep track of products you're interested in.
            </p>
            <Button asChild onClick={() => setIsOpen(false)}>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {wishlistState.items.map((item) => {
                // Skip items with missing product data
                if (!item || !item.product) return null

                return (
                  <div key={`${item.id}-${item.product_id}`} className="flex gap-4">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      <Image
                        src={item.product?.image_urls?.[0] || item.product?.thumbnail_url || "/placeholder.svg"}
                        alt={item.product?.name || "Wishlist item"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link
                          href={`/product/${item.product.slug || item.product_id}`}
                          className="text-sm font-medium hover:text-cherry-600 transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.product.name || "Unknown Product"}
                        </Link>
                        <p className="mt-1 text-sm font-medium text-cherry-600">
                          {formatPrice(item.product.sale_price || item.product.price || 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleAddToCart(item.product_id, item.product.name || "Product")}
                          disabled={loadingItems[item.product_id] || isCartUpdating}
                        >
                          {loadingItems[item.product_id] || isCartUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="mr-1 h-3 w-3" />
                              Move to Cart
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveFromWishlist(item.product_id)}
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
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <div className="p-4 border-t mt-auto">
          <Button asChild className="w-full bg-cherry-600 hover:bg-cherry-700" onClick={() => setIsOpen(false)}>
            <Link href="/wishlist" className="flex items-center justify-center">
              View Full Wishlist <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
