export interface Product {
  id: number
  name: string
  slug: string
  description?: string
  price: number
  sale_price?: number | null
  stock?: number
  category_id?: string | number
  brand_id?: string | number
  image_urls?: string[]
  is_featured?: boolean
  thumbnail_url?: string | null
  images?: { url: string }[]
  is_new?: boolean
  is_sale?: boolean
  is_flash_sale?: boolean
  is_luxury_deal?: boolean
  rating?: number
  reviews?: Review[] | any[]
  review_count?: number
  category?: string | { id: string | number; name: string } | any
  color?: string
  size?: string
  material?: string
  tags?: string[]
  created_at?: string
  updated_at?: string
  sku?: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  variants?: ProductVariant[]
  brand?: {
    id: number
    name: string
    slug: string
    logo_url?: string | null
  }
  seller?: {
    id?: number
    name?: string
    rating?: number
    verified?: boolean
    store_name?: string
    logo_url?: string
  }
  meta_title?: string
  meta_description?: string
  short_description?: string
  specifications?: Record<string, string>
  warranty_info?: string
  shipping_info?: string
  availability_status?: "in_stock" | "low_stock" | "out_of_stock" | "backorder" | "discontinued"
  min_order_quantity?: number
  max_order_quantity?: number
  related_products?: number[]
  cross_sell_products?: number[]
  up_sell_products?: number[]
  discount_percentage?: number
  tax_rate?: number
  tax_class?: string
  barcode?: string
  manufacturer?: string
  country_of_origin?: string
  is_digital?: boolean
  download_link?: string
  download_expiry_days?: number
  is_taxable?: boolean
  is_shippable?: boolean
  requires_shipping?: boolean
  is_gift_card?: boolean
  gift_card_value?: number
  is_customizable?: boolean
  customization_options?: {
    name: string
    type: "text" | "select" | "checkbox" | "radio" | "file"
    required: boolean
    options?: string[]
    price_adjustment?: number
  }[]
  seo_keywords?: string[]
  canonical_url?: string
  condition?: "new" | "used" | "refurbished"
  video_url?: string
  is_visible?: boolean
  is_searchable?: boolean
  is_comparable?: boolean
  is_preorder?: boolean
  preorder_release_date?: string
  preorder_message?: string
  badge_text?: string
  badge_color?: string
  sort_order?: number
  warranty?: string
  features?: string[]
  product_type?: "regular" | "flash_sale" | "luxury"
  is_imported?: boolean
  package_contents?: string[]
}

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

export interface ProductImage {
  id: number | string
  product_id: number | string
  filename: string
  original_name?: string
  url: string
  size?: number
  is_primary: boolean
  sort_order: number
  alt_text?: string
  uploaded_by?: number | string
  created_at?: string
  updated_at?: string
}

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
  meta_title?: string
  meta_description?: string
  icon?: string
  display_order?: number
  is_visible?: boolean
  breadcrumb?: string[]
}

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
  meta_title?: string
  meta_description?: string
  banner_url?: string | null
  country_of_origin?: string
  year_established?: number
  brand_story?: string
  social_links?: {
    facebook?: string
    instagram?: string
    twitter?: string
    youtube?: string
    pinterest?: string
    linkedin?: string
  }
  featured_products?: number[]
  display_order?: number
}

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

export interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  total: number
  product?: Product | null
  product_name?: string
  name?: string
  image_url?: string
  thumbnail_url?: string
  variation?: Record<string, any>
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: string
  created_at: string
  updated_at: string
  items: OrderItem[]
  shipping_address?: any
  billing_address?: any
  payment_method?: string
  payment_status?: string
  shipping_method?: string
  shipping_cost?: number
  tracking_number?: string
  subtotal?: number
  shipping?: number
  tax?: number
  total?: number
  total_amount?: number
  notes?: string
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
    seller?: {
      name?: string
      rating?: number
      verified?: boolean
      store_name?: string
    }
    stock?: number
    sku?: string
    price: number
    sale_price?: number | null
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

export interface Review {
  id: number
  product_id?: number
  user_id?: number
  rating: number
  title?: string
  comment: string
  is_verified_purchase?: boolean
  verified_purchase?: boolean
  is_recommended?: boolean
  likes_count?: number
  helpful_count?: number
  user?: User
  created_at?: string
  date?: string
  updated_at?: string
  reviewer_name: string
}

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

export interface Settings {
  theme: "light" | "dark" | "system"
  currency: "KSh" | "USD" | "EUR" | "GBP"
  language: "en" | "sw" | "fr"
  notifications_enabled: boolean
  email_notifications_enabled: boolean
}

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

export interface CategoryTip {
  category_slug: string
  title: string
  description: string
  icon: string
  related_categories: string[]
}

// Additional utility types for better type safety
export type ProductStatus = "active" | "inactive" | "draft" | "archived"
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded"
export type ShippingStatus = "not_shipped" | "shipped" | "in_transit" | "delivered" | "returned"

// Type guards for runtime type checking
export const isProduct = (obj: any): obj is Product => {
  return obj && typeof obj.id === "number" && typeof obj.name === "string" && typeof obj.price === "number"
}

export const isCategory = (obj: any): obj is Category => {
  return obj && typeof obj.id === "number" && typeof obj.name === "string" && typeof obj.slug === "string"
}

export const isCartItem = (obj: any): obj is CartItem => {
  return obj && typeof obj.id === "number" && typeof obj.product_id === "number" && typeof obj.quantity === "number"
}

// Helper types for API responses
export interface ErrorResponse {
  error: string
  message: string
  status_code: number
}

export interface SuccessResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

// Extended interfaces for admin functionality
export interface AdminUser extends User {
  permissions: string[]
  last_login?: string
  is_active: boolean
}

export interface ProductAnalytics {
  product_id: number
  views: number
  purchases: number
  conversion_rate: number
  revenue: number
  last_updated: string
}

export interface CategoryAnalytics {
  category_id: number
  products_count: number
  total_sales: number
  avg_rating: number
  popular_products: number[]
}
