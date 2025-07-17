"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Loader2, AlertTriangle, Trash, Info, Heart } from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import {
  formatPrice,
  sanitizeQuantity,
  formatQuantity,
  isScientificNotation,
  fromScientificNotation,
} from "@/lib/utils"
import type { CartItem as CartItemType } from "@/services/cart-service"
import { useToast } from "@/components/ui/use-toast"
import { productService } from "@/services/product"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useWishlist } from "@/contexts/wishlist/wishlist-context"
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
      last_updated?: string
    }
  }
  showControls?: boolean
  compact?: boolean
  onRemove?: () => void
  onUpdateQuantity?: (quantity: number) => void
  onSuccess?: (action: "update" | "remove", itemId: number) => void
  className?: string
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

  // Sanitize the quantity to prevent scientific notation display
  const [localQuantity, setLocalQuantity] = useState(() => {
    let sanitized = sanitizeQuantity(item.quantity)
    if (isScientificNotation(item.quantity)) {
      sanitized = fromScientificNotation(item.quantity)
    }
    return sanitized
  })
  const [productDataLoaded, setProductDataLoaded] = useState(!!item.product?.name)
  const [showStockWarning, setShowStockWarning] = useState(false)
  const isMounted = useRef(true)
  const { toast } = useToast()

  // Use the correct wishlist context
  const { addToWishlist } = useWishlist()
  const [isSavingForLater, setIsSavingForLater] = useState(false)

  // Check if operations are pending for this item
  const isRemovePending = pendingOperations?.has(`remove:${item.product_id}:${item.variant_id || "default"}`)
  const isUpdatePending = pendingOperations?.has(`update:${item.product_id}:${item.variant_id || "default"}`)

  // Apple-style spring animation config
  const springConfig = {
    type: "spring",
    stiffness: 250,
    damping: 25,
  }

  // Update local quantity when item quantity changes from parent, with sanitization
  useEffect(() => {
    let sanitizedItemQuantity = sanitizeQuantity(item.quantity)
    if (isScientificNotation(item.quantity)) {
      sanitizedItemQuantity = fromScientificNotation(item.quantity)
    }
    if (sanitizedItemQuantity !== localQuantity && !isUpdatePending) {
      setLocalQuantity(sanitizedItemQuantity)
    }
  }, [item.quantity, localQuantity, isUpdatePending])

  // Effect to load product data if missing
  useEffect(() => {
    if (!item.product?.name || item.product.name.includes("Product ") || !item.product.thumbnail_url) {
      setProductDataLoaded(false)

      const loadProductData = async () => {
        try {
          const product = await productService.getProduct(item.product_id.toString())
          if (isMounted.current && product) {
            // Update the item with product data
            item.product = {
              ...item.product,
              ...product,
              name: product.name || `Product ${item.product_id}`,
              thumbnail_url: product.thumbnail_url || product.image_urls?.[0] || "/placeholder.svg",
              image_urls: product.image_urls || [product.thumbnail_url || "/placeholder.svg"],
              stock: product.stock, // Update stock from backend
            }
            setProductDataLoaded(true)
          }
        } catch (error) {
          console.error(`Failed to load product data for item ${item.product_id}:`, error)

          // Even if the API call fails, ensure we have some basic product data to display
          if (isMounted.current) {
            item.product = {
              ...item.product,
              name: item.product?.name || `Product ${item.product_id}`,
              thumbnail_url: item.product?.thumbnail_url || "/placeholder.svg",
              image_urls: item.product?.image_urls || ["/placeholder.svg"],
              stock: item.product?.stock || 10, // Default stock
            }
            setProductDataLoaded(true)
          }
        }
      }

      loadProductData()
    } else {
      setProductDataLoaded(true)
    }

    return () => {
      isMounted.current = false
    }
  }, [item, productDataLoaded])

  // Get the best available image URL
  const imageUrl =
    item.product?.thumbnail_url ||
    (item.product?.image_urls && item.product?.image_urls.length > 0 ? item.product?.image_urls[0] : "/placeholder.svg")

  // Check if there are any stock issues with this item
  const hasStockIssue =
    stockIssue || (item.product?.stock !== undefined && (item.product.stock <= 0 || localQuantity > item.product.stock))

  const stockMessage =
    stockIssue?.message ||
    ((item.product?.stock ?? 0) <= 0
      ? "This item is out of stock"
      : `Only ${item.product?.stock} in stock (you have ${localQuantity})`)

  // Format variant information if available
  const variantInfo = item.variant_id
    ? `${"color" in item.product && item.product.color ? `Color: ${item.product.color}` : ""} ${"size" in item.product && item.product.size ? `Size: ${item.product.size}` : ""}`
    : ""

  // Check if price has changed
  const hasPriceChanged = priceChange !== undefined
  const oldPrice = hasPriceChanged ? priceChange.old_price : null
  const newPrice = hasPriceChanged ? priceChange.new_price : null
  const priceChangeMessage = hasPriceChanged
    ? `Price changed from ${formatPrice(oldPrice)} to ${formatPrice(newPrice)}`
    : ""

  // Validate stock availability with proper bounds checking
  const _validateStockAvailability = (quantity: number): boolean => {
    let sanitizedQuantity = sanitizeQuantity(quantity)
    if (isScientificNotation(quantity)) {
      sanitizedQuantity = fromScientificNotation(quantity)
    }

    // Check if we have product stock information
    if (item.product?.stock !== undefined) {
      if (sanitizedQuantity > item.product.stock) {
        toast({
          title: "Stock Limit Reached",
          description: `Only ${item.product.stock} items available in stock.`,
          variant: "destructive",
        })
        return false
      }
    } else {
      // If no stock info available, use a reasonable default limit
      const defaultMaxQuantity = 30
      if (sanitizedQuantity > defaultMaxQuantity) {
        toast({
          title: "Quantity Limit",
          description: `Maximum ${defaultMaxQuantity} items allowed per product.`,
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  // Handle quantity change with proper validation
  const handleQuantityChange = async (newQuantity: number) => {
    let sanitizedQuantity = sanitizeQuantity(newQuantity)
    if (isScientificNotation(newQuantity)) {
      sanitizedQuantity = fromScientificNotation(newQuantity)
    }

    if (sanitizedQuantity < 1 || isUpdatePending) return

    // Check real-time inventory before updating
    try {
      const availabilityCheck = await inventoryService.checkAvailability(
        item.product_id,
        sanitizedQuantity,
        item.variant_id || undefined,
      )

      if (!availabilityCheck.is_available) {
        toast({
          title: "Stock Limit Reached",
          description: `Only ${availabilityCheck.available_quantity} items available in stock.`,
          variant: "destructive",
        })

        // Reset to current quantity if validation fails
        setLocalQuantity(sanitizeQuantity(item.quantity))
        return
      }

      if (sanitizedQuantity > availabilityCheck.available_quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${availabilityCheck.available_quantity} items available.`,
          variant: "destructive",
        })

        // Reset to current quantity if validation fails
        setLocalQuantity(sanitizeQuantity(item.quantity))
        return
      }
    } catch (error: any) {
      console.warn("Could not verify inventory, proceeding with existing validation:", error)

      // Fallback to existing validation
      if (!_validateStockAvailability(sanitizedQuantity)) {
        setLocalQuantity(sanitizeQuantity(item.quantity))
        return
      }
    }

    // Update local state immediately for better UX
    setLocalQuantity(sanitizedQuantity)

    try {
      // If custom handler is provided, use it
      if (onUpdateQuantity) {
        onUpdateQuantity(sanitizedQuantity)
        return
      }

      // Otherwise use the context method
      const productId = item.product_id
      if (productId === null || productId === undefined || typeof productId !== "number" || isNaN(productId)) {
        console.error("Invalid product ID:", productId)
        setLocalQuantity(sanitizeQuantity(item.quantity))
        return
      }

      try {
        const success = await updateQuantity(productId, sanitizedQuantity, item.variant_id || undefined)

        if (success) {
          if (onSuccess) {
            onSuccess("update", productId)
          }

          // Dispatch inventory update event
          document.dispatchEvent(
            new CustomEvent("inventory-updated", {
              detail: {
                productId: productId,
                quantityChanged: sanitizedQuantity - item.quantity,
              },
            }),
          )

          if (item.product?.stock !== undefined && sanitizedQuantity <= item.product.stock) {
            window.dispatchEvent(
              new CustomEvent("cart-item-updated", {
                detail: {
                  productId,
                  variantId: item.variant_id || undefined,
                  newQuantity: sanitizedQuantity,
                  availableStock: item.product.stock,
                },
              }),
            )
          }
        } else {
          setLocalQuantity(sanitizeQuantity(item.quantity))
          console.warn("Failed to update quantity, reverted to original")
        }
      } catch (error: unknown) {
        console.error("Failed to update quantity:", error)

        const errorResponse = error as {
          response?: {
            status?: number
            data?: { errors?: Array<{ code: string; message: string; available_stock?: number }>; error?: string }
          }
          message?: string
        }

        // Always reset to original quantity on error
        setLocalQuantity(sanitizeQuantity(item.quantity))

        // Handle specific error types
        if (errorResponse.response?.status === 400) {
          // Bad request - show specific error message
          const errorMessage =
            errorResponse.response.data?.error ||
            errorResponse.response.data?.errors?.[0]?.message ||
            "Invalid quantity update request"

          toast({
            title: "Update Failed",
            description: errorMessage,
            variant: "destructive",
          })
        } else if (errorResponse.response?.status === 401) {
          // Authentication error - don't show additional toast as context handles it
          console.warn("Authentication error during quantity update")
        } else if (errorResponse.response?.data?.errors) {
          // Validation errors from backend
          const errors = errorResponse.response.data.errors
          const firstError = errors[0]

          switch (firstError.code) {
            case "out_of_stock":
            case "insufficient_stock":
              toast({
                title: firstError.code === "out_of_stock" ? "Out of Stock" : "Insufficient Stock",
                description: firstError.message || "There is not enough stock available.",
                variant: "destructive",
              })
              break
            default:
              toast({
                title: "Error",
                description: firstError.message || "Failed to update quantity.",
                variant: "destructive",
              })
          }
        } else if (errorResponse.message && !errorResponse.message.includes("offline mode")) {
          // Show error for other types of errors (but not offline mode successes)
          toast({
            title: "Error",
            description: errorResponse.message,
            variant: "destructive",
          })
        }
      }
    } catch (error: unknown) {
      // Reset to original quantity on unexpected error
      setLocalQuantity(sanitizeQuantity(item.quantity))
      console.error("Unexpected error in handleQuantityChange:", error)

      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
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

      const success = await removeItem(productId, item.variant_id ?? undefined)

      // Call onSuccess if provided and removal was successful
      if (success && onSuccess) {
        onSuccess("remove", productId)
      }
    } catch (error: unknown) {
      const errorResponse = error as {
        response?: {
          status?: number
          data?: { errors?: Array<{ code: string; message: string }>; error?: string }
        }
      }
      console.error("Failed to remove item:", error)

      // Only show error toast if it's not an authentication error that was handled gracefully
      if (!errorResponse.response || errorResponse.response.status !== 401) {
        // Check for specific error types from backend validation
        if (errorResponse.response?.data?.error) {
          toast({
            title: "Error",
            description: errorResponse.response.data.error,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to remove item. Please try again.",
            variant: "destructive",
          })
        }
      }
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
              <span className="text-white text-xs font-medium px-1">Out of Stock</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{item.product?.name || "Loading product..."}</h4>
          {variantInfo && <p className="text-xs text-gray-500">{variantInfo}</p>}
          {item.product?.sku && <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>}
          <p className="text-xs text-gray-500">Qty: {formatQuantity(localQuantity)}</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{formatPrice(item.total)}</p>
        </div>
      </div>
    )
  }

  // Main cart item display
  return (
    <motion.div
      key={`cart-item-${item.product_id}-${item.variant_id || "default"}`}
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

          {/* Out of Stock Overlay */}
          {hasStockIssue && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <span className="text-white text-xs font-bold px-2 py-1 bg-red-600 rounded-sm">
                {item.product?.stock === 0 ? "OUT OF STOCK" : "STOCK ISSUE"}
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
            <div>
              <Link
                href={`/product/${item.product?.slug || item.product_id}`}
                className="font-medium text-gray-900 hover:text-cherry-700"
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
            </div>

            {/* Price */}
            <div className="text-right">
              <div className="text-sm font-bold text-cherry-800">{formatPrice(item.price)}</div>
              {item.price !== item.total && (
                <div className="text-xs text-gray-500">
                  {formatQuantity(localQuantity)} x {formatPrice(item.price)}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-auto pt-3 gap-3 sm:gap-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quantity Controls */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  style={{
                    backgroundColor:
                      isUpdatePending || localQuantity <= 1 || hasStockIssue || isInvalid
                        ? "rgb(243 244 246)"
                        : "rgb(243 244 246)",
                    color:
                      isUpdatePending || localQuantity <= 1 || hasStockIssue || isInvalid
                        ? "rgb(156 163 175)"
                        : "rgb(75 85 99)",
                    cursor:
                      isUpdatePending || localQuantity <= 1 || hasStockIssue || isInvalid ? "not-allowed" : "pointer",
                  }}
                  className={`h-8 w-8 flex items-center justify-center ${
                    isUpdatePending || localQuantity <= 1 || hasStockIssue || isInvalid ? "" : "hover:bg-gray-200"
                  }`}
                  onClick={() =>
                    !isUpdatePending && !hasStockIssue && !isInvalid && handleQuantityChange(localQuantity - 1)
                  }
                  disabled={Boolean(
                    isUpdatePending || isRemovePending || localQuantity <= 1 || hasStockIssue || isInvalid,
                  )}
                >
                  <Minus className="h-3 w-3" />
                </motion.button>
                <div className="w-10 text-center text-sm border-x border-gray-200 h-8 flex items-center justify-center relative overflow-hidden">
                  {isUpdatePending ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-white"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-cherry-600" />
                    </motion.div>
                  ) : null}
                  <span className={isUpdatePending ? "opacity-0" : ""}>{formatQuantity(localQuantity)}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  style={{
                    backgroundColor:
                      isUpdatePending ||
                      hasStockIssue ||
                      isInvalid ||
                      (item.product?.stock !== undefined && localQuantity >= item.product.stock)
                        ? "rgb(251 113 133)"
                        : "rgb(153 27 52)",
                    color: "rgb(255 255 255)",
                    cursor:
                      isUpdatePending ||
                      hasStockIssue ||
                      isInvalid ||
                      (item.product?.stock !== undefined && localQuantity >= item.product.stock)
                        ? "not-allowed"
                        : "pointer",
                  }}
                  className={`h-8 w-8 flex items-center justify-center ${
                    isUpdatePending ||
                    hasStockIssue ||
                    isInvalid ||
                    (item.product?.stock !== undefined && localQuantity >= item.product.stock)
                      ? ""
                      : "hover:bg-cherry-800"
                  }`}
                  onClick={() =>
                    !isUpdatePending &&
                    !hasStockIssue &&
                    !isInvalid &&
                    !(item.product?.stock !== undefined && localQuantity >= item.product.stock) &&
                    handleQuantityChange(localQuantity + 1)
                  }
                  disabled={Boolean(
                    isUpdatePending ||
                      isRemovePending ||
                      hasStockIssue ||
                      isInvalid ||
                      (item.product?.stock !== undefined && localQuantity >= item.product.stock),
                  )}
                >
                  <Plus className="h-3 w-3" />
                </motion.button>
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

          {/* Stock Warning */}
          {hasStockIssue && (
            <div className="mt-2 flex items-center text-xs text-red-600 bg-red-50 p-2 rounded-md">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>{stockMessage}</span>
            </div>
          )}

          {!hasStockIssue && item.product?.stock !== undefined && (
            <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm text-blue-700 flex items-start gap-2">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>This item is reserved for you. Complete your purchase to secure it.</p>
            </div>
          )}

          {!hasStockIssue && item.product?.stock !== undefined && item.product.stock <= 10 && (
            <div className="mt-2 p-3 bg-amber-50 rounded-md text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Low Stock Alert</p>
                <p>Only {item.product.stock} items remaining. Secure yours now!</p>
              </div>
            </div>
          )}

          {/* Price Change Warning */}
          {hasPriceChanged && !hasStockIssue && (
            <div className="mt-2 flex items-center text-xs bg-amber-50 p-2 rounded-md text-amber-700">
              <Info className="h-3 w-3 mr-1" />
              <span>{priceChangeMessage}</span>
            </div>
          )}

          {/* Real-time stock status */}
          {item.product?.stock !== undefined && (
            <div className="mt-2 text-xs text-gray-500">
              Stock: {item.product.stock} available
              {item.product.last_updated && (
                <span className="ml-2">• Updated {new Date(item.product.last_updated).toLocaleTimeString()}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
