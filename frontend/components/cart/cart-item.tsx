"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Loader2, Truck } from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import type { CartItem as CartItemType } from "@/services/cart-service"

interface CartItemProps {
  item: CartItemType
  showControls?: boolean
  compact?: boolean
  onSuccess?: (action: "update" | "remove", itemId: number) => void
  className?: string
}

export function CartItem({ item, showControls = true, compact = false, onSuccess, className = "" }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart()
  const [isRemoving, setIsRemoving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Get the best available image URL
  const imageUrl =
    item.product.thumbnail_url ||
    (item.product.image_urls && item.product.image_urls.length > 0
      ? item.product.image_urls[0]
      : "/placeholder.svg?height=100&width=100")

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 99) return

    setIsUpdating(true)
    try {
      const success = await updateQuantity(item.id, newQuantity)
      if (success && onSuccess) {
        onSuccess("update", item.id)
      }
    } catch (error) {
      console.error("Failed to update quantity:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      const success = await removeItem(item.id)
      if (success && onSuccess) {
        onSuccess("remove", item.id)
      }
    } catch (error) {
      console.error("Failed to remove item:", error)
    } finally {
      setIsRemoving(false)
    }
  }

  // Cherry-styled compact version
  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={item.product.name}
            fill
            sizes="64px"
            className="object-cover object-center"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{formatPrice(item.total)}</p>
        </div>
      </div>
    )
  }

  // Cherry-styled cart item for the sidebar
  return (
    <div className={`flex gap-4 ${className}`}>
      <Link
        href={`/product/${item.product.slug || item.product_id}`}
        className="relative h-24 w-24 flex-none overflow-hidden rounded-md border bg-muted"
      >
        <img
          src={imageUrl || "/placeholder.svg?height=96&width=96"}
          alt={item.product.name}
          className="h-full w-full object-contain"
        />
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <Link href={`/product/${item.product.slug || item.product_id}`} className="font-medium hover:text-cherry-600">
            {item.product.name}
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center">
            <button
              className="h-8 w-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 transition-colors"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdating || isRemoving || item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-12 text-center text-sm border-y border-gray-200 h-8 flex items-center justify-center">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-cherry-900" /> : item.quantity}
            </span>
            <button
              className="h-8 w-8 flex items-center justify-center bg-cherry-600 hover:bg-cherry-700 text-white transition-colors"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating || isRemoving}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{formatPrice(item.total)}</span>
            {item.quantity > 1 && <span className="text-xs text-muted-foreground">{formatPrice(item.price)} each</span>}
          </div>
          <button
            className="ml-auto text-sm text-cherry-600 px-2 py-1 rounded-md transition-all hover:bg-cherry-900 hover:text-white"
            onClick={handleRemove}
            disabled={isRemoving || isUpdating}
          >
            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
          </button>
        </div>
        {/* Delivery Estimate */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="h-3 w-3" />
          <span>Estimated delivery: 2-3 business days</span>
        </div>
      </div>
    </div>
  )
}
