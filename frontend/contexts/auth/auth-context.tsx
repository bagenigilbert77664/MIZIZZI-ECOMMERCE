"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"

// Define the auth context type
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (userData: {
    name: string
    email: string
    password: string
    phone?: string
  }) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (userData: Partial<User>) => Promise<User>
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider props
interface AuthProviderProps {
  children: ReactNode
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [lastAuthCheck, setLastAuthCheck] = useState<number>(0)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  // Initialize auth state
  const initAuth = async () => {
    setIsLoading(true)
    try {
      // First, check if we have tokens in localStorage or cookies
      authService.initializeTokens()

      // If we have a token, validate it by getting the current user
      if (authService.getAccessToken()) {
        const isValid = await checkAuth()
        if (!isValid) {
          // If token validation fails, clear auth state
          setIsAuthenticated(false)
          setUser(null)
        }
      } else {
        // No token, so we're not authenticated
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      console.error("Error initializing auth:", error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Check authentication status
  const checkAuth = async () => {
    try {
      // Add a simple cache to prevent too frequent API calls
      const now = Date.now()
      const CACHE_DURATION = 30000 // 30 seconds

      if (now - lastAuthCheck < CACHE_DURATION && user) {
        console.log("Using cached auth data")
        return true
      }

      // Try to get the current user from the API
      console.log("Checking authentication status...")
      const currentUser = await authService.getCurrentUser()

      // If successful, update state
      setUser(currentUser)
      setIsAuthenticated(true)
      setLastAuthCheck(now)
      console.log("User authenticated:", currentUser.email)
      return true
    } catch (error) {
      console.error("Error validating user with backend:", error)

      // Clear auth data on validation failure
      authService.clearAuthData()
      setUser(null)
      setIsAuthenticated(false)
      setLastAuthCheck(0)

      return false
    }
  }

  // Handle login
  const login = async (email: string, password: string, remember = false) => {
    setIsLoading(true)
    try {
      console.log("Auth context: Attempting login for", email)
      const response = await authService.login(email, password, remember)
      setUser(response.user)
      setIsAuthenticated(true)
      setLastAuthCheck(Date.now())

      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.name || response.user.email}!`,
        variant: "default",
      })

      // Redirect to dashboard or home page
      router.push("/")
    } catch (error: any) {
      console.error("Login error in auth context:", error)

      // Clear any stale auth data
      authService.clearAuthData()
      setUser(null)
      setIsAuthenticated(false)

      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      })

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Handle registration
  const register = async (userData: {
    name: string
    email: string
    password: string
    phone?: string
  }) => {
    setIsLoading(true)
    try {
      const newUser = await authService.register(userData)
      setUser(newUser)
      setIsAuthenticated(true)

      toast({
        title: "Registration successful",
        description: `Welcome, ${newUser.name || newUser.email}!`,
        variant: "default",
      })

      // Redirect to dashboard or home page
      router.push("/")
    } catch (error: any) {
      console.error("Registration error:", error)

      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      })

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Handle logout
  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()

      // Clear auth state
      setUser(null)
      setIsAuthenticated(false)

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
        variant: "default",
      })

      // Redirect to login page
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)

      // Still clear auth state even if API call fails
      setUser(null)
      setIsAuthenticated(false)

      toast({
        title: "Logout error",
        description: "There was an error logging out, but you've been logged out locally",
        variant: "destructive",
      })

      // Redirect to login page
      router.push("/auth/login")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle profile update
  const updateProfile = async (userData: Partial<User>) => {
    setIsLoading(true)
    try {
      const updatedUser = await authService.updateProfile(userData)
      setUser(updatedUser)

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
        variant: "default",
      })

      return updatedUser
    } catch (error: any) {
      console.error("Profile update error:", error)

      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })

      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for auth error events
  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent
      console.error("Auth error event:", customEvent.detail)

      // Clear auth state
      setUser(null)
      setIsAuthenticated(false)

      // Only show toast and redirect if not already on auth page
      if (!pathname?.includes("/auth/")) {
        toast({
          title: "Authentication error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })

        router.push("/auth/login")
      }
    }

    // Add event listener
    document.addEventListener("auth-error", handleAuthError)

    // Initialize auth
    initAuth()

    // Cleanup
    return () => {
      document.removeEventListener("auth-error", handleAuthError)
    }
  }, [])

  // Provide auth context
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

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

