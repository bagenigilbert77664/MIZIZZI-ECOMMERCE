"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext, useCallback, useRef } from "react"
import { adminService } from "@/services/admin"

interface AdminUser {
  id: string | number
  email: string
  name: string
  role: string | { value: string; name?: string }
  verified?: boolean
  created_at?: string
  updated_at?: string
}

interface AdminAuthContextProps {
  isAuthenticated: boolean
  isLoading: boolean
  user: AdminUser | null
  token: string | null
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkAuth: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
  getToken: () => string | null
  handleAuthError: (error: any, context: string) => void
}

const AdminAuthContext = createContext<AdminAuthContextProps>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  login: async () => ({ success: false }),
  logout: () => {},
  checkAuth: async () => false,
  refreshToken: async () => false,
  getToken: () => null,
  handleAuthError: () => {},
})

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Refs to prevent race conditions
  const isRefreshingRef = useRef(false)
  const authCheckInProgressRef = useRef(false)
  const mountedRef = useRef(true)
  const initializationCompleteRef = useRef(false)

  // Token management utilities
  const getStoredToken = useCallback((): string | null => {
    if (typeof window === "undefined") return null

    try {
      // Try admin-specific token first, then fall back to general token
      return localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token") || null
    } catch (error) {
      console.error("Error accessing stored token:", error)
      return null
    }
  }, [])

  const getStoredRefreshToken = useCallback((): string | null => {
    if (typeof window === "undefined") return null

    try {
      return localStorage.getItem("admin_refresh_token") || localStorage.getItem("mizizzi_refresh_token") || null
    } catch (error) {
      console.error("Error accessing stored refresh token:", error)
      return null
    }
  }, [])

  const getStoredUser = useCallback((): AdminUser | null => {
    if (typeof window === "undefined") return null

    try {
      const userStr = localStorage.getItem("admin_user") || localStorage.getItem("user")
      if (!userStr || userStr === "null" || userStr === "undefined") return null

      return JSON.parse(userStr)
    } catch (error) {
      console.error("Error parsing stored user:", error)
      return null
    }
  }, [])

  const isTokenExpired = useCallback((token: string): boolean => {
    if (!token) return true

    try {
      // Simple JWT expiry check (assumes JWT format)
      const payload = JSON.parse(atob(token.split(".")[1]))
      const currentTime = Math.floor(Date.now() / 1000)

      // Check if token expires within the next 2 minutes (instead of 5)
      return payload.exp && payload.exp < currentTime + 120
    } catch (error) {
      console.warn("Could not parse token for expiry check:", error)
      // If we can't parse the token, assume it might be expired
      return true
    }
  }, [])

  const isAdminUser = useCallback((userData: AdminUser | null): boolean => {
    if (!userData) return false

    const role = userData.role

    if (typeof role === "string") {
      return role.toLowerCase() === "admin"
    }

    if (role && typeof role === "object" && "value" in role) {
      return role.value.toLowerCase() === "admin"
    }

    if (role && typeof role === "object" && "name" in role) {
      return (role as any).name.toLowerCase() === "admin"
    }

    return false
  }, [])

  const storeAuthData = useCallback((accessToken: string, refreshToken?: string, userData?: AdminUser) => {
    if (typeof window === "undefined") return

    try {
      // Store tokens
      localStorage.setItem("admin_token", accessToken)
      localStorage.setItem("mizizzi_token", accessToken)

      if (refreshToken) {
        localStorage.setItem("admin_refresh_token", refreshToken)
        localStorage.setItem("mizizzi_refresh_token", refreshToken)
      }

      // Store user data
      if (userData) {
        localStorage.setItem("admin_user", JSON.stringify(userData))
        localStorage.setItem("user", JSON.stringify(userData))
      }

      console.log("✅ Auth data stored successfully")
    } catch (error) {
      console.error("Error storing auth data:", error)
    }
  }, [])

  const clearAuthData = useCallback(() => {
    if (typeof window === "undefined") return

    try {
      const keysToRemove = [
        "admin_token",
        "admin_refresh_token",
        "admin_user",
        "mizizzi_token",
        "mizizzi_refresh_token",
        "mizizzi_csrf_token",
        "user",
      ]

      keysToRemove.forEach((key) => localStorage.removeItem(key))

      console.log("🧹 Auth data cleared")
    } catch (error) {
      console.error("Error clearing auth data:", error)
    }
  }, [])

  const getToken = useCallback((): string | null => {
    return getStoredToken()
  }, [getStoredToken])

  // Handle auth errors and cleanup
  const handleAuthError = useCallback(
    (error: any, context: string) => {
      console.warn(`Auth error in ${context}:`, error)

      // Check if it's a token-related error
      if (error.message?.includes("401") || error.message?.includes("403") || error.message?.includes("token")) {
        console.log("Token-related error detected, clearing auth data")
        clearAuthData()
        setToken(null)
        setUser(null)
        setIsAuthenticated(false)

        // Only redirect if not already on login page
        if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
          const redirectFlag = sessionStorage.getItem("auth_redirecting")
          if (!redirectFlag) {
            sessionStorage.setItem("auth_redirecting", "true")
            window.location.href = "/admin/login?reason=session_expired"

            // Clear the flag after a delay
            setTimeout(() => {
              sessionStorage.removeItem("auth_redirecting")
            }, 3000)
          }
        }
      }
    },
    [clearAuthData],
  )

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      console.log("🔄 Token refresh already in progress, waiting...")

      // Wait for current refresh to complete (max 15 seconds)
      let attempts = 0
      while (isRefreshingRef.current && attempts < 150) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        attempts++
      }

      return isAuthenticated
    }

    isRefreshingRef.current = true

    try {
      const refreshTokenValue = getStoredRefreshToken()

      if (!refreshTokenValue) {
        console.warn("❌ No refresh token available")
        clearAuthData()
        setToken(null)
        setUser(null)
        setIsAuthenticated(false)
        return false
      }

      console.log("🔄 Attempting admin token refresh...")

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`${apiUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshTokenValue}`,
        },
        credentials: "include",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`❌ Token refresh failed: ${response.status}`)

        // Handle auth errors
        if (response.status === 401 || response.status === 403) {
          console.log("🔐 Refresh token is invalid, clearing auth data")
          clearAuthData()
          setToken(null)
          setUser(null)
          setIsAuthenticated(false)

          // Trigger redirect to login
          if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
            const redirectFlag = sessionStorage.getItem("auth_redirecting")
            if (!redirectFlag) {
              sessionStorage.setItem("auth_redirecting", "true")
              window.location.href = "/admin/login?reason=session_expired"
              setTimeout(() => {
                sessionStorage.removeItem("auth_redirecting")
              }, 3000)
            }
          }
        }

        return false
      }

      const data = await response.json()

      if (data.access_token) {
        // Get user data from response or use stored data
        const userData = data.user || getStoredUser()

        if (userData && isAdminUser(userData)) {
          storeAuthData(data.access_token, data.refresh_token || refreshTokenValue, userData)

          // Update state immediately
          setToken(data.access_token)
          setUser(userData)
          setIsAuthenticated(true)

          console.log("✅ Admin token refreshed successfully")
          return true
        } else {
          console.error("❌ User validation failed after token refresh")
          clearAuthData()
          setToken(null)
          setUser(null)
          setIsAuthenticated(false)
          return false
        }
      } else {
        console.error("❌ No access token in refresh response")
        return false
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.warn("⏱️ Token refresh timed out")
      } else {
        console.error("❌ Token refresh error:", error)
      }

      // Don't clear tokens on network errors, only on auth errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn("🌐 Network error during token refresh, keeping existing state")
      } else if (error.message?.includes("401") || error.message?.includes("403")) {
        console.log("🔐 Auth error during refresh, clearing tokens")
        clearAuthData()
        setToken(null)
        setUser(null)
        setIsAuthenticated(false)
      }

      return false
    } finally {
      isRefreshingRef.current = false
    }
  }, [isAuthenticated, getStoredRefreshToken, getStoredUser, isAdminUser, storeAuthData, clearAuthData])

  // Login function
  const login = useCallback(
    async (credentials: { email: string; password: string }): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log("🔐 Attempting admin login...")

        // Clear existing auth data
        clearAuthData()
        setToken(null)
        setUser(null)
        setIsAuthenticated(false)

        // Set loading state during login
        setIsLoading(true)

        // Check if adminService is available
        if (!adminService || typeof adminService.login !== "function") {
          throw new Error("Admin service is not properly loaded. Please refresh the page.")
        }

        // Check if adminService is available
        if (!adminService.isServiceAvailable()) {
          throw new Error("Admin service is not available. Please check your connection.")
        }

        // Call adminService.login with credentials object
        const data = await adminService.login(credentials)

        if (!data.success) {
          return { success: false, error: data.error || "Login failed" }
        }

        // Validate user has admin role
        if (!data.user || !isAdminUser(data.user)) {
          throw new Error("This account doesn't have admin privileges.")
        }

        if (!data.access_token) {
          throw new Error("No access token received")
        }

        // Store auth data
        storeAuthData(data.access_token, data.refresh_token, data.user)

        // Store CSRF token if provided
        if (data.csrf_token) {
          localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
        }

        // Update state immediately and synchronously
        setToken(data.access_token)
        setUser(data.user)
        setIsAuthenticated(true)
        setIsLoading(false)

        console.log("✅ Admin login successful - State updated")

        // Small delay to ensure state propagation
        await new Promise((resolve) => setTimeout(resolve, 100))

        return { success: true }
      } catch (error: any) {
        console.error("❌ Admin login error:", error)
        clearAuthData()
        setToken(null)
        setUser(null)
        setIsAuthenticated(false)
        setIsLoading(false)
        return { success: false, error: error.message || "Login failed. Please check your credentials." }
      }
    },
    [isAdminUser, storeAuthData, clearAuthData],
  )

  // Logout function
  const logout = useCallback(() => {
    console.log("🚪 Admin logout initiated")

    // Try to call logout API (don't wait for it)
    const currentToken = getStoredToken()
    if (currentToken) {
      adminService.logout().catch((error) => {
        console.warn("Logout API call failed:", error)
      })
    }

    clearAuthData()
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    console.log("✅ Admin logout completed")
  }, [getStoredToken, clearAuthData])

  // Check authentication with timeout
  const checkAuth = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent auth checks
    if (authCheckInProgressRef.current) {
      console.log("🔄 Auth check already in progress, waiting...")

      // Wait for current check to complete (max 10 seconds)
      let attempts = 0
      while (authCheckInProgressRef.current && attempts < 100) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        attempts++
      }

      return isAuthenticated
    }

    // Skip auth check on login page
    if (typeof window !== "undefined" && window.location.pathname.includes("/admin/login")) {
      console.log("📍 On login page, skipping auth check")
      setIsAuthenticated(false)
      setIsLoading(false)
      return false
    }

    // If we're already authenticated and have valid data, return true quickly
    if (isAuthenticated && user && token && !isTokenExpired(token)) {
      console.log("✅ Already authenticated with valid token")
      setIsLoading(false)
      return true
    }

    authCheckInProgressRef.current = true

    try {
      console.log("🔍 Starting authentication check...")

      const storedToken = getStoredToken()
      const storedUser = getStoredUser()

      if (!storedToken || !storedUser) {
        console.log("❌ No stored token or user data found")
        setIsAuthenticated(false)
        setUser(null)
        setToken(null)
        setIsLoading(false)
        return false
      }

      console.log("✅ Found stored token and user data")

      // Validate user has admin role
      if (!isAdminUser(storedUser)) {
        console.log("❌ User does not have admin role")
        clearAuthData()
        setIsAuthenticated(false)
        setUser(null)
        setToken(null)
        setIsLoading(false)
        return false
      }

      console.log("✅ User has admin role")

      // Check if token is expired
      if (isTokenExpired(storedToken)) {
        console.log("⏰ Token expired, attempting refresh...")
        const refreshSuccess = await refreshToken()

        if (!refreshSuccess) {
          console.log("❌ Token refresh failed")
          setIsLoading(false)
          return false
        }

        console.log("✅ Token refreshed successfully")
        // State should already be updated by refreshToken function
      } else {
        // Token is still valid, update state
        setToken(storedToken)
        setUser(storedUser)
        setIsAuthenticated(true)
      }

      setIsLoading(false)
      console.log("✅ Admin authentication verified successfully")
      return true
    } catch (error) {
      console.error("❌ Auth check error:", error)
      setIsAuthenticated(false)
      setUser(null)
      setToken(null)
      setIsLoading(false)
      return false
    } finally {
      authCheckInProgressRef.current = false
    }
  }, [
    isAuthenticated,
    user,
    token,
    getStoredToken,
    getStoredUser,
    isAdminUser,
    isTokenExpired,
    refreshToken,
    clearAuthData,
  ])

  // Initialize auth state on mount with timeout
  useEffect(() => {
    mountedRef.current = true

    const initAuth = async () => {
      if (!mountedRef.current) return

      // Skip on login page
      if (typeof window !== "undefined" && window.location.pathname.includes("/admin/login")) {
        setIsAuthenticated(false)
        setIsLoading(false)
        initializationCompleteRef.current = true
        return
      }

      try {
        await checkAuth()
      } catch (error) {
        console.error("Auth initialization error:", error)
        setIsAuthenticated(false)
        setIsLoading(false)
      } finally {
        initializationCompleteRef.current = true
      }
    }

    // Add timeout for initialization to prevent infinite loading
    const initTimeout = setTimeout(() => {
      if (!initializationCompleteRef.current) {
        console.warn("Auth initialization timed out, forcing completion")
        setIsLoading(false)
        setIsAuthenticated(false)
        initializationCompleteRef.current = true
      }
    }, 8000) // 8 second timeout

    initAuth()

    return () => {
      mountedRef.current = false
      clearTimeout(initTimeout)
    }
  }, [checkAuth])

  // Add a safety timeout to prevent infinite loading states
  useEffect(() => {
    if (isLoading) {
      const loadingTimeout = setTimeout(() => {
        console.warn("Auth loading state timed out, forcing completion")
        setIsLoading(false)
        if (!isAuthenticated) {
          setIsAuthenticated(false)
          setUser(null)
          setToken(null)
        }
      }, 15000) // 15 second timeout

      return () => clearTimeout(loadingTimeout)
    }
  }, [isLoading, isAuthenticated])

  const value = {
    isAuthenticated,
    isLoading,
    user,
    token,
    login,
    logout,
    checkAuth,
    refreshToken,
    getToken,
    handleAuthError,
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}
