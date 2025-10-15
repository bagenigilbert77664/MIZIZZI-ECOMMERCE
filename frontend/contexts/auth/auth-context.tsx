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

        // Refresh 1 minute before expiration, but not more than once every 30 seconds
        const refreshTime = Math.max(timeUntilExpiry - 60000, 30000)

        console.log(`Auth state refresh - Access token: ${token ? token.substring(0, 10) + "..." : "Not available"}`)
        console.log(
          `Auth state refresh - Refresh token: ${localStorage.getItem("mizizzi_refresh_token") ? localStorage.getItem("mizizzi_refresh_token")!.substring(0, 10) + "..." : "Not available"}`,
        )
        console.log(`Auth state refresh - CSRF token: ${localStorage.getItem("mizizzi_csrf_token") || "Not available"}`)
        console.log(
          `Token will expire in ${Math.floor(timeUntilExpiry / 1000)} seconds. Scheduling refresh in ${Math.floor(refreshTime / 1000)} seconds.`,
        )

        // Clear any existing timers
        if (window._tokenRefreshTimer) {
          clearTimeout(window._tokenRefreshTimer)
        }

        // Set timer to refresh token before it expires
        if (refreshTime > 0 && timeUntilExpiry > 0) {
          window._tokenRefreshTimer = setTimeout(async () => {
            console.log("Proactively refreshing auth token before expiration...")
            await refreshToken()
          }, refreshTime)
        } else {
          // Token is already expired or about to expire, refresh immediately
          console.log("Token already expired or about to expire, refreshing immediately...")
          setTimeout(() => refreshToken(), 1000) // Small delay to prevent immediate loops
        }
      }
    } catch (error) {
      console.error("Error setting up token refresh timer:", error)
    }
  }

  // Update the refreshAuthState method
  const refreshAuthState = async () => {
    try {
      console.log("Auth state refresh - Access token:", token ? token.substring(0, 10) + "..." : "Not available")
      console.log(
        "Auth state refresh - Refresh token:",
        localStorage.getItem("mizizzi_refresh_token")
          ? localStorage.getItem("mizizzi_refresh_token")!.substring(0, 10) + "..."
          : "Not available",
      )
      console.log("Auth state refresh - CSRF token:", localStorage.getItem("mizizzi_csrf_token") || "Not available")

      // Check for tokens in localStorage
      const storedToken = localStorage.getItem("mizizzi_token")
      const refreshTokenValue = localStorage.getItem("mizizzi_refresh_token")
      const csrfToken = localStorage.getItem("mizizzi_csrf_token")
      const userJson = localStorage.getItem("user")

      if (storedToken && userJson) {
        try {
          // Add validation before parsing JSON to prevent "undefined" parsing errors
          if (userJson === "undefined" || userJson === "null" || !userJson.trim()) {
            throw new Error("Invalid user data in localStorage")
          }

          // Parse user data from localStorage
          const userData = JSON.parse(userJson)

          // Validate parsed data is actually an object
          if (!userData || typeof userData !== "object") {
            throw new Error("Invalid user data format")
          }

          setUser(userData)
          setIsAuthenticated(true)
          setToken(storedToken)

          // Set up token refresh timer
          setupRefreshTimer(storedToken)

          if (typeof document !== "undefined") {
            document.dispatchEvent(
              new CustomEvent("token-updated", {
                detail: { token: storedToken, csrfToken },
              }),
            )
          }

          // Verify with the server if possible (but don't fail if it doesn't work)
          try {
            const freshUserData = await authService.getCurrentUser()
            setUser(freshUserData)
            localStorage.setItem("user", JSON.stringify(freshUserData))
          } catch (error) {
            // Keep using the localStorage data if server verification fails
            console.log("Server verification failed, using cached user data")
          }
        } catch (error) {
          // Improved error handling and cleanup for invalid JSON
          console.error("Error parsing user data:", error)
          // Clear invalid data from localStorage
          localStorage.removeItem("user")
          localStorage.removeItem("mizizzi_token")
          setUser(null)
          setIsAuthenticated(false)
          setTokenExpiry(null)
        }
      } else if (refreshTokenValue) {
        // Try to refresh token only if we don't have an access token
        try {
          const newToken = await authService.refreshAccessToken()
          if (newToken) {
            try {
              const userData = await authService.getCurrentUser()
              setUser(userData)
              setIsAuthenticated(true)
              setToken(newToken)
              localStorage.setItem("user", JSON.stringify(userData))

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

    const handleAuthError = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { silent, isCartOperation } = customEvent.detail || {}

      // Don't handle silent auth errors (like wishlist requests)
      if (silent) {
        return
      }

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
          console.log("Critical auth error, clearing session state")
          setUser(null)
          setIsAuthenticated(false)
          localStorage.removeItem("user")
          localStorage.removeItem("mizizzi_token")
          // Don't remove refresh token here to allow manual login attempts
        }
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
  }, [router, refreshingToken])

  // Update the login method
  const login = async (credentials: { identifier: string; password: string }) => {
    try {
      const response = await authService.login(credentials.identifier, credentials.password)

      setUser(response.user)
      setIsAuthenticated(true)
      const storedToken = localStorage.getItem("mizizzi_token")
      const csrfToken = localStorage.getItem("mizizzi_csrf_token")
      setToken(storedToken)

      console.log("Access token stored:", storedToken ? storedToken.substring(0, 10) + "..." : "Not available")
      console.log("Refresh token stored")
      console.log("CSRF token stored:", csrfToken || "Not available")

      // If token was obtained, set up the refresh timer
      if (storedToken) {
        setupRefreshTimer(storedToken)
      }

      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("token-updated", {
            detail: { token: storedToken, csrfToken },
          }),
        )
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error
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

      // Clear any token refresh timer
      if (window._tokenRefreshTimer) {
        clearTimeout(window._tokenRefreshTimer)
        delete window._tokenRefreshTimer
      }
    }
  }

  const refreshToken = async () => {
    try {
      // Prevent multiple simultaneous refresh attempts
      if (refreshingToken) {
        return null
      }
      setRefreshingToken(true)

      // Create a custom instance for the refresh request to avoid interceptors
      const refreshTokenValue = localStorage.getItem("mizizzi_refresh_token")

      if (!refreshTokenValue) {
        return null
      }

      try {
        // Use axios directly to avoid interceptors
        const refreshInstance = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshTokenValue}`,
          },
          withCredentials: true,
          timeout: 15000,
        })

        const response = await refreshInstance.post("/api/refresh", {})
        const newToken = response.data.access_token

        if (newToken) {
          setToken(newToken)
          localStorage.setItem("mizizzi_token", newToken)

          // Set up new refresh timer for this token
          setupRefreshTimer(newToken)

          if (response.data.csrf_token) {
            localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
          }

          // Store new refresh token if provided
          if (response.data.refresh_token) {
            localStorage.setItem("mizizzi_refresh_token", response.data.refresh_token)
          }

          // Get user data with the new token
          try {
            const userData = await authService.getCurrentUser()
            setUser(userData)
            setIsAuthenticated(true)
            localStorage.setItem("user", JSON.stringify(userData))
          } catch (userError) {
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
        }
      } catch (error) {
        // Don't throw here, just return null
        console.error("Token refresh request failed:", error)
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
