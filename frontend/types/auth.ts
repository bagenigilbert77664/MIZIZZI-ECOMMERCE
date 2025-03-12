export interface User {
  id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  avatar_url?: string // Add this field to match what's used in the components
  role: "user" | "admin"
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  identifier: string
  password?: string
  remember?: boolean
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  message: string
  user: User
  access_token: string
  refresh_token: string
}

export interface AuthError extends Error {
  code?: string
  field?: string
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (identifier: string, password?: string) => Promise<{ requiresPassword: boolean; user?: User }>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (userData: Partial<User>) => Promise<User>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerificationEmail: () => Promise<void>
}

