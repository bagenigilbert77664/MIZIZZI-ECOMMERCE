"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/services/auth"
import type { User, AuthContextType } from "../../types/auth"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser()
        setUser(user)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      authService.logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string, remember = false) => {
    setIsLoading(true)
    try {
      const response = await authService.login({ email, password, remember })
      setUser(response.user)
      setIsAuthenticated(true)

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      })

      router.push("/")
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (credentials: {
    name: string
    email: string
    password: string
    phone?: string
  }) => {
    setIsLoading(true)
    try {
      const response = await authService.register(credentials)
      setUser(response.user)
      setIsAuthenticated(true)

      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      })

      router.push("/")
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)

      toast({
        title: "Goodbye!",
        description: "You've been logged out successfully.",
      })

      router.push("/auth/login")
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateProfile = async (userData: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(userData)
      setUser(updatedUser)

      toast({
        title: "Success",
        description: "Your profile has been updated.",
      })
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
