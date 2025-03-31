import type { User } from "./auth"
import type { Product } from "./index"

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
    categories: number
    brands: number
    reviews: number
    pending_reviews: number
    newsletter_subscribers: number
  }
  sales: {
    today: number
    yesterday: number
    weekly: number
    monthly: number
    yearly: number
  }
  order_status: Record<string, number>
  recent_orders: any[]
  recent_users: any[]
  low_stock_products: Product[]
  sales_by_category: {
    category: string
    sales: number
  }[]
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

export interface SalesStatistics {
  period: string
  data: {
    label: string
    sales: number
    orders: number
  }[]
}

export interface ProductStatistics {
  top_selling: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    total_quantity: number
    total_sales: number
  }[]
  highest_rated: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    average_rating: number
    review_count: number
  }[]
  low_stock: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    stock: number
  }[]
  out_of_stock: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
  }[]
}

