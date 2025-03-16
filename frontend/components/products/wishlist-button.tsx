"use client"

import { useState } from "react"
import { Heart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { useAuth } from "@/contexts/auth/auth-context"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface WishlistButtonProps {
  productId: number
  variant?: "default" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showText?: boolean
}

export function WishlistButton({
  productId,
  variant = "outline",
  size = "icon",
  className,
  showText = false,
}: WishlistButtonProps) {
  const { isInWishlist, addToWishlist, removeProductFromWishlist } = useWishlist()
  const { isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const isProductInWishlist = isInWishlist(productId)

  const handleToggleWishlist = async () => {
    setIsLoading(true)
    try {
      if (isProductInWishlist) {
        await removeProductFromWishlist(productId)
        toast({
          description: "Removed from wishlist",
        })
      } else {
        await addToWishlist(productId)
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
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
        "group",
        isProductInWishlist && "text-cherry-600 hover:text-cherry-700 border-cherry-200 hover:border-cherry-300",
        className,
      )}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleToggleWishlist()
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", isProductInWishlist && "fill-cherry-600")} />
      )}
      {showText && <span className="ml-2">{isProductInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}</span>}
    </Button>
  )
}

