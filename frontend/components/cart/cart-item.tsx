"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Loader2, AlertTriangle, Trash, Info, Heart, RotateCcw } from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import type { CartItem as CartItemType } from "@/services/cart-service"
import { useToast } from "@/components/ui/use-toast"
import { productService } from "@/services/product"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useWishlistHook } from "@/hooks/use-wishlist"
import { inventoryService } from "@/services/inventory-service"

interface CartItemProps {
  item: CartItemType & {
    product?: {
      name?: string
      description?: string
      sku?: string
      stock?: number
      slug?: string
      image_urls?: string[]
      thumbnail_url?: string
      price?: number
      sale_price?: number | null
      category?: string
      color?: string
      size?: string
    }
  }
  showControls?: boolean
  compact?: boolean
  className?: string
  onRemove?: () => void
  onUpdateQuantity?: (quantity: number) => void
  onSuccess?: (action: "update" | "remove", itemId: number) => void
  stockIssue?: any
  priceChange?: any
  isInvalid?: boolean
}

export function CartItem({
  item,
  showControls = true,
  compact = false,
  className = "",
  onRemove,
  onUpdateQuantity,
  onSuccess,
  stockIssue,
  priceChange,
  isInvalid,
}: CartItemProps) {
  const { updateQuantity, removeItem, pendingOperations } = useCart()
  const [localQuantity, setLocalQuantity] = useState(item.quantity)
  const [productDataLoaded, setProductDataLoaded] = useState(!!item.product?.name)
  const [showStockSuggestion, setShowStockSuggestion] = useState(false)
  const { toast } = useToast()

  const { addToWishlist } = useWishlistHook()
  const [isSavingForLater, setIsSavingForLater] = useState(false)

  const [inventoryData, setInventoryData] = useState<{
    available_quantity: number
    is_in_stock: boolean
    is_low_stock: boolean
    stock_status: "in_stock" | "low_stock" | "out_of_stock"
    last_updated?: string
  } | null>(null)
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)

  // Check if operations are pending for this item
  const isRemovePending = pendingOperations?.has(`remove:${item.product_id}:${item.variant_id || "default"}`)
  const isUpdatePending = pendingOperations?.has(`update:${item.product_id}:${item.variant_id || "default"}`)

  // Update local quantity when item quantity changes from parent
  useEffect(() => {
    if (item.quantity !== localQuantity && !isUpdatePending) {
      setLocalQuantity(item.quantity)
    }
  }, [item.quantity, localQuantity, isUpdatePending])

  useEffect(() => {
    const fetchInventory = async () => {
      if (!item.product_id) return

      setIsLoadingInventory(true)

      try {
        const summary = await inventoryService.getProductInventorySummary(item.product_id, item.variant_id || undefined)

        if (summary) {
          const available = summary.total_available_quantity ?? 0

          const stock_status: "in_stock" | "low_stock" | "out_of_stock" =
            available === 0 ? "out_of_stock" : summary.is_low_stock ? "low_stock" : "in_stock"

          const newInventoryData = {
            available_quantity: available,
            is_in_stock: !!summary.is_in_stock,
            is_low_stock: !!summary.is_low_stock,
            stock_status,
            last_updated: summary.items?.[0]?.last_updated,
          }

          setInventoryData(newInventoryData)
        }
      } catch (error) {
        console.error("Failed to fetch inventory for cart item:", error)
        // Fallback to product stock if inventory fetch fails
        if (item.product?.stock !== undefined) {
          setInventoryData({
            available_quantity: item.product.stock,
            is_in_stock: item.product.stock > 0,
            is_low_stock: item.product.stock > 0 && item.product.stock <= 5,
            stock_status:
              item.product.stock === 0 ? "out_of_stock" : item.product.stock <= 5 ? "low_stock" : "in_stock",
          })
        }
      } finally {
        setIsLoadingInventory(false)
      }
    }

    fetchInventory()
  }, [item.product_id, item.variant_id, item.product?.stock])

  // Effect to load product data if missing
  useEffect(() => {
    if (!item.product?.name || item.product.name.includes("Product ") || !item.product.thumbnail_url) {
      setProductDataLoaded(false)

      const loadProductData = async () => {
        try {
          const product = await productService.getProductForCartItem(item.product_id)
          if (product) {
            // Update the item with product data
            item.product = {
              ...item.product,
              ...product,
              name: product.name || `Product ${item.product_id}`,
              thumbnail_url: product.thumbnail_url || product.image_urls?.[0] || "/placeholder.svg",
              image_urls: product.image_urls || [product.thumbnail_url || "/placeholder.svg"],
            }
            setProductDataLoaded(true)
          }
        } catch (error) {
          console.error(`Failed to load product data for item ${item.product_id}:`, error)
        }
      }

      loadProductData()
    } else {
      setProductDataLoaded(true)
    }
  }, [item, productDataLoaded])

  // Get the best available image URL
  const imageUrl =
    item.product?.thumbnail_url ||
    (item.product?.image_urls && item.product?.image_urls.length > 0 ? item.product?.image_urls[0] : "/placeholder.svg")

  const availableStock = inventoryData?.available_quantity ?? 0

  const isOutOfStock =
    !isLoadingInventory && inventoryData !== null && (!inventoryData?.is_in_stock || availableStock <= 0)
  const exceedsStock =
    !isLoadingInventory && inventoryData !== null && item.quantity > availableStock && availableStock > 0

  // Check if there are any stock issues with this item
  const hasStockIssue = stockIssue || isOutOfStock || exceedsStock

  const stockMessage =
    stockIssue?.message ||
    (isLoadingInventory
      ? "Checking stock..."
      : isOutOfStock
        ? "This item is out of stock"
        : exceedsStock
          ? `Only ${availableStock} available (you have ${item.quantity})`
          : `${availableStock} in stock`)

  // Format variant information if available
  const variantInfo =
    item.variant_id && item.product && typeof item.product === "object"
      ? `${"color" in item.product && item.product.color ? `Color: ${item.product.color}` : ""} ${
          "size" in item.product && item.product.size ? `Size: ${item.product.size}` : ""
        }`
      : ""

  // Check if price has changed
  const hasPriceChanged = priceChange !== undefined
  const oldPrice = hasPriceChanged ? priceChange.old_price : null
  const newPrice = hasPriceChanged ? priceChange.new_price : null
  const priceChangeMessage = hasPriceChanged
    ? `Price changed from ${formatPrice(oldPrice)} to ${formatPrice(newPrice)}`
    : ""

  const handleQuantityChange = useCallback(
    async (newQuantity: number) => {
      if (newQuantity < 1 || isUpdatePending) return

      // If quantity exceeds available stock, show suggestion
      if (availableStock > 0 && newQuantity > availableStock) {
        setShowStockSuggestion(true)
        toast({
          title: "Stock Limit Reached",
          description: `Only ${availableStock} items available. Would you like to adjust to available quantity?`,
          variant: "destructive",
        })
        return
      }

      // Update local state immediately for better UX (optimistic update)
      setLocalQuantity(newQuantity)

      try {
        // If custom handler is provided, use it
        if (onUpdateQuantity) {
          onUpdateQuantity(newQuantity)
          return
        }

        // Otherwise use the context method
        const productId = item.product_id
        if (productId === null || productId === undefined || typeof productId !== "number" || isNaN(productId)) {
          console.error("Invalid product ID:", productId)
          return
        }

        await updateQuantity(productId, newQuantity, item.variant_id || undefined)

        // Call onSuccess if provided
        if (onSuccess) {
          onSuccess("update", productId)
        }

        // Clear stock suggestion if successful
        setShowStockSuggestion(false)

        // Dispatch event for cart validation refresh
        if (availableStock > 0 && newQuantity <= availableStock) {
          window.dispatchEvent(
            new CustomEvent("cart-item-updated", {
              detail: {
                productId,
                variantId: item.variant_id || undefined,
                newQuantity,
                availableStock,
              },
            }),
          )
        }

        toast({
          description: "Quantity updated successfully",
        })
      } catch (error: unknown) {
        // Reset to original quantity on error
        setLocalQuantity(item.quantity)

        const errorResponse = error as {
          response?: {
            data?: { errors?: Array<{ code: string; message: string; available_stock?: number }>; error?: string }
          }
        }

        // Check for specific error types from backend validation
        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors
          const stockError = errors.find((e) => e.code === "out_of_stock" || e.code === "insufficient_stock")

          if (stockError) {
            // Update inventory data if available
            if (stockError.available_stock !== undefined) {
              setInventoryData({
                available_quantity: stockError.available_stock,
                is_in_stock: stockError.available_stock > 0,
                is_low_stock: stockError.available_stock > 0 && stockError.available_stock <= 5,
                stock_status:
                  stockError.available_stock === 0
                    ? "out_of_stock"
                    : stockError.available_stock <= 5
                      ? "low_stock"
                      : "in_stock",
              })
            }

            toast({
              title: stockError.code === "out_of_stock" ? "Out of Stock" : "Insufficient Stock",
              description: stockError.message || "There's an issue with the product stock",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Error",
              description: errors[0]?.message || "Failed to update quantity. Please try again.",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Error",
            description: errorResponse.response?.data?.error || "Failed to update quantity. Please try again.",
            variant: "destructive",
          })
        }
      }
    },
    [
      availableStock,
      isUpdatePending,
      item.product_id,
      item.quantity,
      item.variant_id,
      onSuccess,
      onUpdateQuantity,
      toast,
      updateQuantity,
    ],
  )

  const handleAdjustToAvailableStock = async () => {
    if (availableStock > 0) {
      await handleQuantityChange(availableStock)
      setShowStockSuggestion(false)
    }
  }

  const handleRemove = async () => {
    if (isRemovePending) return

    try {
      // If custom handler is provided, use it
      if (onRemove) {
        onRemove()
        return
      }

      // Otherwise use the context method
      const productId = item.product_id
      if (productId === null || productId === undefined || typeof productId !== "number" || isNaN(productId)) {
        console.error("Invalid product ID:", productId)
        return
      }

      await removeItem(productId, item.variant_id ?? undefined)

      // Call onSuccess if provided
      if (onSuccess) {
        onSuccess("remove", productId)
      }

      toast({
        description: "Item removed from cart",
      })
    } catch (error: unknown) {
      const errorResponse = error as {
        response?: { data?: { errors?: Array<{ code: string; message: string }>; error?: string } }
      }
      console.error("Failed to remove item:", error)

      toast({
        title: "Error",
        description: errorResponse.response?.data?.error || "Failed to remove item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSaveForLater = async () => {
    if (isSavingForLater) return

    setIsSavingForLater(true)
    try {
      // Ensure we have a valid product ID
      if (item.product_id === null || item.product_id === undefined) {
        throw new Error("Invalid product ID")
      }

      // Add the item to the wishlist with proper price
      await addToWishlist(item.product_id, {
        name: item.product?.name || `Product ${item.product_id}`,
        slug: item.product?.slug || `product-${item.product_id}`,
        price: item.product?.price || item.price || 0,
        sale_price: item.product?.sale_price || undefined,
        thumbnail_url: item.product?.thumbnail_url || item.product?.image_urls?.[0] || "/placeholder.svg",
        image_urls: item.product?.image_urls || [item.product?.thumbnail_url || "/placeholder.svg"],
      })

      // Remove from cart if successful
      await removeItem(item.product_id, item.variant_id ?? undefined)

      toast({
        description: "Item saved to wishlist and removed from cart",
      })
    } catch (error) {
      console.error("Error saving item for later:", error)
      toast({
        title: "Error",
        description: "Failed to save item for later. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingForLater(false)
    }
  }

  const StockDisplay = useMemo(() => {
    return (
      <div className="min-h-[24px] flex items-center transition-opacity duration-200">
        {isLoadingInventory ? (
          <p className="text-sm text-gray-600 flex items-center gap-1.5 font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking stock...</span>
          </p>
        ) : !inventoryData ? (
          <p className="text-sm text-gray-500">Stock information unavailable</p>
        ) : isOutOfStock ? (
          <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span>Out of stock</span>
          </p>
        ) : availableStock <= 5 ? (
          <p className="text-sm text-amber-600 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span>Only {availableStock} left in stock</span>
          </p>
        ) : (
          <p className="text-sm text-green-600 font-semibold">
            <span>{availableStock} in stock</span>
          </p>
        )}
      </div>
    )
  }, [isLoadingInventory, inventoryData, isOutOfStock, availableStock])

  // Cherry-styled compact version
  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={item.product?.name || "Product Unavailable"}
            fill
            sizes="64px"
            className="object-cover object-center"
          />
          {hasStockIssue && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white text-xs font-medium px-1">
                {isOutOfStock ? "Out of Stock" : "Stock Issue"}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{item.product?.name || "Loading product..."}</h4>
          {variantInfo && <p className="text-xs text-gray-500">{variantInfo}</p>}
          {item.product?.sku && <p className="text-xs text-gray-500 mt-1">SKU: {item.product.sku}</p>}
          <div className="mt-1">{StockDisplay}</div>
          <p className="text-xs text-gray-500 mt-1">Qty: {localQuantity}</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{formatPrice(item.total)}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, overflow: "hidden" }}
      transition={{ duration: 0.3 }}
      className={`p-4 ${className} ${!item.product || !item.product.name ? "cart-item-unavailable" : ""}`}
    >
      <div className="flex gap-4">
        {/* Product Image */}
        <Link
          href={`/product/${item.product?.slug || item.product_id}`}
          className="relative h-24 w-24 flex-none overflow-hidden rounded-md border bg-muted"
        >
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={item.product?.name || "Product Unavailable"}
            width={96}
            height={96}
            className="h-full w-full object-contain"
          />

          {/* Stock Status Overlay */}
          {hasStockIssue && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <span className="text-white text-xs font-bold px-2 py-1 bg-red-600 rounded-sm">
                {isOutOfStock ? "OUT OF STOCK" : "STOCK ISSUE"}
              </span>
            </div>
          )}

          {/* Unavailable Overlay */}
          {isInvalid && !hasStockIssue && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <span className="text-white text-xs font-bold px-2 py-1 bg-gray-700 rounded-sm">UNAVAILABLE</span>
            </div>
          )}
        </Link>

        {/* Product Details */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Link
                href={`/product/${item.product?.slug || item.product_id}`}
                className="font-medium text-gray-900 hover:text-cherry-700 block"
              >
                {item.product?.name || "Loading product..."}
              </Link>
              {variantInfo && <div className="text-xs text-gray-500 mt-1">{variantInfo}</div>}

              {/* Product description - limited to 2 lines */}
              {item.product?.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.product.description}</p>
              )}

              {/* Product SKU if available */}
              {item.product?.sku && <p className="text-xs text-gray-500 mt-1">SKU: {item.product.sku}</p>}

              <div className="mt-2">{StockDisplay}</div>
            </div>

            {/* Price */}
            <div className="text-right ml-4">
              <div className="text-sm font-bold text-cherry-800">{formatPrice(item.price)}</div>
              {item.price !== item.total && (
                <div className="text-xs text-gray-500">
                  {localQuantity} x {formatPrice(item.price)}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-auto pt-3 gap-3 sm:gap-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quantity Controls */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <button
                  className={`h-8 w-8 flex items-center justify-center transition-colors ${
                    isUpdatePending || localQuantity <= 1 || isOutOfStock || isInvalid
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                  }`}
                  onClick={() =>
                    !isUpdatePending &&
                    !isOutOfStock &&
                    !isInvalid &&
                    localQuantity > 1 &&
                    handleQuantityChange(localQuantity - 1)
                  }
                  disabled={Boolean(
                    isUpdatePending || isRemovePending || localQuantity <= 1 || isOutOfStock || isInvalid,
                  )}
                >
                  <Minus className="h-3 w-3" />
                </button>

                <div className="w-12 text-center text-sm border-x border-gray-200 h-8 flex items-center justify-center relative">
                  <span className={`transition-opacity duration-200 ${isUpdatePending ? "opacity-30" : "opacity-100"}`}>
                    {localQuantity}
                  </span>
                  {isUpdatePending && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-cherry-600" />
                    </div>
                  )}
                </div>

                <button
                  className={`h-8 w-8 flex items-center justify-center transition-colors ${
                    isUpdatePending || isOutOfStock || isInvalid || localQuantity >= availableStock
                      ? "bg-red-300 text-white cursor-not-allowed"
                      : "bg-cherry-700 text-white hover:bg-cherry-800 cursor-pointer"
                  }`}
                  onClick={() =>
                    !isUpdatePending && !isOutOfStock && !isInvalid && handleQuantityChange(localQuantity + 1)
                  }
                  disabled={Boolean(
                    isUpdatePending || isRemovePending || isOutOfStock || isInvalid || localQuantity >= availableStock,
                  )}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-cherry-700 hover:bg-cherry-50 hover:text-cherry-800"
                  onClick={handleRemove}
                  disabled={Boolean(isRemovePending || isUpdatePending)}
                >
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-gray-600 hover:bg-gray-50"
                  onClick={handleSaveForLater}
                  disabled={Boolean(isSavingForLater || isRemovePending || isUpdatePending)}
                >
                  {isSavingForLater ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Heart className="h-3.5 w-3.5 mr-1" />
                  )}
                  {isSavingForLater ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Total Price - Mobile only */}
            <div className="md:hidden text-right">
              <div className="text-sm font-bold text-cherry-800">{formatPrice(item.total)}</div>
            </div>
          </div>

          {/* Enhanced Stock Warning with Action Buttons */}
          <AnimatePresence>
            {hasStockIssue && !isLoadingInventory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div
                  className={`p-3 rounded-lg border ${
                    isOutOfStock
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{isOutOfStock ? "Out of Stock" : "Stock Limit Exceeded"}</p>
                      <p className="text-xs mt-1">{stockMessage}</p>

                      {/* Action buttons for stock issues */}
                      {exceedsStock && availableStock > 0 && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 bg-transparent"
                            onClick={handleAdjustToAvailableStock}
                            disabled={isUpdatePending}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Adjust to {availableStock}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                            onClick={handleRemove}
                            disabled={isRemovePending}
                          >
                            <Trash className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      )}

                      {isOutOfStock && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                            onClick={handleRemove}
                            disabled={isRemovePending}
                          >
                            <Trash className="h-3 w-3 mr-1" />
                            Remove Item
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                            onClick={handleSaveForLater}
                            disabled={isSavingForLater}
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Save for Later
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reservation Notice for valid items */}
          {!hasStockIssue && !isInvalid && !isLoadingInventory && availableStock > 0 && (
            <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>This item is reserved for you. Complete your purchase to secure it.</p>
            </div>
          )}

          {/* Price Change Warning */}
          {hasPriceChanged && !hasStockIssue && (
            <div className="mt-2 flex items-center text-xs bg-amber-50 p-2 rounded-md text-amber-700">
              <Info className="h-3 w-3 mr-1" />
              <span>{priceChangeMessage}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
