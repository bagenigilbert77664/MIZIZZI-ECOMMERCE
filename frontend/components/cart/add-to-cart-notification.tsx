"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, ArrowRight, Volume2, VolumeX, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSoundEffects } from "@/hooks/use-sound-effects"

interface AddToCartNotificationProps {
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left" | "top-center" | "bottom-center"
}

export function AddToCartNotification({ position = "bottom-right" }: AddToCartNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [message, setMessage] = useState("Item added to cart")
  const [productImage, setProductImage] = useState<string | null>(null)
  const [productName, setProductName] = useState<string | null>(null)
  const [productPrice, setProductPrice] = useState<string | null>(null)
  const [isUpdate, setIsUpdate] = useState(false)
  const router = useRouter()

  const { soundEnabled, toggleSound, playSound } = useSoundEffects()

  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  }

  const handleViewCart = useCallback(() => {
    setIsVisible(false)

    // Use a small timeout to allow the animation to complete
    setTimeout(() => {
      router.push("/cart")
    }, 150)
  }, [router])

  const handleCheckout = useCallback(() => {
    setIsVisible(false)

    // Use a small timeout to allow the animation to complete
    setTimeout(() => {
      router.push("/checkout")
    }, 150)
  }, [router])

  const handleToggleSound = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const newState = toggleSound()
      // Force immediate UI update without waiting for re-render
      if (e.currentTarget instanceof HTMLElement) {
        const icon = e.currentTarget.querySelector("svg")
        if (icon) {
          if (newState) {
            icon.innerHTML =
              '<path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>'
          } else {
            icon.innerHTML =
              '<path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>'
          }
        }
      }
    },
    [toggleSound],
  )

  useEffect(() => {
    const handleCartUpdated = (event: CustomEvent) => {
      if (event.detail?.message) {
        setMessage(event.detail.message)
      } else {
        setMessage("Item added to cart")
      }

      // Set product details if available
      if (event.detail?.product) {
        setProductName(event.detail.product.name || null)
        setProductImage(event.detail.product.thumbnail_url || null)
        setProductPrice(event.detail.product.price ? `${event.detail.product.price}` : null)
        setIsUpdate(event.detail.isUpdate || false)
      } else {
        setProductName(null)
        setProductImage(null)
        setProductPrice(null)
        setIsUpdate(false)
      }

      setIsVisible(true)

      // Play sound if enabled
      playSound()

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
  }, [playSound])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 1.2,
          }}
          className={`fixed ${positionClasses[position]} z-50 w-[350px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden`}
        >
          <div className="relative">
            {/* Success indicator bar with animation */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5, ease: "linear" }}
            />

            <div className="flex p-4">
              {/* Left side - success icon or product image */}
              <div className="flex-shrink-0 mr-4">
                {productImage ? (
                  <motion.div
                    className="h-16 w-16 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Image
                      src={productImage || "/placeholder.svg"}
                      alt={productName || "Product"}
                      width={64}
                      height={64}
                      className="object-cover"
                      onError={(e) => {
                        // Fallback to success icon if image fails to load
                        e.currentTarget.style.display = "none"
                        e.currentTarget.parentElement!.innerHTML = `
                          <div class="h-full w-full flex items-center justify-center bg-green-50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-green-600"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        `
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    className="h-16 w-16 rounded-lg bg-green-50 flex items-center justify-center"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-8 w-8 text-green-600" />
                  </motion.div>
                )}
              </div>

              {/* Right side - content */}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h3 className="text-base font-semibold text-gray-900">
                      {productName || (isUpdate ? "Cart Updated" : "Item Added")}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{message}</p>
                    {productPrice && (
                      <motion.p
                        className="mt-1 text-sm font-medium text-green-700"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {productPrice}
                      </motion.p>
                    )}
                  </motion.div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsVisible(false)
                    }}
                    className="h-7 w-7 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>

                <motion.div
                  className="mt-3 flex items-center justify-between"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button size="sm" variant="ghost" onClick={handleToggleSound} className="h-8 w-8 p-0 rounded-full">
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4 text-gray-500" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="sr-only">{soundEnabled ? "Disable sound" : "Enable sound"}</span>
                  </Button>

                  <div className="flex space-x-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-medium"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCart()
                        }}
                      >
                        <ShoppingCart className="mr-1 h-3 w-3" />
                        View Cart
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium bg-green-700 hover:bg-green-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCheckout()
                        }}
                      >
                        Checkout
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
