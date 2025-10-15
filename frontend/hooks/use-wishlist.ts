"use client"

import { useWishlist as useWishlistContext } from "@/contexts/wishlist/wishlist-context"
import { useCallback } from "react"

export function useWishlistHook() {
  const { state, isInWishlist, addToWishlist, removeProductFromWishlist, clearWishlist, isUpdating, refreshWishlist } =
    useWishlistContext()

  // Transform the wishlist items to a simpler format for components
  const wishlistItems = state.items
    .filter((item) => item && (item.product || item.product_name))
    .map((item) => {
      console.log("[v0] 🖼️ Wishlist item:", item)
      console.log("[v0] 🖼️ Product object:", item.product)
      console.log("[v0] 🖼️ Product thumbnail_url:", item.product?.thumbnail_url)
      console.log("[v0] 🖼️ Product image_urls:", item.product?.image_urls)
      console.log("[v0] 🖼️ Product_image:", item.product_image)

      const imageUrl =
        item.product?.thumbnail_url ||
        (item.product?.image_urls && item.product?.image_urls[0]) ||
        item.product_image ||
        "/diverse-products-still-life.png"

      console.log("[v0] 🖼️ Final image URL:", imageUrl)

      return {
        id: item.product_id,
        name: item.product?.name || item.product_name || "Unknown Product",
        price: item.product?.sale_price || item.product?.price || item.product_price || 0,
        image: imageUrl,
        slug: item.product?.slug || item.product_slug || `product-${item.product_id}`,
        added_at: item.created_at || item.added_at,
      }
    })

  const isItemInWishlist = useCallback(
    (productId: number | string) => {
      return isInWishlist(productId)
    },
    [isInWishlist],
  )

  return {
    wishlist: wishlistItems,
    count: state.itemCount,
    isInWishlist: isItemInWishlist,
    addToWishlist,
    removeFromWishlist: removeProductFromWishlist,
    clearWishlist,
    isUpdating,
    refreshWishlist,
    lastUpdated: state.lastUpdated,
  }
}

export { useWishlist } from "@/contexts/wishlist/wishlist-context"
