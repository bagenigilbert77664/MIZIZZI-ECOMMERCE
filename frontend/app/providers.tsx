"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { CartProvider } from "@/contexts/cart/cart-context"
import { WishlistProvider } from "@/contexts/wishlist/wishlist-context"
import { AuthProvider } from "@/contexts/auth/auth-context"
import { ProductProvider } from "@/contexts/product/product-context"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth/auth-context"
import type { ReactNode } from "react"

// Wrapper component to access auth context
function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <ProductProvider>
          <CartProvider>
            <WishlistProvider>
              <AuthenticatedProviders>{children}</AuthenticatedProviders>
              <Toaster />
            </WishlistProvider>
          </CartProvider>
        </ProductProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

