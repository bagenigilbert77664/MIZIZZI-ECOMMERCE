"use client"

import { useWishlist as useWishlistContext } from "@/contexts/wishlist/wishlist-context"

// This hook simplifies the wishlist context for components
export function useWishlistHook() {
  const { state, isInWishlist, addToWishlist, removeProductFromWishlist, clearWishlist, isUpdating, refreshWishlist } =
    useWishlistContext()

  // Transform the wishlist items to a simpler format for components
  // Add null checks to prevent "Cannot read properties of undefined" errors
  const wishlistItems = state.items
    .filter((item) => item && item.product) // Filter out items with missing product data
    .map((item) => ({
      id: item.product_id,
      name: item.product.name || "Unknown Product",
      price: item.product.sale_price || item.product.price || 0,
      image:
        item.product.thumbnail_url || (item.product.image_urls && item.product.image_urls[0]) || "/placeholder.svg",
      slug: item.product.slug || `product-${item.product_id}`,
      added_at: item.created_at,
    }))

  return {
    wishlist: wishlistItems,
    count: state.itemCount,
    isInWishlist,
    addToWishlist,
    removeFromWishlist: removeProductFromWishlist,
    clearWishlist,
    isUpdating,
    refreshWishlist,
    lastUpdated: state.lastUpdated,
  }
}

// Re-export the original hook for backward compatibility
export { useWishlist } from "@/contexts/wishlist/wishlist-context"

