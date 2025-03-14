"use client"

import { useState } from "react"
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, Truck, ShieldCheck, Clock, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/contexts/cart/cart-context"
import { toast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

export function CartSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const {
    items,
    itemCount,
    subtotal,
    shipping,
    total,
    isLoading,
    isUpdating,
    updateQuantity,
    removeItem,
    clearCart,
    error,
  } = useCart()
  const router = useRouter()

  const [isUpdatingItem, setIsUpdatingItem] = useState<number | null>(null)
  const [isClearingCart, setIsClearingCart] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)

  const handleQuantityChange = async (id: number, quantity: number) => {
    if (quantity < 1) return
    setIsUpdatingItem(id)
    try {
      await updateQuantity(id, quantity)
      toast({
        description: "Cart updated successfully",
      })
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({
        description: "Failed to update cart",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingItem(null)
    }
  }

  const handleRemoveItem = async (id: number) => {
    if (window.confirm("Are you sure you want to remove this item from your cart?")) {
      setIsUpdatingItem(id)
      try {
        await removeItem(id)
        toast({
          description: "Item removed from cart",
        })
      } catch (error) {
        console.error("Error removing item:", error)
        toast({
          description: "Failed to remove item",
          variant: "destructive",
        })
      } finally {
        setIsUpdatingItem(null)
      }
    }
  }

  const handleClearCart = async () => {
    if (window.confirm("Are you sure you want to clear your entire cart?")) {
      setIsClearingCart(true)
      try {
        await clearCart()
        toast({
          description: "Cart cleared successfully",
        })
      } catch (error) {
        console.error("Error clearing cart:", error)
        toast({
          description: "Failed to clear cart",
          variant: "destructive",
        })
      } finally {
        setIsClearingCart(false)
      }
    }
  }

  const handleCheckout = () => {
    setIsOpen(false)
    router.push("/checkout")
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    setIsApplyingCoupon(true)
    try {
      // This would be implemented with an API call to apply the coupon
      console.log("Applying coupon:", couponCode)
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        description: `Coupon ${couponCode} applied successfully!`,
      })
      setCouponCode("")
    } catch (error) {
      console.error("Error applying coupon:", error)
      toast({
        description: "Failed to apply coupon",
        variant: "destructive",
      })
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 sm:h-10 sm:w-10 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
        >
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
          <AnimatePresence>
            {itemCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2"
              >
                <Badge className="h-3 w-3 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-cherry-600 text-[8px] sm:text-[10px]">
                  {itemCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Shopping Cart ({itemCount})</SheetTitle>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {itemCount > 0 && !error && (
              <Button variant="outline" size="sm" onClick={handleClearCart} disabled={isClearingCart || isUpdating}>
                {isClearingCart || isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  "Clear Cart"
                )}
              </Button>
            )}
          </div>
          <SheetDescription>
            {error
              ? "Please try again or refresh the page"
              : itemCount > 0
                ? `Free delivery on orders above KSh ${(10000).toLocaleString()}`
                : "Add items to get started"}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <Loader2 className="h-12 w-12 animate-spin text-cherry-600" />
            <p className="text-center text-muted-foreground">Loading your cart...</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <div className="text-center">
              <p className="text-lg font-medium text-destructive">{error}</p>
              {error.includes("log in") && (
                <Button className="mt-4" variant="outline" asChild>
                  <Link href="/auth/login">Log In</Link>
                </Button>
              )}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <div className="relative h-32 w-32">
              <motion.div
                initial={{ opacity: 0.5, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                  duration: 2,
                }}
                className="absolute inset-0 rounded-full bg-cherry-100"
              />
              <ShoppingCart className="absolute inset-0 h-32 w-32 text-cherry-300" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Add items to get started</p>
            </div>
            <Button className="mt-4 bg-cherry-600 hover:bg-cherry-700" onClick={() => setIsOpen(false)} asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex gap-4">
                      <Link
                        href={`/product/${item.product.slug || item.product_id}`}
                        className="relative h-24 w-24 flex-none overflow-hidden rounded-md border bg-muted"
                        onClick={() => setIsOpen(false)}
                      >
                        <Image
                          src={item.product.thumbnail_url || "/placeholder.svg?height=96&width=96"}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <Link
                            href={`/product/${item.product.slug || item.product_id}`}
                            className="font-medium hover:text-cherry-600"
                            onClick={() => setIsOpen(false)}
                          >
                            {item.product.name}
                          </Link>
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center rounded-full border">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-l-full"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={isUpdatingItem === item.id || isUpdating || item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-10 text-center text-sm">
                              {isUpdatingItem === item.id ? (
                                <Loader2 className="h-3 w-3 mx-auto animate-spin" />
                              ) : (
                                item.quantity
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-r-full"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={isUpdatingItem === item.id || isUpdating}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{formatPrice(item.total)}</span>
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground">{formatPrice(item.price)} each</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isUpdatingItem === item.id || isUpdating}
                          >
                            {isUpdatingItem === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {/* Delivery Estimate */}
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3" />
                          <span>Estimated delivery: 2-3 business days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code Section */}
              <div className="p-4 border-t">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={isApplyingCoupon}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || isApplyingCoupon}
                  >
                    {isApplyingCoupon ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      "Apply Coupon"
                    )}
                  </Button>
                </div>
              </div>

              {/* Shopping Benefits */}
              <div className="border-t p-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <span>Secure Checkout</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span>Fast Delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span>24/7 Customer Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="border-t p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">VAT (16%)</span>
                    <span>{formatPrice(Math.round(subtotal * 0.16))}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span className="text-lg">{formatPrice(total)}</span>
                </div>
                {shipping > 0 && (
                  <div className="rounded-lg bg-cherry-50 p-3 text-center text-sm text-cherry-600">
                    Add {formatPrice(10000 - subtotal)} more for free delivery
                  </div>
                )}
                <Button
                  className="w-full bg-cherry-600 hover:bg-cherry-700 gap-2"
                  onClick={handleCheckout}
                  disabled={isUpdating || error !== null}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : error ? (
                    "Please fix errors to continue"
                  ) : (
                    <>
                      Proceed to Checkout <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

