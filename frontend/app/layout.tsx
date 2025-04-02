import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Providers as AppProviders } from "./providers"
import { Providers as StateProviders } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import type React from "react"
import { TopBar } from "@/components/layout/top-bar"
import { defaultMetadata, defaultViewport } from "@/lib/metadata-utils"

// Optimize font loading
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
})

export const metadata = defaultMetadata
export const viewport = defaultViewport

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <StateProviders>
            <AppProviders>
              <TopBar />
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

