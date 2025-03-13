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

class AuthService {
  // Store tokens in memory for the current session
  private accessToken: string | null = null
  private refreshTokenValue: string | null = null
  private csrfToken: string | null = null
  private user: User | null = null

  // Initialize from localStorage if available
  constructor() {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("accessToken")
      this.refreshTokenValue = localStorage.getItem("refreshToken")
      this.csrfToken = localStorage.getItem("csrfToken")
      const userStr = localStorage.getItem("user")
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
      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("csrfToken", csrfToken)
    }
  }

  // Store user data
  private storeUser(user: User): void {
    this.user = user

    if (typeof window !== "undefined" && user) {
      console.log("Storing user in localStorage:", user)
      localStorage.setItem("user", JSON.stringify(user))
    }
  }

  // Clear all auth data
  private clearAuthData(): void {
    this.accessToken = null
    this.refreshTokenValue = null
    this.csrfToken = null
    this.user = null

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("csrfToken")
      localStorage.removeItem("user")
    }
  }

  // Register a new user
  async register(credentials: {
    name: string
    email: string
    password: string
    phone?: string
  }): Promise<RegisterResponse> {
    try {
      console.log("Registering user with data:", credentials)
      const response = await api.post("/api/auth/register", credentials)
      const data = response.data

      // Store tokens and user data
      this.storeTokens(data.access_token, data.refresh_token, data.csrf_token)
      this.storeUser(data.user)

      return {
        user: data.user,
        message: data.message || "Registration successful",
      }
    } catch (error: any) {
      console.error("Registration error:", error)

      // Handle specific error cases
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error
        const errorCode = error.response.data.code

        if (errorCode === "auth/email-already-exists") {
          throw {
            message: "Email is already registered",
            field: "email",
          }
        }

        throw new Error(errorMessage)
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
      const response = await api.post("/api/auth/refresh")
      const data = response.data

      // Update tokens
      this.accessToken = data.access_token
      this.csrfToken = data.csrf_token

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.access_token)
        localStorage.setItem("csrfToken", data.csrf_token)
      }

      return data.access_token
    } catch (error) {
      console.error("Token refresh error:", error)
      this.clearAuthData()
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
}

export const authService = new AuthService()

