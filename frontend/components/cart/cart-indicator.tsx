"use client"

import { useCart } from "@/contexts/cart/cart-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { useCartValidation } from "@/hooks/use-cart-validation"
import { AlertCircle } from "lucide-react"

export function CartIndicator() {
  const { itemCount, items } = useCart()
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevCount, setPrevCount] = useState(itemCount)
  const { toast } = useToast()
  const [lastAddedProduct, setLastAddedProduct] = useState<{
    name: string
    image: string
    price: string
  } | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { isValid, errors, warnings } = useCartValidation({
    validateOnMount: true,
    validateOnCartChange: true,
  })

  useEffect(() => {
    // Only animate when the count increases
    if (itemCount > prevCount) {
      setIsAnimating(true)

      // Reset animation after it completes
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 1000)

      return () => clearTimeout(timer)
    }

    setPrevCount(itemCount)
  }, [itemCount, prevCount])

  useEffect(() => {
    // Listen for cart update events
    const handleCartUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.product) {
        const product = event.detail.product

        // Set the last added product
        setLastAddedProduct({
          name: product.name || "Product",
          image: product.thumbnail_url || "/placeholder.svg",
          price: product.price || "",
        })

        // Show notification
        setShowNotification(true)

        // Show toast notification
        toast({
          title: event.detail.isUpdate ? "Cart Updated" : "Added to Cart",
          description: (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md overflow-hidden border bg-muted">
                <Image
                  src={product.thumbnail_url || "/placeholder.svg"}
                  alt={product.name || "Product"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{product.name || "Product"}</p>
                {product.price && <p className="text-xs text-muted-foreground">${product.price}</p>}
              </div>
            </div>
          ),
          action: (
            <Link href="/cart" className="bg-cherry-800 text-white px-3 py-1 rounded-md text-xs hover:bg-cherry-700">
              View Cart
            </Link>
          ),
        })

        // Hide notification after 3 seconds
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current)
        }

        notificationTimeoutRef.current = setTimeout(() => {
          setShowNotification(false)
        }, 3000)
      }
    }

    document.addEventListener("cart-updated", handleCartUpdate as EventListener)

    // Listen for cart cleared events
    const handleCartCleared = () => {
      // Reset the cart indicator state
      setLastAddedProduct(null)
      setShowNotification(false)
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    }

    document.addEventListener("cart:cleared", handleCartCleared)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdate as EventListener)
      document.removeEventListener("cart:cleared", handleCartCleared)
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    }
  }, [toast])

  return (
    <div className="relative">
      <Link href="/cart" className="relative">
        <Button
          variant="ghost"
          size="icon"
          className={`relative transition-all duration-300 ${isAnimating ? "bg-cherry-50" : ""}`}
          aria-label={`Shopping cart with ${itemCount} items`}
        >
          <motion.div
            animate={
              isAnimating
                ? {
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -5, 0],
                  }
                : {}
            }
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Custom Cart Icon - More realistic like Jumia's */}
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              className={`transition-colors ${isAnimating ? "text-cherry-800" : ""}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.78002 5H18.44C19.5 5 20.16 6.15 19.71 7.14L16.74 13.33C16.5 13.81 16.01 14.14 15.47 14.14H8.00002C7.42002 14.14 6.92002 13.76 6.73002 13.22L4.05002 6.5C3.23002 4.5 4.08002 5 4.78002 5Z"
                className="fill-cherry-800"
              />
              <path
                d="M7.5 18.5C7.5 19.33 6.83 20 6 20C5.17 20 4.5 19.33 4.5 18.5C4.5 17.67 5.17 17 6 17C6.83 17 7.5 17.67 7.5 18.5Z"
                className="fill-cherry-900"
              />
              <path
                d="M17 18.5C17 19.33 16.33 20 15.5 20C14.67 20 14 19.33 14 18.5C14 17.67 14.67 17 15.5 17C16.33 17 17 17.67 17 18.5Z"
                className="fill-cherry-900"
              />
              <path
                d="M8.00002 14.14H15.47C16.01 14.14 16.5 13.81 16.74 13.33L19.71 7.14C20.16 6.15 19.5 5 18.44 5H4.78002"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          <AnimatePresence>
            {itemCount > 0 && (
              <motion.div
                initial={isAnimating ? { scale: 0.5, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  className={`h-5 w-5 p-0 flex items-center justify-center text-white text-xs
                    ${isAnimating ? "bg-cherry-700 ring-2 ring-cherry-200" : "bg-cherry-800"}`}
                >
                  {itemCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </Link>
      {itemCount > 0 && !isValid && (
        <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
          <AlertCircle className="h-3 w-3" />
        </span>
      )}

      {/* Product added notification */}
      <AnimatePresence>
        {showNotification && lastAddedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
          >
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md overflow-hidden border bg-muted">
                  <Image
                    src={lastAddedProduct.image || "/placeholder.svg"}
                    alt={lastAddedProduct.name}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{lastAddedProduct.name}</p>
                  {lastAddedProduct.price && <p className="text-xs text-muted-foreground">${lastAddedProduct.price}</p>}
                  <p className="text-xs text-cherry-600 font-medium mt-1">Added to cart</p>
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Link
                  href="/cart"
                  className="text-xs text-cherry-800 hover:text-cherry-700 font-medium"
                  onClick={() => setShowNotification(false)}
                >
                  View Cart →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
