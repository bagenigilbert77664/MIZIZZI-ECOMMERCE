import type { User } from "./auth"

export interface AdminUser extends User {
  role: "admin" | "manager"
}

export interface AdminState {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AdminLoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface AdminDashboardData {
  counts: {
    users: number
    products: number
    orders: number
  }
  sales: {
    today: number
    monthly: number
  }
  order_status: Record<string, number>
  recent_orders: any[]
}

export interface AdminPaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
}

