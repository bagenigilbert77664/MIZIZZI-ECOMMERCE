"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"
import { useToast } from "@/components/ui/use-toast"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (credentials: { name: string; email: string; password: string; phone?: string }) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (userData: Partial<User>) => Promise<User>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerificationEmail: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [refreshAttempts, setRefreshAttempts] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth()
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const checkAuth = async (): Promise<boolean> => {
    try {
      console.log("Checking authentication status...")

      // First check if we have a token
      const hasToken = !!authService.getAccessToken()
      if (!hasToken) {
        console.log("No token found, user is not authenticated")
        setUser(null)
        setIsAuthenticated(false)
        return false
      }

      // Try to get user from localStorage first
      const storedUser = authService.getUser()

      if (storedUser) {
        if (process.env.NODE_ENV === "development") {
          // Only log in development, and sanitize sensitive data
          const sanitizedUser = storedUser
            ? {
                id: storedUser.id,
                role: storedUser.role,
                is_active: storedUser.is_active,
              }
            : null
          console.log("User found in localStorage (sanitized):", sanitizedUser)
        }
        setUser(storedUser)
        setIsAuthenticated(true)

        // Validate with backend in background, but don't retry excessively
        if (refreshAttempts < 2) {
          try {
            const freshUser = await authService.getCurrentUser()
            if (process.env.NODE_ENV === "development") {
              // Only log in development, and sanitize sensitive data
              const sanitizedUser = freshUser
                ? {
                    id: freshUser.id,
                    role: freshUser.role,
                    is_active: freshUser.is_active,
                  }
                : null
              console.log("User validated with backend (sanitized):", sanitizedUser)
            }
            setUser(freshUser)
            setRefreshAttempts(0) // Reset counter on success
          } catch (error) {
            console.error("Error validating user with backend:", error)
            setRefreshAttempts((prev) => prev + 1)
            // Keep using stored user, don't log out
          }
        }

        return true
      }

      // If no stored user but we have a token, try to get user from API
      if (refreshAttempts < 2) {
        try {
          console.log("Fetching user from API...")
          const currentUser = await authService.getCurrentUser()
          if (process.env.NODE_ENV === "development") {
            // Only log in development, and sanitize sensitive data
            const sanitizedUser = currentUser
              ? {
                  id: currentUser.id,
                  role: currentUser.role,
                  is_active: currentUser.is_active,
                }
              : null
            console.log("User fetched from API (sanitized):", sanitizedUser)
          }
          setUser(currentUser)
          setIsAuthenticated(true)
          setRefreshAttempts(0) // Reset counter on success
          return true
        } catch (error) {
          console.error("Error fetching user from API:", error)
          setRefreshAttempts((prev) => prev + 1)
          // If API call fails, clear auth state
          setUser(null)
          setIsAuthenticated(false)
          authService.logout()
          return false
        }
      } else {
        console.log("Max refresh attempts reached, clearing auth state")
        setUser(null)
        setIsAuthenticated(false)
        authService.logout()
        return false
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setUser(null)
      setIsAuthenticated(false)
      return false
    }
  }

  const login = async (email: string, password: string, remember = false): Promise<void> => {
    try {
      setIsLoading(true)
      const response = await authService.login(email, password, remember)
      setUser(response.user)
      setIsAuthenticated(true)

      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.name}!`,
      })

      router.push("/")
    } catch (error: any) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
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
  }): Promise<void> => {
    try {
      setIsLoading(true)
      const response = await authService.register(credentials)
      setUser(response.user)
      setIsAuthenticated(true)

      toast({
        title: "Registration successful",
        description: `Welcome, ${response.user.name}!`,
      })

      router.push("/")
    } catch (error: any) {
      console.error("Registration error:", error)
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true)
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })

      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (userData: Partial<User>): Promise<User> => {
    try {
      const updatedUser = await authService.updateProfile(userData)
      setUser(updatedUser)

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })

      return updatedUser
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
      throw error
    }
  }

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await authService.forgotPassword(email)
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      })
      throw error
    }
  }

  const resetPassword = async (token: string, password: string): Promise<void> => {
    try {
      await authService.resetPassword(token, password)
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      })
      throw error
    }
  }

  const verifyEmail = async (token: string): Promise<void> => {
    try {
      await authService.verifyEmail(token)
      toast({
        title: "Email verified",
        description: "Your email has been verified successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify email",
        variant: "destructive",
      })
      throw error
    }
  }

  const resendVerificationEmail = async (): Promise<void> => {
    try {
      await authService.resendVerificationEmail()
      toast({
        title: "Verification email sent",
        description: "Please check your email for verification instructions.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
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
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerificationEmail,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

