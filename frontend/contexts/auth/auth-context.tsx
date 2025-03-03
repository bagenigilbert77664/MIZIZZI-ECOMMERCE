"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/services/auth"
import type { User, AuthContextType, RegisterCredentials, AuthError } from "@/types/auth"

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
      handleAuthError(error as AuthError)
      authService.logout()
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthError = (error: AuthError) => {
    let title = "Error"
    let description = error.message

    switch (error.code) {
      case "auth/invalid-credentials":
        title = "Invalid credentials"
        description = "Please check your email and password"
        break
      case "auth/email-already-exists":
        title = "Email already registered"
        description = "Please use a different email address"
        break
      case "auth/phone-already-exists":
        title = "Phone number already registered"
        description = "Please use a different phone number"
        break
      case "auth/email-not-verified":
        title = "Email not verified"
        description = "Please verify your email address"
        break
      case "auth/weak-password":
        title = "Weak password"
        description = "Please choose a stronger password"
        break
      default:
        title = "Error"
        description = error.message || "An unexpected error occurred"
    }

    toast({
      title,
      description,
      variant: "destructive",
    })
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
    } catch (error) {
      handleAuthError(error as AuthError)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (credentials: RegisterCredentials) => {
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
    } catch (error) {
      handleAuthError(error as AuthError)
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
    } catch (error) {
      handleAuthError(error as AuthError)
    }
  }

  const updateProfile = async (userData: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(userData)
      setUser(updatedUser)

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })

      return updatedUser
    } catch (error) {
      handleAuthError(error as AuthError)
      throw error
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      await authService.forgotPassword(email)
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      })
    } catch (error) {
      handleAuthError(error as AuthError)
      throw error
    }
  }

  const resetPassword = async (token: string, password: string) => {
    try {
      await authService.resetPassword(token, password)
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      })
    } catch (error) {
      handleAuthError(error as AuthError)
      throw error
    }
  }

  const verifyEmail = async (token: string) => {
    try {
      await authService.verifyEmail(token)
      toast({
        title: "Email verified",
        description: "Your email has been verified successfully.",
      })
    } catch (error) {
      handleAuthError(error as AuthError)
      throw error
    }
  }

  const resendVerificationEmail = async () => {
    try {
      await authService.resendVerificationEmail()
      toast({
        title: "Verification email sent",
        description: "Please check your email for verification instructions.",
      })
    } catch (error) {
      handleAuthError(error as AuthError)
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
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
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

