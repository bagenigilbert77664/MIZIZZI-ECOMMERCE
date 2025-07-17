"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { AlertTriangle, CheckCircle, RefreshCw, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { validateAndCleanCartItems, type CartValidationResult } from "@/lib/cart-validation-enhanced"

interface EnhancedCartValidatorProps {
  onValidationComplete?: (result: CartValidationResult) => void
  autoClean?: boolean
  showSummary?: boolean
}

export function EnhancedCartValidator({
  onValidationComplete,
  autoClean = false,
  showSummary = true,
}: EnhancedCartValidatorProps) {
  const { items, refreshCart, clearCart } = useCart()
  const [validationResult, setValidationResult] = useState<CartValidationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Validate cart whenever items change
  useEffect(() => {
    if (items.length > 0) {
      const result = validateAndCleanCartItems(items)
      setValidationResult(result)
      onValidationComplete?.(result)

      // Auto-clean if enabled and there are issues
      if (autoClean && !result.isValid && result.cleanedItems) {
        handleAutoClean(result)
      }
    } else {
      setValidationResult(null)
    }
  }, [items, autoClean, onValidationComplete])

  const handleAutoClean = async (result: CartValidationResult) => {
    if (!result.cleanedItems || isProcessing) return

    setIsProcessing(true)
    try {
      // Update localStorage with cleaned items
      if (typeof window !== "undefined") {
        localStorage.setItem("cartItems", JSON.stringify(result.cleanedItems))
      }

      // Refresh cart to apply changes
      await refreshCart()

      const errorCount = result.issues.filter((i) => i.severity === "error").length
      const warningCount = result.issues.filter((i) => i.severity === "warning").length

      toast({
        title: "Cart Cleaned",
        description: `Fixed ${errorCount} errors and ${warningCount} warnings`,
        variant: errorCount > 0 ? "default" : "default",
      })
    } catch (error) {
      console.error("Auto-clean failed:", error)
      toast({
        title: "Cleanup Failed",
        description: "Unable to automatically fix cart issues",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualClean = async () => {
    if (!validationResult?.cleanedItems || isProcessing) return

    setIsProcessing(true)
    try {
      // Update localStorage with cleaned items
      if (typeof window !== "undefined") {
        localStorage.setItem("cartItems", JSON.stringify(validationResult.cleanedItems))
      }

      // Refresh cart
      await refreshCart()

      toast({
        title: "Cart Fixed",
        description: "All issues have been resolved",
      })
    } catch (error) {
      console.error("Manual clean failed:", error)
      toast({
        title: "Fix Failed",
        description: "Unable to fix cart issues",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearProblematicItems = async () => {
    const problemItems = validationResult?.issues.filter((i) => i.severity === "error" && i.itemId).map((i) => i.itemId)

    if (!problemItems?.length || isProcessing) return

    setIsProcessing(true)
    try {
      // Remove problematic items
      const cleanItems = items.filter((item) => !problemItems.includes(item.id))

      if (typeof window !== "undefined") {
        localStorage.setItem("cartItems", JSON.stringify(cleanItems))
      }

      await refreshCart()

      toast({
        title: "Problematic Items Removed",
        description: `Removed ${problemItems.length} corrupted items`,
      })
    } catch (error) {
      console.error("Failed to remove problematic items:", error)
      toast({
        title: "Removal Failed",
        description: "Unable to remove problematic items",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!validationResult || validationResult.isValid) {
    return showSummary ? (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Cart Valid</AlertTitle>
        <AlertDescription className="text-green-700">
          All items in your cart are valid and ready for checkout.
        </AlertDescription>
      </Alert>
    ) : null
  }

  const errorIssues = validationResult.issues.filter((i) => i.severity === "error")
  const warningIssues = validationResult.issues.filter((i) => i.severity === "warning")

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Cart Validation Issues</CardTitle>
          </div>
          <div className="flex gap-2">
            {errorIssues.length > 0 && <Badge variant="destructive">{errorIssues.length} errors</Badge>}
            {warningIssues.length > 0 && (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                {warningIssues.length} warnings
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="text-sm text-amber-700">
          {errorIssues.length > 0 && (
            <p className="font-medium">
              {errorIssues.length} critical issue{errorIssues.length !== 1 ? "s" : ""} found that prevent checkout.
            </p>
          )}
          {warningIssues.length > 0 && (
            <p>
              {warningIssues.length} warning{warningIssues.length !== 1 ? "s" : ""} detected.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleManualClean}
            disabled={isProcessing || !validationResult.cleanedItems}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-1" />
                Fix Issues
              </>
            )}
          </Button>

          {errorIssues.length > 0 && (
            <Button
              onClick={handleClearProblematicItems}
              disabled={isProcessing}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove Problem Items
            </Button>
          )}

          <Button
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
            variant="ghost"
            className="text-amber-700 hover:bg-amber-100"
          >
            {showDetails ? "Hide" : "Show"} Details
          </Button>
        </div>

        {/* Detailed Issues */}
        {showDetails && (
          <div className="space-y-2 border-t border-amber-200 pt-3">
            {validationResult.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm ${
                  issue.severity === "error"
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-yellow-50 border border-yellow-200 text-yellow-700"
                }`}
              >
                <div className="font-medium">{issue.message}</div>
                <div className="text-xs mt-1 opacity-75">{issue.suggestedAction}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
