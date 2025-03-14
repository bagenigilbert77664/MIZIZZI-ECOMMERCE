import type { Metadata } from "next"
import { Cart } from "@/components/cart/cart"

export const metadata: Metadata = {
  title: "Cart | MIZIZZI E-Commerce",
  description: "View and manage your shopping cart",
}

export default function CartPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <Cart />
    </div>
  )
}

