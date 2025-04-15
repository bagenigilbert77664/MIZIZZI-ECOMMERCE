"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Truck,
  Clock,
  ChevronRight,
  AlertTriangle,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import { CartItem } from "@/components/cart/cart-item"
import { toast } from "@/components/ui/use-toast"
import { productService } from "@/services/product"
import type { Product } from "@/types"
import { motion, AnimatePresence } from "framer-motion"

export default function CartPage() {
  const { items, subtotal, shipping, total, clearCart, isLoading, applyCoupon, validation, refreshCart } = useCart()

  const [isClearingCart, setIsClearingCart] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Add this useEffect to validate the cart when the page loads
  useEffect(() => {
    if (!isLoading && items.length > 0) {
      const validateCartItems = async () => {
        try {
          await refreshCart()
        } catch (error) {
          console.error("Error validating cart:", error)
        }
      }

      validateCartItems()
    }
  }, [isLoading, items.length, refreshCart])

  // Show success message when item is added to cart
  useEffect(() => {
    const handleCartUpdated = (event: CustomEvent) => {
      if (event.detail?.message) {
        setSuccessMessage(event.detail.message)
      } else {
        setSuccessMessage("Product added to cart successfully")
      }
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    }

    document.addEventListener("cart-updated", handleCartUpdated as EventListener)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdated as EventListener)
    }
  }, [])

  // Fetch recommended products based on cart items
  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      if (!items.length) return

      setIsLoadingRecommendations(true)
      try {
        // Get product IDs from cart items
        const productIds = items.map((item) => item.product_id)

        // Fetch recommended products based on cart items
        // In a real app, you might have a dedicated endpoint for this
        const products = await productService.getProducts({
          limit: 4,
          is_featured: true,
          exclude_ids: productIds.join(","),
        })

        setRecommendedProducts(products || [])
      } catch (error) {
        console.error("Failed to fetch recommended products:", error)
      } finally {
        setIsLoadingRecommendations(false)
      }
    }

    if (mounted && items.length > 0) {
      fetchRecommendedProducts()
    }
  }, [items, mounted])

  const handleClearCart = async () => {
    setIsClearingCart(true)
    try {
      await clearCart()
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      })
    } catch (error) {
      console.error("Failed to clear cart:", error)
      toast({
        title: "Error",
        description: "Failed to clear your cart. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsClearingCart(false)
    }
  }

  // Update the handleApplyCoupon function to better handle backend validation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setIsApplyingCoupon(true)

    try {
      const success = await applyCoupon(couponCode)
      if (success) {
        setCouponCode("")
        toast({
          title: "Coupon Applied",
          description: "Your coupon has been applied successfully",
        })
      }
    } catch (error: any) {
      console.error("Failed to apply coupon:", error)

      // Check for specific error types from backend validation
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors
        toast({
          title: "Invalid Coupon",
          description: errors[0]?.message || "Failed to apply coupon. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Invalid Coupon",
          description: "Failed to apply coupon. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  if (!mounted) return null

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-6 text-gray-600">Loading your cart...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Your cart is empty</h2>
            <p className="text-gray-500 mb-8 max-w-md">
              Looks like you haven't added anything to your cart yet. Browse our products and find something you'll
              love!
            </p>
            <Button asChild size="lg" className="px-8 py-6 h-auto text-base font-medium">
              <Link href="/products">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check for stock issues
  const stockIssues =
    validation?.errors?.filter((error) => error.code === "out_of_stock" || error.code === "insufficient_stock") || []

  // Calculate tax amount for display
  const taxAmount = Math.round(subtotal * 0.16)

  return (
    <div className="container max-w-6xl mx-auto py-10 px-4">
      {/* Success notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-green-500 text-white px-4 py-3 mb-4 rounded-md flex items-center gap-2 text-sm"
          >
            <Check className="h-4 w-4" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-3xl font-bold mb-2 text-gray-800">Shopping Cart</h1>
      <p className="text-gray-500 mb-8">Review your items and proceed to checkout</p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="bg-white shadow-md border-0 rounded-lg overflow-hidden mb-6">
            <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b px-6">
              <CardTitle className="text-lg font-semibold">Cart Items ({items.length})</CardTitle>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-gray-500 hover:text-red-500">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Cart
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all items from your cart. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearCart}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={isClearingCart}
                    >
                      {isClearingCart ? "Clearing..." : "Clear Cart"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent className="px-6 py-0">
              {stockIssues.length > 0 && (
                <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Stock issues detected</p>
                      <ul className="mt-1 text-sm text-amber-700 list-disc pl-5">
                        {stockIssues.map((issue, index) => (
                          <li key={index}>{issue.message}</li>
                        ))}
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={() => refreshCart()}
                      >
                        Refresh Cart
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} onSuccess={() => refreshCart()} />
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between px-6 py-4 bg-gray-50 border-t">
              <Button variant="outline" asChild className="gap-2">
                <Link href="/products">Continue Shopping</Link>
              </Button>
              <span className="text-sm text-gray-500">
                {items.length} {items.length === 1 ? "item" : "items"} in your cart
              </span>
            </CardFooter>
          </Card>

          {/* Shipping & Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="bg-white shadow-sm border-0 rounded-lg overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-50 p-2 mt-1">
                    <Truck className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Free Shipping</h3>
                    <p className="text-sm text-gray-600">On orders over {formatPrice(10000)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-0 rounded-lg overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-50 p-2 mt-1">
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Delivery Time</h3>
                    <p className="text-sm text-gray-600">2-3 business days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          {/* Order Summary */}
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
                  <p className="font-medium">{formatPrice(taxAmount)}</p>
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
                    Add <span className="font-semibold">{formatPrice(10000 - subtotal)}</span> more to your cart for
                    FREE shipping!
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="px-6 py-4 bg-gray-50 border-t flex flex-col gap-4">
              <Button asChild className="w-full h-12 text-base font-medium gap-2">
                <Link href="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Secure checkout</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Recommended Products */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">You might also like</h2>
          <Button variant="link" asChild className="gap-1 text-primary">
            <Link href="/products">
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoadingRecommendations ? (
            // Loading skeletons
            Array(4)
              .fill(0)
              .map((_, index) => <div key={index} className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>)
          ) : recommendedProducts.length > 0 ? (
            // Actual product recommendations
            recommendedProducts.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug || product.id}`}
                className="group relative overflow-hidden rounded-lg border bg-white transition-all hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden">
                  <Image
                    src={product.thumbnail_url || product.image_urls?.[0] || "/placeholder.svg?height=300&width=300"}
                    alt={product.name}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-primary">
                        {formatPrice(product.sale_price || product.price)}
                      </span>
                      {product.sale_price && (
                        <span className="text-xs text-gray-500 line-through">{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {product.is_sale && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Sale</div>
                )}
              </Link>
            ))
          ) : (
            // Fallback message when no recommendations are available
            <div className="col-span-4 text-center py-8 text-gray-500">
              No product recommendations available at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
