"use client"

import type React from "react"
import { createContext, useState, useEffect, type ReactNode, useContext } from "react"
import { authService } from "@/services/auth"
import type { User } from "@/types/auth"
import { useRouter } from "next/navigation"

// Define the AuthContext type
interface AuthContextProps {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  token: string | null
  login: (credentials: { identifier: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<string | null>
  checkVerificationState: () => { needsVerification: boolean; identifier?: string; userId?: string }
  emailVerified?: boolean
  refreshAuthState: () => Promise<void>
}

// Create the AuthContext
const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  loading: true,
  token: null,
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => null,
  checkVerificationState: () => ({ needsVerification: false }),
  refreshAuthState: async () => {},
})

// Create the AuthProvider component
interface AuthProviderProps {
  children: ReactNode
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

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

  // Function to refresh auth state from localStorage and API
  const refreshAuthState = async () => {
    try {
      // Check for tokens in localStorage
      const token = localStorage.getItem("mizizzi_token")
      const userJson = localStorage.getItem("user")

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
      } else {
        // Try to refresh token
        const newToken = await authService.refreshToken()
        if (newToken) {
          try {
            const userData = await authService.getCurrentUser()
            setUser(userData)
            setIsAuthenticated(true)
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
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error)
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true)
      try {
        // Check if there's a verification state in localStorage
        const verificationState = checkVerificationState()
        if (verificationState.needsVerification) {
          // If there's a pending verification, redirect to auth page
          if (typeof window !== "undefined" && !window.location.pathname.includes("/auth")) {
            router.push("/auth")
          }
          setLoading(false)
          return
        }

        await refreshAuthState()
      } catch (error) {
        console.error("Auth initialization error:", error)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth error events
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent
      console.log("Auth error event received:", customEvent.detail)

      // Try to refresh the token
      authService
        .refreshToken()
        .then((newToken) => {
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
            localStorage.removeItem("mizizzi_refresh_token")
            localStorage.removeItem("mizizzi_csrf_token")
            // DO NOT remove verification state here
            // localStorage.removeItem("auth_verification_state")
          }
        })
        .catch((error) => {
          console.error("Token refresh error:", error)
          setUser(null)
          setIsAuthenticated(false)
          localStorage.removeItem("user")
          localStorage.removeItem("mizizzi_token")
          localStorage.removeItem("mizizzi_refresh_token")
          localStorage.removeItem("mizizzi_csrf_token")
          // DO NOT remove verification state here
          // localStorage.removeItem("auth_verification_state")
        })
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

  const refreshToken = async () => {
    try {
      const newToken = await authService.refreshToken()
      if (!newToken) {
        setUser(null)
        setIsAuthenticated(false)
      }
      return newToken
    } catch (error) {
      console.error("Token refresh error:", error)
      setUser(null)
      setIsAuthenticated(false)
      return null
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        token,
        login,
        logout,
        refreshToken,
        checkVerificationState,
        refreshAuthState,
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
