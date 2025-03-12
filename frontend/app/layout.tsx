import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Providers as AppProviders } from "./providers"
import { Providers as StateProviders } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MIZIZZI - Official Store",
  description: "Exclusive Collection of Fashion and Lifestyle Products",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <StateProviders>
            <AppProviders>
              <Header />
              <main className="min-h-screen">{children}</main>
              <Footer />
            </AppProviders>
          </StateProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}

