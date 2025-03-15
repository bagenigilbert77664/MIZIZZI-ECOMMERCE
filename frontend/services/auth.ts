import api from "@/lib/api"
import type { User } from "@/types/auth"

// Define the response types
interface LoginResponse {
  user: User
  message?: string
}

interface RegisterResponse {
  user: User
  message?: string
}

// Token key constants to ensure consistency
const TOKEN_KEYS = {
  ACCESS_TOKEN: "mizizzi_token",
  REFRESH_TOKEN: "mizizzi_refresh_token",
  CSRF_TOKEN: "mizizzi_csrf_token",
  USER: "user",
}

class AuthService {
  // Store tokens in memory for the current session
  private accessToken: string | null = null
  private refreshTokenValue: string | null = null
  private csrfToken: string | null = null
  private user: User | null = null

  // Initialize from localStorage if available
  constructor() {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)
      this.refreshTokenValue = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
      this.csrfToken = localStorage.getItem(TOKEN_KEYS.CSRF_TOKEN)
      const userStr = localStorage.getItem(TOKEN_KEYS.USER)
      if (userStr) {
        try {
          this.user = JSON.parse(userStr)
        } catch (e) {
          console.error("Failed to parse user from localStorage", e)
          this.user = null
        }
      }
    }
  }

  // Get the current access token
  getAccessToken(): string | null {
    return this.accessToken
  }

  // Get the current CSRF token
  getCsrfToken(): string | null {
    return this.csrfToken
  }

  // Get the current user
  getUser(): User | null {
    return this.user
  }

  // Store tokens and user data
  private storeTokens(accessToken: string, refreshToken: string, csrfToken: string): void {
    this.accessToken = accessToken
    this.refreshTokenValue = refreshToken
    this.csrfToken = csrfToken

    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken)
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken)
      localStorage.setItem(TOKEN_KEYS.CSRF_TOKEN, csrfToken)
    }
  }

  // Store user data
  private storeUser(user: User): void {
    this.user = user

    if (typeof window !== "undefined" && user) {
      if (process.env.NODE_ENV === "development") {
        // Only log in development, and sanitize sensitive data
        const sanitizedUser = {
          id: user.id,
          name: user.name ? `${user.name.charAt(0)}***` : null,
          email: user.email ? `${user.email.split("@")[0].charAt(0)}***@${user.email.split("@")[1]}` : null,
          role: user.role,
          is_active: user.is_active,
        }
        console.log("Storing user in localStorage (sanitized):", sanitizedUser)
      }
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user))
    }
  }

  // Clear all auth data
  public clearAuthData(): void {
    this.accessToken = null
    this.refreshTokenValue = null
    this.csrfToken = null
    this.user = null

    if (typeof window !== "undefined") {
      // Clear both the new token keys and any legacy keys
      localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN)
      localStorage.removeItem(TOKEN_KEYS.CSRF_TOKEN)
      localStorage.removeItem(TOKEN_KEYS.USER)
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("csrfToken")
      localStorage.removeItem("user")
      localStorage.removeItem("lastRefreshAttempt")
    }
  }

  // Register a new user
  async register(credentials: {
    name: string
    email: string
    password: string
    phone?: string
  }): Promise<User> {
    try {
      console.log("Sending registration request with data:", {
        ...credentials,
        password: "[REDACTED]",
      })

      const response = await api.post("/api/auth/register", {
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
        phone: credentials.phone,
      })

      const data = response.data

      // Store tokens and user data
      this.setTokens(data.access_token, data.refresh_token)
      this.setUser(data.user)

      return data.user
    } catch (error: any) {
      console.error("Registration error:", error)

      // Handle specific error cases
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error
        const errorField = error.response.data.field

        throw {
          message: errorMessage,
          field: errorField || "email", // Default to email if no field specified
        }
      }

      throw new Error("Failed to create account")
    }
  }

  // Login a user
  async login(email: string, password: string, remember = false): Promise<LoginResponse> {
    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
        remember,
      })
      const data = response.data

      // Store tokens and user data
      this.storeTokens(data.access_token, data.refresh_token, data.csrf_token)
      this.storeUser(data.user)

      return {
        user: data.user,
        message: data.message || "Login successful",
      }
    } catch (error: any) {
      console.error("Login error:", error)

      // Handle specific error cases
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error("Invalid credentials")
    }
  }

  // Logout the current user
  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await api.post("/api/auth/logout")
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      this.clearAuthData()
    }
  }

  // Refresh the access token
  async refreshAccessToken(): Promise<string> {
    try {
      // Check if refresh token exists
      const refreshToken = this.refreshTokenValue || localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
      if (!refreshToken) {
        console.error("No refresh token available")
        this.clearAuthData()
        throw new Error("No refresh token")
      }

      // Check if we've tried to refresh too recently
      const lastRefreshAttempt = localStorage.getItem("lastRefreshAttempt")
      const now = Date.now()

      if (lastRefreshAttempt) {
        const timeSinceLastAttempt = now - Number.parseInt(lastRefreshAttempt)
        // If we tried to refresh less than 5 seconds ago, don't try again
        if (timeSinceLastAttempt < 5000) {
          throw new Error("Refresh throttled")
        }
      }

      // Store the current time as the last refresh attempt
      localStorage.setItem("lastRefreshAttempt", now.toString())

      const response = await api.post("/api/auth/refresh")
      const data = response.data

      // Update tokens
      this.accessToken = data.access_token
      this.csrfToken = data.csrf_token

      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.access_token)
        localStorage.setItem(TOKEN_KEYS.CSRF_TOKEN, data.csrf_token)
        // Clear the throttle after successful refresh
        localStorage.removeItem("lastRefreshAttempt")
      }

      return data.access_token
    } catch (error) {
      console.error("Token refresh error:", error)
      // Only clear auth data on actual auth errors, not network errors
      if ((error as any).response && (error as any).response.status === 401) {
        this.clearAuthData()
      }
      throw error
    }
  }

  // Get the current user's profile
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get("/api/auth/me")
      const user = response.data

      // Update stored user
      this.storeUser(user)

      return user
    } catch (error) {
      console.error("Failed to get user from API:", error)
      throw new Error("Failed to get user profile")
    }
  }

  // Update the current user's profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put("/api/auth/me", userData)
      const updatedUser = response.data.user

      // Update stored user
      this.storeUser(updatedUser)

      return updatedUser
    } catch (error: any) {
      console.error("Update profile error:", error)

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error("Failed to update profile")
    }
  }

  // Request a password reset
  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post("/api/auth/forgot-password", { email })
    } catch (error: any) {
      console.error("Forgot password error:", error)

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error("Failed to send reset email")
    }
  }

  // Reset password with token
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await api.post("/api/auth/reset-password", {
        token,
        password,
      })
    } catch (error: any) {
      console.error("Reset password error:", error)

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error("Failed to reset password")
    }
  }

  // Verify email with token
  async verifyEmail(token: string): Promise<void> {
    try {
      await api.post("/api/auth/verify-email", { token })
    } catch (error: any) {
      console.error("Verify email error:", error)

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error("Failed to verify email")
    }
  }

  // Resend verification email
  async resendVerificationEmail(): Promise<void> {
    try {
      await api.post("/api/auth/resend-verification")
    } catch (error: any) {
      console.error("Resend verification error:", error)

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error("Failed to resend verification email")
    }
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken
    this.refreshTokenValue = refreshToken

    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken)
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken)
    }
  }

  private setUser(user: User): void {
    this.user = user

    if (typeof window !== "undefined" && user) {
      if (process.env.NODE_ENV === "development") {
        // Only log in development, and sanitize sensitive data
        const sanitizedUser = {
          id: user.id,
          name: user.name ? `${user.name.charAt(0)}***` : null,
          email: user.email ? `${user.email.split("@")[0].charAt(0)}***@${user.email.split("@")[1]}` : null,
          role: user.role,
          is_active: user.is_active,
        }
        console.log("Storing user in localStorage (sanitized):", sanitizedUser)
      }
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user))
    }
  }
}

export const authService = new AuthService()
