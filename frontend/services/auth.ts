import type { AuthResponse, User, AuthError } from "@/types/auth"

class AuthService {
  private tokenKey = "mizizzi_token"
  private refreshTokenKey = "mizizzi_refresh_token"
  private userKey = "mizizzi_user"
  private csrfTokenKey = "mizizzi_csrf_token"

  // Initialize auth state from localStorage
  constructor() {
    // Check for token expiration on initialization
    if (typeof window !== "undefined") {
      this.checkTokenExpiration()
    }
  }

  // Check if token is expired and handle accordingly
  private checkTokenExpiration(): void {
    // This would be implemented with JWT decoding in a production app
    // For now, we'll just check if the token exists
    const token = this.getAccessToken()
    if (!token) return
  }

  // Update the login method to use the correct API endpoint
  async login(email: string, password: string, remember = false): Promise<AuthResponse> {
    try {
      console.log("Login with credentials:", { email, password, remember })

      // Use fetch API directly to have more control over the request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password, remember }),
        credentials: "include", // Important for cookies
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw {
          response: {
            data: errorData,
            status: response.status,
          },
        }
      }

      const data = await response.json()
      const { access_token, refresh_token, user, csrf_token } = data

      // Store tokens and user data
      this.setAccessToken(access_token)
      this.setRefreshToken(refresh_token)
      if (csrf_token) this.setCsrfToken(csrf_token)
      this.setUser(user)

      console.log("Login successful, stored user:", user)
      return data
    } catch (error: any) {
      console.error("Login error:", error)
      const authError: AuthError = new Error(error.response?.data?.error || "Failed to sign in")
      authError.code = error.response?.data?.code || "auth/invalid-credentials"
      authError.field = error.response?.data?.field
      throw authError
    }
  }

  // Update the register method to use the correct API endpoint
  async register(credentials: {
    name: string
    email: string
    password: string
    phone?: string
  }): Promise<AuthResponse> {
    try {
      console.log("Registering user with data:", credentials)

      // Use fetch API directly to have more control over the request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Important for cookies
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw {
          response: {
            data: errorData,
            status: response.status,
          },
        }
      }

      const data = await response.json()
      const { access_token, refresh_token, user, csrf_token } = data

      this.setAccessToken(access_token)
      this.setRefreshToken(refresh_token)
      if (csrf_token) this.setCsrfToken(csrf_token)
      this.setUser(user)

      return data
    } catch (error: any) {
      console.error("Registration error:", error)
      const authError: AuthError = new Error(error.response?.data?.error || "Failed to create account")
      authError.code = error.response?.data?.code || "auth/registration-failed"
      authError.field = error.response?.data?.field
      throw authError
    }
  }

  // Update the logout method to use the correct API endpoint
  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken()
      const csrfToken = this.getCsrfToken()

      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRF-TOKEN": csrfToken || "",
          },
          credentials: "include", // Important for cookies
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      this.clearAuth()
    }
  }

  // Update the getCurrentUser method to use the correct API endpoint
  async getCurrentUser(): Promise<User> {
    try {
      const token = this.getAccessToken()
      const csrfToken = this.getCsrfToken()

      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include", // Important for cookies
      })

      if (!response.ok) {
        throw new Error("Failed to get user profile")
      }

      const user = await response.json()
      this.setUser(user)
      return user
    } catch (error: any) {
      console.warn("Failed to get user from API:", error)
      // Fall back to stored user if API fails
      const storedUser = this.getUser()
      if (storedUser) {
        return storedUser
      }
      throw new Error("Failed to get user profile")
    }
  }

  // Update the updateProfile method to use the correct API endpoint
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const token = this.getAccessToken()
      const csrfToken = this.getCsrfToken()

      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        body: JSON.stringify(userData),
        credentials: "include", // Important for cookies
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()
      const updatedUser = data.user
      this.setUser(updatedUser)
      return updatedUser
    } catch (error: any) {
      throw new Error(error.message || "Failed to update profile")
    }
  }

  // Update the refreshToken method to use the correct API endpoint
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        throw new Error("No refresh token available")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // Important for cookies
      })

      if (!response.ok) {
        throw new Error("Failed to refresh token")
      }

      const data = await response.json()
      const { access_token, csrf_token } = data

      this.setAccessToken(access_token)
      if (csrf_token) this.setCsrfToken(csrf_token)
      return access_token
    } catch (error) {
      console.error("Token refresh failed:", error)
      this.clearAuth()
      throw error
    }
  }

  // Update other auth methods to use the correct API endpoints
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email }),
        },
      )

      if (!response.ok) {
        throw new Error("Failed to send reset password email")
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to send reset password email")
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ token, password }),
        },
      )

      if (!response.ok) {
        throw new Error("Failed to reset password")
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to reset password")
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ token }),
        },
      )

      if (!response.ok) {
        throw new Error("Failed to verify email")
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to verify email")
    }
  }

  async resendVerificationEmail(): Promise<void> {
    try {
      const token = this.getAccessToken()
      const csrfToken = this.getCsrfToken()

      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRF-TOKEN": csrfToken || "",
          },
          credentials: "include",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to resend verification email")
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to resend verification email")
    }
  }

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.tokenKey)
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.refreshTokenKey)
  }

  getCsrfToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.csrfTokenKey)
  }

  getUser(): User | null {
    if (typeof window === "undefined") return null

    try {
      const userStr = localStorage.getItem(this.userKey)
      if (!userStr) {
        console.log("No user found in localStorage")
        return null
      }

      const user = JSON.parse(userStr)

      // Validate that we have a proper user object with required fields
      if (user && user.id && user.email) {
        return user
      }

      console.log("Invalid user object in localStorage")
      return null
    } catch (error) {
      console.error("Error parsing user from localStorage:", error)
      // Clear invalid user data
      localStorage.removeItem(this.userKey)
      return null
    }
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken()
    const user = this.getUser()
    return !!token && !!user
  }

  setAccessToken(token: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.tokenKey, token)
  }

  setRefreshToken(token: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.refreshTokenKey, token)
  }

  setCsrfToken(token: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.csrfTokenKey, token)
  }

  private setUser(user: User): void {
    if (typeof window === "undefined") return

    if (!user || !user.id || !user.email) {
      console.error("Attempted to store invalid user object:", user)
      return
    }

    console.log("Storing user in localStorage:", user)
    localStorage.setItem(this.userKey, JSON.stringify(user))
  }

  private clearAuth(): void {
    if (typeof window === "undefined") return

    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.refreshTokenKey)
    localStorage.removeItem(this.userKey)
    localStorage.removeItem(this.csrfTokenKey)
  }
}

export const authService = new AuthService()

