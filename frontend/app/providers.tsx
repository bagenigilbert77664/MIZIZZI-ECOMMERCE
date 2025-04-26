"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth/auth-context"
import { SocketProvider } from "@/contexts/socket-context"
import { VerificationHandler } from "@/components/auth/verification-handler"
import { ProductProvider } from "@/contexts/product/product-context"
import { CartProvider } from "@/contexts/cart/cart-context"
import { WishlistProvider } from "@/contexts/wishlist/wishlist-context"
import { SocketNotificationHandler } from "@/components/notifications/socket-notification-handler"
import { NotificationProvider } from "@/contexts/notification/notification-context"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <SocketProvider>
          <VerificationHandler />
          <ProductProvider>
            <CartProvider>
              <WishlistProvider>
                <NotificationProvider>
                  <SocketNotificationHandler />
                  {children}
                  <Toaster />
                </NotificationProvider>
              </WishlistProvider>
            </CartProvider>
          </ProductProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
