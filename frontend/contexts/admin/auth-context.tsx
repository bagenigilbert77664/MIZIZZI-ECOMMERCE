"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { User } from "@/types/auth"
import { useRouter, usePathname } from "next/navigation"

interface AdminAuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  mfaRequired: boolean
  login: (credentials: { email: string; password: string; mfa_token?: string }) => Promise<{
    success: boolean
    error?: string
  }>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
  refreshAccessToken: () => Promise<string | null>
  getToken: () => string | null
  updateProfile: (data: any) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  mfaRequired: false,
  login: async () => ({ success: false, error: "Not implemented" }),
  logout: async () => {},
  checkAuth: async () => false,
  refreshToken: async () => false,
  refreshAccessToken: async () => null,
  getToken: () => null,
  updateProfile: async () => {},
  changePassword: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
})

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const getToken = (): string | null => {
    if (typeof window === "undefined") return null
    const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
    return token
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      if (isRefreshing) {
        return false
      }
      setIsRefreshing(true)

      const currentRefreshToken =
        localStorage.getItem("admin_refresh_token") || localStorage.getItem("mizizzi_refresh_token")
      if (!currentRefreshToken) {
        return false
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${apiUrl}/api/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentRefreshToken}`,
        },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
        credentials: "include",
      })

      if (!response.ok) {
        localStorage.removeItem("admin_token")
        localStorage.removeItem("admin_refresh_token")
        localStorage.removeItem("mizizzi_token")
        localStorage.removeItem("mizizzi_refresh_token")
        localStorage.removeItem("admin_user")
        return false
      }

      const data = await response.json()

      if (data.access_token) {
        localStorage.setItem("admin_token", data.access_token)
        localStorage.setItem("mizizzi_token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("admin_refresh_token", data.refresh_token)
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
      }
      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      return true
    } catch (error) {
      console.error("Token refresh error:", error)
      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_refresh_token")
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("admin_user")
      return false
    } finally {
      setIsRefreshing(false)
    }
  }

  const refreshAccessToken = async (): Promise<string | null> => {
    const success = await refreshToken()
    if (success) {
      return getToken()
    }
    return null
  }

  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        setIsAuthenticated(false)
        setUser(null)
        setIsLoading(false)
        return false
      }

      const userDataStr = localStorage.getItem("admin_user")
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr)
          if (userData && (userData.role === "admin" || userData.role?.value === "admin")) {
            setUser(userData)
            setIsAuthenticated(true)
            setIsLoading(false)
            return true
          }
        } catch (e) {
          console.error("Failed to parse cached admin user data:", e)
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      try {
        const response = await fetch(`${apiUrl}/api/admin/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          const adminUser = data.admin || data.user

          if (adminUser && (adminUser.role === "admin" || adminUser.role?.value === "admin")) {
            setUser(adminUser)
            setIsAuthenticated(true)
            localStorage.setItem("admin_user", JSON.stringify(adminUser))
            setIsLoading(false)
            return true
          } else {
            throw new Error("User is not admin")
          }
        } else if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))

          if (errorData.code === "AUTH_REQUIRED") {
            throw new Error("Authentication required")
          }
          if (errorData.code === "USER_NOT_FOUND") {
            throw new Error("User not found")
          }
          if (errorData.code === "ADMIN_REQUIRED") {
            throw new Error("Admin privileges required")
          }

          const refreshSuccess = await refreshToken()
          if (refreshSuccess) {
            const newToken = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
            if (newToken) {
              const retryResponse = await fetch(`${apiUrl}/api/admin/profile`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${newToken}`,
                },
                credentials: "include",
              })

              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                const retryAdminUser = retryData.admin || retryData.user
                if (retryAdminUser && (retryAdminUser.role === "admin" || retryAdminUser.role?.value === "admin")) {
                  setUser(retryAdminUser)
                  setIsAuthenticated(true)
                  localStorage.setItem("admin_user", JSON.stringify(retryAdminUser))
                  setIsLoading(false)
                  return true
                }
              }
            }
            throw new Error("Token refresh failed")
          } else {
            throw new Error("Token refresh failed")
          }
        } else {
          throw new Error(`Auth check failed: ${response.status}`)
        }
      } catch (fetchError) {
        console.error("Network error during auth check:", fetchError)

        const userDataStr = localStorage.getItem("admin_user")
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr)
            if (userData.role === "admin" || userData.role?.value === "admin") {
              setUser(userData)
              setIsAuthenticated(true)
              setIsLoading(false)
              return true
            }
          } catch (e) {
            console.error("Failed to parse cached admin user data:", e)
          }
        }

        throw fetchError
      }
    } catch (error) {
      console.error("Auth check error:", error)

      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_refresh_token")
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("admin_user")

      setIsAuthenticated(false)
      setUser(null)
      setIsLoading(false)
      return false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      if (!isMounted) {
        return
      }

      try {
        const isAuthed = await checkAuth()

        if (!isMounted) return

        if (isLoading) {
          timeoutId = setTimeout(() => {
            if (isMounted && isLoading) {
              setIsLoading(false)
            }
          }, 10000)
        }

        if (!isAuthed && pathname?.includes("/admin") && !pathname?.includes("/admin/login")) {
          router.push("/admin/login")
        } else if (isAuthed && pathname === "/admin/login") {
          router.push("/admin")
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        if (isMounted) {
          setIsAuthenticated(false)
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [pathname, router])

  const login = async (credentials: { email: string; password: string; mfa_token?: string }): Promise<{
    success: boolean
    error?: string
  }> => {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const requestBody: any = {
        email: credentials.email,
        password: credentials.password,
      }

      if (credentials.mfa_token) {
        requestBody.mfa_token = credentials.mfa_token
      }

      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include",
      })

      const responseData = await response.json()

      if (!response.ok) {
        if (responseData.code === "AUTH_REQUIRED") {
          return { success: false, error: "Authentication required. Please provide valid credentials." }
        }
        if (responseData.code === "USER_NOT_FOUND") {
          return { success: false, error: "Admin account not found. Please check your email address." }
        }
        if (responseData.code === "ADMIN_REQUIRED") {
          return { success: false, error: "You don't have admin privileges. Please contact an administrator." }
        }
        if (responseData.code === "ROLE_NOT_DEFINED") {
          return { success: false, error: "Account role is not properly configured. Please contact support." }
        }
        if (responseData.code === "AUTH_FAILED") {
          return { success: false, error: "Authentication failed. Please try again." }
        }

        if (response.status === 403) {
          if (responseData.mfa_required) {
            setMfaRequired(true)
            return { success: false, error: "MFA token required" }
          }
          if (responseData.error?.includes("Admin access required")) {
            return { success: false, error: "You don't have admin privileges. Please contact an administrator." }
          }
          if (responseData.error?.includes("deactivated")) {
            return { success: false, error: "Your admin account has been deactivated. Please contact a super admin." }
          }
          if (responseData.error?.includes("not verified")) {
            return {
              success: false,
              error: "Your admin account email/phone is not verified. Please verify your account first.",
            }
          }
        }
        if (response.status === 401) {
          return { success: false, error: "Invalid admin credentials. Please check your email and password." }
        }
        return {
          success: false,
          error: responseData.error || responseData.message || `Login failed with status: ${response.status}`,
        }
      }

      const adminUser = responseData.user
      if (!adminUser || (adminUser.role !== "admin" && adminUser.role?.value !== "admin")) {
        return { success: false, error: "You don't have permission to access the admin area" }
      }

      if (responseData.access_token) {
        localStorage.setItem("admin_token", responseData.access_token)
        localStorage.setItem("mizizzi_token", responseData.access_token)
      }
      if (responseData.refresh_token) {
        localStorage.setItem("admin_refresh_token", responseData.refresh_token)
        localStorage.setItem("mizizzi_refresh_token", responseData.refresh_token)
      }
      if (responseData.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", responseData.csrf_token)
      }

      localStorage.setItem("admin_user", JSON.stringify(adminUser))

      setUser(adminUser)
      setIsAuthenticated(true)
      setMfaRequired(false)
      setIsLoading(false)

      return { success: true }
    } catch (error: any) {
      console.error("Login error:", error)
      setIsLoading(false)
      return { success: false, error: error.message || "An unexpected error occurred. Please try again." }
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const token = getToken()
      if (token && token.trim()) {
        try {
          await fetch(`${apiUrl}/api/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          })
        } catch (logoutError) {
          console.warn("Admin logout API call failed, continuing with local logout:", logoutError)
        }
      }

      setUser(null)
      setIsAuthenticated(false)
      setMfaRequired(false)

      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_refresh_token")
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("admin_user")

      router.push("/admin/login")
    } catch (error) {
      console.error("Logout error:", error)

      setUser(null)
      setIsAuthenticated(false)
      setMfaRequired(false)

      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_refresh_token")
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("admin_user")

      router.push("/admin/login")
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (data: any): Promise<void> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    const token = getToken()

    const response = await fetch(`${apiUrl}/api/admin/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update profile")
    }

    const responseData = await response.json()
    const updatedUser = responseData.admin || responseData.user
    setUser(updatedUser)
    localStorage.setItem("admin_user", JSON.stringify(updatedUser))
  }

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    const token = getToken()

    const response = await fetch(`${apiUrl}/api/admin/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to change password")
    }
  }

  const forgotPassword = async (email: string): Promise<void> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

    const response = await fetch(`${apiUrl}/api/admin/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to send reset email")
    }
  }

  const resetPassword = async (token: string, password: string, confirmPassword: string): Promise<void> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

    const response = await fetch(`${apiUrl}/api/admin/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
        confirm_password: confirmPassword,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to reset password")
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        mfaRequired,
        login,
        logout,
        checkAuth,
        refreshToken,
        refreshAccessToken,
        getToken,
        updateProfile,
        changePassword,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
