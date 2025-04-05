"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "../globals.css"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"
import { AdminAuthProvider } from "@/contexts/admin/auth-context"
import { AdminProvider } from "@/contexts/admin/admin-context"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { motion } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAdminAuth } from "@/contexts/admin/auth-context"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
})

export default function AdminLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const { checkAuth, isLoading } = useAdminAuth()

  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isLoading) {
        const isAuthed = await checkAuth()

        // If not authenticated and not on login page, redirect to login
        if (!isAuthed && !pathname?.includes("/admin/login")) {
          router.push("/admin/login")
        }
      }
    }

    checkAuthentication()
  }, [pathname, checkAuth, isLoading, router])

  return (
    <div className={`h-screen bg-white dark:bg-gray-900 ${inter.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AdminAuthProvider>
          <AdminProvider>
            <div className="flex h-screen w-full overflow-hidden">
              <AdminSidebar />
              <div className="flex flex-col flex-1 w-full overflow-hidden">
                <AdminHeader />
                <motion.main
                  key={pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-2 sm:p-4 md:p-6"
                >
                  {children}
                </motion.main>
              </div>
            </div>
            <Toaster />
          </AdminProvider>
        </AdminAuthProvider>
      </ThemeProvider>
    </div>
  )
}

