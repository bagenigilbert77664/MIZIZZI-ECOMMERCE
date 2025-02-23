"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useStateContext } from "@/components/providers"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

export function WishlistIndicator() {
  const [isOpen, setIsOpen] = useState(false)
  const { state, dispatch } = useStateContext()

  const removeFromWishlist = (id: number) => {
    dispatch({
      type: "TOGGLE_WISHLIST",
      payload: {
        id,
        name: "", // These fields are required by the type but not needed for removal
        price: 0,
        image: "",
      },
    })
  }

  const moveToCart = (item: { id: number; name: string; price: number; image: string }) => {
    dispatch({
      type: "ADD_TO_CART",
      payload: {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
      },
    })
    removeFromWishlist(item.id)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 sm:h-10 sm:w-10 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
        >
          <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
          <AnimatePresence>
            {state.wishlist.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2"
              >
                <Badge className="h-3 w-3 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-cherry-600 text-[8px] sm:text-[10px]">
                  {state.wishlist.length}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0 bg-white" aria-describedby="wishlist-description">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Wishlist ({state.wishlist.length})</SheetTitle>
          <SheetDescription id="wishlist-description">View and manage your wishlist items</SheetDescription>
        </SheetHeader>

        {state.wishlist.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <Heart className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">Your wishlist is empty</p>
              <p className="text-sm text-muted-foreground">Save items you love to your wishlist</p>
            </div>
            <Button className="mt-4 bg-cherry-600 hover:bg-cherry-700" onClick={() => setIsOpen(false)}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-6">
                {state.wishlist.map((item) => (
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
                          onClick={() => removeFromWishlist(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-1 text-sm font-bold">KSh {item.price.toLocaleString()}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-fit hover:bg-cherry-50 hover:text-cherry-900"
                        onClick={() => moveToCart(item)}
                      >
                        Move to Cart
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Total Items</span>
                  <span>{state.wishlist.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Value</span>
                  <span>KSh {state.wishlist.reduce((total, item) => total + item.price, 0).toLocaleString()}</span>
                </div>
                <Separator />
                <Button className="w-full bg-cherry-600 hover:bg-cherry-700" asChild>
                  <Link href="/wishlist" onClick={() => setIsOpen(false)}>
                    View Wishlist
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full hover:bg-cherry-50 hover:text-cherry-900"
                  onClick={() => {
                    state.wishlist.forEach((item) => moveToCart(item))
                    setIsOpen(false)
                  }}
                >
                  Move All to Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

