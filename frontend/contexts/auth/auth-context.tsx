"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import authService from "@/services/auth"
import { toast } from "@/components/ui/use-toast"

interface User {
  id: number
  name: string
  email: string
  role: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (userData: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("mizizzi_token")
    if (token) {
      try {
        const userData = await authService.getCurrentUser()
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        localStorage.removeItem("mizizzi_token")
        localStorage.removeItem("mizizzi_user")
        setUser(null)
        setIsAuthenticated(false)
      }
    }
    setIsLoading(false)
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await authService.login({ email, password })
      localStorage.setItem("mizizzi_token", response.access_token)
      localStorage.setItem("mizizzi_user", JSON.stringify(response.user))
      setUser(response.user)
      setIsAuthenticated(true)
      toast({
        title: "Success",
        description: "Logged in successfully",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, phone?: string) => {
    setIsLoading(true)
    try {
      const response = await authService.register({
        name,
        email,
        password,
        phone,
      })
      localStorage.setItem("mizizzi_token", response.access_token)
      localStorage.setItem("mizizzi_user", JSON.stringify(response.user))
      setUser(response.user)
      setIsAuthenticated(true)
      toast({
        title: "Success",
        description: "Registration successful",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
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
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_user")
      setUser(null)
      setIsAuthenticated(false)
      toast({
        title: "Success",
        description: "Logged out successfully",
      })
      router.push("/auth/login")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Logout failed",
        variant: "destructive",
      })
    }
  }

  const updateProfile = async (userData: Partial<User>) => {
    try {
      const response = await authService.updateProfile(userData)
      setUser(response.user)
      localStorage.setItem("mizizzi_user", JSON.stringify(response.user))
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Profile update failed",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
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

