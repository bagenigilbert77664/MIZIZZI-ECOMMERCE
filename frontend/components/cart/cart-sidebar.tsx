"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ShoppingCart, Plus, Minus, ArrowRight, Truck, Loader2, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useCart, type CartItem } from "@/contexts/cart/cart-context"
import { toast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

export function CartSidebar({ trigger }: { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { items, itemCount, subtotal, shipping, total, isLoading, isUpdating, updateQuantity, removeItem } = useCart()
  const router = useRouter()

  const [isUpdatingItem, setIsUpdatingItem] = useState<number | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle success message visibility
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  // Debug logging
  useEffect(() => {
    if (mounted) {
      console.log("Cart sidebar state:", {
        isLoading,
        itemCount,
        itemsLength: items.length,
        subtotal,
        shipping,
        total,
      })
    }
  }, [mounted, isLoading, items, itemCount, subtotal, shipping, total])

  const handleQuantityChange = async (id: number, quantity: number, isIncrement: boolean) => {
    if (quantity < 1) return
    setIsUpdatingItem(id)

    try {
      await updateQuantity(id, quantity)

      // Only show success message when increasing quantity
      if (isIncrement) {
        setShowSuccess(true)
      }
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

  const defaultTrigger = (
    <Button
      variant="ghost"
      className="relative h-8 sm:h-10 flex items-center gap-1.5 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
      data-cart-trigger="true"
    >
      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
      <span className="text-sm hidden sm:inline">Cart</span>
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
  )

  if (!mounted) {
    return (
      <Button variant="ghost" className="relative h-8 sm:h-10 flex items-center gap-1.5">
        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-sm hidden sm:inline">Cart</span>
      </Button>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white">
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-green-500 text-white px-4 py-2 flex items-center gap-2 text-sm"
            >
              <Check className="h-4 w-4" />
              Product added successfully
            </motion.div>
          )}
        </AnimatePresence>

        <SheetHeader className="border-b px-6 py-5 bg-gradient-to-r from-white to-cherry-50">
          <div>
            <SheetTitle className="text-xl font-semibold tracking-tight text-cherry-950">
              Shopping Cart {itemCount > 0 && `(${itemCount})`}
            </SheetTitle>
            {itemCount > 0 ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <SheetDescription className="text-sm font-medium text-green-700">
                  Free delivery on orders above KSh {(10000).toLocaleString()}
                </SheetDescription>
              </div>
            ) : (
              <SheetDescription className="mt-1 text-sm text-muted-foreground">
                Add items to get started
              </SheetDescription>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <Loader2 className="h-12 w-12 animate-spin text-cherry-600" />
            <p className="text-center text-muted-foreground">Loading your cart...</p>
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
                {items.map((item: CartItem) => (
                  <div key={item.id} className="p-4">
                    <div className="flex gap-4">
                      <Link
                        href={`/product/${item.product.slug || item.product_id}`}
                        className="relative h-24 w-24 flex-none overflow-hidden rounded-md border bg-muted"
                        onClick={() => setIsOpen(false)}
                      >
                        <img
                          src={
                            item.product.thumbnail_url ||
                            (item.product.image_urls && item.product.image_urls.length > 0
                              ? item.product.image_urls[0]
                              : "/placeholder.svg?height=96&width=96")
                          }
                          alt={item.product.name}
                          className="h-full w-full object-contain"
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
                          <div className="flex items-center">
                            <button
                              className="h-8 w-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 transition-colors"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1, false)}
                              disabled={isUpdatingItem === item.id || isUpdating || item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-12 text-center text-sm border-y border-gray-200 h-8 flex items-center justify-center">
                              {isUpdatingItem === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-cherry-900" />
                              ) : (
                                item.quantity
                              )}
                            </span>
                            <button
                              className="h-8 w-8 flex items-center justify-center bg-cherry-600 hover:bg-cherry-700 text-white transition-colors"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1, true)}
                              disabled={isUpdatingItem === item.id || isUpdating}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{formatPrice(item.total)}</span>
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground">{formatPrice(item.price)} each</span>
                            )}
                          </div>
                          <button
                            className="ml-auto text-sm text-cherry-600 px-2 py-1 rounded-md transition-all hover:bg-cherry-900 hover:text-white"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            Remove
                          </button>
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
                  className="w-full bg-cherry-600 hover:bg-cherry-700 text-white gap-2"
                  onClick={handleCheckout}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
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

