import api from "@/lib/api"
import type { User } from "@/types/auth"

// Define the response types
interface LoginResponse {
  user: User
  access_token?: string
  refresh_token?: string
  csrf_token?: string
  message?: string
}

interface RegisterResponse {
  user_id: string
  msg?: string
}

interface VerificationResponse {
  user_id: string
  message?: string
  verified?: boolean
  user?: User
  access_token?: string
  refresh_token?: string
  csrf_token?: string
}

interface AvailabilityResponse {
  email_available?: boolean
  phone_available?: boolean
}

class AuthService {
  // Check if email or phone is available (not already registered)
  async checkAvailability(identifier: string): Promise<AvailabilityResponse> {
    try {
      const isEmail = identifier.includes("@")
      const data = isEmail ? { email: identifier } : { phone: identifier }

      const response = await api.post("/api/check-availability", data)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || "Failed to check availability")
    }
  }

  // Send verification code for registration
  async sendVerificationCode(identifier: string): Promise<VerificationResponse> {
    try {
      // The backend uses /resend-verification for this functionality
      const response = await api.post("/api/resend-verification", { identifier })
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || "Failed to send verification code")
    }
  }

  // Verify code during registration
  async verifyCode(userId: string, code: string, isPhone = false): Promise<VerificationResponse> {
    try {
      // Ensure code is trimmed and userId is properly formatted
      const trimmedCode = code.trim()
      console.log(`Verifying code: ${trimmedCode} for user ${userId}, isPhone: ${isPhone}`)

      const response = await api.post("/api/verify-code", {
        user_id: userId,
        code: trimmedCode,
        is_phone: isPhone,
      })

      console.log("Verification response:", response.data)

      // Store tokens in localStorage if provided
      if (response.data.access_token) {
        localStorage.setItem("mizizzi_token", response.data.access_token)
      }
      if (response.data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", response.data.refresh_token)
      }
      if (response.data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
      }

      // Store user data
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user))
      }

      // Clear verification state
      localStorage.removeItem("auth_verification_state")

      return {
        ...response.data,
        verified: true,
        user_id: userId,
      }
    } catch (error: any) {
      console.error("Verification error:", error)

      // Extract the error message from the response
      const errorResponse = error.response?.data || {}
      const errorMessage = errorResponse.msg || errorResponse.message || errorResponse.error || "Failed to verify code"
      console.log("Error message:", errorMessage)

      // Provide more specific error messages based on the error
      if (errorMessage.includes("expired")) {
        throw new Error("Verification code has expired. Please request a new one.")
      } else if (errorMessage.includes("invalid")) {
        throw new Error("Invalid verification code. Please check and try again.")
      } else if (errorMessage.includes("attempts")) {
        throw new Error("Too many failed attempts. Please request a new code.")
      } else if (errorMessage.includes("not found")) {
        throw new Error("User not found. Please try registering again.")
      }

      throw new Error(errorMessage)
    }
  }

  // Resend verification code
  async resendVerificationCode(identifier: string): Promise<any> {
    try {
      console.log(`Resending verification code to: ${identifier}`)
      const response = await api.post("/api/resend-verification", { identifier })

      // Log the response for debugging
      console.log("Resend verification response:", response.data)

      return response.data
    } catch (error: any) {
      console.error("Resend verification error:", error)

      // Extract the error message from the response
      const errorResponse = error.response?.data || {}
      const errorMessage =
        errorResponse.msg || errorResponse.message || errorResponse.error || "Failed to resend verification code"

      // Provide more specific error messages based on the error
      if (errorMessage.includes("too many")) {
        throw new Error("Too many attempts. Please try again after 5 minutes.")
      } else if (errorMessage.includes("not found")) {
        throw new Error("Account not found. Please check your information.")
      } else if (errorMessage.includes("already verified")) {
        throw new Error("This account is already verified. Please login.")
      } else if (errorMessage.includes("recently sent")) {
        throw new Error("A code was recently sent. Please wait before requesting another one.")
      }

      throw new Error(errorMessage)
    }
  }

  // Login with email/phone and password
  async login(identifier: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post("/api/login", { identifier, password })

      // Store tokens in localStorage
      if (response.data.access_token) {
        localStorage.setItem("mizizzi_token", response.data.access_token)
      }
      if (response.data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", response.data.refresh_token)
      }
      if (response.data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
      }

      // Store user data
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user))
      }

      // Clear verification state
      localStorage.removeItem("auth_verification_state")

      return {
        user: response.data.user,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        message: response.data.msg,
      }
    } catch (error: any) {
      // Check if this is a verification required error
      if (error.response?.data?.verification_required) {
        error.response.data = {
          ...error.response.data,
          verification_required: true,
        }
        throw error
      }

      const errorMessage = error.response?.data?.msg || "Login failed"

      // Provide more specific error messages based on the error
      if (errorMessage.includes("not found")) {
        throw new Error("Account not found. Please check your email or phone number.")
      } else if (errorMessage.includes("password")) {
        throw new Error("Incorrect password. Please try again.")
      } else if (errorMessage.includes("locked")) {
        throw new Error("Your account has been locked. Please contact support.")
      } else if (errorMessage.includes("verified")) {
        throw new Error("Your account is not verified. Please verify your account first.")
      }

      throw new Error(errorMessage)
    }
  }

  // Register a new user
  async register(userData: {
    name: string
    email?: string
    phone?: string
    password: string
  }): Promise<RegisterResponse> {
    try {
      const response = await api.post("/api/register", userData)

      // Store verification state in localStorage
      if (response.data.user_id) {
        localStorage.setItem(
          "auth_verification_state",
          JSON.stringify({
            identifier: userData.email || userData.phone,
            userId: response.data.user_id,
            step: "verification",
            timestamp: new Date().toISOString(),
          }),
        )
      }

      return {
        user_id: response.data.user_id,
        msg: response.data.msg,
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.msg || "Registration failed"

      // Provide more specific error messages based on the error
      if (errorMessage.includes("email") && errorMessage.includes("exists")) {
        throw new Error("This email is already registered. Please use a different email.")
      } else if (errorMessage.includes("phone") && errorMessage.includes("exists")) {
        throw new Error("This phone number is already registered. Please use a different number.")
      } else if (errorMessage.includes("password")) {
        throw new Error("Password does not meet requirements. Please choose a stronger password.")
      }

      throw new Error(errorMessage)
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await api.post("/api/logout")
    } finally {
      // Clear tokens regardless of API response
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("user")
      localStorage.removeItem("auth_verification_state")
    }
  }

  // Request password reset
  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post("/api/forgot-password", { email })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to send reset email")
    }
  }

  // Reset password with token
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await api.post("/api/reset-password", { token, password })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to reset password")
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get("/api/profile")
      return response.data.user
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || "Failed to get user profile")
    }
  }

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put("/api/profile", userData)
      return response.data.user
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || "Failed to update profile")
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.post("/api/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || "Failed to change password")
    }
  }

  // Delete account
  async deleteAccount(password: string): Promise<void> {
    try {
      await api.post("/api/delete-account", { password })
      // Clear tokens after account deletion
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("user")
      localStorage.removeItem("auth_verification_state")
    } catch (error: any) {
      throw new Error(error.response?.data?.msg || "Failed to delete account")
    }
  }

  // Refresh token
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem("mizizzi_refresh_token")
      if (!refreshToken) return null

      const response = await api.post(
        "/api/refresh",
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        },
      )

      if (response.data.access_token) {
        localStorage.setItem("mizizzi_token", response.data.access_token)
      }
      if (response.data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", response.data.csrf_token)
      }

      return response.data.access_token
    } catch (error: any) {
      // Clear tokens on refresh failure
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      return null
    }
  }

  // Get access token
  async getAccessToken(): Promise<string | null> {
    // First try to get from localStorage
    const token = localStorage.getItem("mizizzi_token")
    if (token) {
      return token
    }

    // If no token, try to refresh
    return this.refreshToken()
  }

  // Check if verification state is expired
  checkVerificationStateExpiry(): boolean {
    try {
      const storedState = localStorage.getItem("auth_verification_state")
      if (!storedState) return true

      const state = JSON.parse(storedState)
      if (!state.timestamp) return true

      // Check if the verification state is older than 30 minutes
      const timestamp = new Date(state.timestamp).getTime()
      const now = new Date().getTime()
      const thirtyMinutesInMs = 30 * 60 * 1000

      if (now - timestamp > thirtyMinutesInMs) {
        localStorage.removeItem("auth_verification_state")
        return true
      }

      return false
    } catch (e) {
      localStorage.removeItem("auth_verification_state")
      return true
    }
  }
}

export const authService = new AuthService()
