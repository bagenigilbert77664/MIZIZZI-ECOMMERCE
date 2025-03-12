export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export type RegisterCredentials = {
  name: string
  email: string
  password: string
  phone: string
}

export interface User {
  id: string
  email: string
  name: string
}

export class AuthError extends Error {
  code?: string
  field?: string
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<AuthResponse>
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>
  logout: () => Promise<void>
  updateProfile: () => Promise<void>
  forgotPassword: () => Promise<void>
  resetPassword: () => Promise<void>
  verifyEmail: () => Promise<void>
  resendVerificationEmail: () => Promise<void>

}