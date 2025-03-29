"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Heart, ShoppingCart, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWishlistHook } from "@/hooks/use-wishlist"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"

export default function WishlistPage() {
  const { wishlist, count, removeFromWishlist, clearWishlist, isUpdating, refreshWishlist, lastUpdated } =
    useWishlistHook()
  const { addToCart, isUpdating: isCartUpdating } = useCart()
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)

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
      await removeFromWishlist(id)
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
      await removeFromWishlist(id)
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">
            {count} {count === 1 ? "item" : "items"} saved
            {lastUpdated && (
              <span className="text-xs ml-2">Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isUpdating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {count > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearWishlist}
              disabled={isClearingAll || isUpdating}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <Separator className="mb-6" />

      {isUpdating && !isRefreshing ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cherry-600" />
          <span className="ml-2 text-lg">Loading wishlist...</span>
        </div>
      ) : count === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <Heart className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-medium mb-3">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add items to your wishlist to keep track of products you're interested in purchasing later.
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="group relative border rounded-lg overflow-hidden flex flex-col h-full bg-white dark:bg-gray-950 hover:shadow-md transition-all duration-200"
            >
              {/* Wishlist Action */}
              <button
                onClick={() => handleRemoveFromWishlist(item.id)}
                disabled={loadingItems[item.id]}
                className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
              >
                {loadingItems[item.id] ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                ) : (
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                )}
              </button>

              {/* Product Image */}
              <Link href={`/product/${item.slug || item.id}`} className="relative aspect-square overflow-hidden">
                <Image
                  src={item.image || "/placeholder.svg?height=300&width=300"}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </Link>

              {/* Product Info */}
              <div className="p-3 flex flex-col flex-1">
                <Link
                  href={`/product/${item.slug || item.id}`}
                  className="text-sm font-medium hover:text-cherry-600 transition-colors line-clamp-2 mb-1"
                >
                  {item.name}
                </Link>

                <div className="mt-1 mb-2">
                  <p className="text-base font-semibold text-cherry-600">{formatPrice(item.price)}</p>
                  {item.added_at && (
                    <p className="text-xs text-muted-foreground mt-1">Added on {formatDate(item.added_at)}</p>
                  )}
                </div>

                {/* Add to Cart Button */}
                <div className="mt-auto pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAddToCart(item.id, item.name)}
                    disabled={loadingItems[item.id] || isCartUpdating}
                  >
                    {loadingItems[item.id] || isCartUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

