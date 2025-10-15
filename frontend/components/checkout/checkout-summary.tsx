"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ShieldCheck, Truck, Loader2 } from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"

interface CheckoutSummaryProps {
  isSubmitting?: boolean
  activeStep?: number
  handleSubmit?: () => void
  orderPlaced?: boolean
  isValidatingCart?: boolean
}

export default function CheckoutSummary({
  isSubmitting = false,
  activeStep = 1,
  handleSubmit = () => {},
  orderPlaced = false,
  isValidatingCart = false,
}: CheckoutSummaryProps) {
  const { items, subtotal, shipping, total, refreshCart, isLoading, isUpdating, applyCoupon } = useCart()
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null)
  const [showCouponInput, setShowCouponInput] = useState(false)
  const { toast } = useToast()

  const today = new Date()
  const deliveryStart = new Date(today)
  deliveryStart.setDate(today.getDate() + 5)
  const deliveryEnd = new Date(today)
  deliveryEnd.setDate(today.getDate() + 7)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code")
      return
    }

    setIsApplyingCoupon(true)
    setCouponError(null)
    setCouponSuccess(null)

    // Simulate API call
    setTimeout(() => {
      if (couponCode.toLowerCase() === "discount10") {
        setCouponSuccess("10% discount applied successfully!")
      } else {
        setCouponError("Invalid or expired coupon code")
      }
      setIsApplyingCoupon(false)
    }, 1500)
  }

  // Render loading skeleton for cart items
  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b px-6 py-4">
          <CardTitle className="text-xl font-semibold text-gray-800">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="space-y-5">
            <Skeleton className="h-6 w-32 rounded-md" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-16 w-16 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-1/4 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b px-6 py-4">
        <CardTitle className="text-xl font-semibold text-gray-800">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Cart Items */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Items in Cart ({items?.length || 0})</h3>
          <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
            <AnimatePresence>
              {items?.map((item, index) => (
                <motion.div
                  key={`${item.product_id}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30, delay: index * 0.05 }}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="relative h-16 w-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    {item.product?.thumbnail_url || item.product?.image_urls?.[0] ? (
                      <Image
                        src={item.product?.thumbnail_url || item.product?.image_urls?.[0] || "/placeholder.svg"}
                        alt={item.product?.name || "Product"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{item.product?.name || "Product"}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      <p className="font-medium text-sm">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Processing & Handling</span>
            <span className="font-medium text-green-600">Included</span>
          </div>

          {couponSuccess && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount (10%)</span>
              <span className="font-medium">-{formatPrice((subtotal || 0) * 0.1)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-lg">
              {formatPrice(couponSuccess ? (total || 0) - (subtotal || 0) * 0.1 : total || 0)}
            </span>
          </div>
        </div>

        <div>
          {showCouponInput ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                  disabled={isApplyingCoupon}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon}
                  className="whitespace-nowrap bg-transparent"
                >
                  {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {couponError && <p className="text-xs text-red-500">{couponError}</p>}
              {couponSuccess && <p className="text-xs text-green-600">{couponSuccess}</p>}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-cherry-600 hover:text-cherry-700 hover:bg-cherry-50 p-0 h-auto"
              onClick={() => setShowCouponInput(true)}
            >
              Have a coupon code?
            </Button>
          )}
        </div>

        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="flex items-center text-sm text-gray-700">
            <Truck className="h-4 w-4 mr-2 text-cherry-600" />
            <span className="font-medium">Lightning Fast Delivery</span>
          </div>
          <p className="text-sm text-gray-600 ml-6">
            Get your order delivered the same day! Order now and receive it within hours.
          </p>
          <p className="text-xs text-cherry-600 ml-6 font-medium">
            ⚡ Same-day delivery available for orders placed before 2 PM
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
          <span>Secure Checkout</span>
        </div>
      </CardContent>

      {activeStep === 2 && (
        <CardFooter className="px-6 py-4 bg-gray-50 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isValidatingCart || orderPlaced}
            className="w-full bg-cherry-600 hover:bg-cherry-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isValidatingCart ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating Cart...
              </>
            ) : (
              "Complete Order"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
