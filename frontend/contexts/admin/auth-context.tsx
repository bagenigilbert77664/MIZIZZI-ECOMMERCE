"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"
import { useRouter, usePathname } from "next/navigation"

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

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Get token from storage - use the same token as user auth
  const getToken = (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("mizizzi_token")
  }

  // Check if the current user has admin role
  const hasAdminRole = (userData: User | null): boolean => {
    if (!userData) return false

    // Check for admin role in different formats
    if (typeof userData.role === "string") {
      return userData.role.toLowerCase() === "admin"
    } else if (userData.role && typeof userData.role === "object" && "value" in userData.role) {
      return (userData.role as any).value.toLowerCase() === "admin"
    }

    return false
  }

  // Refresh token using the same mechanism as user auth
  const refreshToken = async (): Promise<boolean> => {
    try {
      const newToken = await authService.refreshAccessToken()
      if (newToken) {
        // After refreshing, verify the user still has admin role
        try {
          const userData = await authService.getCurrentUser()
          console.log("User data after token refresh:", userData)
          if (hasAdminRole(userData)) {
            setUser(userData)
            setIsAuthenticated(true)
            return true
          } else {
            console.error("User does not have admin role after token refresh")
            return false
          }
        } catch (error) {
          console.error("Failed to get user data after token refresh:", error)
          return false
        }
      }
      return false
    } catch (error) {
      console.error("Admin token refresh error:", error)
      return false
    }
  }

  // Refresh access token
  const refreshAccessToken = async (): Promise<string | null> => {
    const success = await refreshToken()
    if (success) {
      return getToken()
    }
    return null
  }

  // Check if the user is authenticated and has admin role
  const checkAuth = async (): Promise<boolean> => {
    try {
      // First check if we have a valid token
      const token = getToken()
      if (!token) {
        // Try to refresh the token
        const refreshed = await refreshToken()
        if (!refreshed) {
          setUser(null)
          setIsAuthenticated(false)
          return false
        }
      }

      // Get the current user data
      try {
        const userData = await authService.getCurrentUser()
        console.log("User data from checkAuth:", userData)

        // Check if the user has admin role
        if (hasAdminRole(userData)) {
          setUser(userData)
          setIsAuthenticated(true)
          return true
        } else {
          console.log("User does not have admin role:", userData)
          setUser(null)
          setIsAuthenticated(false)
          return false
        }
      } catch (error) {
        console.error("Failed to get user data:", error)

        // Try to refresh the token and check again
        const refreshed = await refreshToken()
        if (refreshed) {
          return checkAuth()
        }

        setUser(null)
        setIsAuthenticated(false)
        return false
      }
    } catch (error) {
      console.error("Check auth error:", error)
      setUser(null)
      setIsAuthenticated(false)
      return false
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        const isAuthed = await checkAuth()
        setIsAuthenticated(isAuthed)

        // If not authenticated and on admin page (not login), redirect to login
        if (!isAuthed && pathname?.includes("/admin") && !pathname?.includes("/admin/login")) {
          router.push("/admin/login")
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [pathname, router])

  // Login using the same endpoint as user auth but verify admin role
  const login = async (email: string, password: string, remember = false): Promise<void> => {
    try {
      // Create a direct fetch request to the login endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier: email, password }),
        credentials: "include",
      })

      if (!response.ok) {
        // Handle specific error status codes
        if (response.status === 401) {
          throw new Error("Invalid email or password")
        } else if (response.status === 403) {
          throw new Error("Email not verified or account is inactive")
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.msg || `Login failed with status: ${response.status}`)
        }
      }

      const data = await response.json()

      // Verify the user is an admin
      if (!data.user || data.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required")
      }

      // Store tokens in localStorage
      if (data.access_token) {
        localStorage.setItem("mizizzi_token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
      }
      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      // Store user data
      localStorage.setItem("user", JSON.stringify(data.user))

      // User is an admin, set the authenticated state
      setUser(data.user)
      setIsAuthenticated(true)
    } catch (error) {
      console.error("Admin login error:", error)
      setUser(null)
      setIsAuthenticated(false)
      throw error
    }
  }

  // Logout using the same endpoint as user auth
  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear state even if logout API fails
      setUser(null)
      setIsAuthenticated(false)
      throw error
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
