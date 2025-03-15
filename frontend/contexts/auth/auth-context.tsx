"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import api from "@/lib/api"
import { authService, type User } from "@/services/auth"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>
  logout: () => Promise<void>
  register: (name: string, email: string, password: string) => Promise<boolean>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      try {
        // Check if we have a token
        const token = localStorage.getItem("token")

        if (!token) {
          setIsAuthenticated(false)
          setUser(null)
          setIsLoading(false)
          return
        }

        // Verify token by fetching user data
        const response = await api.get("/api/auth/me")
        setUser(response.data)
        setIsAuthenticated(true)
        setError(null)
      } catch (error) {
        console.error("Authentication check failed:", error)
        setUser(null)
        setIsAuthenticated(false)

        // Clear tokens on auth failure
        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Listen for auth errors from API service
    const handleAuthError = () => {
      setUser(null)
      setIsAuthenticated(false)
      setError("Your session has expired. Please log in again.")
    }

    document.addEventListener("auth-error", handleAuthError)

    return () => {
      document.removeEventListener("auth-error", handleAuthError)
    }
  }, [])

  const login = async (email: string, password: string, remember = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const user = await authService.login(email, password, remember)
      setUser(user)
      setIsAuthenticated(true)
      return true
    } catch (error: any) {
      console.error("Login failed:", error)
      setError(error.message || "Login failed. Please check your credentials.")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const user = await authService.register({ name, email, password })
      setUser(user)
      setIsAuthenticated(true)
      return true
    } catch (error: any) {
      console.error("Registration failed:", error)
      setError(error.message || "Registration failed. Please try again.")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        register,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
