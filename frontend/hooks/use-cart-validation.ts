"use client"

import { useState, useCallback } from "react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import type { CartItem } from "@/contexts/cart/cart-context"

interface ValidationResult {
  valid: boolean
  items: any[]
  invalidItems: any[]
  stockIssues: any[]
  priceChanges: any[]
  total: number
  item_count: number
}

interface UseCartValidationReturn {
  validateCart: (items: CartItem[]) => Promise<ValidationResult>
  isValidating: boolean
  validationResult: ValidationResult | null
  validationError: string | null
}

const defaultValidationResult: ValidationResult = {
  valid: true,
  items: [],
  invalidItems: [],
  stockIssues: [],
  priceChanges: [],
  total: 0,
  item_count: 0,
}

export function useCartValidation(): UseCartValidationReturn {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { toast } = useToast()

  const validateCart = useCallback(
    async (items: CartItem[]): Promise<ValidationResult> => {
      if (!items || items.length === 0) {
        return defaultValidationResult
      }

      setIsValidating(true)
      setValidationError(null)

      try {
        // Format items for validation
        const itemsToValidate = items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price,
        }))

        // Call validation API
        const response = await api.post("/api/cart/validate", {
          items: itemsToValidate,
        })

        const result = response.data
        setValidationResult(result)

        // Show toast notifications for any issues
        if (!result.valid) {
          // Stock issues
          if (result.stockIssues && result.stockIssues.length > 0) {
            toast({
              title: "Stock Issues",
              description: `Some items in your cart have stock issues. Please review your cart.`,
              variant: "destructive",
            })
          }

          // Price changes
          if (result.priceChanges && result.priceChanges.length > 0) {
            toast({
              title: "Price Changes",
              description: `Prices for some items in your cart have changed. Please review your cart.`,
              variant: "destructive",
            })
          }

          // Invalid items
          if (result.invalidItems && result.invalidItems.length > 0) {
            toast({
              title: "Invalid Items",
              description: `Some items in your cart are no longer available. Please review your cart.`,
              variant: "destructive",
            })
          }
        }

        return result
      } catch (error) {
        console.error("Cart validation error:", error)
        setValidationError("Failed to validate cart. Please try again.")

        toast({
          title: "Validation Error",
          description: "We couldn't validate your cart. Please try again.",
          variant: "destructive",
        })

        return defaultValidationResult
      } finally {
        setIsValidating(false)
      }
    },
    [toast],
  )

  return {
    validateCart,
    isValidating,
    validationResult,
    validationError,
  }
}
