"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { detectExtremeCorruption, emergencyCleanupCart, cleanupCartData } from "@/lib/cart-cleanup"
import { toast } from "@/components/ui/use-toast"

interface CartCorruptionDetectorProps {
  onCorruptionDetected?: () => void
  onCleanupComplete?: () => void
}

export function CartCorruptionDetector({ onCorruptionDetected, onCleanupComplete }: CartCorruptionDetectorProps) {
  const [corruptionDetected, setCorruptionDetected] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    // Check for corruption on mount
    const checkCorruption = () => {
      try {
        // Check localStorage for cart items
        const cartItems = localStorage.getItem("cartItems")
        if (cartItems) {
          const items = JSON.parse(cartItems)
          if (detectExtremeCorruption(items)) {
            setCorruptionDetected(true)
            onCorruptionDetected?.()
            return
          }
        }

        // Check for other cart data corruption
        const cartData = localStorage.getItem("cart")
        if (cartData) {
          const cart = JSON.parse(cartData)
          if (detectExtremeCorruption(cart)) {
            setCorruptionDetected(true)
            onCorruptionDetected?.()
            return
          }
        }
      } catch (error) {
        console.error("Error checking for corruption:", error)
        setCorruptionDetected(true)
        onCorruptionDetected?.()
      }
    }

    checkCorruption()

    // Listen for corruption events
    const handleCorruption = () => {
      setCorruptionDetected(true)
      onCorruptionDetected?.()
    }

    window.addEventListener("cart:corruption-detected", handleCorruption)

    return () => {
      window.removeEventListener("cart:corruption-detected", handleCorruption)
    }
  }, [onCorruptionDetected])

  const handleFixCart = async () => {
    setIsFixing(true)
    try {
      const result = cleanupCartData()
      if (result.success) {
        toast({
          title: "Cart Fixed",
          description: result.message,
          variant: "default",
        })
        setCorruptionDetected(false)
        onCleanupComplete?.()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Failed to fix cart:", error)
      toast({
        title: "Fix Failed",
        description: "Unable to fix cart data. Try resetting instead.",
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }

  const handleResetCart = async () => {
    setIsResetting(true)
    try {
      const result = emergencyCleanupCart()
      if (result.success) {
        toast({
          title: "Cart Reset",
          description: "Your cart has been completely reset due to data corruption.",
          variant: "default",
        })
        setCorruptionDetected(false)
        onCleanupComplete?.()

        // Reload page after reset to ensure clean state
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Failed to reset cart:", error)
      toast({
        title: "Reset Failed",
        description: "Unable to reset cart. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  if (!corruptionDetected) {
    return null
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Cart Data Corruption Detected</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Your cart contains corrupted data with invalid values. This can happen due to browser storage issues or
          network problems.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFixCart}
            disabled={isFixing || isResetting}
            className="bg-white hover:bg-gray-50"
          >
            {isFixing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Fix Cart Data
              </>
            )}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleResetCart} disabled={isFixing || isResetting}>
            {isResetting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Cart
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
