"use client"

import { useState, useCallback, useRef } from "react"
import { cartService } from "@/services/cart-service"

interface ValidationIssue {
  product_id: number
  variant_id?: number
  code: string
  message: string
  available_stock?: number
  old_price?: number
  new_price?: number
}

interface ValidationResult {
  isValid: boolean
  stockIssues: ValidationIssue[]
  priceChanges: ValidationIssue[]
  invalidItems: ValidationIssue[]
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

export function useCartValidation() {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  // Add request deduplication
  const pendingValidation = useRef<Promise<ValidationResult> | null>(null)
  const lastValidationTime = useRef<number>(0)
  const validationDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const validateCart = useCallback(
    async (retries = 3, force = false): Promise<ValidationResult> => {
      // Debounce validation calls - don't validate more than once per 2 seconds unless forced
      const now = Date.now()
      if (!force && now - lastValidationTime.current < 2000) {
        console.log("Cart validation debounced - too recent")
        return (
          validationResult || {
            isValid: true,
            stockIssues: [],
            priceChanges: [],
            invalidItems: [],
            errors: [],
            warnings: [],
          }
        )
      }

      // If there's already a pending validation and it's not forced, return that promise
      if (pendingValidation.current && !force) {
        console.log("Reusing pending cart validation request")
        return pendingValidation.current
      }

      // Clear any existing debounce timer
      if (validationDebounceRef.current) {
        clearTimeout(validationDebounceRef.current)
        validationDebounceRef.current = null
      }

      // Create the validation promise
      const validationPromise = (async (): Promise<ValidationResult> => {
        setIsValidating(true)
        lastValidationTime.current = now

        try {
          console.log("Starting cart validation...")
          interface CartValidationResponse {
            is_valid: boolean
            stock_issues?: ValidationIssue[]
            price_changes?: ValidationIssue[]
            invalid_items?: ValidationIssue[]
            errors?: ValidationIssue[]
            warnings?: ValidationIssue[]
          }

          const response = await cartService.validateCart() as CartValidationResponse

          const result: ValidationResult = {
            isValid: response.is_valid || true,
            stockIssues: response.stock_issues || [],
            priceChanges: response.price_changes || [],
            invalidItems: response.invalid_items || [],
            errors: response.errors || [],
            warnings: response.warnings || [],
          }

          setValidationResult(result)
          console.log("Cart validation completed:", result)
          return result
        } catch (error: any) {
          console.error("Cart validation failed:", error)

          // If we have retries left and it's not a client error, retry
          if (retries > 0 && error?.response?.status !== 400 && error?.response?.status !== 401) {
            console.log(`Retrying cart validation... ${retries} retries left`)
            await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second before retry
            return validateCart(retries - 1, force)
          }

          // Return a safe default result on error
          const errorResult: ValidationResult = {
            isValid: true, // Assume valid on error to not block user
            stockIssues: [],
            priceChanges: [],
            invalidItems: [],
            errors: [],
            warnings: [],
          }

          setValidationResult(errorResult)
          return errorResult
        } finally {
          setIsValidating(false)
          pendingValidation.current = null
        }
      })()

      // Store the pending validation
      pendingValidation.current = validationPromise
      return validationPromise
    },
    [validationResult],
  )

  return {
    validateCart,
    isValidating,
    validationResult,
  }
}
