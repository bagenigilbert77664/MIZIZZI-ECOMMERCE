export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  avatar_url?: string
  is_active: boolean
  email_verified?: boolean
  created_at: string
  updated_at: string
  last_login?: string
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
  csrf_token?: string
  message?: string
}

export class AuthError extends Error {
  code?: string
  field?: string
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
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

