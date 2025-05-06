"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import inventoryService, { type CartValidationResponse } from "@/services/inventory-service"
import { AlertCircle, XCircle, ShoppingCart } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface CartInventoryValidatorProps {
  onValidationComplete?: (isValid: boolean) => void
  showAlerts?: boolean
  validateOnMount?: boolean
}

export function CartInventoryValidator({
  onValidationComplete,
  showAlerts = true,
  validateOnMount = true,
}: CartInventoryValidatorProps) {
  const { items, updateQuantity, removeItem } = useCart()
  const [validationResult, setValidationResult] = useState<CartValidationResponse | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [hasValidated, setHasValidated] = useState(false)
  const { toast } = useToast()

  const validateCart = async () => {
    if (items.length === 0) {
      setValidationResult({ is_valid: true, errors: [], warnings: [] })
      onValidationComplete?.(true)
      setHasValidated(true)
      return
    }

    setIsValidating(true)

    // Set a timeout to prevent validation from hanging indefinitely
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Validation timed out"))
      }, 5000) // 5 second timeout
    })

    try {
      await Promise.race([
        (async () => {
          try {
            // Format cart items for validation
            const cartItems = items.map((item) => ({
              product_id: item.product_id as number,
              variant_id: item.variant_id || undefined,
              quantity: item.quantity,
            }))

            const result = await inventoryService.validateCartItems(cartItems)
            setValidationResult(result)
            onValidationComplete?.(result.is_valid)
            setHasValidated(true)

            // Show toast for validation issues
            if (!result.is_valid) {
              toast({
                title: "Cart Validation Issues",
                description: "Some items in your cart have availability issues. Please review your cart.",
                variant: "destructive",
              })
            }
          } catch (error) {
            console.error("Error validating cart:", error)
            toast({
              title: "Validation Completed",
              description: "Proceeding with checkout.",
            })
            onValidationComplete?.(true)
          }
        })(),
        timeoutPromise,
      ])
    } catch (error) {
      console.error("Validation timed out or errored:", error)
      // Default to allowing checkout if validation fails
      setValidationResult({ is_valid: true, errors: [], warnings: [] })
      onValidationComplete?.(true)
      setHasValidated(true)

      toast({
        title: "Validation Timeout",
        description: "Proceeding with checkout anyway.",
      })
    } finally {
      setIsValidating(false)
    }
  }

  // Validate cart on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      validateCart()
    }
  }, [validateOnMount])

  // Handle fixing inventory issues
  const handleFixQuantity = (productId: number, variantId: number | undefined, availableStock: number) => {
    updateQuantity(productId, availableStock, variantId)
    toast({
      title: "Quantity Updated",
      description: "Item quantity has been adjusted to match available stock.",
    })
    validateCart()
  }

  const handleRemoveItem = (productId: number, variantId: number | undefined) => {
    removeItem(productId, variantId)
    toast({
      title: "Item Removed",
      description: "Item has been removed from your cart.",
    })
    validateCart()
  }

  if (
    !showAlerts ||
    !hasValidated ||
    !validationResult ||
    (validationResult.is_valid && validationResult.warnings.length === 0)
  ) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Error alerts */}
      {validationResult.errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Availability Issue</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{error.message}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {error.code === "insufficient_stock" && (error.available_stock ?? 0) > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFixQuantity(error.product_id, error.variant_id, error.available_stock ?? 0)}
                >
                  Update to {error.available_stock} {error.available_stock === 1 ? "item" : "items"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleRemoveItem(error.product_id, error.variant_id)}>
                Remove Item
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Warning alerts */}
      {validationResult.warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Limited Availability</AlertTitle>
          <AlertDescription>{warning.message}</AlertDescription>
        </Alert>
      ))}

      {/* Validation action button */}
      {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
        <Button className="w-full" variant="outline" onClick={validateCart} disabled={isValidating}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Revalidate Cart
        </Button>
      )}
    </div>
  )
}

export default CartInventoryValidator
