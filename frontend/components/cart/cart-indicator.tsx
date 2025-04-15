"use client"

import { useCart } from "@/contexts/cart/cart-context"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export function CartIndicator() {
  const { itemCount } = useCart()

  return (
    <Link href="/cart" className="relative">
      <Button variant="ghost" size="icon" className="relative" aria-label={`Shopping cart with ${itemCount} items`}>
        <ShoppingBag className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-cherry-800 text-white text-xs">
            {itemCount}
          </Badge>
        )}
      </Button>
    </Link>
  )
}
