"use client"

import { useCart } from "@/contexts/cart/cart-context"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export function CartIndicator() {
  const { itemCount } = useCart()
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevCount, setPrevCount] = useState(itemCount)

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

  return (
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
                  rotate: [0, 15, -15, 0],
                }
              : {}
          }
          transition={{ duration: 0.5 }}
        >
          <ShoppingBag className={`h-5 w-5 transition-colors ${isAnimating ? "text-cherry-800" : ""}`} />
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
  )
}
