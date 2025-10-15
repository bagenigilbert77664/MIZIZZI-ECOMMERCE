"use client"

import { useState } from "react"
import { AlertTriangle, RefreshCw, Trash2, DollarSign, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { useCart } from "@/contexts/cart/cart-context"
import { productService } from "@/services/product"

interface CartIssue {
  type: "duplicate" | "invalid_price" | "invalid_quantity" | "missing_product"
  message: string
  itemId: number
  productId: number
  suggestedFix?: string
}

interface CartIssueResolverProps {
  issues: CartIssue[]
  onIssuesResolved?: () => void
}

export function CartIssueResolver({ issues, onIssuesResolved }: CartIssueResolverProps) {
  const { items, removeItem, updateQuantity, refreshCart } = useCart()
  const [resolvingItems, setResolvingItems] = useState<Set<number>>(new Set())
  const [isResolving, setIsResolving] = useState(false)

  const handleFixPricing = async (itemId: number, productId: number) => {
    setResolvingItems((prev) => new Set(prev).add(itemId))

    try {
      // Fetch current product data
      const product = await productService.getProduct(productId.toString())

      if (product && product.price > 0) {
        // Update localStorage with correct price
        const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]")
        const updatedItems = cartItems.map((item: any) => {
          if (item.id === itemId) {
            return {
              ...item,
              price: product.sale_price || product.price,
              total: (product.sale_price || product.price) * item.quantity,
              product: {
                ...item.product,
                ...product,
              },
            }
          }
          return item
        })

        localStorage.setItem("cartItems", JSON.stringify(updatedItems))
        await refreshCart()

        toast({
          title: "Price Fixed",
          description: `Updated price for ${product.name}`,
        })
      } else {
        throw new Error("Product not found or has invalid price")
      }
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: "Unable to fix pricing. Consider removing the item.",
        variant: "destructive",
      })
    } finally {
      setResolvingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    setResolvingItems((prev) => new Set(prev).add(itemId))

    try {
      await removeItem(itemId)
      toast({
        title: "Item Removed",
        description: "Problematic item has been removed from your cart",
      })
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: "Unable to remove item",
        variant: "destructive",
      })
    } finally {
      setResolvingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleFixQuantity = async (itemId: number) => {
    setResolvingItems((prev) => new Set(prev).add(itemId))

    try {
      await updateQuantity(itemId, 1) // Reset to safe quantity of 1
      toast({
        title: "Quantity Fixed",
        description: "Item quantity has been reset to 1",
      })
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: "Unable to fix quantity",
        variant: "destructive",
      })
    } finally {
      setResolvingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleResolveAll = async () => {
    setIsResolving(true)

    try {
      for (const issue of issues) {
        if (resolvingItems.has(issue.itemId)) continue

        switch (issue.type) {
          case "invalid_price":
            await handleFixPricing(issue.itemId, issue.productId)
            break
          case "invalid_quantity":
            await handleFixQuantity(issue.itemId)
            break
          case "duplicate":
          case "missing_product":
            await handleRemoveItem(issue.itemId)
            break
        }

        // Small delay between operations
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      onIssuesResolved?.()

      toast({
        title: "All Issues Resolved",
        description: "Your cart has been cleaned up successfully",
      })
    } catch (error) {
      toast({
        title: "Resolution Failed",
        description: "Some issues could not be resolved automatically",
        variant: "destructive",
      })
    } finally {
      setIsResolving(false)
    }
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "invalid_price":
        return <DollarSign className="h-4 w-4" />
      case "invalid_quantity":
        return <Package className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case "invalid_price":
        return "border-red-200 bg-red-50"
      case "invalid_quantity":
        return "border-yellow-200 bg-yellow-50"
      case "duplicate":
        return "border-blue-200 bg-blue-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  if (issues.length === 0) return null

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Cart Issues Found ({issues.length})
          </CardTitle>
          <Button
            onClick={handleResolveAll}
            disabled={isResolving}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isResolving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Resolving...
              </>
            ) : (
              "Resolve All"
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {issues.map((issue, index) => (
          <div key={`${issue.itemId}-${index}`} className={`p-3 rounded-lg border ${getIssueColor(issue.type)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                {getIssueIcon(issue.type)}
                <div>
                  <p className="font-medium text-sm">{issue.message}</p>
                  {issue.suggestedFix && <p className="text-xs opacity-75 mt-1">{issue.suggestedFix}</p>}
                </div>
              </div>

              <div className="flex gap-1">
                {issue.type === "invalid_price" && (
                  <Button
                    onClick={() => handleFixPricing(issue.itemId, issue.productId)}
                    disabled={resolvingItems.has(issue.itemId)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Fix Price
                  </Button>
                )}

                {issue.type === "invalid_quantity" && (
                  <Button
                    onClick={() => handleFixQuantity(issue.itemId)}
                    disabled={resolvingItems.has(issue.itemId)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Fix Qty
                  </Button>
                )}

                <Button
                  onClick={() => handleRemoveItem(issue.itemId)}
                  disabled={resolvingItems.has(issue.itemId)}
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  {resolvingItems.has(issue.itemId) ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
