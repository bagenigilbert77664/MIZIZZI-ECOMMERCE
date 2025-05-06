"use client"

import type React from "react"
import { createContext, useState, useEffect, type ReactNode, useContext } from "react"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"
import { useRouter } from "next/navigation"
import axios from "axios"

// Define the AuthContext type
interface AuthContextProps {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  login: (credentials: { identifier: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<string | null>
  checkVerificationState: () => { needsVerification: boolean; identifier?: string; userId?: string }
  emailVerified?: boolean
  refreshAuthState: () => Promise<void>
  showPageTransition?: boolean
  handlePageTransitionComplete?: () => void
}

// Create the AuthContext
const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => null,
  checkVerificationState: () => ({ needsVerification: false }),
  refreshAuthState: async () => {},
  showPageTransition: false,
  handlePageTransitionComplete: () => {},
})

// Create the AuthProvider component
interface AuthProviderProps {
  children: ReactNode
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [showPageTransition, setShowPageTransition] = useState(false)
  const router = useRouter()

  // Add the handler for page transition completion
  const handlePageTransitionComplete = () => {
    setShowPageTransition(false)
  }

  // Check if verification state exists and is valid
  const checkVerificationState = () => {
    try {
      // Check if verification state is expired
      if (authService.checkVerificationStateExpiry()) {
        return { needsVerification: false }
      }

      const storedState = localStorage.getItem("auth_verification_state")
      if (!storedState) return { needsVerification: false }

      const state = JSON.parse(storedState)
      if (state.identifier && state.step === "verification") {
        return {
          needsVerification: true,
          identifier: state.identifier,
          userId: state.userId,
        }
      }

      return { needsVerification: false }
    } catch (e) {
      localStorage.removeItem("auth_verification_state")
      return { needsVerification: false }
    }
  }

  // Update the refreshAuthState method to properly handle all tokens
  const refreshAuthState = async () => {
    try {
      // Check for tokens in localStorage
      const token = localStorage.getItem("mizizzi_token")
      const refreshToken = localStorage.getItem("mizizzi_refresh_token")
      const csrfToken = localStorage.getItem("mizizzi_csrf_token")
      const userJson = localStorage.getItem("user")

      // Log token information for debugging
      console.log("Auth state refresh - Access token:", token ? token.substring(0, 10) + "..." : "Not available")
      console.log(
        "Auth state refresh - Refresh token:",
        refreshToken ? refreshToken.substring(0, 10) + "..." : "Not available",
      )
      console.log("Auth state refresh - CSRF token:", csrfToken || "Not available")

      if (token && userJson) {
        try {
          // Parse user data from localStorage
          const userData = JSON.parse(userJson)
          setUser(userData)
          setIsAuthenticated(true)
          setToken(token)

          // Verify with the server if possible
          try {
            const freshUserData = await authService.getCurrentUser()
            setUser(freshUserData)
            localStorage.setItem("user", JSON.stringify(freshUserData))
          } catch (error) {
            console.error("Failed to get fresh user data:", error)
            // Keep using the localStorage data
          }
        } catch (error) {
          console.error("Error parsing user data:", error)
          setUser(null)
          setIsAuthenticated(false)
        }
      } else if (refreshToken) {
        // Try to refresh token
        try {
          const newToken = await authService.refreshAccessToken()
          if (newToken) {
            try {
              const userData = await authService.getCurrentUser()
              setUser(userData)
              setIsAuthenticated(true)
              setToken(newToken)
              localStorage.setItem("user", JSON.stringify(userData))
            } catch (error) {
              console.error("Failed to get user profile after token refresh:", error)
              setUser(null)
              setIsAuthenticated(false)
            }
          } else {
            setUser(null)
            setIsAuthenticated(false)
          }
        } catch (error) {
          console.error("Failed to refresh token:", error)
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error)
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  // Add this state to track refresh status
  const [refreshingToken, setRefreshingToken] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        // Check if there's a verification state in localStorage
        const verificationState = checkVerificationState()
        if (verificationState.needsVerification) {
          // If there's a pending verification, redirect to auth page
          if (typeof window !== "undefined" && !window.location.pathname.includes("/auth")) {
            router.push("/auth")
          }
          setIsLoading(false)
          return
        }

        await refreshAuthState()
      } catch (error) {
        console.error("Auth initialization error:", error)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth error events
    const handleAuthError = async (event: Event) => {
      const customEvent = event as CustomEvent
      console.log("Auth error event received:", customEvent.detail)

      // Prevent multiple simultaneous refresh attempts
      if (refreshingToken) return

      // Try to refresh the token
      const newToken = await refreshToken()

      if (newToken) {
        // Dispatch token refreshed event
        document.dispatchEvent(
          new CustomEvent("token-refreshed", {
            detail: { token: newToken },
          }),
        )
      } else {
        // If refresh fails, clear auth state
        setUser(null)
        setIsAuthenticated(false)
        localStorage.removeItem("user")
        localStorage.removeItem("mizizzi_token")
        // Don't remove refresh token here to allow manual login attempts
        // localStorage.removeItem("mizizzi_refresh_token")
        localStorage.removeItem("mizizzi_csrf_token")
      }
    }

    document.addEventListener("auth-error", handleAuthError)

    return () => {
      document.removeEventListener("auth-error", handleAuthError)
    }
  }, [router])

  const login = async (credentials: { identifier: string; password: string }) => {
    try {
      const response = await authService.login(credentials.identifier, credentials.password)
      setUser(response.user)
      setIsAuthenticated(true)
      setToken(localStorage.getItem("mizizzi_token"))
    } catch (error) {
      console.error("Login error:", error)
      // Handle login error (e.g., display an error message)
      throw error // Re-throw the error to be caught by the component calling login
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)
      setToken(null)
    } catch (error) {
      console.error("Logout error:", error)
      // Even if the server-side logout fails, clear the client-side state
      setUser(null)
      setIsAuthenticated(false)
      setToken(null)
    }
  }

  // Update the refreshToken method in the AuthContext
  const refreshToken = async () => {
    try {
      // Prevent multiple simultaneous refresh attempts
      if (refreshingToken) return null
      setRefreshingToken(true)

      // Create a custom instance for the refresh request to avoid interceptors
      const refreshToken = localStorage.getItem("mizizzi_refresh_token")
      if (!refreshToken) {
        console.error("No refresh token available")
        return null
      }

      try {
        // Use axios directly to avoid interceptors
        const refreshInstance = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshToken}`,
            // Removed X-CSRF-TOKEN header to avoid CORS issues
          },
          withCredentials: true,
        })

        const response = await refreshInstance.post("/api/refresh", {})

        const newToken = response.data.access_token

        if (newToken) {
          setToken(newToken)
          localStorage.setItem("mizizzi_token", newToken)

          if (response.data.csrf_token) {
            localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
          }

          // Get user data with the new token
          try {
            const userData = await authService.getCurrentUser()
            setUser(userData)
            setIsAuthenticated(true)
            localStorage.setItem("user", JSON.stringify(userData))
          } catch (userError) {
            console.error("Failed to get user data after token refresh:", userError)
          }

          return newToken
        }
      } catch (error) {
        console.error("Token refresh error:", error)
      }

      // If refresh fails, clear auth state
      setUser(null)
      setIsAuthenticated(false)
      setToken(null)
      return null
    } catch (error) {
      console.error("Token refresh error in context:", error)
      setUser(null)
      setIsAuthenticated(false)
      setToken(null)
      return null
    } finally {
      setRefreshingToken(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        token,
        login,
        logout,
        refreshToken,
        checkVerificationState,
        refreshAuthState,
        showPageTransition,
        handlePageTransitionComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Create a custom hook to use the AuthContext
const useAuth = () => {
  return useContext(AuthContext)
}

export { AuthProvider, useAuth }
