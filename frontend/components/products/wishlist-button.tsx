"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface WishlistButtonProps {
  productId: number
  productDetails?: {
    name?: string
    slug?: string
    price?: number
    sale_price?: number
    thumbnail_url?: string
    image_urls?: string[]
  }
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function WishlistButton({
  productId,
  productDetails,
  variant = "outline",
  size = "icon",
  className,
}: WishlistButtonProps) {
  const { isInWishlist, addToWishlist, removeProductFromWishlist } = useWishlist()
  const [isLoading, setIsLoading] = useState(false)
  const [isInList, setIsInList] = useState(false)

  // Check if product is in wishlist and update local state
  useEffect(() => {
    setIsInList(isInWishlist(productId))
  }, [productId, isInWishlist])

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)

    try {
      if (isInList) {
        await removeProductFromWishlist(productId)
        toast({
          description: "Product removed from wishlist",
        })
      } else {
        await addToWishlist(productId, productDetails)
        toast({
          description: "Product added to wishlist",
        })
      }

      // Update local state immediately for better UX
      setIsInList(!isInList)
    } catch (error) {
      console.error("Error toggling wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "relative",
        isInList ? "text-cherry-600 hover:text-cherry-700" : "text-gray-500 hover:text-gray-700",
        className,
      )}
      onClick={handleToggleWishlist}
      disabled={isLoading}
      aria-label={isInList ? "Remove from wishlist" : "Add to wishlist"}
      data-state={isInList ? "active" : "inactive"}
      data-product-id={productId}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Heart className={cn("h-5 w-5", isInList ? "fill-cherry-600" : "")} />
      )}
    </Button>
  )
}

