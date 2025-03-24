"use client"

import { useCart } from "@/contexts/cart/cart-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ArrowRight, RefreshCw } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import { useEffect, useState } from "react"

interface CheckoutSummaryProps {
  isSubmitting: boolean
  activeStep: number
  handleSubmit: () => void
  orderPlaced?: boolean
  isValidatingCart?: boolean
}

export default function CheckoutSummary({
  isSubmitting,
  activeStep,
  handleSubmit,
  orderPlaced = false,
  isValidatingCart = false,
}: CheckoutSummaryProps) {
  const { items, subtotal, shipping, total, refreshCart } = useCart()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  // Add error state
  const [error, setError] = useState<string | null>(null)

  // Function to manually refresh cart data with error handling
  const handleRefreshCart = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      await refreshCart()
      setLastRefreshed(new Date())
    } catch (error) {
      console.error("Error refreshing cart:", error)
      setError("Failed to refresh cart data")

      // Try to use cached data as fallback
      const cachedCart = localStorage.getItem("guestCart")
      if (cachedCart) {
        try {
          console.log("Using cached cart data as fallback")
          setError("Using cached data. Some information may be outdated.")
        } catch (parseErr) {
          console.error("Error parsing cached cart:", parseErr)
        }
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh cart data when component mounts
  useEffect(() => {
    if (!orderPlaced && items.length > 0) {
      handleRefreshCart()
    }
  }, [])

  return (
    <Card className="border-gray-200 shadow-sm sticky top-24">
      <CardHeader className="bg-gray-50 border-b border-gray-100 flex flex-row justify-between items-center">
        <CardTitle className="text-lg font-medium text-gray-800">Order Summary</CardTitle>
        {!orderPlaced && items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshCart}
            disabled={isRefreshing}
            className="h-8 px-2 text-xs"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700 mb-4">
              {error}
              {error.includes("cached") ? (
                <Button variant="link" onClick={handleRefreshCart} className="ml-2 p-0 h-auto text-red-700 underline">
                  Try again
                </Button>
              ) : null}
            </div>
          )}
          {lastRefreshed && !orderPlaced && items.length > 0 && (
            <p className="text-xs text-gray-500 text-right">Last updated: {lastRefreshed.toLocaleTimeString()}</p>
          )}

          <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                    <Image
                      src={
                        item.product.thumbnail_url ||
                        (item.product.image_urls && item.product.image_urls.length > 0
                          ? item.product.image_urls[0]
                          : "/placeholder.svg?height=64&width=64")
                      }
                      alt={item.product.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formatPrice(item.total)}</p>
                  </div>
                </div>
              ))
            ) : orderPlaced ? (
              <div className="py-3 text-center text-sm text-gray-500">Order has been placed successfully</div>
            ) : (
              <div className="py-3 text-center text-sm text-gray-500">Your cart is empty</div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">VAT (16%)</span>
              <span className="font-medium">{formatPrice(Math.round(subtotal * 0.16))}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="font-medium">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between font-medium">
            <span className="text-gray-900">Total</span>
            <span className="text-xl font-semibold text-cherry-900">{formatPrice(total)}</span>
          </div>

          {shipping > 0 && subtotal > 0 && (
            <div className="rounded-md bg-blue-50 p-3 text-center text-sm text-blue-700">
              Add {formatPrice(10000 - subtotal)} more for free delivery
            </div>
          )}

          {activeStep === 2 && !orderPlaced && (
            <Button
              type="button"
              onClick={handleSubmit}
              className="w-full h-12 mt-4 bg-cherry-900 hover:bg-cherry-800 text-white font-semibold flex items-center justify-center gap-2"
              disabled={isSubmitting || items.length === 0 || isValidatingCart}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : isValidatingCart ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Validating...
                </>
              ) : (
                <>
                  Place Order
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

