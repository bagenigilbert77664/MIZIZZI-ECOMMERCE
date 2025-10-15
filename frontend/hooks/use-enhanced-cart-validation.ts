"use client"

import { useState, useCallback, useRef } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { validateAndCleanCartItems, type CartValidationResult } from "@/lib/cart-validation-enhanced"
import { toast } from "@/components/ui/use-toast"

export function useEnhancedCartValidation() {
  const { items, refreshCart } = useCart()
  const [validationResult, setValidationResult] = useState<CartValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const lastValidationRef = useRef<number>(0)

  const validateCart = useCallback(
    async (force = false): Promise<CartValidationResult> => {
      const now = Date.now()

      // Prevent too frequent validations (unless forced)
      if (!force && now - lastValidationRef.current < 1000) {
        return validationResult || { isValid: true, issues: [], shouldRefresh: false }
      }

      lastValidationRef.current = now
      setIsValidating(true)

      try {
        // Validate current cart items
        const result = validateAndCleanCartItems(items)
        setValidationResult(result)

        // Auto-apply fixes for certain issues
        if (result.cleanedItems && result.shouldRefresh) {
          const autoFixableIssues = result.issues.filter(
            (issue) => ["duplicate", "invalid_quantity"].includes(issue.type) && issue.severity === "warning",
          )

          if (autoFixableIssues.length > 0 && result.cleanedItems.length > 0) {
            // Update localStorage with cleaned items
            if (typeof window !== "undefined") {
              localStorage.setItem("cartItems", JSON.stringify(result.cleanedItems))
            }

            // Refresh cart
            await refreshCart()

            toast({
              title: "Cart Auto-Fixed",
              description: `Automatically resolved ${autoFixableIssues.length} minor issues`,
            })

            // Update result to reflect fixes
            const updatedResult = { ...result, isValid: true, shouldRefresh: false }
            setValidationResult(updatedResult)
            return updatedResult
          }
        }

        return result
      } catch (error) {
        console.error("Cart validation failed:", error)

        const errorResult: CartValidationResult = {
          isValid: false,
          issues: [
            {
              type: "corruption",
              severity: "error",
              message: "Cart validation failed due to an unexpected error",
              suggestedAction: "Try refreshing the page or clearing your cart",
            },
          ],
          shouldRefresh: true,
        }

        setValidationResult(errorResult)
        return errorResult
      } finally {
        setIsValidating(false)
      }
    },
    [items, refreshCart, validationResult],
  )

  const clearValidation = useCallback(() => {
    setValidationResult(null)
  }, [])

  const hasErrors = validationResult?.issues.some((issue) => issue.severity === "error") ?? false
  const hasWarnings = validationResult?.issues.some((issue) => issue.severity === "warning") ?? false

  return {
    validationResult,
    isValidating,
    validateCart,
    clearValidation,
    hasErrors,
    hasWarnings,
    isValid: validationResult?.isValid ?? true,
  }
}
