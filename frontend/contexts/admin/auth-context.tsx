"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext, useCallback, useRef } from "react"

interface AdminAuthContextProps {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
  token: string | null
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
}

const AdminAuthContext = createContext<AdminAuthContextProps>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  checkAuth: async () => false,
  refreshToken: async () => false,
})

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<"online" | "offline" | "unknown">("unknown")

  // Add refs to track last health check time and prevent excessive calls
  const lastHealthCheckTime = useRef<number>(0)
  const healthCheckInProgress = useRef<boolean>(false)
  const healthCheckInterval = 10000 // 10 seconds between health checks

  // Check if user has admin role - make this more flexible
  const isAdminUser = (userData: any): boolean => {
    if (!userData) {
      console.log("❌ No user data provided for admin check")
      return false
    }

    console.log("🔍 Checking admin role for user:", {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      roleType: typeof userData.role,
    })

    const role = userData.role

    // Handle string roles
    if (typeof role === "string") {
      const isAdmin = role.toLowerCase() === "admin"
      console.log(`📝 String role check: "${role}" -> ${isAdmin}`)
      return isAdmin
    }

    // Handle object roles with value property
    if (role && typeof role === "object" && "value" in role) {
      const isAdmin = role.value.toLowerCase() === "admin"
      console.log(`📝 Object role check: "${role.value}" -> ${isAdmin}`)
      return isAdmin
    }

    // Handle object roles with name property
    if (role && typeof role === "object" && "name" in role) {
      const isAdmin = role.name.toLowerCase() === "admin"
      console.log(`📝 Object role.name check: "${role.name}" -> ${isAdmin}`)
      return isAdmin
    }

    console.log("❌ Role format not recognized:", role)
    return false
  }

  // Get stored tokens
  const getStoredTokens = () => {
    if (typeof window === "undefined") return { accessToken: null, refreshToken: null }

    try {
      const accessToken = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      const refreshToken = localStorage.getItem("admin_refresh_token") || localStorage.getItem("mizizzi_refresh_token")

      return { accessToken, refreshToken }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
      return { accessToken: null, refreshToken: null }
    }
  }

  // Store tokens in localStorage
  const storeTokens = (accessToken: string, refreshToken?: string, userData?: any) => {
    if (typeof window === "undefined") return

    try {
      // Store access token for both admin and regular systems
      localStorage.setItem("admin_token", accessToken)
      localStorage.setItem("mizizzi_token", accessToken)

      // Store refresh token if provided
      if (refreshToken) {
        localStorage.setItem("admin_refresh_token", refreshToken)
        localStorage.setItem("mizizzi_refresh_token", refreshToken)
        console.log("✅ Admin refresh token stored successfully")
      }

      // Store user data if provided
      if (userData) {
        localStorage.setItem("user", JSON.stringify(userData))
        localStorage.setItem("admin_user", JSON.stringify(userData))
      }

      setToken(accessToken)
      if (userData) setUser(userData)
    } catch (error) {
      console.error("Error storing tokens:", error)
    }
  }

  // Clear all tokens and user data
  const clearTokens = () => {
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

      setToken(null)
      setUser(null)
      setIsAuthenticated(false)

      console.log("🧹 All tokens and user data cleared")
    } catch (error) {
      console.error("Error clearing tokens:", error)
    }
  }

  // Check if backend is available with throttling
  const checkBackendHealth = useCallback(
    async (force = false): Promise<boolean> => {
      // Skip if a check is already in progress
      if (healthCheckInProgress.current) {
        return backendStatus === "online"
      }

      // Skip if we've checked recently, unless forced
      const now = Date.now()
      if (!force && now - lastHealthCheckTime.current < healthCheckInterval) {
        return backendStatus === "online"
      }

      healthCheckInProgress.current = true

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

        // Use a shorter timeout for health check
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

        const response = await fetch(`${apiUrl}/api/health-check`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
          cache: "no-store", // Prevent caching
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        clearTimeout(timeoutId)

        // Update last check time
        lastHealthCheckTime.current = now

        const isOnline = response.ok
        setBackendStatus(isOnline ? "online" : "offline")
        return isOnline
      } catch (error) {
        if (typeof error === "object" && error !== null && "name" in error && (error as any).name === "AbortError") {
          console.error("❌ Backend health check timed out")
        } else {
          console.error("❌ Backend health check failed:", error)
        }

        // Update last check time even on failure
        lastHealthCheckTime.current = now
        setBackendStatus("offline")
        return false
      } finally {
        healthCheckInProgress.current = false
      }
    },
    [backendStatus],
  )

  // Refresh access token using refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      console.log("🔄 Attempting to refresh admin token...")

      // Check backend health first (with throttling)
      const backendHealthy = await checkBackendHealth()
      if (!backendHealthy) {
        console.error("❌ Backend is not available, skipping token refresh")
        return false
      }

      const { refreshToken: storedRefreshToken } = getStoredTokens()

      if (!storedRefreshToken) {
        console.warn("❌ No refresh token available for admin token refresh")
        return false
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${apiUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedRefreshToken}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        console.error(`❌ Admin token refresh failed with status: ${response.status}`)

        // Only clear tokens and redirect for 401/403 errors (invalid refresh token)
        if (response.status === 401 || response.status === 403) {
          console.log("🧹 Refresh token invalid, clearing all tokens")
          clearTokens()

          // Only redirect if we're in a browser environment and not already on login page
          if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
            // Set a flag to prevent multiple redirects
            const redirectFlag = sessionStorage.getItem("auth_redirecting")
            if (!redirectFlag) {
              sessionStorage.setItem("auth_redirecting", "true")
              window.location.href = "/admin/login?reason=token_expired"

              // Clear the flag after a delay
              setTimeout(() => {
                sessionStorage.removeItem("auth_redirecting")
              }, 3000)
            }
          }
        }

        return false
      }

      const data = await response.json()
      console.log("✅ Token refresh response received:", {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        hasUser: !!data.user,
      })

      if (data.access_token) {
        // If no user data in refresh response, use existing user data
        let userData = data.user
        if (!userData) {
          console.log("⚠️ No user data in refresh response, using stored user data")
          const storedUser = localStorage.getItem("user")
          if (storedUser) {
            try {
              userData = JSON.parse(storedUser)
              console.log("✅ Using stored user data:", userData)
            } catch (error) {
              console.error("❌ Error parsing stored user data:", error)
            }
          }
        }

        // Verify user has admin role
        if (userData && isAdminUser(userData)) {
          // Store the new tokens
          storeTokens(data.access_token, data.refresh_token || storedRefreshToken, userData)
          setIsAuthenticated(true)
          console.log("✅ Admin token refreshed successfully")
          return true
        } else {
          console.error("❌ User validation failed after refresh:", {
            hasUserData: !!userData,
            userRole: userData?.role,
            isAdmin: userData ? isAdminUser(userData) : false,
          })

          clearTokens()
          return false
        }
      } else {
        console.error("❌ No access token in refresh response")
        return false
      }
    } catch (error) {
      console.error("❌ Token refresh error:", error)

      // Don't automatically redirect on network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn("⚠️ Network error during token refresh, keeping existing tokens")
        return false
      }

      clearTokens()
      return false
    }
  }, [checkBackendHealth])

  // Check authentication status
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const { accessToken, refreshToken: storedRefreshToken } = getStoredTokens()
      const storedUser = localStorage.getItem("user")

      if (!accessToken) {
        console.log("❌ No access token found")
        setIsAuthenticated(false)
        setIsLoading(false)
        return false
      }

      // Parse and validate user data
      let userData = null
      if (storedUser) {
        try {
          userData = JSON.parse(storedUser)
        } catch (error) {
          console.error("❌ Error parsing stored user data:", error)
        }
      }

      // Check if user has admin role
      if (!userData || !isAdminUser(userData)) {
        console.log("❌ User does not have admin role")
        clearTokens()
        setIsAuthenticated(false)
        setIsLoading(false)
        return false
      }

      // Check backend health before making API calls (with throttling)
      const backendHealthy = await checkBackendHealth()
      if (!backendHealthy) {
        console.warn("⚠️ Backend is not available, but tokens exist. Allowing offline access.")
        setToken(accessToken)
        setUser(userData)
        setIsAuthenticated(true)
        setIsLoading(false)
        return true
      }

      // Try to verify token with a simple API call
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      try {
        const response = await fetch(`${apiUrl}/api/admin/dashboard`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
        })

        if (response.ok) {
          // Token is valid
          setToken(accessToken)
          setUser(userData)
          setIsAuthenticated(true)
          setIsLoading(false)
          console.log("✅ Admin authentication verified")
          return true
        } else if (response.status === 401) {
          // Token expired, try to refresh
          console.log("🔄 Access token expired, attempting refresh...")

          if (storedRefreshToken) {
            const refreshSuccess = await refreshToken()
            setIsLoading(false)
            return refreshSuccess
          } else {
            console.log("❌ No refresh token available")
            clearTokens()
            setIsAuthenticated(false)
            setIsLoading(false)
            return false
          }
        } else {
          console.error(`❌ Auth check failed with status: ${response.status}`)

          // For non-401 errors, still allow access if we have valid tokens locally
          console.warn("⚠️ API error but tokens exist. Allowing offline access.")
          setToken(accessToken)
          setUser(userData)
          setIsAuthenticated(true)
          setIsLoading(false)
          return true
        }
      } catch (error) {
        console.error("❌ Error verifying token:", error)

        // Network error but we have tokens - allow offline access
        console.warn("⚠️ Network error but tokens exist. Allowing offline access.")
        setToken(accessToken)
        setUser(userData)
        setIsAuthenticated(true)
        setIsLoading(false)
        return true
      }
    } catch (error) {
      console.error("❌ Auth check error:", error)
      setIsAuthenticated(false)
      setIsLoading(false)
      return false
    }
  }, [checkBackendHealth, refreshToken])

  // Login function
  const login = async (credentials: { email: string; password: string }): Promise<void> => {
    try {
      console.log("🔐 Attempting admin login...")

      // Clear any existing tokens first
      clearTokens()

      // Check backend health first (with throttling)
      const backendHealthy = await checkBackendHealth(true) // Force check
      if (!backendHealthy) {
        throw new Error(
          "Backend server is not available. Please check if the server is running on http://localhost:5000",
        )
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          identifier: credentials.email,
          password: credentials.password,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          throw new Error("Invalid email or password")
        } else if (response.status === 403) {
          if (errorData.msg && errorData.msg.includes("verified")) {
            throw new Error("This account needs to be verified. Please check your email for a verification link.")
          } else {
            throw new Error("Access forbidden. You may not have the required permissions.")
          }
        } else {
          throw new Error(errorData.msg || errorData.message || `Login failed with status: ${response.status}`)
        }
      }

      const data = await response.json()
      console.log("✅ Login response received")

      // Verify user has admin role
      if (!data.user || !isAdminUser(data.user)) {
        throw new Error(
          "You don't have permission to access the admin area. This account doesn't have admin privileges.",
        )
      }

      // Store tokens and user data
      if (data.access_token) {
        storeTokens(data.access_token, data.refresh_token, data.user)

        // Store CSRF token if provided
        if (data.csrf_token) {
          localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
        }

        setIsAuthenticated(true)
        console.log("✅ Admin login successful with refresh token support")
      } else {
        throw new Error("No access token received from server")
      }
    } catch (error) {
      console.error("❌ Admin login error:", error)
      clearTokens()
      throw error
    }
  }

  // Logout function
  const logout = () => {
    console.log("🚪 Admin logout initiated")

    // Try to call logout API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    const { accessToken } = getStoredTokens()

    if (accessToken) {
      fetch(`${apiUrl}/api/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      }).catch((error) => {
        console.warn("Logout API call failed, continuing with local logout:", error)
      })
    }

    clearTokens()
    console.log("✅ Admin logout completed")
  }

  // Initialize authentication state on mount
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      if (mounted) {
        await checkAuth()
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [checkAuth])

  // Set up automatic token refresh - but only if backend is healthy
  useEffect(() => {
    if (!isAuthenticated) return

    // Refresh token every 14 minutes (tokens typically expire in 15 minutes)
    const refreshInterval = setInterval(
      async () => {
        console.log("⏰ Automatic token refresh triggered")
        const backendHealthy = await checkBackendHealth()
        if (backendHealthy) {
          refreshToken()
        } else {
          console.log("⚠️ Backend unhealthy, skipping automatic refresh")
        }
      },
      14 * 60 * 1000,
    ) // 14 minutes

    // Set up periodic backend health checks (every 30 seconds)
    const healthCheckTimer = setInterval(() => {
      checkBackendHealth()
    }, 30000)

    return () => {
      clearInterval(refreshInterval)
      clearInterval(healthCheckTimer)
    }
  }, [isAuthenticated, refreshToken, checkBackendHealth])

  const value = {
    isAuthenticated,
    isLoading,
    user,
    token,
    login,
    logout,
    checkAuth,
    refreshToken,
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
