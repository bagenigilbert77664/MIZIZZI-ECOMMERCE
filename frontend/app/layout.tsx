import { Inter } from "next/font/google"
import "./globals.css"
import { Providers as AppProviders } from "./providers"
import { Providers as StateProviders } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import type React from "react"
import { defaultMetadata, defaultViewport } from "@/lib/metadata-utils"
import { LayoutRenderer } from "@/components/layout/layout-renderer"
import { NotificationProvider } from "@/contexts/notification/notification-context"

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
            <NotificationProvider>

              <LayoutRenderer>{children}</LayoutRenderer>
              </NotificationProvider>

            </AppProviders>
          </StateProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
