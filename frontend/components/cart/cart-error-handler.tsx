"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RefreshCw, X, CheckCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface CartError {
  id: string
  timestamp: string
  operation: string
  error: any
  context: any
  resolved: boolean
}

export function CartErrorHandler() {
  const { items, refreshCart, validateCart } = useCart()
  const [errors, setErrors] = useState<CartError[]>([])
  const [isFixing, setIsFixing] = useState(false)

  useEffect(() => {
    // Listen for cart errors
    const handleCartError = (event: CustomEvent) => {
      const error: CartError = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        operation: event.detail.operation || "unknown",
        error: event.detail.error,
        context: event.detail.context || {},
        resolved: false,
      }

      setErrors((prev) => [...prev, error])
    }

    document.addEventListener("cart-error", handleCartError as EventListener)

    return () => {
      document.removeEventListener("cart-error", handleCartError as EventListener)
    }
  }, [])

  const analyzeError = (error: CartError) => {
    const { error: err, context } = error

    // Analyze common error patterns
    if (err?.response?.status === 400) {
      if (err.response.data?.errors) {
        return {
          type: "validation_error",
          severity: "high",
          suggestion: "Check input validation",
          details: err.response.data.errors,
        }
      }

      if (err.config?.data) {
        try {
          const requestData = JSON.parse(err.config.data)
          if (requestData.quantity && (requestData.quantity <= 0 || requestData.quantity > 999)) {
            return {
              type: "invalid_quantity",
              severity: "high",
              suggestion: "Quantity must be between 1 and 999",
              details: { quantity: requestData.quantity },
            }
          }

          if (requestData.quantity && requestData.quantity.toString().includes("e")) {
            return {
              type: "scientific_notation",
              severity: "high",
              suggestion: "Scientific notation detected in quantity",
              details: { quantity: requestData.quantity },
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    if (err?.response?.status === 401) {
      return {
        type: "authentication_error",
        severity: "medium",
        suggestion: "User needs to sign in",
        details: {},
      }
    }

    if (err?.response?.status === 404) {
      return {
        type: "not_found",
        severity: "medium",
        suggestion: "Resource not found, may need to refresh",
        details: {},
      }
    }

    return {
      type: "unknown_error",
      severity: "low",
      suggestion: "Check network connection and try again",
      details: {},
    }
  }

  const fixError = async (errorId: string) => {
    setIsFixing(true)

    try {
      const error = errors.find((e) => e.id === errorId)
      if (!error) return

      const analysis = analyzeError(error)

      switch (analysis.type) {
        case "invalid_quantity":
        case "scientific_notation":
          // Try to fix quantity issues by refreshing cart
          await refreshCart()
          toast({
            title: "Cart Refreshed",
            description: "Attempted to fix quantity issues by refreshing cart data",
          })
          break

        case "validation_error":
          // Validate cart and show specific errors
          const validation = await validateCart()
          if (!validation.is_valid) {
            toast({
              title: "Validation Issues Found",
              description: `Found ${validation.errors.length} validation errors`,
              variant: "destructive",
            })
          }
          break

        case "authentication_error":
          toast({
            title: "Authentication Required",
            description: "Please sign in to continue",
            variant: "destructive",
          })
          break

        case "not_found":
          await refreshCart()
          toast({
            title: "Cart Refreshed",
            description: "Refreshed cart data to resolve missing resources",
          })
          break

        default:
          await refreshCart()
          toast({
            title: "Cart Refreshed",
            description: "Attempted general fix by refreshing cart",
          })
      }

      // Mark error as resolved
      setErrors((prev) => prev.map((e) => (e.id === errorId ? { ...e, resolved: true } : e)))
    } catch (fixError) {
      console.error("Error while fixing cart error:", fixError)
      toast({
        title: "Fix Failed",
        description: "Could not automatically fix this error",
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }

  const dismissError = (errorId: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId))
  }

  const clearAllErrors = () => {
    setErrors([])
  }

  const unresolvedErrors = errors.filter((e) => !e.resolved)

  if (unresolvedErrors.length === 0) {
    return null
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Cart Errors ({unresolvedErrors.length})
          </div>
          <Button variant="outline" size="sm" onClick={clearAllErrors}>
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {unresolvedErrors.map((error) => {
          const analysis = analyzeError(error)

          return (
            <div key={error.id} className="bg-white border rounded p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        analysis.severity === "high"
                          ? "destructive"
                          : analysis.severity === "medium"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {analysis.type}
                    </Badge>
                    <span className="text-xs text-gray-500">{error.operation}</span>
                    <span className="text-xs text-gray-400">{new Date(error.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{analysis.suggestion}</p>

                  {Object.keys(analysis.details).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600">Error Details</summary>
                      <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(analysis.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <Button variant="outline" size="sm" onClick={() => fixError(error.id)} disabled={isFixing}>
                    {isFixing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => dismissError(error.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
