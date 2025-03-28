"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, ShieldCheck, Truck, RefreshCw, AlertCircle, CheckCircle2, X } from "lucide-react"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"

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
  const { items, subtotal, shipping, total, refreshCart, isLoading, isUpdating } = useCart()
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [showCouponError, setShowCouponError] = useState(false)
  const [couponErrorMessage, setCouponErrorMessage] = useState("")
  const { toast } = useToast()

  // Use a ref to prevent multiple refreshes
  const refreshingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the coupon input when component mounts
  useEffect(() => {
    if (inputRef.current && !couponApplied && !isLoading && items.length > 0) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 500)
    }
  }, [isLoading, couponApplied, items.length])

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
        variant: "default",
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

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return

    setIsApplyingCoupon(true)
    setShowCouponError(false)

    // Simulate API call for coupon validation
    setTimeout(() => {
      // Demo coupon codes: "WELCOME10" for 10% off, "FREESHIP" for free shipping
      if (couponCode.toUpperCase() === "WELCOME10") {
        const discount = Math.round(subtotal * 0.1) // 10% discount
        setDiscountAmount(discount)
        setCouponApplied(true)

        toast({
          title: "Coupon Applied",
          description: "10% discount has been applied to your order.",
          variant: "default",
        })
      } else if (couponCode.toUpperCase() === "FREESHIP" && shipping > 0) {
        setDiscountAmount(shipping)
        setCouponApplied(true)

        toast({
          title: "Coupon Applied",
          description: "Free shipping has been applied to your order.",
          variant: "default",
        })
      } else {
        setShowCouponError(true)
        setCouponErrorMessage("Invalid or expired coupon code")
      }

      setIsApplyingCoupon(false)
    }, 1000)
  }

  const handleRemoveCoupon = () => {
    setCouponApplied(false)
    setDiscountAmount(0)
    setCouponCode("")

    toast({
      title: "Coupon Removed",
      description: "The coupon has been removed from your order.",
      variant: "default",
    })
  }

  // Calculate final total with discount
  const finalTotal = total - discountAmount

  // Render loading skeleton for cart items
  if (isLoading) {
    return (
      <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden sticky top-6">
        <CardHeader className="bg-gradient-to-r from-cherry-950 to-cherry-900 border-b px-6 py-4">
          <CardTitle className="text-lg font-semibold text-white">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5 space-y-5">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-16 w-16 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 bg-gray-50 border-t">
          <Skeleton className="h-12 w-full" />
        </CardFooter>
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden sticky top-6">
        <CardHeader className="bg-gradient-to-r from-cherry-950 to-cherry-900 border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-white">Order Summary</CardTitle>
            {!orderPlaced && items.length > 0 && (
              <div className="text-xs text-cherry-100">Updated: {lastRefreshed.toLocaleTimeString()}</div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 py-5 space-y-5">
          {/* Coupon Code */}
          <AnimatePresence mode="wait">
            {!couponApplied ? (
              <motion.div
                key="coupon-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value)
                      setShowCouponError(false)
                    }}
                    className="flex-1 border-cherry-100 focus-visible:ring-cherry-500"
                    ref={inputRef}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleApplyCoupon()
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim()}
                    className="whitespace-nowrap border-cherry-200 hover:bg-cherry-50 hover:text-cherry-700"
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

                <AnimatePresence>
                  {showCouponError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-red-500 flex items-center gap-1.5 mt-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      {couponErrorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="coupon-applied"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg flex justify-between items-center border border-green-200"
              >
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800 font-medium">
                    Coupon <span className="font-bold uppercase">{couponCode}</span> applied
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="h-7 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50"
                >
                  Remove
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Order Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-800">Items ({items.length})</h3>
              {!orderPlaced && items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshCart}
                  disabled={isUpdating || refreshingRef.current}
                  className="h-7 text-xs hover:text-cherry-700 hover:bg-cherry-50"
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

            <AnimatePresence mode="wait">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="py-6 text-center"
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    {orderPlaced ? "Order has been placed successfully" : "Your cart is empty"}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="max-h-60 overflow-y-auto pr-2 space-y-3 scrollbar-thin"
                >
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex gap-3 py-2 border-b border-gray-100 last:border-0 group"
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group-hover:border-cherry-200 transition-all duration-300">
                        {item.product.thumbnail_url ||
                        (item.product.image_urls && item.product.image_urls.length > 0) ? (
                          <Image
                            src={item.product.thumbnail_url || item.product.image_urls[0]}
                            alt={item.product.name}
                            fill
                            sizes="64px"
                            className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
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
                          <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-cherry-800 transition-colors duration-300">
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.product.sku && <span className="mr-2">SKU: {item.product.sku}</span>}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator className="my-2" />

          {/* Price Summary */}
          <div className="space-y-2">
            <motion.div
              className="flex justify-between text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <p className="text-gray-600">Subtotal</p>
              <p className="font-medium">{formatPrice(subtotal)}</p>
            </motion.div>

            <motion.div
              className="flex justify-between text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <p className="text-gray-600">Shipping</p>
              <p className="font-medium">{shipping === 0 ? "Free" : formatPrice(shipping)}</p>
            </motion.div>

            <motion.div
              className="flex justify-between text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <p className="text-gray-600">VAT (16%)</p>
              <p className="font-medium">{formatPrice(Math.round(subtotal * 0.16))}</p>
            </motion.div>

            <AnimatePresence>
              {couponApplied && (
                <motion.div
                  className="flex justify-between text-sm text-green-600"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p>Discount</p>
                  <p className="font-medium">-{formatPrice(discountAmount)}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Separator className="my-2" />

            <motion.div
              className="flex justify-between text-base font-medium"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <p className="text-gray-800">Total</p>
              <p className="text-primary font-semibold">{formatPrice(finalTotal)}</p>
            </motion.div>
          </div>

          <AnimatePresence>
            {shipping > 0 && subtotal > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700 flex items-start gap-2 border border-blue-100"
              >
                <Truck className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>
                  Add <span className="font-semibold">{formatPrice(10000 - subtotal)}</span> more to your cart for FREE
                  shipping!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t flex flex-col gap-4">
          {activeStep === 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleSubmit}
                className="w-full h-12 text-base font-medium gap-2 bg-gradient-to-r from-cherry-900 to-cherry-800 hover:from-cherry-800 hover:to-cherry-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                disabled={isSubmitting || isValidatingCart || orderPlaced || isLoading || isUpdating}
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

