"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"
import { AdminProvider } from "@/contexts/admin/admin-context"
import { ThemeProvider } from "@/components/theme-provider"
import { AdminAuthProvider, useAdminAuth } from "@/contexts/admin/auth-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import useMobile from "@/hooks/use-mobile"
import { QuickActions } from "@/components/admin/quick-actions"
import { Loader2 } from "lucide-react"

// Wrapper component that handles auth checks
function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAdminAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      setIsChecking(true)
      try {
        const isAuthed = await checkAuth()

        // If not authenticated and not on login page, redirect to login
        if (!isAuthed && !pathname?.includes("/admin/login")) {
          console.log("Not authenticated, redirecting to login")

          // Store the current path to redirect back after login
          if (pathname) {
            sessionStorage.setItem("admin_redirect_after_login", pathname)
          }

          router.push("/admin/login")
        }
      } catch (error) {
        console.error("Auth verification error:", error)
        router.push("/admin/login")
      } finally {
        setIsChecking(false)
      }
    }

    verifyAuth()
  }, [checkAuth, router, pathname])

  // Show loading state while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-cherry-600" />
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // If on login page or authenticated, show content
  if (pathname?.includes("/admin/login") || isAuthenticated) {
    return <>{children}</>
  }

  // Fallback - should not reach here due to redirect in useEffect
  return null
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const isMobile = useMobile()

  // On mobile, sidebar is always collapsed initially
  useEffect(() => {
    setIsSidebarCollapsed(isMobile)
  }, [isMobile])

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AdminAuthProvider>
          <AdminProvider>
            <AdminLayoutWrapper>
              <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 antialiased">
                <AdminSidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
                <div
                  className={cn(
                    "flex min-h-screen flex-col transition-all duration-300",
                    isMobile ? "ml-[60px]" : isSidebarCollapsed ? "ml-[70px]" : "ml-[280px]",
                  )}
                >
                  <AdminHeader toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
                  <AnimatePresence mode="wait">
                    <motion.main
                      key={`admin-content-${isSidebarCollapsed}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 p-4 md:p-6"
                    >
                      <div className="mx-auto max-w-7xl">{children}</div>
                    </motion.main>
                  </AnimatePresence>
                </div>
                <QuickActions />
              </div>
            </AdminLayoutWrapper>
          </AdminProvider>
        </AdminAuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
