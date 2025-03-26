"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, ShieldCheck, Truck } from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"

interface CheckoutSummaryProps {
  isSubmitting: boolean
  activeStep: number
  handleSubmit: () => void
  orderPlaced: boolean
  isValidatingCart: boolean
}

export default function CheckoutSummary({
  isSubmitting,
  activeStep,
  handleSubmit,
  orderPlaced,
  isValidatingCart,
}: CheckoutSummaryProps) {
  const { items, subtotal, shipping, total } = useCart()
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return
    setIsApplyingCoupon(true)
    // Simulate API call
    setTimeout(() => {
      setIsApplyingCoupon(false)
      setCouponCode("")
      // Show success message or error
    }, 1000)
  }

  return (
    <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden sticky top-6">
      <CardHeader className="bg-gray-50 border-b px-6">
        <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-4">
        {/* Coupon Code */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode.trim()}>
            {isApplyingCoupon ? "Applying..." : "Apply"}
          </Button>
        </div>

        {/* Order Items */}
        <div className="space-y-3 mb-4">
          <h3 className="font-medium text-gray-700">Items ({items.length})</h3>
          <div className="max-h-48 overflow-y-auto pr-2 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex-1 pr-4">
                  <p className="text-gray-800 font-medium truncate">{item.product.name}</p>
                  <p className="text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium whitespace-nowrap">{formatPrice(item.total)}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Price Summary */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <p className="text-gray-600">Subtotal</p>
            <p className="font-medium">{formatPrice(subtotal)}</p>
          </div>
          <div className="flex justify-between text-sm">
            <p className="text-gray-600">Shipping</p>
            <p className="font-medium">{shipping === 0 ? "Free" : formatPrice(shipping)}</p>
          </div>
          <div className="flex justify-between text-sm">
            <p className="text-gray-600">VAT (16%)</p>
            <p className="font-medium">{formatPrice(Math.round(subtotal * 0.16))}</p>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between text-base font-medium">
            <p className="text-gray-800">Total</p>
            <p className="text-primary font-semibold">{formatPrice(total)}</p>
          </div>
        </div>

        {shipping > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700 flex items-start gap-2">
            <Truck className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>
              Add <span className="font-semibold">{formatPrice(10000 - subtotal)}</span> more to your cart for FREE
              shipping!
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="px-6 py-4 bg-gray-50 border-t flex flex-col gap-4">
        {activeStep === 2 && (
          <Button
            onClick={handleSubmit}
            className="w-full h-12 text-base font-medium gap-2 bg-cherry-900 hover:bg-cherry-800 text-white"
            disabled={isSubmitting || isValidatingCart || orderPlaced}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Processing...
              </>
            ) : (
              <>
                Complete Order
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>Secure checkout</span>
        </div>
      </CardFooter>
    </Card>
  )
}

