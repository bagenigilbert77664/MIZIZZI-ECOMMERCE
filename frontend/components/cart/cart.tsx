"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/hooks/use-cart"
import { formatPrice } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function Cart() {
  const { items, total, count, isLoading, updateQuantity, removeItem, clearCart } = useCart()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState<number | null>(null)

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return
    setIsUpdating(itemId)
    await updateQuantity(itemId, newQuantity)
    setIsUpdating(null)
  }

  const handleRemoveItem = async (itemId: number) => {
    setIsUpdating(itemId)
    await removeItem(itemId)
    setIsUpdating(null)
  }

  const handleCheckout = () => {
    router.push("/checkout")
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Cart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Your cart is empty</h3>
            <p className="text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
            <Button asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Cart ({count} items)</CardTitle>
          <Button variant="outline" size="sm" onClick={clearCart}>
            Clear Cart
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 py-3"
              >
                <div className="relative h-20 w-20 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={item.product.image_url || `/placeholder.svg?height=80&width=80`}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.product.slug || item.product.id}`}
                    className="text-lg font-medium hover:underline line-clamp-1"
                  >
                    {item.product.name}
                  </Link>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatPrice(item.product.discount_price || item.product.price)} each
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={isUpdating === item.id || item.quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    disabled={isUpdating === item.id}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="font-medium">
                    {formatPrice((item.product.discount_price || item.product.price) * item.quantity)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isUpdating === item.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 pt-4">
          <div className="text-lg font-semibold">Total: {formatPrice(total)}</div>
          <Button onClick={handleCheckout} className="w-full sm:w-auto">
            Proceed to Checkout
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

