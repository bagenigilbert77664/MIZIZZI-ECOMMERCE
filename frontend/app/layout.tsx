import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"
import { TopBar } from "@/components/layout/top-bar"
import { AuthProvider } from "@/contexts/auth"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mizizzi - Fashion & Jewelry",
  description:
    "Discover exclusive fashion and jewelry collections at Mizizzi. Shop the latest trends in luxury accessories, designer clothing, and fine jewelry. Free shipping on orders over KSh 10,000.",
  keywords: "fashion, jewelry, accessories, online shopping, luxury fashion, Kenya fashion, designer jewelry",
  metadataBase: new URL("https://v0-mizizzi-ecommerce.vercel.app"),
  openGraph: {
    title: "Mizizzi - Fashion & Jewelry",
    description:
      "Shop the latest fashion and jewelry trends at Mizizzi. Find exclusive collections of jewelry, accessories, and fashion items.",
    type: "website",
    url: "https://v0-mizizzi-ecommerce.vercel.app",
    images: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png",
        width: 1200,
        height: 630,
        alt: "Mizizzi Fashion & Jewelry",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mizizzi - Fashion & Jewelry",
    description:
      "Discover exclusive fashion and jewelry collections at Mizizzi. Shop the latest trends in luxury accessories.",
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png",
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/_next/static/media/a34f9d1faa5f3315-s.p.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col antialiased`} suppressHydrationWarning lang="en">
        <AuthProvider>
          <Providers>
            <TopBar />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}



import './globals.css'