"use client"

import { useState, useCallback } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { cartService } from "@/services/cart-service"

export interface ValidationResult {
  isValid: boolean
  stockIssues: any[]
  priceChanges: any[]
  invalidItems: any[]
  errors: any[]
  warnings: any[]
  hasIssues?: boolean
  error?: string
}

export function useCartValidation() {
  const { cart, items } = useCart()
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  const validateCart = useCallback(
    async (retries = 2): Promise<ValidationResult> => {
      setIsValidating(true)
      setValidationResult(null)

      try {
        // Don't try to call refreshCart on the cart object directly
        // Instead, use the refreshCart function from the cart context
        if (!items || items.length === 0) {
          return {
            isValid: true,
            stockIssues: [],
            priceChanges: [],
            invalidItems: [],
            errors: [],
            warnings: [],
            hasIssues: false,
          }
        }

        // Then validate the cart
        const validation = await cartService.validateCart()

        // Process validation results
        const stockIssues: any[] = []
        const priceChanges: any[] = []
        const invalidItems: any[] = []

        // Process errors
        ;(validation.errors || []).forEach((error) => {
          if (error.code === "out_of_stock" || error.code === "insufficient_stock") {
            stockIssues.push(error)
          } else if (error.code === "price_changed") {
            priceChanges.push(error)
          } else if (error.code === "item_unavailable" || error.code === "product_unavailable") {
            invalidItems.push(error)
          }
        })

        // Process warnings
        ;(validation.warnings || []).forEach((warning) => {
          if (warning.code === "stock_warning") {
            stockIssues.push(warning)
          } else if (warning.code === "price_changed") {
            priceChanges.push(warning)
          }
        })

        const result = {
          isValid: validation.is_valid,
          stockIssues,
          priceChanges,
          invalidItems,
          hasIssues: stockIssues.length > 0 || priceChanges.length > 0 || invalidItems.length > 0,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
        }

        setValidationResult(result)
        return result
      } catch (error) {
        console.error("Error validating cart:", error)

        // Retry logic
        if (retries > 0) {
          console.log(`Retrying cart validation (${retries} attempts left)...`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return validateCart(retries - 1)
        }

        // If all retries fail, return a default result
        const defaultResult = {
          isValid: false,
          stockIssues: [],
          priceChanges: [],
          invalidItems: [],
          errors: [],
          warnings: [],
          hasIssues: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }

        setValidationResult(defaultResult)
        return defaultResult
      } finally {
        setIsValidating(false)
      }
    },
    [items],
  )

  return {
    validateCart,
    isValidating,
    validationResult,
  }
}
