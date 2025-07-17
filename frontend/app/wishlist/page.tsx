"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, ShoppingCart, Loader2, RefreshCw, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"

export default function WishlistPage() {
  const { state: wishlistState, removeProductFromWishlist, clearWishlist, refreshWishlist } = useWishlist()
  const { addToCart, isUpdating: isCartUpdating } = useCart()
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [removedItems, setRemovedItems] = useState<number[]>([])

  // Listen for wishlist events
  useEffect(() => {
    const handleWishlistEvents = (event: CustomEvent) => {
      switch (event.type) {
        case "wishlist-item-removed":
          const { productId } = event.detail
          setRemovedItems((prev) => [...prev, productId])
          // Remove from removed items after animation
          setTimeout(() => {
            setRemovedItems((prev) => prev.filter((id) => id !== productId))
          }, 300)
          break
        case "wishlist-cleared":
          setRemovedItems(wishlistState.items.map((item) => item.product_id))
          setTimeout(() => {
            setRemovedItems([])
          }, 300)
          break
      }
    }

    const events = ["wishlist-item-removed", "wishlist-cleared"]
    events.forEach((event) => {
      document.addEventListener(event, handleWishlistEvents as EventListener)
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleWishlistEvents as EventListener)
      })
    }
  }, [wishlistState.items])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshWishlist()
      toast({
        description: "Wishlist refreshed",
      })
    } catch (error) {
      console.error("Error refreshing wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to refresh wishlist",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddToCart = async (id: number, name: string) => {
    setLoadingItems((prev) => ({ ...prev, [id]: true }))

    try {
      await addToCart(id, 1)
      await removeProductFromWishlist(id)

      toast({
        description: `${name} moved to cart`,
      })
    } catch (error) {
      console.error("Error moving to cart:", error)
      toast({
        title: "Error",
        description: "Failed to move item to cart",
        variant: "destructive",
      })
    } finally {
      setLoadingItems((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleRemoveFromWishlist = async (id: number) => {
    setLoadingItems((prev) => ({ ...prev, [id]: true }))

    try {
      await removeProductFromWishlist(id)
      toast({
        description: "Item removed from wishlist",
      })
    } catch (error) {
      console.error("Error removing from wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive",
      })
    } finally {
      setLoadingItems((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleClearWishlist = async () => {
    setIsClearingAll(true)
    try {
      await clearWishlist()
      toast({
        description: "Wishlist cleared",
      })
    } catch (error) {
      console.error("Error clearing wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to clear wishlist",
        variant: "destructive",
      })
    } finally {
      setIsClearingAll(false)
    }
  }

  // Filter out items that have been marked as removed
  const filteredWishlist = wishlistState.items.filter((item) => !removedItems.includes(item.product_id))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Wishlist</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {filteredWishlist.length} {filteredWishlist.length === 1 ? "item" : "items"} saved
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || wishlistState.isUpdating}
              className="rounded-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {filteredWishlist.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearWishlist}
                disabled={isClearingAll || wishlistState.isUpdating}
                className="text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50 rounded-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Content */}
        {wishlistState.isUpdating && !isRefreshing ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="h-12 w-12 border-3 border-gray-300 border-t-gray-900 dark:border-t-gray-100 rounded-full mx-auto mb-4"
              />
              <span className="text-lg text-gray-600 dark:text-gray-300">Loading wishlist...</span>
            </div>
          </div>
        ) : filteredWishlist.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-8"
            >
              <Heart className="h-12 w-12 text-gray-400" />
            </motion.div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Your wishlist is empty</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Add items to your wishlist to keep track of products you're interested in purchasing later.
            </p>
            <Button
              asChild
              className="bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-full px-8 py-3"
            >
              <Link href="/products">Browse Products</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredWishlist.map((item) => (
                <motion.div
                  key={item.product_id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700"
                >
                  {/* Wishlist Action */}
                  <button
                    onClick={() => handleRemoveFromWishlist(item.product_id)}
                    disabled={loadingItems[item.product_id]}
                    className="absolute top-3 right-3 z-10 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {loadingItems[item.product_id] ? (
                      <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    ) : (
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    )}
                  </button>

                  {/* Product Image */}
                  <Link href={`/product/${item.product.slug || item.product_id}`} className="block">
                    <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <Image
                        src={item.product.thumbnail_url || "/placeholder.svg?height=300&width=300"}
                        alt={item.product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link
                      href={`/product/${item.product.slug || item.product_id}`}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-gray-900 dark:hover:text-gray-100 transition-colors line-clamp-2 mb-2"
                    >
                      {item.product.name}
                    </Link>

                    <div className="mb-4">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatPrice(item.product.sale_price || item.product.price)}
                      </p>
                      {item.product.sale_price && (
                        <p className="text-sm text-gray-500 line-through">{formatPrice(item.product.price)}</p>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-full"
                      onClick={() => handleAddToCart(item.product_id, item.product.name)}
                      disabled={loadingItems[item.product_id] || isCartUpdating}
                    >
                      {loadingItems[item.product_id] || isCartUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 mr-2" />
                      )}
                      Add to Cart
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
