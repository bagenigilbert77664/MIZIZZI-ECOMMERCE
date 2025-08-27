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
      const csrfToken = localStorage.getItem("mizizzi_csrf_token") // Get CSRF token
      const userJson = localStorage.getItem("user")

      // Log token information for debugging
      console.log("Auth state refresh - Access token:", token ? token.substring(0, 10) + "..." : "Not available")
      console.log(
        "Auth state refresh - Refresh token:",
        refreshToken ? refreshToken.substring(0, 10) + "..." : "Not available",
      )
      console.log("Auth state refresh - CSRF token:", csrfToken || "Not available") // Log CSRF token

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

            // Check if this is a critical error that should invalidate the session
            if (
              error instanceof Error &&
              (error.message.includes("User not found") || error.message.includes("Authentication failed"))
            ) {
              console.log("Critical auth error, clearing session state")
              setUser(null)
              setIsAuthenticated(false)
              setToken(null)
              setTokenExpiry(null)
              return
            }

            // For non-critical errors, keep using the localStorage data
            console.log("Using cached user data due to non-critical error")
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
        customEvent.detail?.originalRequest?.url?.includes("/api/orders") ||
        customEvent.detail?.originalRequest?.url?.includes("/api/cart/checkout") ||
        customEvent.detail?.originalRequest?.url?.includes("/api/cart/coupons") ||
        customEvent.detail?.originalRequest?.url?.includes("/api/cart/shipping") ||
        customEvent.detail?.originalRequest?.url?.includes("/api/cart/billing") ||
        customEvent.detail?.originalRequest?.url?.includes("/api/cart/payment")

      // Cart item operations (add, update, remove) are handled gracefully by the cart service
      const isCartOperation =
        customEvent.detail?.originalRequest?.url?.includes("/api/cart/items") ||
        customEvent.detail?.originalRequest?.url?.match(/\/api\/cart\/items\/\d+/)

      if (isCartOperation) {
        console.log("Cart operation failed due to auth, letting cart service handle it gracefully")
        return
      }

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

    // Add a new event listener for user-not-found events
    const handleUserNotFound = (event: Event) => {
      const customEvent = event as CustomEvent
      console.log("User not found event received:", customEvent.detail)

      // Clear auth state
      setUser(null)
      setIsAuthenticated(false)
      setToken(null)
      setTokenExpiry(null)

      // Clear localStorage
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("user")

      // Redirect to login page if needed
      if (typeof window !== "undefined" && !window.location.pathname.includes("/auth")) {
        router.push("/auth/login")
      }
    }

    document.addEventListener("auth-error", handleAuthError)
    document.addEventListener("user-not-found", handleUserNotFound)

    return () => {
      // Remove event listeners
      document.removeEventListener("auth-error", handleAuthError)
      document.removeEventListener("user-not-found", handleUserNotFound)

      // Clear the token refresh timer when component unmounts
      if (window._tokenRefreshTimer) {
        clearTimeout(window._tokenRefreshTimer)
        delete window._tokenRefreshTimer
      }
    }
  }, [router, refreshingToken]) // Added refreshingToken to dependencies

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
    // Track failed attempts to avoid infinite retry loops
    let failedAttempts = 0
    const MAX_ATTEMPTS = 2
    try {
      if (refreshingToken) return null
      setRefreshingToken(true)

      const refreshToken = localStorage.getItem("mizizzi_refresh_token")

      if (!refreshToken) {
        if (process.env.NODE_ENV === "development") {
          console.error("No refresh token available in localStorage. User may need to log in again.")
        }
        // Show user-friendly notification
        if (typeof window !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("token-refresh-error", {
              detail: { reason: "no_refresh_token", message: "Your session has expired. Please log in again." },
            }),
          )
          // Optional: redirect to login page
          window.location.href = "/auth/login?reason=session_expired"
        }
        return null
      }

      while (failedAttempts < MAX_ATTEMPTS) {
        try {
          const refreshInstance = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refreshToken}`,
            },
            withCredentials: true,
            timeout: 30000,
          })

          const response = await refreshInstance.post("/api/refresh", {})
          const newToken = response.data.access_token

          if (newToken) {
            setToken(newToken)
            localStorage.setItem("mizizzi_token", newToken)
            syncAdminToken(newToken)
            setupRefreshTimer(newToken)

            if (response.data.csrf_token) {
              localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
            }
            if (response.data.refresh_token) {
              localStorage.setItem("mizizzi_refresh_token", response.data.refresh_token)
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
            try {
              const userData = await authService.getCurrentUser()
              setUser(userData)
              setIsAuthenticated(true)
              localStorage.setItem("user", JSON.stringify(userData))
              syncAdminToken(newToken)
            } catch (userError) {
              if (process.env.NODE_ENV === "development") {
                console.error("Failed to get user data after token refresh:", userError)
              }
            }
            if (typeof document !== "undefined") {
              document.dispatchEvent(
                new CustomEvent("token-refreshed", {
                  detail: { token: newToken },
                }),
              )
            }
            return newToken
          } else {
            if (process.env.NODE_ENV === "development") {
              console.error("No access token in refresh response")
            }
          }
          break
        } catch (error) {
          failedAttempts++
          // Handle timeout errors specifically
          if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
            if (process.env.NODE_ENV === "development") {
              console.error("Token refresh request timed out.")
            }
          }
          // Handle network errors
          if (error instanceof Error && error.message.includes("Network Error")) {
            if (process.env.NODE_ENV === "development") {
              console.error("Network error during token refresh. Check API connectivity.")
            }
            if (typeof window !== "undefined") {
              document.dispatchEvent(
                new CustomEvent("token-refresh-error", {
                  detail: { reason: "network_error", message: "Cannot connect to server. Please check your connection." },
                }),
              )
              // Optional: redirect to login page
              window.location.href = "/auth/login?reason=network_error"
            }
            return null
          }
          // Handle expired/invalid refresh token
          if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
            if (process.env.NODE_ENV === "development") {
              console.error("Refresh token is expired or invalid. User needs to log in again.")
            }
            if (typeof window !== "undefined") {
              document.dispatchEvent(
                new CustomEvent("token-refresh-error", {
                  detail: { reason: "invalid_refresh_token", message: "Session expired. Please log in again." },
                }),
              )
              window.location.href = "/auth/login?reason=invalid_refresh_token"
            }
            return null
          }
          // For other errors, just retry up to MAX_ATTEMPTS
          if (failedAttempts >= MAX_ATTEMPTS) {
            if (typeof window !== "undefined") {
              document.dispatchEvent(
                new CustomEvent("token-refresh-error", {
                  detail: { reason: "unknown_error", message: "Authentication failed. Please log in again." },
                }),
              )
              window.location.href = "/auth/login?reason=auth_failed"
            }
            return null
          }
        }
      }
      return null
    } catch (error) {
      console.error("Token refresh error in context:", error)
      // Dispatch event for generic error
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("token-refresh-error", {
            detail: { reason: "unknown_error" },
          }),
        )
      }
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
