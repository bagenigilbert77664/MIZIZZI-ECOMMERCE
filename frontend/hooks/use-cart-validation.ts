"use client"

import { useState, useEffect, useCallback } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import type { CartValidationResponse } from "@/services/inventory-service"
import { cartService } from "@/services/cart-service"

interface UseCartValidationProps {
  validateOnMount?: boolean
  validateOnCartChange?: boolean
}

// Define a more comprehensive result type that includes our categorized issues
interface CartValidationResult {
  is_valid: boolean
  errors: CartValidationResponse["errors"]
  warnings: CartValidationResponse["warnings"]
  stockIssues: CartValidationResponse["errors"]
  priceChanges: {
    [key: string]: any
    message: string
    code: string
    product_id: number
    variant_id?: number
    old_price?: number
    new_price?: number
    item_id?: number
  }[]
  invalidItems: CartValidationResponse["errors"]
}

interface UseCartValidationReturn {
  isValid: boolean
  validationResult: CartValidationResult | null
  isValidating: boolean
  hasValidated: boolean
  validateCart: (retries?: number, forceRefresh?: boolean) => Promise<CartValidationResult>
  errors: CartValidationResponse["errors"]
  warnings: CartValidationResponse["warnings"]
}

// Add this function to the useCartValidation hook to categorize validation issues
const categorizeValidationIssues = (validation: CartValidationResponse) => {
  const stockIssues: any[] = []
  const priceChanges: any[] = []
  const invalidItems: any[] = []

  // Process errors
  validation.errors.forEach((error) => {
    if (error.code === "out_of_stock" || error.code === "insufficient_stock") {
      stockIssues.push({
        ...error,
        product_id: error.item_id ? getProductIdFromItemId(error.item_id) : undefined,
      })
    } else if (error.code === "product_inactive" || error.code === "product_not_found") {
      invalidItems.push({
        ...error,
        product_id: error.item_id ? getProductIdFromItemId(error.item_id) : undefined,
      })
    }
  })

  // Process warnings
  validation.warnings.forEach((warning) => {
    if (warning.code === "price_changed") {
      priceChanges.push({
        ...warning,
        product_id: warning.item_id ? getProductIdFromItemId(warning.item_id) : undefined,
      })
    }
  })

  return {
    is_valid: validation.is_valid && stockIssues.length === 0 && invalidItems.length === 0,
    stockIssues,
    priceChanges,
    invalidItems,
    errors: validation.errors,
    warnings: validation.warnings,
  }
}

// Helper function to get product ID from item ID
const getProductIdFromItemId = (itemId: number) => {
  // This is a placeholder - in a real implementation, you would look up the product ID
  // from the cart items using the item ID
  return null
}

/**
 * Hook for validating cart items against inventory
 */
export function useCartValidation({
  validateOnMount = true,
  validateOnCartChange = false,
}: UseCartValidationProps = {}): UseCartValidationReturn {
  const { items, refreshCart } = useCart()
  const [validationResult, setValidationResult] = useState<CartValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [hasValidated, setHasValidated] = useState(false)

  // Update the validateCart function to handle CORS errors gracefully
  const validateCart = useCallback(
    async (retries = 1, forceRefresh = false): Promise<CartValidationResult> => {
      setIsValidating(true)

      try {
        // If force refresh is requested, refresh the cart first
        if (forceRefresh) {
          try {
            await refreshCart()
          } catch (error) {
            console.error("Error refreshing cart before validation:", error)
          }
        }

        // Try to validate the cart, but handle CORS errors gracefully
        try {
          const validation = await cartService.validateCart()
          setValidationResult(validation as any)
          setHasValidated(true)

          // Categorize the validation issues
          const categorized = categorizeValidationIssues(validation)
          return categorized as any
        } catch (error) {
          console.error("Cart validation failed, using fallback:", error)

          // Return a default valid result if validation fails
          const fallbackValidation = {
            is_valid: true,
            errors: [],
            warnings: [
              {
                code: "validation_offline",
                message: "Cart validation is currently offline. Proceeding with checkout.",
              },
            ],
          }

          setValidationResult(fallbackValidation as any)
          setHasValidated(true)

          return {
            is_valid: true,
            stockIssues: [],
            priceChanges: [],
            invalidItems: [],
            errors: [],
            warnings: [
              {
                code: "validation_offline",
                message: "Cart validation is currently offline. Proceeding with checkout.",
              },
            ],
          } as any
        }
      } catch (error) {
        console.error("Error in validateCart:", error)

        // Return a default result for all errors
        return {
          is_valid: true, // Assume valid to not block the user
          stockIssues: [],
          priceChanges: [],
          invalidItems: [],
          errors: [],
          warnings: [
            {
              code: "validation_error",
              message: "Unable to validate cart. Proceeding with checkout.",
            },
          ],
        } as any
      } finally {
        setIsValidating(false)
      }
    },
    [refreshCart],
  )

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      validateCart()
    }
  }, [validateOnMount, validateCart])

  // Validate when cart changes if requested
  useEffect(() => {
    if (validateOnCartChange && hasValidated) {
      validateCart()
    }
  }, [items, validateOnCartChange, hasValidated, validateCart])

  return {
    isValid: validationResult?.is_valid ?? true,
    validationResult,
    isValidating,
    hasValidated,
    validateCart,
    errors: validationResult?.errors || [],
    warnings: validationResult?.warnings || [],
  }
}

export default useCartValidation
