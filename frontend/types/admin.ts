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
  meta?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from: number
    to: number
  }
  pagination?: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
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
  is_featured?: boolean
  is_new?: boolean
  is_sale?: boolean
  is_flash_sale?: boolean
  is_luxury_deal?: boolean
  meta_title?: string
  meta_description?: string
  material?: string
  image_urls?: string[]
  thumbnail_url?: string | null
  variants?: any[]
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
  site: {
    name: string
    tagline?: string
    description?: string
    logo_url?: string
    favicon_url?: string
    email: string
    phone?: string
    address?: string
    social_links?: Record<string, string>
    currency: string
    currency_symbol: string
    timezone: string
    date_format: string
    time_format: string
    default_language: string
    available_languages: string[]
  }
  seo: {
    meta_title: string
    meta_description: string
    meta_keywords?: string
    google_analytics_id?: string
    facebook_pixel_id?: string
    robots_txt?: string
    sitemap_enabled: boolean
  }
  email: {
    smtp_host?: string
    smtp_port?: number
    smtp_username?: string
    smtp_password?: string
    smtp_encryption?: "tls" | "ssl" | "none"
    from_email: string
    from_name: string
    email_signature?: string
    email_templates?: Record<
      string,
      {
        subject: string
        body: string
        is_active: boolean
      }
    >
  }
  payment: {
    payment_methods: {
      id: string
      name: string
      is_active: boolean
      config?: Record<string, any>
    }[]
    currency: string
    tax_rate: number
    tax_included_in_price: boolean
  }
  shipping: {
    shipping_methods: {
      id: string
      name: string
      is_active: boolean
      price: number
      free_shipping_threshold?: number
      config?: Record<string, any>
    }[]
    shipping_zones?: {
      id: number
      name: string
      countries: string[]
      states?: string[]
      zip_codes?: string[]
      shipping_methods: {
        id: string
        price: number
      }[]
    }[]
  }
  inventory: {
    low_stock_threshold: number
    notify_on_low_stock: boolean
    allow_backorders: boolean
    show_out_of_stock_products: boolean
  }
  reviews: {
    enabled: boolean
    require_approval: boolean
    allow_guest_reviews: boolean
    notify_on_new_review: boolean
  }
  security: {
    password_min_length: number
    password_requires_special_char: boolean
    password_requires_number: boolean
    password_requires_uppercase: boolean
    max_login_attempts: number
    lockout_time: number
    session_lifetime: number
    enable_two_factor: boolean
  }
  maintenance: {
    maintenance_mode: boolean
    maintenance_message?: string
    allowed_ips?: string[]
  }
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

