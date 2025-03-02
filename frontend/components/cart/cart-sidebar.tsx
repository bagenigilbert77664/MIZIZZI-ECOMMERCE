"use client"

import { useState } from "react"
import { ShoppingCart, Plus, Minus, Trash2, Heart, ArrowRight, Truck, ShieldCheck, Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useStateContext } from "@/components/providers"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

export function CartSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { state, dispatch } = useStateContext()

  const cartCount = state.cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = state.cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const VAT = Math.round(subtotal * 0.16) // 16% VAT
  const shipping = subtotal > 10000 ? 0 : 500 // Free shipping over KSh 10,000
  const total = subtotal + shipping + VAT

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return
    dispatch({
      type: "UPDATE_QUANTITY",
      payload: { id, quantity },
    })
    toast({
      description: "Cart updated successfully",
    })
  }

  const removeFromCart = (id: number) => {
    dispatch({
      type: "REMOVE_FROM_CART",
      payload: id,
    })
    toast({
      description: "Item removed from cart",
    })
  }

  const moveToWishlist = (item: any) => {
    dispatch({
      type: "TOGGLE_WISHLIST",
      payload: {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
      },
    })
    removeFromCart(item.id)
    toast({
      description: "Item moved to wishlist",
    })
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
            {cartCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2"
              >
                <Badge className="h-3 w-3 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-cherry-600 text-[8px] sm:text-[10px]">
                  {cartCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Shopping Cart ({cartCount})</SheetTitle>
          <SheetDescription>
            {cartCount > 0
              ? `Free delivery on orders above KSh ${(10000).toLocaleString()}`
              : "Add items to get started"}
          </SheetDescription>
        </SheetHeader>

        {state.cart.length === 0 ? (
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
                {state.cart.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex gap-4">
                      <Link
                        href={`/product/${item.id}`}
                        className="relative h-24 w-24 flex-none overflow-hidden rounded-md border bg-muted"
                        onClick={() => setIsOpen(false)}
                      >
                        <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <Link
                            href={`/product/${item.id}`}
                            className="font-medium hover:text-cherry-600"
                            onClick={() => setIsOpen(false)}
                          >
                            {item.name}
                          </Link>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-cherry-600"
                              onClick={() => moveToWishlist(item)}
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center rounded-full border">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-l-full"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-10 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-r-full"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              KSh {(item.price * item.quantity).toLocaleString()}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground">
                                KSh {item.price.toLocaleString()} each
                              </span>
                            )}
                          </div>
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
                    <span>KSh {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">VAT (16%)</span>
                    <span>KSh {VAT.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{shipping === 0 ? "FREE" : `KSh ${shipping.toLocaleString()}`}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span className="text-lg">KSh {total.toLocaleString()}</span>
                </div>
                {shipping > 0 && (
                  <div className="rounded-lg bg-cherry-50 p-3 text-center text-sm text-cherry-600">
                    Add KSh {(10000 - subtotal).toLocaleString()} more for free delivery
                  </div>
                )}
                <Button className="w-full bg-cherry-600 hover:bg-cherry-700 gap-2" asChild>
                  <Link href="/checkout" onClick={() => setIsOpen(false)}>
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

