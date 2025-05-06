"use client"

import { useState, useEffect, useCallback } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import inventoryService, { type CartValidationResponse } from "@/services/inventory-service"

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

/**
 * Hook for validating cart items against inventory
 */
export function useCartValidation({
  validateOnMount = true,
  validateOnCartChange = false,
}: UseCartValidationProps = {}): UseCartValidationReturn {
  const { items } = useCart()
  const [validationResult, setValidationResult] = useState<CartValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [hasValidated, setHasValidated] = useState(false)

  const validateCart = useCallback(
    async (retries = 1, forceRefresh = false): Promise<CartValidationResult> => {
      if (items.length === 0) {
        const emptyResult: CartValidationResult = {
          is_valid: true,
          errors: [],
          warnings: [],
          stockIssues: [],
          priceChanges: [],
          invalidItems: [],
        }
        setValidationResult(emptyResult)
        setHasValidated(true)
        return emptyResult
      }

      setIsValidating(true)

      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise<CartValidationResult>((resolve) => {
        setTimeout(() => {
          console.log("Cart validation timed out, returning default valid state")
          resolve({
            is_valid: true,
            errors: [],
            warnings: [{ message: "Validation timed out", code: "timeout" }],
            stockIssues: [],
            priceChanges: [],
            invalidItems: [],
          })
        }, 3000) // 3 second timeout
      })

      try {
        // Race between actual validation and timeout
        const result = await Promise.race([
          (async () => {
            // Format cart items for validation
            const cartItems = items.map((item) => ({
              product_id: item.product_id as number,
              variant_id: item.variant_id || undefined,
              quantity: item.quantity,
            }))

            const result = await inventoryService.validateCartItems(cartItems)

            // Categorize issues for better UI handling
            const stockIssues = result.errors.filter(
              (error) => error.code === "out_of_stock" || error.code === "insufficient_stock",
            )

            const priceChanges = result.warnings
              .filter((warning) => warning.code === "price_changed" && warning.product_id !== undefined)
              .map((warning) => ({
                ...warning,
                product_id: warning.product_id as number,
              }))

            const invalidItems = result.errors.filter(
              (error) =>
                error.code === "product_not_found" ||
                error.code === "product_inactive" ||
                error.code === "variant_not_found",
            )

            return {
              ...result,
              stockIssues,
              priceChanges,
              invalidItems,
            } as CartValidationResult
          })(),
          timeoutPromise,
        ])

        setValidationResult(result)
        setHasValidated(true)
        return result
      } catch (error) {
        console.error("Error validating cart:", error)

        // Return a default valid state to prevent blocking checkout
        const errorResult: CartValidationResult = {
          is_valid: true, // Set to true to allow checkout to proceed
          errors: [],
          warnings: [
            {
              message: "Validation could not be completed, but you can still proceed with checkout",
              code: "validation_error",
            },
          ],
          stockIssues: [],
          priceChanges: [],
          invalidItems: [],
        }

        setValidationResult(errorResult)
        setHasValidated(true)
        return errorResult
      } finally {
        setIsValidating(false)
      }
    },
    [items],
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
