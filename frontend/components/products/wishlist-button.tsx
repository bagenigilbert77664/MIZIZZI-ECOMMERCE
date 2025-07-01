"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

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

  // Listen for wishlist events to update UI immediately
  useEffect(() => {
    const handleWishlistEvents = (event: CustomEvent) => {
      const { productId: eventProductId } = event.detail
      if (eventProductId === productId) {
        switch (event.type) {
          case "wishlist-item-added":
            setIsInList(true)
            break
          case "wishlist-item-removed":
            setIsInList(false)
            break
        }
      }
    }

    const events = ["wishlist-item-added", "wishlist-item-removed"]
    events.forEach((event) => {
      document.addEventListener(event, handleWishlistEvents as EventListener)
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleWishlistEvents as EventListener)
      })
    }
  }, [productId])

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    setIsLoading(true)

    try {
      const wasInList = isInList

      if (wasInList) {
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

      // Update local state immediately for better UX (optimistic update)
      setIsInList(!wasInList)

      // Dispatch a custom event to notify other components
      document.dispatchEvent(
        new CustomEvent("wishlist-updated", {
          detail: { productId, isAdded: !wasInList },
        }),
      )
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
        "relative overflow-hidden transition-all duration-200",
        isInList
          ? "text-red-500 hover:text-red-600 bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600"
          : "hover:text-red-500 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-800 dark:hover:border-gray-600",
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
        <motion.div
          key={isInList ? "filled" : "empty"}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.3 }}
        >
          <Heart className={cn("h-5 w-5 transition-all duration-200", isInList ? "fill-red-500 text-red-500" : "")} />
        </motion.div>
      )}

      {/* Ripple effect */}
      {isInList && (
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-gray-900 dark:bg-gray-100 rounded-full"
        />
      )}
    </Button>
  )
}
