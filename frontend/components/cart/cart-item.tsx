"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Trash2, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import type { CartItem as CartItemType } from "@/types"

interface CartItemProps {
  item: CartItemType
  showControls?: boolean
  compact?: boolean
}

export function CartItem({ item, showControls = true, compact = false }: CartItemProps) {
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
      await updateQuantity(item.id, newQuantity)
    } catch (error) {
      console.error("Failed to update quantity:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await removeItem(item.id)
    } catch (error) {
      console.error("Failed to remove item:", error)
    } finally {
      setIsRemoving(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
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

  return (
    <div className="flex gap-4 py-6 border-b border-gray-100 last:border-0">
      {/* Product Image */}
      <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
        <Link href={`/product/${item.product.slug || item.product.id}`}>
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={item.product.name}
            fill
            sizes="(max-width: 768px) 112px, 112px"
            className="object-cover object-center"
            priority={true}
          />
        </Link>
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between">
          <div>
            <Link
              href={`/product/${item.product.slug || item.product.id}`}
              className="text-base font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2"
            >
              {item.product.name}
            </Link>

            {item.product.category && <p className="mt-1 text-xs text-gray-500">Category: {item.product.category}</p>}

            {item.product.sku && <p className="mt-1 text-xs text-gray-400">SKU: {item.product.sku}</p>}
          </div>

          <p className="text-base font-medium text-gray-900">{formatPrice(item.price)}</p>
        </div>

        {/* Quantity Controls */}
        <div className="mt-auto flex items-center justify-between pt-4">
          {showControls ? (
            <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none border-r border-gray-200 hover:bg-gray-100"
                onClick={() => handleQuantityChange(item.quantity - 1)}
                disabled={item.quantity <= 1 || isUpdating}
              >
                <Minus className="h-3 w-3" />
                <span className="sr-only">Decrease quantity</span>
              </Button>

              <span className="w-12 text-center text-sm font-medium">{isUpdating ? "..." : item.quantity}</span>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none border-l border-gray-200 hover:bg-gray-100"
                onClick={() => handleQuantityChange(item.quantity + 1)}
                disabled={item.quantity >= 99 || isUpdating}
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">Increase quantity</span>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
          )}

          <div className="flex items-center gap-4">
            <p className="text-base font-semibold text-primary">{formatPrice(item.total)}</p>

            {showControls && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 h-auto"
                onClick={handleRemove}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <span className="flex items-center">
                    <span className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></span>
                    <span className="sr-only">Removing...</span>
                  </span>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

