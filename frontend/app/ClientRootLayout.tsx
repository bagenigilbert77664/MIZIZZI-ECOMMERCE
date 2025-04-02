"use client"

import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Providers as AppProviders } from "./providers"
import { Providers as StateProviders } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import type React from "react"
import { TopBar } from "@/components/layout/top-bar"
import { usePathname } from "next/navigation"

export default function ClientRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <StateProviders>
        <AppProviders>
          <LayoutRenderer>{children}</LayoutRenderer>
        </AppProviders>
      </StateProviders>
    </ThemeProvider>
  )
}

// Client component for conditional rendering
function LayoutRenderer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith("/admin")

  // Don't render standard layout components for admin routes
  if (isAdminRoute) {
    return children
  }

  return (
    <>
      <TopBar />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}

