import { Roboto } from "next/font/google"
import "./globals.css"
import { Providers as AppProviders } from "./providers"
import { Providers as StateProviders } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import type React from "react"
import { defaultMetadata, defaultViewport } from "@/lib/metadata-utils"
import { LayoutRenderer } from "@/components/layout/layout-renderer"
import { NotificationProvider } from "@/contexts/notification/notification-context"
import { PageTransitionWrapper } from "@/components/transitions/page-transition-wrapper"
import { VerificationHandler } from "@/components/auth/verification-handler"
import { Toaster } from "@/components/ui/toaster" // Import Toaster
import { NetworkStatusIndicator } from "@/components/shared/network-status-indicator" // Import NetworkStatusIndicator

// Optimize font loading
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  preload: true,
  variable: "--font-roboto",
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
      // Suppress React DevTools warning
      console.warn = (function(originalWarn) {
        return function(msg, ...args) {
          if (typeof msg === 'string' && (
            msg.includes('Download the React DevTools') ||
            msg.includes('react-devtools')
          )) {
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
      <body className={roboto.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <StateProviders>
            <AppProviders>
              <NotificationProvider>
                <PageTransitionWrapper />
                {/* Add the VerificationHandler to handle auth state persistence */}
                <VerificationHandler />
                <LayoutRenderer>{children}</LayoutRenderer>
                {/* Add the cart notification component */}
                <NetworkStatusIndicator /> {/* Add the network status indicator */}
                <Toaster /> {/* Add the Toaster component */}
              </NotificationProvider>
            </AppProviders>
          </StateProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
