"use client"

import { useCart } from "@/contexts/cart/cart-context"
import { CartSidebar } from "./cart-sidebar"

export function CartIndicator() {
  const { itemCount } = useCart()

  return (
    <div className="relative">
      <CartSidebar />
    </div>
  )
}