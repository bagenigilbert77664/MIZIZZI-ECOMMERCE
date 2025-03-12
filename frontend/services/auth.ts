import api from "@/lib/api"
import type { AuthResponse, LoginCredentials, RegisterCredentials, User, AuthError } from "@/types/auth"

class AuthService {
  private tokenKey = "mizizzi_token"
  private refreshTokenKey = "mizizzi_refresh_token"
  private userKey = "mizizzi_user"
  private identifierKey = "mizizzi_identifier"

  async checkIdentifier(identifier: string): Promise<{ exists: boolean; requiresPassword: boolean }> {
    try {
      // In a real implementation, this would check with the backend
      // For now, we'll simulate a check and always return requires password
      // const response = await api.post("/api/auth/check-identifier", { identifier })
      // return response.data

      // Store the identifier for the next step
      localStorage.setItem(this.identifierKey, identifier)
      return { exists: true, requiresPassword: true }
    } catch (error: any) {
      const authError: AuthError = new Error(error.response?.data?.message || "Failed to check identifier")
      authError.code = error.response?.data?.code
      throw authError
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log("Login with credentials:", credentials)

      // For demo purposes, let's create a mock response
      // In a real app, this would be an API call
      const mockResponse: AuthResponse = {
        message: "Login successful",
        user: {
          id: 1,
          name: credentials.identifier.split("@")[0] || "User",
          email: credentials.identifier,
          role: "user",
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
      }

      // Store the tokens and user
      this.setTokens(mockResponse.access_token, mockResponse.refresh_token)
      this.setUser(mockResponse.user)

      console.log("Login successful, stored user:", mockResponse.user)
      return mockResponse
    } catch (error: any) {
      console.error("Login error:", error)
      const authError: AuthError = new Error(error.response?.data?.error || "Failed to sign in")
      authError.code = error.response?.data?.code
      authError.field = error.response?.data?.field
      throw authError
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      console.log("Registering user with data:", credentials)
      const response = await api.post<AuthResponse>("/api/auth/register", credentials)
      const { access_token, refresh_token, user } = response.data

      this.setTokens(access_token, refresh_token)
      this.setUser(user)

      return response.data
    } catch (error: any) {
      console.error("Registration error:", error)
      const authError: AuthError = new Error(error.response?.data?.error || "Failed to create account")
      authError.code = error.response?.data?.code
      authError.field = error.response?.data?.field
      throw authError
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      this.clearAuth()
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      // In a real app, this would be an API call
      // For demo purposes, let's return the stored user
      const storedUser = this.getUser()
      if (storedUser) {
        return storedUser
      }

      throw new Error("No user found in storage")
    } catch (error: any) {
      console.warn("Failed to get user, error:", error)
      throw new Error(error.message || "Failed to get user profile")
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put<{ user: User }>("/api/auth/me", userData)
      const updatedUser = response.data.user
      this.setUser(updatedUser)
      return updatedUser
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to update profile")
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post("/api/auth/forgot-password", { email })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to send reset password email")
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await api.post("/api/auth/reset-password", { token, password })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to reset password")
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await api.post("/api/auth/verify-email", { token })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to verify email")
    }
  }

  async resendVerificationEmail(): Promise<void> {
    try {
      await api.post("/api/auth/resend-verification")
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to resend verification email")
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey)
  }

  getUser(): User | null {
    try {
      const userStr = localStorage.getItem(this.userKey)
      if (!userStr) {
        console.log("No user found in localStorage")
        return null
      }

      const user = JSON.parse(userStr)
      console.log("Retrieved user from localStorage:", user)

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

  getStoredIdentifier(): string | null {
    return localStorage.getItem(this.identifierKey)
  }

  clearStoredIdentifier(): void {
    localStorage.removeItem(this.identifierKey)
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken()
    const user = this.getUser()
    const isAuth = !!token && !!user
    console.log("isAuthenticated check:", { hasToken: !!token, hasUser: !!user, isAuth })
    return isAuth
  }

  private setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(this.tokenKey, accessToken)
    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken)
    }
  }

  private setUser(user: User): void {
    if (!user || !user.id || !user.email) {
      console.error("Attempted to store invalid user object:", user)
      return
    }

    console.log("Storing user in localStorage:", user)
    localStorage.setItem(this.userKey, JSON.stringify(user))
  }

  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.refreshTokenKey)
    localStorage.removeItem(this.userKey)
    localStorage.removeItem(this.identifierKey)
  }
}

export const authService = new AuthService()

