"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"

interface AdminAuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
  refreshAccessToken: () => Promise<string>
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refreshAccessToken: async () => "",
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => false,
})

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        const isAuthed = await checkAuth()
        setIsAuthenticated(isAuthed)
      } catch (error) {
        console.error("Auth initialization error:", error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string, remember = false) => {
    try {
      // For admin login, we'll use the same auth service but check for admin role
      const response = await authService.login(email, password, remember)

      // Verify the user is an admin
      if (response.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required")
      }

      setUser(response.user)
      setIsAuthenticated(true)
      // Successfully logged in as admin
      return
    } catch (error) {
      console.error("Login error:", error)
      setUser(null)
      setIsAuthenticated(false)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error("Logout error:", error)
      throw error
    }
  }

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser()

      // Verify the user is an admin
      if (currentUser.role !== "admin") {
        setUser(null)
        return false
      }

      setUser(currentUser)
      return true
    } catch (error) {
      console.error("Check auth error:", error)
      setUser(null)
      return false
    }
  }

  const refreshAccessToken = async (): Promise<string> => {
    // Placeholder implementation, replace with actual refresh logic
    return authService.refreshAccessToken()
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
        refreshAccessToken,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
