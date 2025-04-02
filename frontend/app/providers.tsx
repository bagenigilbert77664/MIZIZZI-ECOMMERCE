"use client"

import { type ReactNode, useEffect, useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth/auth-context"
import { SocketProvider } from "@/contexts/socket-context"
import { ProductProvider } from "@/contexts/product/product-context"
import { CartProvider } from "@/contexts/cart/cart-context"
import { WishlistProvider } from "@/contexts/wishlist/wishlist-context"
import { SocketNotificationHandler } from "@/components/notifications/socket-notification-handler"
import { Toaster } from "@/components/ui/toaster"
import { NotificationProvider } from "@/contexts/notification/notification-context"

interface ProvidersProps {
  children: ReactNode
}

// Component for providers that require authentication
function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function Providers({ children }: ProvidersProps) {
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
          <ProductProvider>
            <CartProvider>
              <WishlistProvider>
                <NotificationProvider>
                  <SocketNotificationHandler />
                  <AuthenticatedProviders>{children}</AuthenticatedProviders>
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

