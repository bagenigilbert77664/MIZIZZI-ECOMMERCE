"use client"

import type React from "react"

import { AuthProvider } from "@/contexts/auth/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { CartProvider } from "@/contexts/cart/cart-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

