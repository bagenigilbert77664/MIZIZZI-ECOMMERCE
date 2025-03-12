"use client"

import type React from "react"
import { AuthProvider } from "@/contexts/auth/auth-context"
import { CartProvider } from "@/contexts/cart/cart-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  )
}

