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

      // Convert identifier-based credentials to email-based for backend compatibility
      const loginPayload = {
        email: credentials.identifier,
        password: credentials.password,
        remember: credentials.remember,
      }

      const response = await api.post<AuthResponse>("/api/auth/login", loginPayload)
      const { access_token, refresh_token, user } = response.data

      this.setTokens(access_token, refresh_token)
      this.setUser(user)

      return response.data
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
      const response = await api.get<{ user: User }>("/api/auth/me")
      const user = response.data.user
      this.setUser(user)
      return user
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to get user profile")
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
    const userStr = localStorage.getItem(this.userKey)
    return userStr ? JSON.parse(userStr) : null
  }

  getStoredIdentifier(): string | null {
    return localStorage.getItem(this.identifierKey)
  }

  clearStoredIdentifier(): void {
    localStorage.removeItem(this.identifierKey)
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getUser()
  }

  private setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(this.tokenKey, accessToken)
    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken)
    }
  }

  private setUser(user: User): void {
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

