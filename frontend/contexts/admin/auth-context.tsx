"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
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

  const refreshToken = async (): Promise<boolean> => {
    try {
      console.log("Attempting to refresh token")

      // Check if we have a refresh token before attempting refresh
      const currentRefreshToken = localStorage.getItem("mizizzi_refresh_token")
      if (!currentRefreshToken) {
        console.warn("No refresh token available for token refresh")
        return false
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Make direct fetch request to refresh token
      const response = await fetch(`${apiUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentRefreshToken}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        console.error(`Token refresh failed with status: ${response.status}`)
        return false
      }

      const data = await response.json()

      // Store the new tokens
      if (data.access_token) {
        localStorage.setItem("mizizzi_token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
      }
      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      // After refreshing, verify the user still has admin role
      if (data.user) {
        const isAdmin =
          data.user.role === "admin" ||
          (data.user.role && typeof data.user.role === "object" && data.user.role.value === "admin")

        if (isAdmin) {
          setUser(data.user)
          setIsAuthenticated(true)
          localStorage.setItem("user", JSON.stringify(data.user))
          return true
        }
      }

      // If no user data in response, try to get current user
      const userResponse = await fetch(`${apiUrl}/api/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access_token}`,
        },
        credentials: "include",
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        const isAdmin =
          userData.role === "admin" ||
          (userData.role && typeof userData.role === "object" && userData.role.value === "admin")

        if (isAdmin) {
          setUser(userData)
          setIsAuthenticated(true)
          localStorage.setItem("user", JSON.stringify(userData))
          return true
        }
      }

      return false
    } catch (error) {
      console.error("Token refresh error:", error)
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

  // Update the checkAuth function to better handle token validation
  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      // Check if we have a token
      const token = localStorage.getItem("mizizzi_token")
      if (!token) {
        setIsAuthenticated(false)
        setUser(null)
        return false
      }

      // Check if we have user data
      const userDataStr = localStorage.getItem("user")
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr)

          // Verify the user has admin role
          const isAdmin =
            userData.role === "admin" ||
            (userData.role && typeof userData.role === "object" && userData.role.value === "admin")

          if (isAdmin) {
            setUser(userData)
            setIsAuthenticated(true)
            return true
          } else {
            console.warn("User does not have admin role")
            setIsAuthenticated(false)
            setUser(null)
            return false
          }
        } catch (e) {
          console.error("Failed to parse user data:", e)
        }
      }

      // If we have a token but no valid user data, try to get the user profile
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const response = await fetch(`${apiUrl}/api/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`)
        }

        const profile = await response.json()

        // Verify the user has admin role
        const isAdmin =
          profile.role === "admin" ||
          (profile.role && typeof profile.role === "object" && profile.role.value === "admin")

        if (isAdmin) {
          setUser(profile)
          setIsAuthenticated(true)
          localStorage.setItem("user", JSON.stringify(profile))
          return true
        } else {
          console.warn("User profile does not have admin role")
          setIsAuthenticated(false)
          setUser(null)
          return false
        }
      } catch (profileError) {
        console.error("Error getting profile:", profileError)
        setIsAuthenticated(false)
        setUser(null)
        return false
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setIsAuthenticated(false)
      setUser(null)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

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
  }, [pathname, router, checkAuth])

  // Update the login function to match the backend API format
  const login = async (email: string, password: string, remember = false): Promise<void> => {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Make direct fetch request to match the backend format exactly
      const response = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: email,
          password: password,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.msg || `Login failed with status: ${response.status}`)
      }

      const responseData = await response.json()

      // Check if the user has admin role
      if (responseData.user && responseData.user.role === "admin") {
        // Store tokens in localStorage
        if (responseData.access_token) {
          localStorage.setItem("mizizzi_token", responseData.access_token)
        }
        if (responseData.refresh_token) {
          localStorage.setItem("mizizzi_refresh_token", responseData.refresh_token)
        }
        if (responseData.csrf_token) {
          localStorage.setItem("mizizzi_csrf_token", responseData.csrf_token)
        }

        // Store user data
        localStorage.setItem("user", JSON.stringify(responseData.user))

        setUser(responseData.user)
        setIsAuthenticated(true)
      } else {
        // User doesn't have admin role
        throw new Error(
          "You don't have permission to access the admin area. This account doesn't have admin privileges.",
        )
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Update the logout function to handle token removal
  const logout = async () => {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Try to call the logout endpoint
      try {
        await fetch(`${apiUrl}/api/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("mizizzi_token") || ""}`,
          },
          credentials: "include",
        })
      } catch (logoutError) {
        console.warn("Logout API call failed, continuing with local logout:", logoutError)
      }

      // Clear user data and tokens regardless of API response
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("user")

      // Redirect to login page
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout error:", error)

      // Even if the API call fails, clear local data
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("user")

      router.push("/admin/login")
    } finally {
      setIsLoading(false)
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
