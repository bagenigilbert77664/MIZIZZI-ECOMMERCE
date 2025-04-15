"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AddToCartNotificationProps {
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left" | "top-center" | "bottom-center"
}

export function AddToCartNotification({ position = "bottom-right" }: AddToCartNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [message, setMessage] = useState("Item added to cart")

  useEffect(() => {
    const handleCartUpdated = (event: CustomEvent) => {
      if (event.detail?.message) {
        setMessage(event.detail.message)
      } else {
        setMessage("Item added to cart")
      }
      setIsVisible(true)

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 5000)

      return () => clearTimeout(timer)
    }

    document.addEventListener("cart-updated", handleCartUpdated as unknown as EventListener)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdated as unknown as EventListener)
    }
  }, [])

  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed ${positionClasses[position]} z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden`}
        >
          <div className="flex items-start p-4">
            <div className="flex-shrink-0 bg-green-100 rounded-full p-2 mr-3">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">Success!</h3>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
              <div className="mt-3 flex space-x-2">
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href="/cart" className="flex items-center justify-center">
                    <ShoppingCart className="mr-1.5 h-4 w-4" />
                    View Cart
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsVisible(false)} className="flex-shrink-0">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
