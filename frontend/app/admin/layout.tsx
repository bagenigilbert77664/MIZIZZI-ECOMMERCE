import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"
import { AdminAuthProvider } from "@/contexts/admin/auth-context"
import { AdminProvider } from "@/contexts/admin/admin-context"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Mizizzi Admin Dashboard",
  description: "Admin dashboard for Mizizzi E-commerce platform",
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={inter.className}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AdminAuthProvider>
          <AdminProvider>
            <div className="flex h-screen overflow-hidden">
              <AdminSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4">{children}</main>
              </div>
            </div>
            <Toaster />
          </AdminProvider>
        </AdminAuthProvider>
      </ThemeProvider>
    </div>
  )
}

