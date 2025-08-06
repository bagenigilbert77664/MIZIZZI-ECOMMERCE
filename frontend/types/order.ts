// Product Types
export interface Product {
  id: number
  name: string
  slug: string
  description: string
  price: number
  sale_price: number | null
  stock: number
  category_id: number
  brand_id: number | null
  image_urls: string[]
  is_featured: boolean
  thumbnail_url?: string
  images?: { url: string }[]
  is_new: boolean
  is_sale: boolean
  is_flash_sale: boolean
  is_luxury_deal: boolean
  rating?: number
  reviews?: Review[]
  category?: string
  color?: string
  size?: string
  material?: string
  tags?: string[]
  created_at?: string
  updated_at?: string
  // Add missing properties
  sku?: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  variants?: ProductVariant[]
}

// Add ProductVariant interface
export interface ProductVariant {
  id: number
  product_id: number
  color?: string
  size?: string
  price: number
  stock: number
  sku?: string
  image_url?: string
}

// Category Types
export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  parent_id: number | null
  image_url: string | null
  banner_url: string | null
  is_featured: boolean
  products_count?: number
  subcategories?: Category[]
  created_at?: string
  updated_at?: string
}

// Brand Types
export interface Brand {
  id: number
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  is_featured: boolean
  products_count?: number
  created_at?: string
  updated_at?: string
}

// User Types
export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string
  role: "customer" | "admin" | "manager"
  is_verified: boolean
  created_at?: string
  updated_at?: string
}

// Address Types
export interface Address {
  id: number
  user_id: number
  first_name: string
  last_name: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  is_default: boolean
  created_at?: string
  updated_at?: string
}

// Order Types
export interface OrderItem {
  id: string
  product_id: string
  name?: string
  product_name?: string
  price: number
  quantity: number
  image?: string
  product?: {
    name?: string
    thumbnail_url?: string
    image_urls?: string[]
    variation?: Record<string, string>
  }
  thumbnail_url?: string
  image_url?: string
  variation?: Record<string, string>
  return_tracking?: string
  return_authorization?: string
  return_reason?: string
  refund_status?: string
  refund_amount?: number
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  items: OrderItem[]
  created_at: string
  updated_at?: string
  cancelled_at?: string
  returned_at?: string
  shipping_address: Address
  billing_address: Address
  payment_method: string
  payment_status?: string
  shipping_method?: string
  carrier?: string
  tracking_number?: string
  subtotal: number
  shipping: number
  tax: number
  total: number
  total_amount?: number
  subtotal_amount?: number
  shipping_amount?: number
  tax_amount?: number
  discount_amount?: number
  cancellation_reason?: string
  return_reason?: string
  return_tracking?: string
  return_authorization?: string
  refund_status?: string
  notes?: string
  _isErrorOrder?: boolean
  _isOfflineOrder?: boolean
}

export interface CreateOrderData {
  shipping_address: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address_line1: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  billing_address: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address_line1: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  payment_method: string
  shipping_method: string
  notes?: string
  coupon_code?: string
  shipping_cost: number
}

export interface OrderResponse {
  message: string
  order: {
    id: number
    order_number: string
    status: string
    total_amount: number
    created_at: string
    items: OrderItem[]
  }
}

export interface CancelOrderData {
  reason: string
  note?: string
}

// Cart Types
export interface CartItem {
  id: number
  product_id: number
  variant_id?: number | null
  quantity: number
  price: number
  total: number
  product: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    image_urls: string[]
    category?: string
  }
}

export interface Cart {
  items: CartItem[]
  total_items: number
  total_amount: number
  shipping_amount: number
  tax_amount: number
  discount_amount: number
  final_amount: number
}

// Wishlist Types
export interface WishlistItem {
  id: number
  product_id: number
  created_at?: string
  product: {
    id: number
    name: string
    slug: string
    price: number
    sale_price?: number
    thumbnail_url: string
    image_urls: string[]
  }
}

// Review Types
export interface Review {
  id: number
  product_id: number
  user_id: number
  rating: number
  title: string
  comment: string
  is_verified_purchase: boolean
  is_recommended: boolean
  likes_count: number
  user?: User
  created_at?: string
  updated_at?: string
  reviewer_name: string
}

// Coupon Types
export interface Coupon {
  id: number
  code: string
  description: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  minimum_spend?: number
  maximum_discount?: number
  start_date: string
  end_date: string
  is_active: boolean
  usage_limit?: number
  usage_count: number
  created_at?: string
  updated_at?: string
}

// API Response Types
export interface ApiResponse<T> {
  items: T[]
  pagination: Pagination
}

export interface Pagination {
  page: number
  per_page: number
  total_pages: number
  total_items: number
}

// Filter and Sort Types
export interface ProductFilter {
  category_id?: number
  brand_id?: number
  price_min?: number
  price_max?: number
  is_featured?: boolean
  is_new?: boolean
  is_sale?: boolean
  is_flash_sale?: boolean
  is_luxury_deal?: boolean
  rating?: number
  search?: string
  [key: string]: any
}

export type SortOption = "price_asc" | "price_desc" | "newest" | "rating" | "popularity"

// Notification Types
export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: "order" | "promotion" | "system" | "account"
  is_read: boolean
  action_url?: string
  created_at: string
}

// Settings Types
export interface Settings {
  theme: "light" | "dark" | "system"
  currency: "KSh" | "USD" | "EUR" | "GBP"
  language: "en" | "sw" | "fr"
  notifications_enabled: boolean
  email_notifications_enabled: boolean
}

// Auth Types
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterData {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
  phone?: string
  accept_terms: boolean
}

// Category Tips
export interface CategoryTip {
  category_slug: string
  title: string
  description: string
  icon: string
  related_categories: string[]
}
