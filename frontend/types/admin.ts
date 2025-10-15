// Removed the grouped export statement to avoid conflicts with individual exports.

import type { ProductVariant } from "./index"

// Admin User Types
export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

export interface AdminPermission {
  resource: string
  actions: Array<"create" | "read" | "update" | "delete" | "manage">
}

// Change the AdminUser interface to fix the role property type incompatibility
export interface AdminUser {
  id: number
  name: string
  email: string
  role: AdminRole
  permissions: AdminPermission[]
  last_login?: string
  is_active: boolean
  created_by?: number
  department?: string
  phone?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

// Instead of extending User, we're defining all the necessary properties directly
// This avoids the type conflict with the role property

// Admin Authentication
export interface AdminLoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface AdminLoginResponse {
  user: AdminUser
  token: string
  expires_at: string
}

// Admin API Response Types
export interface AdminPaginatedResponse<T> {
  items: T[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from: number
    to: number
  }
}

// Dashboard Data Types
export interface AdminDashboardData {
  summary: {
    total_sales: number
    total_orders: number
    total_customers: number
    total_products: number
    average_order_value: number
    conversion_rate: number
  }
  recent_orders: {
    id: string
    order_number: string
    customer_name: string
    total: number
    status: string
    created_at: string
  }[]
  recent_customers: {
    id: number
    name: string
    email: string
    orders_count: number
    total_spent: number
    created_at: string
  }[]
  top_selling_products: {
    id: number
    name: string
    sku: string
    price: number
    quantity_sold: number
    revenue: number
    image_url?: string
  }[]
  sales_by_category: {
    category: string
    sales: number
    percentage: number
  }[]
  sales_by_period: {
    date: string
    sales: number
    orders: number
  }[]
  low_stock_products: {
    id: number
    name: string
    sku: string
    stock: number
    threshold: number
    image_url?: string
  }[]
  order_status_distribution: {
    status: string
    count: number
    percentage: number
  }[]
}

// Product Statistics
export interface ProductStatistics {
  total_products: number
  active_products: number
  out_of_stock_products: number
  low_stock_products: number
  featured_products: number
  on_sale_products: number
  new_products: number
  products_by_category: {
    category: string
    count: number
    percentage: number
  }[]
  products_by_brand: {
    brand: string
    count: number
    percentage: number
  }[]
  top_viewed_products: {
    id: number
    name: string
    views: number
    conversion_rate: number
  }[]
  inventory_value: {
    total: number
    average_per_product: number
  }
  price_distribution: {
    range: string
    count: number
    percentage: number
  }[]
}

// Sales Statistics
export interface SalesStatistics {
  total_revenue: number
  total_orders: number
  average_order_value: number
  revenue_growth: number
  orders_growth: number
  sales_by_period: {
    period: string
    revenue: number
    orders: number
  }[]
  sales_by_payment_method: {
    method: string
    revenue: number
    percentage: number
  }[]
  sales_by_country: {
    country: string
    revenue: number
    percentage: number
  }[]
  sales_by_device: {
    device: string
    orders: number
    percentage: number
  }[]
  conversion_rate: number
  cart_abandonment_rate: number
  repeat_purchase_rate: number
  refund_rate: number
}

// Product Management Types
export interface ProductCreatePayload {
  name: string
  slug: string
  description?: string
  price: number
  sale_price?: number | null
  stock: number
  category_id: number
  brand_id?: number | null
  sku?: string
  weight?: number | null
  is_featured: boolean
  is_new: boolean
  is_sale: boolean
  is_flash_sale: boolean
  is_luxury_deal: boolean
  meta_title?: string
  meta_description?: string
  material?: string
  image_urls?: string[]
  thumbnail_url?: string
  variants?: ProductVariant[]
}

export interface ProductUpdatePayload extends ProductCreatePayload {
  // Any additional fields specific to updates
}

// Order Management Types
export interface OrderUpdatePayload {
  status?: string
  payment_status?: string
  shipping_method?: string
  tracking_number?: string
  notes?: string
}

// Category Management Types
export interface CategoryCreatePayload {
  name: string
  slug: string
  description?: string | null
  parent_id?: number | null
  image_url?: string | null
  banner_url?: string | null
  is_featured?: boolean
  meta_title?: string
  meta_description?: string
  icon?: string
  display_order?: number
  is_visible?: boolean
}

export interface CategoryUpdatePayload extends Partial<CategoryCreatePayload> {
  id?: number
}

// Brand Management Types
export interface BrandCreatePayload {
  name: string
  slug: string
  description?: string | null
  logo_url?: string | null
  website_url?: string | null
  is_featured?: boolean
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
  display_order?: number
}

export interface BrandUpdatePayload extends Partial<BrandCreatePayload> {
  id?: number
}

// Review Management Types
export interface ReviewUpdatePayload {
  status?: "approved" | "rejected" | "pending"
  admin_response?: string
  is_featured?: boolean
}

// Newsletter Management Types
export interface NewsletterSubscriber {
  id: number
  email: string
  name?: string
  status: "active" | "unsubscribed" | "bounced"
  subscribed_at: string
  unsubscribed_at?: string
  last_sent_at?: string
  groups?: string[]
}

export interface NewsletterSendPayload {
  subject: string
  content: string
  recipient_groups?: string[]
  test_emails?: string[]
  scheduled_at?: string
  sender_name?: string
  sender_email?: string
  template_id?: number
}

// System Settings Types
export interface SystemSettings {
  store_name: string
  store_email: string
  store_phone: string
  store_address: string
  store_description: string
  default_currency: string
  default_locale: string
  timezone: string
  ga_tracking_id: string
  facebook_pixel_id: string
  twitter_handle: string
  instagram_handle: string
  youtube_channel_id: string
  contact_email: string
  order_email: string
  shipping_email: string
  return_email: string
  support_email: string
  low_stock_threshold: number
  out_of_stock_threshold: number
  new_product_badge_days: number
  free_shipping_threshold: number
  flat_shipping_rate: number
  local_pickup_cost: number
  tax_rate: number
  tax_class: string
  default_product_condition: string
  default_product_availability: string
  default_product_requires_shipping: boolean
  default_product_is_taxable: boolean
  default_product_weight_unit: string
  default_product_dimension_unit: string
  default_customer_group: string
  default_order_status: string
  default_payment_status: string
  default_shipping_method: string
  default_country: string
  default_state: string
  default_locale_format: string
  default_date_format: string
  default_time_format: string
  default_timezone: string
  default_weight_unit: string
  default_dimension_unit: string
  default_page_title_separator: string
  default_meta_keywords: string
  default_meta_description: string
  default_seo_title: string
  default_seo_description: string
  default_seo_keywords: string
  default_seo_canonical_url: string
  default_seo_robots: string
  default_seo_author: string
  default_seo_copyright: string
  default_seo_language: string
  default_seo_distribution: string
  default_seo_rating: string
  default_seo_revisit_after: string
  default_seo_expires: string
  default_seo_pragma: string
  default_seo_cache_control: string
  default_seo_generator: string
  default_seo_publisher: string
  default_seo_classification: string
  default_seo_coverage: string
  default_seo_location: string
  default_seo_region: string
  default_seo_placename: string
  default_seo_position: string
  default_seo_icbm: string
  default_seo_dcterms_title: string
  default_seo_dcterms_description: string
  default_seo_dcterms_subject: string
  default_seo_dcterms_creator: string
  default_seo_dcterms_publisher: string
  default_seo_dcterms_contributor: string
  default_seo_dcterms_date: string
  default_seo_dcterms_type: string
  default_seo_dcterms_format: string
  default_seo_dcterms_identifier: string
  default_seo_dcterms_source: string
  default_seo_dcterms_language: string
  default_seo_og_title: string
  default_og_description: string
  default_og_type: string
  default_og_url: string
  default_og_image: string
  default_og_site_name: string
  default_og_locale: string
  default_og_determiner: string
  default_og_audio: string
  default_og_video: string
  default_og_article_author: string
  default_og_article_publisher: string
  default_og_article_published_time: string
  default_og_article_modified_time: string
  default_og_article_expiration_time: string
  default_og_book_author: string
  default_og_book_isbn: string
  default_og_book_release_date: string
  default_og_book_tag: string
  default_og_profile_first_name: string
  default_og_profile_last_name: string
  default_og_profile_username: string
  default_og_profile_gender: string
  default_twitter_card: string
  default_twitter_site: string
  default_twitter_creator: string
  default_twitter_title: string
  default_twitter_description: string
  default_twitter_image: string
  default_twitter_domain: string
  default_twitter_url: string
  default_twitter_account_id: string
  default_twitter_label1: string
  default_twitter_data1: string
  default_twitter_label2: string
  default_twitter_data2: string
}

// Admin Activity Log
export interface AdminActivityLog {
  id: number
  admin_id: number
  admin_name: string
  action: string
  resource_type: string
  resource_id?: number | string
  details?: Record<string, any>
  ip_address: string
  user_agent: string
  created_at: string
}

// Admin Notification
export interface AdminNotification {
  id: number
  type: "order" | "product" | "customer" | "review" | "system"
  title: string
  message: string
  is_read: boolean
  data?: Record<string, any>
  created_at: string
}

// Dashboard Customization
export interface DashboardWidget {
  id: string
  name: string
  type: "chart" | "stats" | "table" | "list"
  data_source: string
  refresh_interval?: number
  settings?: Record<string, any>
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface DashboardLayout {
  id: number
  admin_id: number
  name: string
  is_default: boolean
  widgets: DashboardWidget[]
  created_at: string
  updated_at: string
}

// Import/Export Types
export interface ExportOptions {
  resource: "products" | "orders" | "customers" | "categories" | "brands" | "reviews"
  format: "csv" | "xlsx" | "json"
  filters?: Record<string, any>
  include_related?: boolean
  columns?: string[]
}

export interface ImportOptions {
  resource: "products" | "orders" | "customers" | "categories" | "brands"
  file_url: string
  format: "csv" | "xlsx" | "json"
  column_mapping?: Record<string, string>
  skip_first_row?: boolean
  update_existing?: boolean
  identifier_field?: string
}

export interface ImportResult {
  total_rows: number
  processed_rows: number
  success_count: number
  error_count: number
  warnings_count: number
  errors?: {
    row: number
    message: string
    data?: Record<string, any>
  }[]
  warnings?: {
    row: number
    message: string
    data?: Record<string, any>
  }[]
  import_id: string
  status: "completed" | "failed" | "processing"
  download_errors_url?: string
}
