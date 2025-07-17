// Update the User type to match the backend model
export interface User {
  id: number
  name: string
  email?: string
  phone?: string
  role?: string
  avatar_url?: string
  is_active?: boolean
  created_at?: string
  last_login?: string
  email_verified?: boolean
  phone_verified?: boolean
}

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface AuthResponse {
  message: string
  user: User
  access_token: string
  refresh_token: string
  csrf_token: string
}

export interface AuthError extends Error {
  code?: string
  field?: string
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  token: string | null
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (userData: Partial<User>) => Promise<User>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerificationEmail: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken?: string
  expiresIn?: number
  expires_at?: string
  message?: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
  password_confirmation?: string
  terms?: boolean
}

export interface RegisterResponse {
  user: User
  token: string
  refreshToken?: string
  expiresIn?: number
  verification_required?: boolean
}

export interface ForgotPasswordCredentials {
  email: string
}

export interface ResetPasswordCredentials {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export interface VerifyEmailCredentials {
  token: string
}

export interface RefreshTokenResponse {
  token: string
  refreshToken?: string
  expiresIn?: number
}

export interface ChangePasswordCredentials {
  current_password: string
  password: string
  password_confirmation: string
}

export interface UpdateProfileCredentials {
  name?: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  preferences?: {
    notifications?: {
      email?: boolean
      sms?: boolean
      push?: boolean
    }
    marketing?: boolean
    theme?: "light" | "dark" | "system"
  }
}

export interface IdentifierFormValues {
  email: string
}

export interface PasswordFormValues {
  password: string
}

export interface RegisterFormValues {
  name: string
  email?: string
  phone?: string
  password: string
  confirmPassword: string
  terms: boolean
}

export interface LoginFormValues {
  email: string
  password: string
  remember: boolean
}

export interface RegisterData {
  name: string
  email?: string
  phone?: string
  password: string
  confirmPassword?: string
  terms?: boolean
}

export interface VerificationData {
  user_id: string
  code: string
  is_phone?: boolean
}

export interface ResetPasswordData {
  token: string
  password: string
  confirmPassword?: string
}
