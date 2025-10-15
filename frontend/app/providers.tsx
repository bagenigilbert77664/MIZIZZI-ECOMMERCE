"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth/auth-context"
import { SocketProvider } from "@/contexts/socket-context"
import { VerificationHandler } from "@/components/auth/verification-handler"
import { ProductProvider } from "@/contexts/product/product-context"
import { CartProvider } from "@/contexts/cart/cart-context"
import { WishlistProvider } from "@/contexts/wishlist/wishlist-context"
import { SocketNotificationHandler } from "@/components/notifications/socket-notification-handler"
import { NotificationProvider } from "@/contexts/notification/notification-context"
import { InventoryProvider } from "@/contexts/inventory/inventory-context"
import AnimationErrorBoundary from "@/components/animation/animation-error-boundary"
import DisableAnimations from "@/components/animation/disable-animations"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <>
      <DisableAnimations />
      <AuthProvider>
        <SocketProvider>
          <VerificationHandler />
          <ProductProvider>
            <CartProvider>
              <InventoryProvider>
                <WishlistProvider>
                  <NotificationProvider>
                    <SocketNotificationHandler />
                    <AnimationErrorBoundary>
                      {children}
                      <Toaster />
                    </AnimationErrorBoundary>
                  </NotificationProvider>
                </WishlistProvider>
              </InventoryProvider>
            </CartProvider>
          </ProductProvider>
        </SocketProvider>
      </AuthProvider>
    </>
  )
}
