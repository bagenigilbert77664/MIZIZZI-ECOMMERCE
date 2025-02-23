"use client"

import { useState } from "react"
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useStateContext } from "@/components/providers"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

export function CartSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { state, dispatch } = useStateContext()

  const cartCount = state.cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = state.cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const shipping = subtotal > 10000 ? 0 : 500 // Free shipping over KSh 10,000
  const total = subtotal + shipping

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return
    dispatch({
      type: "UPDATE_QUANTITY",
      payload: { id, quantity },
    })
  }

  const removeFromCart = (id: number) => {
    dispatch({
      type: "REMOVE_FROM_CART",
      payload: id,
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
      <SheetContent className="flex w-full flex-col sm:max-w-lg p-0 bg-white" aria-describedby="cart-description">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Shopping Cart ({cartCount})</SheetTitle>
          <SheetDescription id="cart-description">
            View and manage items in your shopping cart. Free shipping on orders over KSh 10,000.
          </SheetDescription>
        </SheetHeader>

        {state.cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Add items to your cart to checkout</p>
            </div>
            <Button className="mt-4 bg-cherry-600 hover:bg-cherry-700" onClick={() => setIsOpen(false)}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-6">
                {state.cart.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative h-24 w-24 flex-none overflow-hidden rounded-md border bg-muted">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <Link
                          href={`/product/${item.id}`}
                          className="text-sm font-medium hover:text-cherry-600"
                          onClick={() => setIsOpen(false)}
                        >
                          {item.name}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-1 text-sm font-bold">KSh {item.price.toLocaleString()}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : `KSh ${shipping.toLocaleString()}`}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>KSh {total.toLocaleString()}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add KSh {(10000 - subtotal).toLocaleString()} more for free shipping
                  </p>
                )}
                <Button className="w-full bg-cherry-600 hover:bg-cherry-700" asChild>
                  <Link href="/checkout" onClick={() => setIsOpen(false)}>
                    Proceed to Checkout
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

