"use client"

import { useState } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import type { CartValidationError } from "@/services/cart-service"

/**
 * Hook to handle cart validation
 * This provides a convenient way to access and display validation errors and warnings
 */
export function useCartValidation() {
  const { validation, validateCart, refreshCart } = useCart()
  const [isValidating, setIsValidating] = useState(false)

  // Group validation errors by type for easier handling in UI
  const stockErrors =
    validation?.errors?.filter((error) => error.code === "out_of_stock" || error.code === "insufficient_stock") || []

  const productErrors =
    validation?.errors?.filter((error) => error.code === "product_not_found" || error.code === "product_inactive") || []

  const variantErrors =
    validation?.errors?.filter((error) => error.code === "variant_not_found" || error.code === "variant_mismatch") || []

  const otherErrors =
    validation?.errors?.filter(
      (error) => !stockErrors.includes(error) && !productErrors.includes(error) && !variantErrors.includes(error),
    ) || []

  // Function to manually validate the cart
  const runValidation = async () => {
    setIsValidating(true)
    try {
      await validateCart()
    } catch (error) {
      console.error("Error validating cart:", error)
    } finally {
      setIsValidating(false)
    }
  }

  // Get error for a specific item
  const getItemErrors = (itemId: number): CartValidationError[] => {
    return validation?.errors?.filter((error) => error.item_id === itemId) || []
  }

  // Check if an item has any errors
  const hasItemError = (itemId: number): boolean => {
    return getItemErrors(itemId).length > 0
  }

  return {
    validation,
    isValidating,
    runValidation,
    stockErrors,
    productErrors,
    variantErrors,
    otherErrors,
    getItemErrors,
    hasItemError,
    refreshValidation: refreshCart,
  }
}
