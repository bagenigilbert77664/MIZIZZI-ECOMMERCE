"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpDown, Trash2, Plus, Minus, Package2, RefreshCcw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { useAuth } from "@/contexts/auth/auth-context"
import { Loader } from "@/components/ui/loader"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

export function Cart() {
  const {
    items,
    isLoading,
    isUpdating,
    error,
    subtotal,
    shipping,
    total,
    updateQuantity,
    removeItem,
    refreshCart,
    clearCart,
  } = useCart()
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const [sortBy, setSortBy] = useState<string>("default")
  const [localItems, setLocalItems] = useState(items)
  const [isClearing, setIsClearing] = useState(false)

  // Update local items when items change
  useEffect(() => {
    setLocalItems(items)
  }, [items])

  // Sort items based on selected criteria
  const sortedItems = [...localItems].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price
      case "price-desc":
        return b.price - a.price
      case "name-asc":
        return a.product.name.localeCompare(b.product.name)
      case "name-desc":
        return b.product.name.localeCompare(a.product.name)
      default:
        return 0
    }
  })

  // Handle quantity change with optimistic UI update
  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return

    // Update local state immediately for responsive UI
    setLocalItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity, total: item.price * newQuantity } : item,
      ),
    )

    // Send update to server
    await updateQuantity(itemId, newQuantity)
  }

  // Handle item removal with optimistic UI update
  const handleRemoveItem = async (itemId: number) => {
    // Update local state immediately for responsive UI
    setLocalItems((prevItems) => prevItems.filter((item) => item.id !== itemId))

    // Send update to server
    await removeItem(itemId)
  }

  // Handle clearing the cart
  const handleClearCart = async () => {
    if (confirm("Are you sure you want to clear your cart?")) {
      setIsClearing(true)
      await clearCart()
      setIsClearing(false)
    }
  }

  // Handle proceeding to checkout
  const handleCheckout = () => {
    router.push("/checkout")
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated && !isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
            className="mb-4 rounded-full bg-muted p-6"
          >
            <Package2 className="h-12 w-12 text-muted-foreground" />
          </motion.div>
          <h2 className="mb-2 text-lg font-semibold">Please log in to view your cart</h2>
          <p className="mb-6 text-center text-muted-foreground">
            You need to be logged in to manage your shopping cart.
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/auth/login?redirect=/cart">Log In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Your Shopping Cart</h1>
          <p className="mt-2 text-muted-foreground">
            {localItems.length === 0
              ? "Your cart is empty"
              : `${localItems.length} item${localItems.length === 1 ? "" : "s"} in your cart`}
          </p>
        </div>

        <div className="flex gap-2">
          {!isLoading && localItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              disabled={isUpdating || isClearing}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </Button>
          )}

          {!isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshCart()}
              disabled={isUpdating}
              className="flex items-center gap-1"
            >
              <RefreshCcw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader />
            <p className="mt-4 text-muted-foreground">Loading your cart...</p>
          </CardContent>
        </Card>
      ) : localItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
              className="mb-4 rounded-full bg-muted p-6"
            >
              <Package2 className="h-12 w-12 text-muted-foreground" />
            </motion.div>
            <h2 className="mb-2 text-lg font-semibold">Your cart is empty</h2>
            <p className="mb-6 text-center text-muted-foreground">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/products">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cart Items</CardTitle>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      <span>Default</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc">Name: A to Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="divide-y">
              <AnimatePresence initial={false}>
                {sortedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.6,
                    }}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex gap-4">
                      <Link
                        href={`/product/${item.product_id}`}
                        className="relative h-24 w-24 flex-none overflow-hidden rounded-md border bg-muted"
                      >
                        <Image
                          src={item.product.thumbnail_url || "/placeholder.svg?height=96&width=96"}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/product/${item.product_id}`} className="hover:underline">
                              <h3 className="font-medium">{item.product.name}</h3>
                            </Link>
                            <p className="mt-1 text-sm text-muted-foreground">{item.product.category}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isUpdating}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove item</span>
                          </Button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-l-lg"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || isUpdating}
                            >
                              <Minus className="h-3 w-3" />
                              <span className="sr-only">Decrease quantity</span>
                            </Button>
                            <div className="w-12 text-center">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, Number.parseInt(e.target.value) || 1)}
                                disabled={isUpdating}
                                className="w-full border-0 bg-transparent p-0 text-center text-sm [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-r-lg"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={isUpdating}
                            >
                              <Plus className="h-3 w-3" />
                              <span className="sr-only">Increase quantity</span>
                            </Button>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">
                              KSh {(item.price * item.quantity).toLocaleString()}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground">
                                (KSh {item.price.toLocaleString()} each)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? "Free" : `KSh ${shipping.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (16% VAT)</span>
                <span>KSh {Math.round(subtotal * 0.16).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>KSh {(total + Math.round(subtotal * 0.16)).toLocaleString()}</span>
              </div>
              {shipping > 0 && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p>Add KSh {(10000 - subtotal).toLocaleString()} more to your cart for free shipping</p>
                </div>
              )}

              <div className="pt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Apply Coupon</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Input placeholder="Enter coupon code" className="flex-1" />
                  <Button variant="outline" size="sm">
                    Apply
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                size="lg"
                disabled={isLoading || isUpdating || localItems.length === 0}
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </Button>
              <Button variant="outline" className="w-full" size="lg" asChild>
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
