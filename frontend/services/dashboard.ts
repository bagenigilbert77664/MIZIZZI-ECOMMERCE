interface DashboardData {
  counts: {
    users: number
    verified_customers: number
    unverified_customers: number
    premium_customers: number
    active_sessions: number
    products: number
    featured_products: number
    new_products: number
    sale_products: number
    flash_sale_products: number
    luxury_products: number
    low_stock_products: number
    out_of_stock_products: number
    orders: number
    pending_orders: number
    processing_orders: number
    shipped_orders: number
    delivered_orders: number
    cancelled_orders: number
    returned_orders: number
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
    total_revenue: number
    pending_amount: number
    refunded_amount: number
    average_order_value: number
    conversion_rate: number
    cart_abandonment_rate: number
    return_rate: number
    customer_lifetime_value: number
  }
  order_status: Record<string, number>
  payment_status: Record<string, number>
  shipping_status: Record<string, number>
  recent_orders: Array<{
    id: string
    order_number: string
    user: {
      name: string
      email: string
    }
    total_amount: number
    status: string
    payment_status: string
    created_at: string
    shipping_method: string
    items: Array<{ quantity: number }>
  }>
  recent_users: Array<{
    id: number
    name: string
    email: string
    role: string
    is_active: boolean
    created_at: string
    last_login: string | null
    location: string
    orders_count?: number
    total_spent?: number
  }>
  low_stock_products: Array<{
    id: number
    name: string
    stock: number
    sku: string
    price: number
    thumbnail_url: string
    category: string
    min_stock: number
  }>
  sales_by_category: Array<{
    category: string
    sales: number
    orders: number
    percentage: number
  }>
  top_products: Array<{
    id: number
    name: string
    sales: number
    revenue: number
    views: number
    conversion_rate: number
    thumbnail_url: string
  }>
  customer_segments: Array<{
    segment: string
    count: number
    percentage: number
    revenue: number
  }>
  geographic_data: any[]
  device_analytics: any[]
  browser_analytics: any[]
  traffic_sources: any[]
  system_health: {
    api_status: string
    database_status: string
    storage_status: string
    cdn_status: string
    payment_gateway: string
    email_service: string
    sms_service: string
    backup_status: string
    uptime: number
    response_time: number
    error_rate: number
    active_connections: number
    cpu_usage: number
    memory_usage: number
    disk_usage: number
    bandwidth_usage: number
  }
  recent_activities: Array<{
    id: number
    type: string
    message: string
    time: string
    icon: string
    color: string
  }>
  notifications: Array<{
    id: number
    title: string
    message: string
    type: string
    time: string
    read: boolean
  }>
  promotions: Array<{
    id: number
    name: string
    discount: number
    type: string
    status: string
    start_date: string | null
    end_date: string | null
    usage: number
  }>
  timestamp: string
  data_source: string
}

interface SalesChartData {
  chart_data: Array<{
    date: string
    sales: number
    orders: number
  }>
  period: string
  start_date: string
  end_date: string
}

interface CategorySalesData {
  category_sales: Array<{
    category_id: number
    category_name: string
    total_sales: number
    total_quantity: number
    order_count: number
  }>
  total_categories: number
}

interface RecentActivityData {
  activities: Array<{
    type: string
    id: number
    description: string
    amount?: number
    status?: string
    timestamp: string
    time_ago: string
    user_name: string
    user_email?: string
    product_name?: string
    rating?: number
  }>
  total_activities: number
}

interface ProductAnalytics {
  best_sellers: Array<{
    id: number
    name: string
    thumbnail_url: string
    total_sold: number
    total_revenue: number
    order_count: number
  }>
  stock_analysis: Record<string, number>
  category_distribution: Array<{
    category: string
    product_count: number
  }>
}

interface CustomerAnalytics {
  registration_trends: Array<{
    date: string
    registrations: number
  }>
  top_customers: Array<{
    id: number
    name: string
    email: string
    order_count: number
    total_spent: number
    last_order_date: string | null
  }>
}

interface HealthCheckData {
  status: string
  service: string
  timestamp: string
  database: string
  models_loaded: Record<string, boolean>
}

interface Customer {
  id: number // Changed from string to number to match backend
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  last_login: string | null
  location: string
  orders_count?: number
  total_spent?: number
}

class DashboardService {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  }

  private getAuthHeaders() {
    const adminToken = localStorage.getItem("admin_token")
    if (!adminToken) {
      throw new Error("AUTHENTICATION_REQUIRED")
    }

    return {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}/api/admin/dashboard${endpoint}`, {
        headers: this.getAuthHeaders(),
        credentials: "include",
      })

      if (response.status === 401) {
        // Clear invalid token and throw specific error
        localStorage.removeItem("admin_token")
        throw new Error("AUTHENTICATION_EXPIRED")
      }

      if (response.status === 403) {
        throw new Error("ACCESS_FORBIDDEN")
      }

      if (!response.ok) {
        throw new Error(`API_ERROR_${response.status}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "AUTHENTICATION_REQUIRED" || error.message === "AUTHENTICATION_EXPIRED") {
          throw error
        }
        if (error.message === "ACCESS_FORBIDDEN") {
          throw error
        }
        if (error.message.startsWith("API_ERROR_")) {
          throw error
        }
      }
      // Network or other errors
      throw new Error("NETWORK_ERROR")
    }
  }

  async getDashboardOverview(): Promise<DashboardData> {
    return this.makeRequest<DashboardData>("/")
  }

  async getSalesChart(days = 30): Promise<SalesChartData> {
    return this.makeRequest<SalesChartData>(`/sales-chart?days=${days}`)
  }

  async getCategorySales(): Promise<CategorySalesData> {
    return this.makeRequest<CategorySalesData>("/category-sales")
  }

  async getRecentActivity(): Promise<RecentActivityData> {
    return this.makeRequest<RecentActivityData>("/recent-activity")
  }

  async getProductAnalytics(): Promise<ProductAnalytics> {
    return this.makeRequest<ProductAnalytics>("/product-analytics")
  }

  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    return this.makeRequest<CustomerAnalytics>("/customer-analytics")
  }

  async getHealthCheck(): Promise<HealthCheckData> {
    return this.makeRequest<HealthCheckData>("/health")
  }

  async getAllDashboardData(): Promise<{
    dashboard: DashboardData
    salesChart: SalesChartData["chart_data"]
    categoryData: CategorySalesData["category_sales"]
    recentActivity: RecentActivityData["activities"]
    productAnalytics: ProductAnalytics | null
    customerAnalytics: CustomerAnalytics | null
    healthCheck: HealthCheckData | null
  }> {
    try {
      // Check authentication first
      const adminToken = localStorage.getItem("admin_token")
      if (!adminToken) {
        throw new Error("AUTHENTICATION_REQUIRED")
      }

      // Fetch main dashboard data first
      const dashboard = await this.getDashboardOverview()

      // Fetch additional data in parallel
      const [salesChartResult, categoryResult, activityResult, productResult, customerResult, healthResult] =
        await Promise.allSettled([
          this.getSalesChart(30),
          this.getCategorySales(),
          this.getRecentActivity(),
          this.getProductAnalytics(),
          this.getCustomerAnalytics(),
          this.getHealthCheck(),
        ])

      return {
        dashboard,
        salesChart: salesChartResult.status === "fulfilled" ? salesChartResult.value.chart_data : [],
        categoryData: categoryResult.status === "fulfilled" ? categoryResult.value.category_sales : [],
        recentActivity: activityResult.status === "fulfilled" ? activityResult.value.activities : [],
        productAnalytics: productResult.status === "fulfilled" ? productResult.value : null,
        customerAnalytics: customerResult.status === "fulfilled" ? customerResult.value : null,
        healthCheck: healthResult.status === "fulfilled" ? healthResult.value : null,
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      throw error
    }
  }

  async getDashboardOverviewWithDateRange(fromDate?: string, toDate?: string): Promise<DashboardData> {
    const params = new URLSearchParams()
    if (fromDate) params.append("from_date", fromDate)
    if (toDate) params.append("to_date", toDate)

    const queryString = params.toString()
    const endpoint = queryString ? `/?${queryString}` : "/"

    return this.makeRequest<DashboardData>(endpoint)
  }

  async getSalesChartWithDateRange(days: number, fromDate?: string, toDate?: string): Promise<SalesChartData> {
    const params = new URLSearchParams()
    params.append("days", days.toString())
    if (fromDate) params.append("from_date", fromDate)
    if (toDate) params.append("to_date", toDate)

    return this.makeRequest<SalesChartData>(`/sales-chart?${params.toString()}`)
  }
}

export const dashboardService = new DashboardService()
export type {
  DashboardData,
  SalesChartData,
  CategorySalesData,
  RecentActivityData,
  ProductAnalytics,
  CustomerAnalytics,
  HealthCheckData,
  Customer, // Exporting Customer interface
}
