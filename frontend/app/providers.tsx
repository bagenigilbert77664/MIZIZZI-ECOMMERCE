"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { CartProvider } from "@/contexts/cart/cart-context"
import { WishlistProvider } from "@/contexts/wishlist/wishlist-context"
import { AuthProvider } from "@/contexts/auth/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/auth/auth-context"

// Wrapper component to access auth context
function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <CartProvider>
      <WishlistProvider>
        {children}
      </WishlistProvider>
    </CartProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <AuthenticatedProviders>
          {children}
          <Toaster />
        </AuthenticatedProviders>
      </AuthProvider>
    </ThemeProvider>
  )
}