// Product Types
export interface Product {
  id: string | number
  name: string
  slug: string
  description?: string
  price: number // Ensure price is a required property
  sale_price?: number | null // Ensure sale_price is explicitly defined with proper type
  stock?: number
  category_id?: string | number
  brand_id?: string | number
  image_urls?: string[] | undefined
  is_featured?: boolean
  thumbnail_url?: string | null
  images?: { url: string }[]
  is_new?: boolean
  is_sale?: boolean
  is_flash_sale?: boolean
  is_luxury_deal?: boolean
  rating?: number
  reviews?: Review[] | any[]
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
  color_options?: string[] // Add color options property
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
  meta_title?: string
  meta_description?: string
  icon?: string
  display_order?: number
  is_visible?: boolean
  breadcrumb?: string[]
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
  quantity: number
  price: number
  total: number
  product?: Product | null
  product_name?: string
  name?: string
  image_url?: string
  thumbnail_url?: string // Add this property
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
  product_id?: number // Make optional for mock data
  user_id?: number // Make optional for mock data
  rating: number
  title?: string // Make optional for mock data
  comment: string
  is_verified_purchase?: boolean
  verified_purchase?: boolean
  is_recommended?: boolean // Make optional for mock data
  likes_count?: number // Make optional for mock data
  helpful_count?: number // Add this property
  user?: User
  created_at?: string
  date?: string
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
