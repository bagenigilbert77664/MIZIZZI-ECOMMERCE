"use client"

import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/use-cart"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Cart } from "@/components/cart/cart"

interface CartIndicatorProps {
  className?: string
}

export function CartIndicator({ className }: CartIndicatorProps) {
  const { count, isLoading } = useCart()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)} aria-label="Open cart">
          <ShoppingCart className="h-5 w-5" />
          {!isLoading && count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <div className="py-6">
          <Cart />
        </div>
      </SheetContent>
    </Sheet>
  )
}

