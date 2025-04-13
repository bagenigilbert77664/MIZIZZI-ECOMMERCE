"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface AdminAuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
  refreshAccessToken: () => Promise<string | null>
  getToken: () => string | null
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => false,
  refreshToken: async () => false,
  refreshAccessToken: async () => null,
  getToken: () => null,
})

// Token storage keys - Changed to be more specific to admin
const TOKEN_KEY = "mizizzi_admin_token"
const TOKEN_EXPIRY_KEY = "mizizzi_admin_token_expiry"
const REFRESH_TOKEN_KEY = "mizizzi_admin_refresh_token"
const ADMIN_USER_KEY = "mizizzi_admin_user"

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  // Get token from storage
  const getToken = (): string | null => {
    if (typeof window === "undefined") return null

    const token = localStorage.getItem(TOKEN_KEY)
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY)

    if (!token || !expiryStr) return null

    const expiry = new Date(expiryStr)

    // If token is expired, return null
    if (expiry < new Date()) {
      return null
    }

    return token
  }

  // Save token to storage with expiry
  const saveToken = (token: string, refreshToken: string, expiresIn = 3600) => {
    if (typeof window === "undefined") return

    const expiry = new Date()
    expiry.setSeconds(expiry.getSeconds() + expiresIn)

    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toISOString())
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  // Save admin user data
  const saveUser = (userData: User) => {
    if (typeof window === "undefined") return

    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  // Clear tokens from storage
  const clearTokens = () => {
    if (typeof window === "undefined") return

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
  }

  // Refresh access token with improved error handling
  const refreshAccessToken = async (): Promise<string | null> => {
    if (typeof window === "undefined") return null

    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!storedRefreshToken) {
      console.error("No refresh token available")
      return null
    }

    try {
      console.log("Attempting to refresh access token")
      // Use refreshAccessToken instead of getRefreshToken
      const newAccessToken = await authService.refreshAccessToken()

      if (newAccessToken) {
        console.log("Access token refreshed successfully")
        // Get the current refresh token since it might not have changed
        const currentRefreshToken = authService.getRefreshToken() || storedRefreshToken

        // Update the token in localStorage with a default expiry
        saveToken(newAccessToken, currentRefreshToken, 3600)
        return newAccessToken
      }

      console.error("Failed to refresh access token - no token returned")
      return null
    } catch (error) {
      console.error("Token refresh error:", error)
      clearTokens()
      return null
    }
  }

  // Refresh token
  const refreshToken = async (): Promise<boolean> => {
    if (typeof window === "undefined") return false

    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

    if (!storedRefreshToken) return false

    try {
      // Use refreshAccessToken instead of getRefreshToken
      const newAccessToken = await authService.refreshAccessToken()

      if (newAccessToken) {
        // Get the current refresh token since it might not have changed
        const currentRefreshToken = authService.getRefreshToken() || storedRefreshToken

        // Update the token in localStorage with a default expiry
        saveToken(newAccessToken, currentRefreshToken, 3600)
        return true
      }

      return false
    } catch (error) {
      console.error("Token refresh error:", error)
      clearTokens()
      return false
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        // Try to load user from localStorage first
        const storedUserData = localStorage.getItem(ADMIN_USER_KEY)
        if (storedUserData) {
          try {
            const parsedUser = JSON.parse(storedUserData)
            setUser(parsedUser)
          } catch (e) {
            console.error("Failed to parse admin user data:", e)
          }
        }

        const isAuthed = await checkAuth()
        setIsAuthenticated(isAuthed)

        // If not authenticated and on admin page (not login), redirect to login
        if (!isAuthed && pathname?.includes("/admin") && !pathname?.includes("/admin/login")) {
          console.log("Not authenticated, redirecting to admin login")
          router.push("/admin/login?from=" + encodeURIComponent(pathname || "/admin"))
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [pathname])

  const login = async (email: string, password: string, remember = false): Promise<void> => {
    try {
      // For admin login, we'll use the same auth service but check for admin role
      const response = await authService.login(email, password, remember)

      // Verify the user is an admin
      if (response.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required")
      }

      // Save tokens
      if (response.token) {
        saveToken(response.token, response.refreshToken || "", response.expiresIn || 3600)
      }

      // Save user data
      saveUser(response.user)
      setIsAuthenticated(true)

      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.name || "Admin"}!`,
        variant: "default",
      })
    } catch (error) {
      console.error("Login error:", error)
      setUser(null)
      setIsAuthenticated(false)
      clearTokens()

      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Failed to sign in",
        variant: "destructive",
      })

      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)
      clearTokens()

      toast({
        title: "Logged out",
        description: "You have been successfully logged out of the admin area",
        variant: "default",
      })
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear tokens and state even if logout API fails
      setUser(null)
      setIsAuthenticated(false)
      clearTokens()
      throw error
    }
  }

  const checkAuth = async () => {
    try {
      // First check if we have a valid token
      const token = getToken()

      if (!token) {
        // Try to refresh the token if we have a refresh token
        const refreshed = await refreshToken()
        if (!refreshed) {
          setUser(null)
          return false
        }
      }

      const currentUser = await authService.getCurrentUser()

      // Verify the user is an admin
      if (currentUser.role !== "admin") {
        setUser(null)
        clearTokens()
        return false
      }

      saveUser(currentUser)
      return true
    } catch (error) {
      console.error("Check auth error:", error)
      // Try to refresh token on auth check failure
      try {
        const refreshed = await refreshToken()
        if (refreshed) {
          const currentUser = await authService.getCurrentUser()
          if (currentUser.role === "admin") {
            saveUser(currentUser)
            return true
          }
        }
      } catch (refreshError) {
        console.error("Refresh during auth check failed:", refreshError)
      }

      setUser(null)
      clearTokens()
      return false
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        checkAuth,
        refreshToken,
        refreshAccessToken,
        getToken,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
