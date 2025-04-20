"use client"

import { useCart } from "@/contexts/cart/cart-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useMediaQuery } from "@/hooks/use-media-query"
import { formatPrice } from "@/lib/utils"

export function CartIndicator() {
  const { itemCount, items } = useCart()
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevCount, setPrevCount] = useState(itemCount)
  const { toast } = useToast()
  const isDesktop = useMediaQuery("(min-width: 768px)")

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

        console.log("Product added to cart:", product)

        // Show toast notification with enhanced styling
        toast({
          title: event.detail.isUpdate ? "Cart Updated" : "Added to Cart",
          description: (
            <div className="flex flex-col gap-1.5">
              <p className="font-medium text-sm">{product.name || "Product"}</p>
              {product.price && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-cherry-800">{formatPrice(Number(product.price))}</p>
                  <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                    {event.detail.isUpdate ? "Updated" : "Added"}
                  </span>
                </div>
              )}
            </div>
          ),
          action: (
            <Link
              href="/cart"
              className="bg-cherry-800 text-white px-3 py-1.5 rounded-md text-xs hover:bg-cherry-700 transition-colors duration-200 font-medium"
            >
              View Cart
            </Link>
          ),
        })
      }
    }

    document.addEventListener("cart-updated", handleCartUpdate as EventListener)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdate as EventListener)
    }
  }, [toast])

  return (
    <div className="relative">
      <Link href="/cart" className="relative">
        <Button
          variant="ghost"
          size={isDesktop ? "default" : "icon"}
          className={`relative transition-all duration-300 ${
            isAnimating ? "bg-cherry-50 shadow-sm" : ""
          } ${isDesktop ? "px-3" : ""} hover:bg-cherry-50 group`}
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
              className={`transition-colors ${isAnimating ? "text-cherry-800" : ""} group-hover:text-cherry-800`}
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

          {/* Show "Cart" text only on desktop */}
          {isDesktop && (
            <span className="ml-1.5 text-sm font-medium group-hover:text-cherry-800 transition-colors">Cart</span>
          )}

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
    </div>
  )
}
