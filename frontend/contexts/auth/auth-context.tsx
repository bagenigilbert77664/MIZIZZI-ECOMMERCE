"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
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
  token: string | null
  refreshToken: () => Promise<string | null>
  showPageTransition: boolean
  handlePageTransitionComplete: () => void
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

  // Add state for page transition
  const [showPageTransition, setShowPageTransition] = useState(false)

  // Use a ref to track if we're currently refreshing the token
  const isRefreshing = useRef(false)
  const refreshPromise = useRef<Promise<string | null> | null>(null)

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
      if (currentUser) {
        setUser(currentUser)
        setIsAuthenticated(true)
        setLastAuthCheck(now)
        console.log("User authenticated:", currentUser.email)
        return true
      } else {
        throw new Error("No user data returned")
      }
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

  // Update the refreshToken function to better handle token expiration and refresh
  const refreshToken = async (): Promise<string | null> => {
    // If we're already refreshing, return the existing promise
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current
    }

    isRefreshing.current = true
    refreshPromise.current = authService
      .refreshAccessToken()
      .then((token) => {
        // If token refresh was successful, update auth state
        if (token) {
          setIsAuthenticated(true)
          // Optionally refresh user data
          checkAuth().catch(console.error)
        } else {
          // If refresh failed, clear auth state
          setUser(null)
          setIsAuthenticated(false)
          setLastAuthCheck(0)

          // Show a toast notification about the session expiration
          toast({
            title: "Session expired",
            description: "Please log in again to continue",
            variant: "destructive",
          })

          // Redirect to login page if not already there
          if (pathname && !pathname.includes("/auth/login")) {
            router.push("/auth/login?redirect=" + encodeURIComponent(pathname || ""))
          }
        }
        return token
      })
      .catch((error) => {
        console.error("Token refresh error in auth context:", error)
        // Clear auth state on refresh failure
        setUser(null)
        setIsAuthenticated(false)
        setLastAuthCheck(0)

        // Show a toast notification about the session expiration
        toast({
          title: "Session expired",
          description: "Please log in again to continue",
          variant: "destructive",
        })

        // Redirect to login page if not already there
        if (pathname && !pathname.includes("/auth/login")) {
          router.push("/auth/login?redirect=" + encodeURIComponent(pathname || ""))
        }

        return null
      })
      .finally(() => {
        isRefreshing.current = false
        refreshPromise.current = null
      })

    return refreshPromise.current
  }

  // Handle login
  const login = async (email: string, password: string, remember = false) => {
    setIsLoading(true)
    try {
      console.log("Auth context: Attempting login for", email)
      const response = await authService.login(email, password, remember)

      if (response && response.user) {
        setUser(response.user)
        setIsAuthenticated(true)
        setLastAuthCheck(Date.now())

        toast({
          title: "Login successful",
          description: `Welcome back, ${response.user.name || response.user.email}!`,
          variant: "default",
        })

        // Trigger page transition
        setShowPageTransition(true)
      } else {
        throw new Error("Invalid response from login service")
      }
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

      if (newUser) {
        setUser(newUser)
        setIsAuthenticated(true)

        toast({
          title: "Registration successful",
          description: `Welcome, ${newUser.name || newUser.email}!`,
          variant: "default",
        })

        // Trigger page transition
        setShowPageTransition(true)
      } else {
        throw new Error("Registration failed - no user returned")
      }
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

      if (updatedUser) {
        setUser(updatedUser)

        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated",
          variant: "default",
        })

        return updatedUser
      } else {
        throw new Error("Update failed - no user returned")
      }
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

  // Handle page transition complete
  const handlePageTransitionComplete = () => {
    setShowPageTransition(false)
    router.push("/")
  }

  // Initialize auth
  useEffect(() => {
    initAuth()
  }, [])

  // Add an event listener to handle auth errors from API calls
  useEffect(() => {
    const handleAuthError = async (event: CustomEvent) => {
      const { status, originalRequest } = event.detail

      if (status === 401) {
        console.log("Auth error detected, attempting to refresh token")

        // Try to refresh the token
        const newToken = await refreshToken()

        if (newToken && originalRequest) {
          // If we got a new token and have the original request, retry it
          console.log("Token refreshed, retrying original request")

          // Update the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          // Dispatch an event to notify that the token has been refreshed
          document.dispatchEvent(
            new CustomEvent("token-refreshed", {
              detail: { token: newToken },
            }),
          )
        }
      }
    }

    // Add event listener for auth errors
    document.addEventListener("auth-error", handleAuthError as unknown as EventListener)

    // Clean up
    return () => {
      document.removeEventListener("auth-error", handleAuthError as unknown as EventListener)
    }
  }, [pathname])

  // Provide auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        token: authService.getAccessToken(),
        login,
        register,
        logout,
        updateProfile,
        refreshToken,
        showPageTransition,
        handlePageTransitionComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Export the AuthContextType for use in other files
export type { AuthContextType }

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
