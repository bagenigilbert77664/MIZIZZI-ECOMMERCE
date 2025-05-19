"use client"

import type React from "react"
import { createContext, useState, useEffect, type ReactNode, useContext } from "react"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"
import { useRouter } from "next/navigation"
import axios from "axios"

// Add global type for token refresh timer
declare global {
  interface Window {
    _tokenRefreshTimer?: NodeJS.Timeout
  }
}

// Define the AuthContext type
interface AuthContextProps {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  tokenExpiry: number | null // Add this property to track token expiration
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
  tokenExpiry: null,
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
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null)
  const [refreshingToken, setRefreshingToken] = useState(false)
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

  // Parse JWT token to get expiration time
  const parseJwt = (token: string): { exp?: number } => {
    try {
      const base64Url = token.split(".")[1]
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error("Error parsing JWT token:", error)
      return {}
    }
  }

  // Set up token refresh timer
  const setupRefreshTimer = (token: string) => {
    try {
      const decodedToken = parseJwt(token)
      if (decodedToken.exp) {
        // Convert to milliseconds
        const expiryTime = decodedToken.exp * 1000
        setTokenExpiry(expiryTime)

        // Calculate time until token expiration (in ms)
        const currentTime = Date.now()
        const timeUntilExpiry = expiryTime - currentTime

        // Refresh 1 minute before expiration to be safe
        const refreshTime = Math.max(timeUntilExpiry - 60000, 0)

        console.log(
          `Token will expire in ${Math.floor(timeUntilExpiry / 1000)} seconds. Scheduling refresh in ${Math.floor(refreshTime / 1000)} seconds.`,
        )

        // Clear any existing timers
        if (window._tokenRefreshTimer) {
          clearTimeout(window._tokenRefreshTimer)
        }

        // Set timer to refresh token before it expires
        if (refreshTime > 0) {
          window._tokenRefreshTimer = setTimeout(async () => {
            console.log("Proactively refreshing auth token before expiration...")
            await refreshToken()
          }, refreshTime)
        } else {
          // Token is already expired or about to expire, refresh immediately
          console.log("Token already expired or about to expire, refreshing immediately...")
          refreshToken()
        }
      }
    } catch (error) {
      console.error("Error setting up token refresh timer:", error)
    }
  }

  // Add a new helper function inside the AuthProvider component
  const syncAdminToken = (token: string) => {
    try {
      // If user has admin role, also set admin token
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const userData = JSON.parse(userStr)
        const isAdmin =
          userData.role === "admin" ||
          (userData.role && typeof userData.role === "object" && userData.role.value === "admin")

        if (isAdmin) {
          console.log("User has admin role, syncing admin token")
          localStorage.setItem("admin_token", token)

          // Set admin token expiry based on parsed JWT
          const decodedToken = parseJwt(token)
          if (decodedToken.exp) {
            localStorage.setItem("admin_token_expiry", decodedToken.exp.toString())
          }

          // Also sync refresh token if available
          const refreshToken = localStorage.getItem("mizizzi_refresh_token")
          if (refreshToken) {
            localStorage.setItem("admin_refresh_token", refreshToken)
          }
        }
      }
    } catch (error) {
      console.error("Error syncing admin token:", error)
    }
  }

  // Update the refreshAuthState method
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

          // Sync admin token here
          syncAdminToken(token)

          // Set up token refresh timer
          setupRefreshTimer(token)

          // Verify with the server if possible
          try {
            const freshUserData = await authService.getCurrentUser()
            setUser(freshUserData)
            localStorage.setItem("user", JSON.stringify(freshUserData))

            // Re-sync admin token after fresh user data
            syncAdminToken(token)
          } catch (error) {
            console.error("Failed to get fresh user data:", error)
            // Keep using the localStorage data
          }
        } catch (error) {
          console.error("Error parsing user data:", error)
          setUser(null)
          setIsAuthenticated(false)
          setTokenExpiry(null)
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

              // Sync admin token here too
              syncAdminToken(newToken)

              // Set up token refresh timer for the new token
              setupRefreshTimer(newToken)
            } catch (error) {
              console.error("Failed to get user profile after token refresh:", error)
              setUser(null)
              setIsAuthenticated(false)
              setTokenExpiry(null)
            }
          } else {
            setUser(null)
            setIsAuthenticated(false)
            setTokenExpiry(null)
          }
        } catch (error) {
          console.error("Failed to refresh token:", error)
          setUser(null)
          setIsAuthenticated(false)
          setTokenExpiry(null)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
        setTokenExpiry(null)
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error)
      setUser(null)
      setIsAuthenticated(false)
      setTokenExpiry(null)
    }
  }

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

      // Check if this is a critical endpoint that requires authentication
      const isAuthCritical =
        customEvent.detail?.originalRequest?.url?.includes("/api/profile") ||
        customEvent.detail?.originalRequest?.url?.includes("/api/orders")

      // Only try to refresh token for critical endpoints
      if (isAuthCritical) {
        // Try to refresh the token
        const newToken = await refreshToken()

        if (newToken) {
          // Dispatch token refreshed event
          document.dispatchEvent(
            new CustomEvent("token-refreshed", {
              detail: { token: newToken },
            }),
          )
        } else if (isAuthCritical) {
          // Only clear auth state for critical endpoints
          setUser(null)
          setIsAuthenticated(false)
          localStorage.removeItem("user")
          localStorage.removeItem("mizizzi_token")
          // Don't remove refresh token here to allow manual login attempts
        }
      } else {
        // For non-critical endpoints, just log the error
        console.log("Non-critical auth error, ignoring:", customEvent.detail?.originalRequest?.url)
      }
    }

    document.addEventListener("auth-error", handleAuthError)

    return () => {
      // Remove event listener
      document.removeEventListener("auth-error", handleAuthError)

      // Clear the token refresh timer when component unmounts
      if (window._tokenRefreshTimer) {
        clearTimeout(window._tokenRefreshTimer)
        delete window._tokenRefreshTimer
      }
    }
  }, [router])

  // Update the login method
  const login = async (credentials: { identifier: string; password: string }) => {
    try {
      const response = await authService.login(credentials.identifier, credentials.password)
      setUser(response.user)
      setIsAuthenticated(true)
      const token = localStorage.getItem("mizizzi_token")
      setToken(token)

      // Sync admin token here after login
      if (token) {
        syncAdminToken(token)
      }

      // If token was obtained, set up the refresh timer
      if (token) {
        setupRefreshTimer(token)
      }
    } catch (error) {
      console.error("Login error:", error)
      // Handle login error (e.g., display an error message)
      throw error // Re-throw the error to be caught by the component calling login
    }
  }

  // Update the logout method
  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)
      setToken(null)
      setTokenExpiry(null)

      // Clear admin tokens too
      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_token_expiry")
      localStorage.removeItem("admin_refresh_token")

      // Clear any token refresh timer
      if (window._tokenRefreshTimer) {
        clearTimeout(window._tokenRefreshTimer)
        delete window._tokenRefreshTimer
      }
    } catch (error) {
      console.error("Logout error:", error)
      // Even if the server-side logout fails, clear the client-side state
      setUser(null)
      setIsAuthenticated(false)
      setToken(null)
      setTokenExpiry(null)

      // Clear admin tokens here too
      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_token_expiry")
      localStorage.removeItem("admin_refresh_token")

      // Clear any token refresh timer
      if (window._tokenRefreshTimer) {
        clearTimeout(window._tokenRefreshTimer)
        delete window._tokenRefreshTimer
      }
    }
  }

  // Update the refreshToken method
  const refreshToken = async () => {
    try {
      // Prevent multiple simultaneous refresh attempts
      if (refreshingToken) return null
      setRefreshingToken(true)

      // Create a custom instance for the refresh request to avoid interceptors
      const refreshToken = localStorage.getItem("mizizzi_refresh_token")

      // Log the refresh token status (first few characters only for security)
      console.log(
        `Attempting to refresh token. Refresh token available: ${refreshToken ? "Yes" : "No"}${refreshToken ? " (starts with: " + refreshToken.substring(0, 5) + "...)" : ""}`,
      )

      if (!refreshToken) {
        console.error("No refresh token available in localStorage. User may need to log in again.")
        // Check if we have a token but no refresh token
        const token = localStorage.getItem("mizizzi_token")
        if (token) {
          console.log(
            "Access token exists but no refresh token. This is unusual and may indicate an authentication issue.",
          )
        }
        return null
      }

      try {
        // Use axios directly to avoid interceptors
        const refreshInstance = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
          withCredentials: true,
          timeout: 15000, // Increase timeout for refresh requests
        })

        console.log("Sending refresh token request to server...")
        const response = await refreshInstance.post("/api/refresh", {})
        console.log("Refresh token response received:", response.status)

        const newToken = response.data.access_token

        if (newToken) {
          console.log("New access token received, length:", newToken.length)
          setToken(newToken)
          localStorage.setItem("mizizzi_token", newToken)

          // Sync admin token here after refreshing
          syncAdminToken(newToken)

          // Set up new refresh timer for this token
          setupRefreshTimer(newToken)

          if (response.data.csrf_token) {
            localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
            console.log("New CSRF token stored")
          }

          // Store new refresh token if provided
          if (response.data.refresh_token) {
            localStorage.setItem("mizizzi_refresh_token", response.data.refresh_token)
            console.log("New refresh token stored, length:", response.data.refresh_token.length)

            // Sync admin refresh token
            const isAdmin =
              user?.role === "admin" ||
              (user?.role &&
                typeof user.role === "object" &&
                "value" in user.role &&
                (user.role as { value: string }).value === "admin")
            if (isAdmin) {
              localStorage.setItem("admin_refresh_token", response.data.refresh_token)
            }
          }

          // Get user data with the new token
          try {
            const userData = await authService.getCurrentUser()
            setUser(userData)
            setIsAuthenticated(true)
            localStorage.setItem("user", JSON.stringify(userData))
            console.log("User data refreshed successfully")

            // Re-sync admin token after user data refresh
            syncAdminToken(newToken)
          } catch (userError) {
            console.error("Failed to get user data after token refresh:", userError)
            // Continue even if we can't get user data
          }

          // Dispatch token refreshed event
          if (typeof document !== "undefined") {
            document.dispatchEvent(
              new CustomEvent("token-refreshed", {
                detail: { token: newToken },
              }),
            )
          }

          return newToken
        } else {
          console.error("No access token in refresh response")
        }
      } catch (error) {
        console.error("Token refresh request failed:", error)

        // Check if this is a network error
        if (error instanceof Error && error.message.includes("Network Error")) {
          console.error("Network error during token refresh. Check API connectivity.")
        }

        // Check if this is an expired refresh token
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
          console.error("Refresh token is expired or invalid. User needs to log in again.")
          // Don't clear tokens here, let the auth context handle it
        }

        // Don't throw here, just return null
      }

      return null
    } catch (error) {
      console.error("Token refresh error in context:", error)
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
        tokenExpiry,
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
