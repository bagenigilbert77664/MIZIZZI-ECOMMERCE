"use client"

import { SheetTrigger } from "@/components/ui/sheet"
import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBag, X, AlertTriangle, ArrowRight, Check, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/contexts/cart/cart-context"
import { formatPrice } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import { CartItem } from "./cart-item"

export function CartSidebar({ trigger }: { trigger?: React.ReactNode }) {
  const { items, itemCount, subtotal, shipping, total, isLoading, isUpdating, validation, refreshCart } = useCart()

  const [isOpen, setIsOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show success message when item is added to cart
  useEffect(() => {
    const handleCartUpdated = () => {
      if (isOpen) return // Don't show success if sidebar is already open

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    }

    document.addEventListener("cart-updated", handleCartUpdated)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdated)
    }
  }, [isOpen])

  // Listen for open-sidebar-cart event
  useEffect(() => {
    const handleOpenCart = () => {
      setIsOpen(true)
    }

    document.addEventListener("open-sidebar-cart", handleOpenCart)

    return () => {
      document.removeEventListener("open-sidebar-cart", handleOpenCart)
    }
  }, [])

  // Add this useEffect to validate the cart when it's opened
  useEffect(() => {
    if (isOpen && !isLoading && items.length > 0) {
      // Validate the cart when opened
      const validateCartItems = async () => {
        try {
          await refreshCart()
        } catch (error) {
          console.error("Error validating cart:", error)
        }
      }

      validateCartItems()
    }
  }, [isOpen, isLoading, items.length, refreshCart])

  // Update the hasStockIssues check to be more comprehensive
  const hasStockIssues =
    validation?.errors?.some(
      (error) =>
        error.code === "out_of_stock" ||
        error.code === "insufficient_stock" ||
        error.code === "product_inactive" ||
        error.code === "variant_not_found",
    ) || false

  const defaultTrigger = (
    <Button variant="ghost" className="relative h-8 sm:h-10 flex items-center gap-1.5" data-cart-trigger="true">
      <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
      <span className="text-sm hidden sm:inline">Cart</span>
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-1 -top-1 h-3 w-3 sm:h-5 sm:w-5 p-0 flex items-center justify-center rounded-full bg-cherry-600 text-[8px] sm:text-[10px] text-white"
          >
            {itemCount}
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  )

  if (!mounted) {
    return (
      <Button variant="ghost" className="relative h-8 sm:h-10 flex items-center gap-1.5">
        <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-sm hidden sm:inline">Cart</span>
      </Button>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0">
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

        <SheetHeader className="border-b px-6 py-4 bg-gradient-to-r from-white to-cherry-50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Your Cart ({itemCount})</SheetTitle>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close cart</span>
            </Button>
          </div>
        </SheetHeader>

        {hasStockIssues && (
          <div className="mt-4 p-3 bg-cherry-50 border border-cherry-200 rounded-md flex items-start mx-4">
            <AlertTriangle className="h-5 w-5 text-cherry-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-cherry-800">
              <p className="font-medium">Stock issues detected</p>
              <p>Some items in your cart have stock issues. Please review your cart before checkout.</p>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-5 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <Loader2 className="h-12 w-12 animate-spin text-cherry-600" />
              <p className="text-center text-muted-foreground">Loading your cart...</p>
            </div>
          ) : items.length > 0 ? (
            <>
              <ScrollArea className="flex-1">
                <div className="space-y-6 px-6">
                  {items.map((item) => (
                    <CartItem key={item.id} item={item} onSuccess={() => refreshCart()} />
                  ))}
                </div>
              </ScrollArea>
              <div className="space-y-4 px-6 pb-6">
                <Separator />
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (16%)</span>
                    <span>{formatPrice(Math.round(subtotal * 0.16))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>{shipping > 0 ? formatPrice(shipping) : "Free"}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-cherry-600 hover:bg-cherry-700 gap-2"
                  asChild
                  disabled={items.length === 0 || hasStockIssues || isUpdating}
                >
                  <Link href="/checkout">
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setIsOpen(false)}>
                  Continue Shopping
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-2 p-8">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
              <div className="text-xl font-medium">Your cart is empty</div>
              <div className="text-sm text-muted-foreground">Add items to your cart to see them here.</div>
              <Button
                size="sm"
                className="mt-4 bg-cherry-600 hover:bg-cherry-700"
                onClick={() => setIsOpen(false)}
                asChild
              >
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
