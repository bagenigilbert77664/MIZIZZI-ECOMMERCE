import api from "@/lib/api"

// Define the User type
export interface User {
  id: number
  name: string
  email: string
  role?: string
  avatar_url?: string
  is_active?: boolean
}

// Token key constants to ensure consistency
const TOKEN_KEYS = {
  ACCESS_TOKEN: "token",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
}

class AuthService {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private user: User | null = null

  constructor() {
    // Initialize tokens from localStorage if available
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)
      this.refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
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

  // Get the current refresh token
  getRefreshToken(): string | null {
    return this.refreshToken
  }

  // Get the current user
  getUser(): User | null {
    return this.user
  }

  // Set tokens after login/registration
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken
    this.refreshToken = refreshToken

    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken)
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken)
    }
  }

  // Store user data
  setUser(user: User): void {
    this.user = user

    if (typeof window !== "undefined" && user) {
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user))
    }
  }

  // Clear all auth data
  clearAuthData(): void {
    this.accessToken = null
    this.refreshToken = null
    this.user = null

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN)
      localStorage.removeItem(TOKEN_KEYS.USER)
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("user")
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
      const response = await api.post("/api/auth/register", credentials)
      const data = response.data

      // Store tokens and user data
      this.setTokens(data.access_token, data.refresh_token)
      this.setUser(data.user)

      return data.user
    } catch (error: any) {
      console.error("Registration error:", error)

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error("Failed to create account")
    }
  }

  // Login a user
  async login(email: string, password: string, remember = false): Promise<User> {
    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
        remember,
      })
      const data = response.data

      // Store tokens and user data
      this.setTokens(data.access_token, data.refresh_token)
      this.setUser(data.user)

      return data.user
    } catch (error: any) {
      console.error("Login error:", error)

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

  // Refresh the access token using the refresh token
  async refreshAccessToken(): Promise<string> {
    try {
      // Get the refresh token
      const refreshToken = this.getRefreshToken() || localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)

      if (!refreshToken) {
        throw new Error("No refresh token available")
      }

      // Make the refresh request
      const response = await api.post("/api/auth/refresh", {
        refresh_token: refreshToken,
      })

      const data = response.data

      // Update tokens
      this.setTokens(data.access_token, data.refresh_token || refreshToken)

      return data.access_token
    } catch (error) {
      console.error("Error refreshing token:", error)
      this.clearAuthData()
      throw error
    }
  }

  // Check if the user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken || (typeof window !== "undefined" && !!localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN))
  }

  // Get the current user's profile
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get("/api/auth/me")
      const user = response.data

      // Update stored user
      this.setUser(user)

      return user
    } catch (error) {
      console.error("Failed to get user from API:", error)
      throw new Error("Failed to get user profile")
    }
  }
}

// Create and export a singleton instance
export const authService = new AuthService()
