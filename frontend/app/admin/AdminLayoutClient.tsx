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
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Modern Spinner Component
const ModernSpinner = ({
  size = "default",
  className = "",
}: { size?: "small" | "default" | "large"; className?: string }) => {
  const sizeClasses = {
    small: "h-4 w-4",
    default: "h-6 w-6",
    large: "h-8 w-8",
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 rounded-full border-2 border-cherry-200 dark:border-cherry-800"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cherry-600 animate-spin"></div>
    </div>
  )
}

// Minimal loading component for critical auth checks only
const MinimalAuthCheck = () => (
  <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-3">
      <ModernSpinner size="large" />
      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Verifying access...</p>
    </div>
  </div>
)

// Error component
const AdminErrorScreen = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
    <div className="max-w-md w-full">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2">
          <div className="space-y-2">
            <p>{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  </div>
)

// Main auth wrapper component
function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth, user, token } = useAdminAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [authError, setAuthError] = useState<string | null>(null)

  // Check if we're on the login page
  const isLoginPage = pathname?.includes("/admin/login") || pathname === "/admin/login"

  // Handle authentication logic
  useEffect(() => {
    if (isLoginPage) {
      // Clear any auth errors when on login page
      setAuthError(null)
      return
    }

    const checkAdminAuth = async () => {
      if (!isAuthenticated) {
        const isAuthed = await checkAuth()
        if (!isAuthed) {
          // Store current path for redirect after login
          if (pathname && pathname !== "/admin") {
            sessionStorage.setItem("admin_redirect_after_login", pathname)
          }
          router.push("/admin/login?reason=authentication_required")
        }
      }
    }

    checkAdminAuth()
  }, [pathname, isAuthenticated, checkAuth, router])

  // Show error screen
  if (authError) {
    return <AdminErrorScreen message={authError} onRetry={() => setAuthError(null)} />
  }

  // If we're on login page, always render children directly
  if (isLoginPage) {
    console.log("🔐 On login page, rendering login form directly")
    return <>{children}</>
  }

  // Show loading state while auth is being determined
  if (isLoading) {
    return <MinimalAuthCheck />
  }

  // If we're authenticated with valid user and token, render children
  if (isAuthenticated && user && token) {
    return <>{children}</>
  }

  // Default: show loading
  return <MinimalAuthCheck />
}

// Session manager component
function SessionManager({ children }: { children: React.ReactNode }) {
  const { refreshToken, logout, isAuthenticated } = useAdminAuth()

  useEffect(() => {
    if (!isAuthenticated) return

    console.log("🔄 Setting up session management...")

    // Set up token refresh interval (every 25 minutes)
    const refreshInterval = setInterval(
      async () => {
        try {
          console.log("🔄 Periodic token refresh...")
          const success = await refreshToken()

          if (!success) {
            console.warn("Periodic token refresh failed, logging out")
            logout()
          }
        } catch (error) {
          console.error("Periodic token refresh error:", error)
        }
      },
      25 * 60 * 1000,
    ) // 25 minutes

    // Set up session timeout warning (after 55 minutes of inactivity)
    let sessionTimeoutId: NodeJS.Timeout

    const resetSessionTimeout = () => {
      clearTimeout(sessionTimeoutId)
      sessionTimeoutId = setTimeout(
        () => {
          console.warn("Session timeout approaching, refreshing token...")
          refreshToken().catch(() => {
            console.warn("Session expired due to inactivity")
            logout()
          })
        },
        55 * 60 * 1000,
      ) // 55 minutes
    }

    // Track user activity
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    const handleActivity = () => {
      resetSessionTimeout()
    }

    // Set up activity listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Initialize session timeout
    resetSessionTimeout()

    return () => {
      clearInterval(refreshInterval)
      clearTimeout(sessionTimeoutId)
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated, refreshToken, logout])

  return <>{children}</>
}

// Main layout component
export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const isMobile = useMobile()
  const pathname = usePathname()

  // Check if we're on login page
  const isLoginPage = pathname?.includes("/admin/login") || pathname === "/admin/login"

  // If on login page, render without admin layout
  if (isLoginPage) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    )
  }

  // Rest of the existing code for authenticated admin layout...
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AdminAuthProvider>
          <SessionManager>
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
          </SessionManager>
        </AdminAuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
