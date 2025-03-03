import api from "@/lib/api"
import type { AuthResponse, LoginCredentials, RegisterCredentials, User, AuthError } from "@/types/auth"

class AuthService {
  private tokenKey = "mizizzi_token"
  private refreshTokenKey = "mizizzi_refresh_token"
  private userKey = "mizizzi_user"
  private rememberEmailKey = "mizizzi_remembered_email"

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/login", credentials)
      const { access_token, refresh_token, user } = response.data

      this.setTokens(access_token, refresh_token)
      this.setUser(user)

      if (credentials.remember) {
        localStorage.setItem(this.rememberEmailKey, credentials.email)
      } else {
        localStorage.removeItem(this.rememberEmailKey)
      }

      return response.data
    } catch (error: any) {
      const authError: AuthError = new Error(error.response?.data?.message || "Failed to sign in")
      authError.code = error.response?.data?.code
      authError.field = error.response?.data?.field
      throw authError
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/register", credentials)
      const { access_token, refresh_token, user } = response.data

      this.setTokens(access_token, refresh_token)
      this.setUser(user)

      return response.data
    } catch (error: any) {
      const authError: AuthError = new Error(error.response?.data?.message || "Failed to create account")
      authError.code = error.response?.data?.code
      authError.field = error.response?.data?.field
      throw authError
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      this.clearAuth()
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<{ user: User }>("/auth/me")
      const user = response.data.user
      this.setUser(user)
      return user
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to get user profile")
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put<{ user: User }>("/auth/me", userData)
      const updatedUser = response.data.user
      this.setUser(updatedUser)
      return updatedUser
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to update profile")
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post("/auth/forgot-password", { email })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to send reset password email")
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await api.post("/auth/reset-password", { token, password })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to reset password")
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await api.post("/auth/verify-email", { token })
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to verify email")
    }
  }

  async resendVerificationEmail(): Promise<void> {
    try {
      await api.post("/auth/resend-verification")
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to resend verification email")
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

  getRememberedEmail(): string | null {
    return localStorage.getItem(this.rememberEmailKey)
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
  }
}

export const authService = new AuthService()

