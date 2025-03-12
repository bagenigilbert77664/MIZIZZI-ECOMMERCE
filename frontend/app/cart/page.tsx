"use client"

import { Cart } from "@/components/cart/cart"
import { CartProvider } from "@/contexts/cart/cart-context"
import { Suspense } from "react"
import { Loader } from "@/components/ui/loader"

export default function CartPage() {
  return (
    <CartProvider>
      <Suspense
        fallback={
          <div className="flex justify-center p-12">
            <Loader />
          </div>
        }
      >
        <Cart />
      </Suspense>
    </CartProvider>
  )
}
