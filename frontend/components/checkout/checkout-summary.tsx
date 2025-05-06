"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, ShieldCheck, Truck, RefreshCw, Tag, AlertCircle, AlertTriangle } from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"

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
  const { items, subtotal, shipping, total, refreshCart, isLoading, isUpdating, applyCoupon } = useCart()
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const { toast } = useToast()

  // Use a ref to prevent multiple refreshes
  const refreshingRef = useRef(false)

  // Check for out-of-stock items
  const hasOutOfStockItems = items.some(
    (item) => (item.product?.stock ?? 0) <= 0 || item.quantity > (item.product?.stock ?? 0),
  )

  const handleRefreshCart = async () => {
    // Prevent multiple simultaneous refreshes
    if (refreshingRef.current || isUpdating) return

    try {
      refreshingRef.current = true
      await refreshCart()
      setLastRefreshed(new Date())
      toast({
        title: "Cart Updated",
        description: "Your cart has been refreshed with the latest information.",
      })
    } catch (error) {
      console.error("Error refreshing cart:", error)
      toast({
        title: "Update Failed",
        description: "Could not refresh your cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      refreshingRef.current = false
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    setIsApplyingCoupon(true)

    try {
      const success = await applyCoupon(couponCode)

      if (success) {
        // For demo purposes, we'll simulate a discount
        // In a real app, this would come from the backend
        if (couponCode.toUpperCase() === "WELCOME10") {
          const discount = Math.round(subtotal * 0.1) // 10% discount
          setDiscountAmount(discount)
          setCouponApplied(true)
          toast({
            title: "Coupon Applied",
            description: "10% discount has been applied to your order.",
          })
        } else if (couponCode.toUpperCase() === "FREESHIP" && shipping > 0) {
          setDiscountAmount(shipping)
          setCouponApplied(true)
          toast({
            title: "Coupon Applied",
            description: "Free shipping has been applied to your order.",
          })
        }
      }
    } catch (error) {
      console.error("Error applying coupon:", error)
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponApplied(false)
    setDiscountAmount(0)
    setCouponCode("")
    toast({
      title: "Coupon Removed",
      description: "The coupon has been removed from your order.",
    })
  }

  // Calculate final total with discount
  const finalTotal = total - discountAmount

  // Render loading skeleton for cart items
  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden sticky top-6">
        <CardHeader className="bg-cherry-900 text-white border-b px-6 py-4">
          <CardTitle className="text-lg font-semibold text-white">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-4 space-y-5">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-16 w-16 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/4 rounded-md" />
                    <Skeleton className="h-4 w-1/4 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 bg-gray-50 border-t">
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardFooter>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden sticky top-6">
        <CardHeader className="bg-cherry-900 text-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-white">Order Summary</CardTitle>
            {!orderPlaced && items.length > 0 && (
              <div className="text-xs text-white">Updated: {lastRefreshed.toLocaleTimeString()}</div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 py-4 space-y-5">
          {/* Coupon Code */}
          {!couponApplied ? (
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 rounded-lg"
              />
              <Button
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={isApplyingCoupon || !couponCode.trim()}
                className="whitespace-nowrap rounded-lg"
              >
                {isApplyingCoupon ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 p-3 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center">
                <Tag className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm text-green-700 font-medium">
                  Coupon <span className="font-bold">{couponCode}</span> applied
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCoupon}
                className="h-7 text-xs text-gray-600 hover:text-red-600"
              >
                Remove
              </Button>
            </motion.div>
          )}

          {/* Order Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">Items ({items.length})</h3>
              {!orderPlaced && items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshCart}
                  disabled={isUpdating || refreshingRef.current}
                  className="h-7 text-xs"
                >
                  {isUpdating || refreshingRef.current ? (
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
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  {orderPlaced ? "Order has been placed successfully" : "Your cart is empty"}
                </p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      {item.product?.thumbnail_url ||
                      (item.product?.image_urls && item.product?.image_urls.length > 0) ? (
                        <Image
                          src={item.product?.thumbnail_url || item.product?.image_urls[0]}
                          alt={item.product?.name || "Product"}
                          fill
                          sizes="64px"
                          className="object-cover object-center"
                          priority={true}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {item.product?.name || `Product ${item.product_id}`}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.product?.sku && <span className="mr-2">SKU: {item.product.sku}</span>}
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">{formatPrice(item.price)} each</p>
                        <p className="text-sm font-medium text-gray-900">{formatPrice(item.total)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-2 bg-gray-200" />

          {/* Price Summary */}
          <div className="space-y-2">
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

            {couponApplied && (
              <div className="flex justify-between text-sm text-green-600">
                <p>Discount</p>
                <p className="font-medium">-{formatPrice(discountAmount)}</p>
              </div>
            )}

            <Separator className="my-2 bg-gray-200" />

            <div className="flex justify-between text-base font-medium">
              <p className="text-gray-800">Total</p>
              <p className="text-primary font-semibold">{formatPrice(finalTotal)}</p>
            </div>
          </div>

          {shipping > 0 && subtotal > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2"
            >
              <Truck className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>
                Add <span className="font-semibold">{formatPrice(10000 - subtotal)}</span> more to your cart for FREE
                shipping!
              </p>
            </motion.div>
          )}
        </CardContent>

        <CardFooter className="px-6 py-4 bg-gray-50 border-t flex flex-col gap-4">
          {/* Add warning for out of stock items */}
          {hasOutOfStockItems && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
            >
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                <p>Please remove out-of-stock items from your cart before proceeding to checkout.</p>
              </div>
            </motion.div>
          )}
          {activeStep === 2 && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSubmit}
                className="w-full h-12 text-base font-medium gap-2 bg-cherry-900 hover:bg-cherry-800 text-white rounded-lg"
                disabled={
                  isSubmitting || isValidatingCart || orderPlaced || isLoading || isUpdating || hasOutOfStockItems
                }
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
                    Complete Order
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span>Secure checkout</span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
