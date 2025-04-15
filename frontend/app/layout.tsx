import { Inter } from "next/font/google"
import "./globals.css"
import { Providers as AppProviders } from "./providers"
import { Providers as StateProviders } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import type React from "react"
import { defaultMetadata, defaultViewport } from "@/lib/metadata-utils"
import { LayoutRenderer } from "@/components/layout/layout-renderer"
import { NotificationProvider } from "@/contexts/notification/notification-context"
import { PageTransitionWrapper } from "@/components/transitions/page-transition-wrapper"
// Import the AddToCartNotification component
import { AddToCartNotification } from "@/components/cart/add-to-cart-notification"
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
      <head>
        {/* Suppress React DevTools warning in development */}
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
              console.warn = (function(originalWarn) {
                return function(msg, ...args) {
                  if (typeof msg === 'string' && msg.includes('Download the React DevTools')) {
                    return;
                  }
                  return originalWarn.call(console, msg, ...args);
                };
              })(console.warn);
            `,
            }}
          />
        )}
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <StateProviders>
            <AppProviders>
              <NotificationProvider>
                <PageTransitionWrapper />

                <LayoutRenderer>{children}</LayoutRenderer>
              </NotificationProvider>
            </AppProviders>
          </StateProviders>
        </ThemeProvider>
        <AddToCartNotification position="bottom-right" />
      </body>
    </html>
  )
}
