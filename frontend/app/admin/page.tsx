"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  RefreshCw,
  Calendar,
  AlertCircle,
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
  Star,
  BarChart3,
  PieChart,
  LineChart,
  Tag,
  MessageSquare,
  Mail,
  Clock,
  Crown,
  Eye,
  UserCheck,
  UserX,
  ExternalLink,
  Settings,
  Truck,
  CreditCard,
  Globe,
  Database,
  Percent,
  MapPin,
  Download,
  Zap,
  Target,
  Smartphone,
  Monitor,
  Tablet,
  Chrome,
  ChromeIcon as Firefox,
  AppleIcon as Safari,
} from "lucide-react"
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker"
import type { DateRange } from "react-day-picker"

// Enhanced interfaces for comprehensive data
interface DashboardData {
  counts: {
    users: number
    products: number
    orders: number
    categories: number
    brands: number
    reviews: number
    pending_reviews: number
    newsletter_subscribers: number
    active_sessions: number
    pending_orders: number
    processing_orders: number
    shipped_orders: number
    delivered_orders: number
    cancelled_orders: number
    returned_orders: number
    low_stock_products: number
    out_of_stock_products: number
    featured_products: number
    new_products: number
    sale_products: number
    flash_sale_products: number
    luxury_products: number
    verified_customers: number
    unverified_customers: number
    premium_customers: number
    support_tickets: number
    open_tickets: number
    resolved_tickets: number
    pending_refunds: number
    completed_refunds: number
    active_promotions: number
    expired_promotions: number
    draft_promotions: number
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
    commission_earned: number
    tax_collected: number
    shipping_revenue: number
    discount_given: number
    net_profit: number
    gross_profit: number
    cost_of_goods: number
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
    order_number?: string
    user?: { name: string; email: string }
    total_amount: number
    status: string
    payment_status: string
    created_at: string
    items?: Array<{ quantity: number }>
    shipping_method?: string
  }>
  recent_users: Array<{
    id: number
    name: string
    email: string
    role: string
    is_active: boolean
    created_at: string
    orders_count?: number
    total_spent?: number
    last_login?: string
    location?: string
  }>
  low_stock_products: Array<{
    id: number
    name: string
    stock?: number
    sku: string
    price: number
    thumbnail_url?: string
    category?: string
    min_stock?: number
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
    thumbnail_url?: string
  }>
  customer_segments: Array<{
    segment: string
    count: number
    percentage: number
    revenue: number
  }>
  geographic_data: Array<{
    country: string
    users: number
    orders: number
    revenue: number
  }>
  device_analytics: Array<{
    device: string
    users: number
    percentage: number
    conversions: number
  }>
  browser_analytics: Array<{
    browser: string
    users: number
    percentage: number
  }>
  traffic_sources: Array<{
    source: string
    visitors: number
    percentage: number
    conversions: number
  }>
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
    icon: any
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
    start_date: string
    end_date: string
    usage: number
  }>
}

// Mock comprehensive data
const mockDashboardData: DashboardData = {
  counts: {
    users: 12847,
    products: 2389,
    orders: 8156,
    categories: 45,
    brands: 128,
    reviews: 15234,
    pending_reviews: 89,
    newsletter_subscribers: 8923,
    active_sessions: 234,
    pending_orders: 156,
    processing_orders: 234,
    shipped_orders: 567,
    delivered_orders: 6789,
    cancelled_orders: 123,
    returned_orders: 89,
    low_stock_products: 23,
    out_of_stock_products: 8,
    featured_products: 45,
    new_products: 67,
    sale_products: 234,
    flash_sale_products: 12,
    luxury_products: 89,
    verified_customers: 11234,
    unverified_customers: 1613,
    premium_customers: 456,
    support_tickets: 89,
    open_tickets: 23,
    resolved_tickets: 66,
    pending_refunds: 12,
    completed_refunds: 234,
    active_promotions: 8,
    expired_promotions: 45,
    draft_promotions: 6,
  },
  sales: {
    today: 45678.9,
    yesterday: 38234.56,
    weekly: 234567.89,
    monthly: 1234567.89,
    yearly: 12345678.9,
    total_revenue: 45678901.23,
    pending_amount: 123456.78,
    refunded_amount: 45678.9,
    commission_earned: 234567.89,
    tax_collected: 123456.78,
    shipping_revenue: 45678.9,
    discount_given: 67890.12,
    net_profit: 2345678.9,
    gross_profit: 3456789.01,
    cost_of_goods: 1234567.89,
    average_order_value: 156.78,
    conversion_rate: 3.45,
    cart_abandonment_rate: 67.8,
    return_rate: 2.3,
    customer_lifetime_value: 456.78,
  },
  order_status: {
    pending: 156,
    processing: 234,
    shipped: 567,
    delivered: 6789,
    cancelled: 123,
    returned: 89,
  },
  payment_status: {
    paid: 7234,
    pending: 156,
    failed: 89,
    refunded: 234,
    disputed: 23,
    partial: 45,
  },
  shipping_status: {
    not_shipped: 156,
    preparing: 89,
    shipped: 567,
    in_transit: 234,
    delivered: 6789,
    failed_delivery: 23,
    returned: 89,
  },
  recent_orders: [
    {
      id: "ORD-2024-001",
      order_number: "ORD-2024-001",
      user: { name: "John Doe", email: "john@example.com" },
      total_amount: 299.99,
      status: "processing",
      payment_status: "paid",
      created_at: "2024-01-15T10:30:00Z",
      items: [{ quantity: 3 }],
      shipping_method: "Express",
    },
    {
      id: "ORD-2024-002",
      order_number: "ORD-2024-002",
      user: { name: "Jane Smith", email: "jane@example.com" },
      total_amount: 149.5,
      status: "shipped",
      payment_status: "paid",
      created_at: "2024-01-15T09:15:00Z",
      items: [{ quantity: 1 }],
      shipping_method: "Standard",
    },
    {
      id: "ORD-2024-003",
      order_number: "ORD-2024-003",
      user: { name: "Bob Johnson", email: "bob@example.com" },
      total_amount: 89.99,
      status: "delivered",
      payment_status: "paid",
      created_at: "2024-01-14T16:45:00Z",
      items: [{ quantity: 2 }],
      shipping_method: "Express",
    },
    {
      id: "ORD-2024-004",
      order_number: "ORD-2024-004",
      user: { name: "Alice Brown", email: "alice@example.com" },
      total_amount: 199.99,
      status: "pending",
      payment_status: "pending",
      created_at: "2024-01-14T14:20:00Z",
      items: [{ quantity: 1 }],
      shipping_method: "Standard",
    },
    {
      id: "ORD-2024-005",
      order_number: "ORD-2024-005",
      user: { name: "Charlie Wilson", email: "charlie@example.com" },
      total_amount: 349.99,
      status: "processing",
      payment_status: "paid",
      created_at: "2024-01-13T11:30:00Z",
      items: [{ quantity: 4 }],
      shipping_method: "Express",
    },
  ],
  recent_users: [
    {
      id: 1,
      name: "Sarah Connor",
      email: "sarah@example.com",
      role: "customer",
      is_active: true,
      created_at: "2024-01-15T08:30:00Z",
      orders_count: 5,
      total_spent: 1234.56,
      last_login: "2024-01-15T14:30:00Z",
      location: "New York, USA",
    },
    {
      id: 2,
      name: "Mike Ross",
      email: "mike@example.com",
      role: "customer",
      is_active: true,
      created_at: "2024-01-14T12:15:00Z",
      orders_count: 2,
      total_spent: 456.78,
      last_login: "2024-01-14T09:15:00Z",
      location: "London, UK",
    },
    {
      id: 3,
      name: "Emma Watson",
      email: "emma@example.com",
      role: "customer",
      is_active: true,
      created_at: "2024-01-13T16:45:00Z",
      orders_count: 8,
      total_spent: 2345.67,
      last_login: "2024-01-15T16:45:00Z",
      location: "Paris, France",
    },
    {
      id: 4,
      name: "David Kim",
      email: "david@example.com",
      role: "customer",
      is_active: false,
      created_at: "2024-01-12T10:20:00Z",
      orders_count: 3,
      total_spent: 789.01,
      last_login: "2024-01-15T11:20:00Z",
      location: "Seoul, Korea",
    },
  ],
  low_stock_products: [
    {
      id: 1,
      name: "Wireless Bluetooth Headphones",
      stock: 3,
      sku: "WBH-001",
      price: 89.99,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
      category: "Electronics",
      min_stock: 10,
    },
    {
      id: 2,
      name: "Smart Fitness Watch",
      stock: 1,
      sku: "SFW-002",
      price: 199.99,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
      category: "Electronics",
      min_stock: 5,
    },
    {
      id: 3,
      name: "Premium Phone Case",
      stock: 2,
      sku: "PPC-003",
      price: 24.99,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
      category: "Accessories",
      min_stock: 15,
    },
    {
      id: 4,
      name: "Portable Bluetooth Speaker",
      stock: 4,
      sku: "PBS-004",
      price: 59.99,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
      category: "Electronics",
      min_stock: 12,
    },
    {
      id: 5,
      name: "Adjustable Laptop Stand",
      stock: 2,
      sku: "ALS-005",
      price: 39.99,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
      category: "Accessories",
      min_stock: 8,
    },
  ],
  sales_by_category: [
    { category: "Electronics", sales: 456789, orders: 1234, percentage: 45.6 },
    { category: "Fashion", sales: 234567, orders: 890, percentage: 23.4 },
    { category: "Home & Garden", sales: 123456, orders: 567, percentage: 12.3 },
    { category: "Sports", sales: 89012, orders: 345, percentage: 8.9 },
    { category: "Books", sales: 56789, orders: 234, percentage: 5.7 },
    { category: "Toys", sales: 34567, orders: 123, percentage: 3.5 },
    { category: "Beauty", sales: 12345, orders: 89, percentage: 1.2 },
  ],
  top_products: [
    {
      id: 1,
      name: "iPhone 15 Pro Max",
      sales: 234,
      revenue: 234000,
      views: 12345,
      conversion_rate: 7.8,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      name: "MacBook Air M3",
      sales: 123,
      revenue: 147600,
      views: 8901,
      conversion_rate: 5.4,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 3,
      name: "AirPods Pro 2",
      sales: 456,
      revenue: 114000,
      views: 15678,
      conversion_rate: 6.2,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 4,
      name: "iPad Pro 12.9",
      sales: 89,
      revenue: 89000,
      views: 5432,
      conversion_rate: 4.8,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 5,
      name: "Apple Watch Series 9",
      sales: 167,
      revenue: 66800,
      views: 7890,
      conversion_rate: 5.9,
      thumbnail_url: "/placeholder.svg?height=40&width=40",
    },
  ],
  customer_segments: [
    { segment: "Premium", count: 456, percentage: 3.5, revenue: 456789 },
    { segment: "Regular", count: 11234, percentage: 87.4, revenue: 1234567 },
    { segment: "New", count: 1157, percentage: 9.0, revenue: 234567 },
    { segment: "VIP", count: 13, percentage: 0.1, revenue: 123456 },
  ],
  geographic_data: [
    { country: "United States", users: 5678, orders: 2345, revenue: 1234567 },
    { country: "United Kingdom", users: 2345, orders: 1234, revenue: 567890 },
    { country: "Canada", users: 1234, orders: 678, revenue: 345678 },
    { country: "Australia", users: 890, orders: 456, revenue: 234567 },
    { country: "Germany", users: 678, orders: 345, revenue: 123456 },
    { country: "France", users: 567, orders: 234, revenue: 89012 },
    { country: "Japan", users: 456, orders: 123, revenue: 67890 },
    { country: "Brazil", users: 345, orders: 89, revenue: 45678 },
  ],
  device_analytics: [
    { device: "Desktop", users: 5678, percentage: 44.2, conversions: 234 },
    { device: "Mobile", users: 5234, percentage: 40.7, conversions: 189 },
    { device: "Tablet", users: 1935, percentage: 15.1, conversions: 67 },
  ],
  browser_analytics: [
    { browser: "Chrome", users: 6789, percentage: 52.8 },
    { browser: "Safari", users: 2345, percentage: 18.3 },
    { browser: "Firefox", users: 1567, percentage: 12.2 },
    { browser: "Edge", users: 1234, percentage: 9.6 },
    { browser: "Other", users: 912, percentage: 7.1 },
  ],
  traffic_sources: [
    { source: "Direct", visitors: 5678, percentage: 44.2, conversions: 234 },
    { source: "Google Search", visitors: 3456, percentage: 26.9, conversions: 156 },
    { source: "Social Media", visitors: 2345, percentage: 18.3, conversions: 89 },
    { source: "Email Marketing", visitors: 1234, percentage: 9.6, conversions: 67 },
    { source: "Referral", visitors: 134, percentage: 1.0, conversions: 12 },
  ],
  system_health: {
    api_status: "operational",
    database_status: "operational",
    storage_status: "operational",
    cdn_status: "operational",
    payment_gateway: "operational",
    email_service: "operational",
    sms_service: "degraded",
    backup_status: "operational",
    uptime: 99.9,
    response_time: 245,
    error_rate: 0.1,
    active_connections: 1234,
    cpu_usage: 45,
    memory_usage: 67,
    disk_usage: 34,
    bandwidth_usage: 78,
  },
  recent_activities: [
    {
      id: 1,
      type: "order",
      message: "New order #ORD-2024-001 placed by John Doe ($299.99)",
      time: "2 minutes ago",
      icon: ShoppingCart,
      color: "green",
    },
    {
      id: 2,
      type: "user",
      message: "Sarah Connor registered as new customer",
      time: "5 minutes ago",
      icon: Users,
      color: "blue",
    },
    {
      id: 3,
      type: "product",
      message: "Wireless Headphones stock critically low (3 remaining)",
      time: "10 minutes ago",
      icon: Package,
      color: "orange",
    },
    {
      id: 4,
      type: "review",
      message: "5-star review received for iPhone 15 Pro Max",
      time: "15 minutes ago",
      icon: Star,
      color: "yellow",
    },
    {
      id: 5,
      type: "payment",
      message: "Payment failed for order #ORD-2024-004 ($199.99)",
      time: "20 minutes ago",
      icon: CreditCard,
      color: "red",
    },
    {
      id: 6,
      type: "shipping",
      message: "Order #ORD-2024-002 shipped via Express delivery",
      time: "25 minutes ago",
      icon: Truck,
      color: "blue",
    },
    {
      id: 7,
      type: "support",
      message: "New support ticket #TKT-001 from John Doe",
      time: "30 minutes ago",
      icon: MessageSquare,
      color: "purple",
    },
    {
      id: 8,
      type: "system",
      message: "Daily database backup completed successfully",
      time: "1 hour ago",
      icon: Database,
      color: "green",
    },
  ],
  notifications: [
    {
      id: 1,
      title: "Critical Stock Alert",
      message: "23 products are running critically low on stock",
      type: "warning",
      time: "5 minutes ago",
      read: false,
    },
    {
      id: 2,
      title: "New High-Value Order",
      message: "Order #ORD-2024-001 worth $299.99 needs processing",
      type: "info",
      time: "10 minutes ago",
      read: false,
    },
    {
      id: 3,
      title: "Payment Gateway Issue",
      message: "Multiple payment failures detected in the last hour",
      type: "error",
      time: "15 minutes ago",
      read: true,
    },
    {
      id: 4,
      title: "System Maintenance",
      message: "Scheduled maintenance tonight at 2:00 AM EST",
      type: "info",
      time: "1 hour ago",
      read: true,
    },
    {
      id: 5,
      title: "Monthly Report Ready",
      message: "January sales report is ready for download",
      type: "success",
      time: "2 hours ago",
      read: false,
    },
  ],
  promotions: [
    {
      id: 1,
      name: "Winter Sale 2024",
      discount: 25,
      type: "percentage",
      status: "active",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
      usage: 1234,
    },
    {
      id: 2,
      name: "Free Shipping Weekend",
      discount: 0,
      type: "shipping",
      status: "active",
      start_date: "2024-01-15",
      end_date: "2024-01-17",
      usage: 567,
    },
    {
      id: 3,
      name: "New Year Flash Sale",
      discount: 50,
      type: "fixed",
      status: "expired",
      start_date: "2023-12-31",
      end_date: "2024-01-02",
      usage: 234,
    },
    {
      id: 4,
      name: "Valentine's Day Special",
      discount: 15,
      type: "percentage",
      status: "draft",
      start_date: "2024-02-10",
      end_date: "2024-02-14",
      usage: 0,
    },
  ],
}

// Function to map API response to DashboardData
function mapApiResponseToDashboardData(apiResponse: any): DashboardData {
  // Start with mock data as fallback
  const mappedData: DashboardData = { ...mockDashboardData }

  try {
    // Map counts
    if (apiResponse.counts) {
      mappedData.counts = {
        ...mappedData.counts,
        ...apiResponse.counts,
      }
    }

    // Map sales
    if (apiResponse.sales) {
      mappedData.sales = {
        ...mappedData.sales,
        ...apiResponse.sales,
      }
    }

    // Map order status
    if (apiResponse.order_status) {
      mappedData.order_status = apiResponse.order_status
    }

    // Map recent orders
    if (apiResponse.recent_orders && Array.isArray(apiResponse.recent_orders)) {
      mappedData.recent_orders = apiResponse.recent_orders
    }

    // Map recent users
    if (apiResponse.recent_users && Array.isArray(apiResponse.recent_users)) {
      mappedData.recent_users = apiResponse.recent_users
    }

    // Map low stock products
    if (apiResponse.low_stock_products && Array.isArray(apiResponse.low_stock_products)) {
      mappedData.low_stock_products = apiResponse.low_stock_products
    }

    // Map sales by category
    if (apiResponse.sales_by_category && Array.isArray(apiResponse.sales_by_category)) {
      mappedData.sales_by_category = apiResponse.sales_by_category
    }

    console.log("Successfully mapped API response to dashboard data")
    return mappedData
  } catch (error) {
    console.error("Error mapping API response:", error)
    return mappedData // Return mock data on error
  }
}

// Quick Action Card Component
const QuickActionCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  badge,
  color = "blue",
  isLoading = false,
}: {
  icon: any
  title: string
  description: string
  onClick: () => void
  badge?: string | number
  color?: string
  isLoading?: boolean
}) => {
  const colorClasses = {
    blue: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900",
    green: "bg-green-50 hover:bg-green-100 border-green-200 text-green-900",
    purple: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900",
    orange: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900",
    red: "bg-red-50 hover:bg-red-100 border-red-200 text-red-900",
    yellow: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-900",
  }

  return (
    <div
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
        colorClasses[color as keyof typeof colorClasses]
      } ${isLoading ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"}`}
      onClick={isLoading ? undefined : onClick}
    >
      {badge && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {badge}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white shadow-sm">
          {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{title}</h3>
          <p className="text-xs opacity-70 truncate">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  subtitle,
  isLoading = false,
}: {
  title: string
  value: string | number
  change?: string
  icon: any
  trend?: "up" | "down" | "neutral"
  subtitle?: string
  isLoading?: boolean
}) => {
  const trendColors = {
    up: "text-green-600 bg-green-50",
    down: "text-red-600 bg-red-50",
    neutral: "text-gray-600 bg-gray-50",
  }

  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Activity

  return (
    <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            )}
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            {change && trend && !isLoading && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{change}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Activity Item Component
const ActivityItem = ({
  icon: Icon,
  title,
  description,
  time,
  type,
}: {
  icon: any
  title: string
  description: string
  time: string
  type: "success" | "warning" | "error" | "info"
}) => {
  const typeColors = {
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    error: "bg-red-100 text-red-700 border-red-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`p-2 rounded-lg border ${typeColors[type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-400">{time}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, user } = useAdminAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login?reason=not_authenticated")
    }
  }, [isAuthenticated, isLoading, router])

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoadingData(true)
      setIsRefreshing(true)
      setError(null)

      if (!isAuthenticated) {
        throw new Error("User not authenticated")
      }

      const fromDate = dateRange.from ? dateRange.from.toISOString().split("T")[0] : ""
      const toDate = dateRange.to ? dateRange.to.toISOString().split("T")[0] : ""

      try {
        const dashboardResponse = await adminService.getDashboardData({
          from_date: fromDate,
          to_date: toDate,
        })

        // Map the API response to our expected DashboardData structure
        const mappedData = mapApiResponseToDashboardData(dashboardResponse)
        setDashboardData(mappedData)

        toast({
          title: "Dashboard Loaded",
          description: "Successfully loaded dashboard data.",
          variant: "default",
        })
      } catch (error: any) {
        console.warn("Using mock data:", error)
        setDashboardData(mockDashboardData)
        toast({
          title: "Demo Mode",
          description: "Using sample data for demonstration.",
          variant: "default",
        })
      }
    } catch (error: any) {
      setError(error.message || "Failed to load dashboard data")
      setDashboardData(mockDashboardData)
    } finally {
      setIsLoadingData(false)
      setIsRefreshing(false)
    }
  }

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const timer = setTimeout(() => {
        fetchDashboardData()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, isLoading, dateRange])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader />
          <p className="mt-2 text-sm text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const data = dashboardData || mockDashboardData

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const todayGrowth = calculateGrowth(data.sales.today, data.sales.yesterday)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 lg:p-6 rounded-xl shadow-sm border">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">E-commerce Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name || "Admin"}! Here's your store overview.</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-green-500"}`}></div>
                <span>System {error ? "error" : "healthy"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-gray-600" />
              <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={fetchDashboardData} disabled={isRefreshing} className="flex-1 sm:flex-none">
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoadingData && !isRefreshing ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Frequently used admin tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  <QuickActionCard
                    icon={Plus}
                    title="Add Product"
                    description="Create new product"
                    onClick={() => router.push("/admin/products/new")}
                    color="blue"
                    isLoading={isRefreshing}
                  />
                  <QuickActionCard
                    icon={ShoppingCart}
                    title="Orders"
                    description="Manage orders"
                    onClick={() => router.push("/admin/orders")}
                    color="green"
                    badge={data.counts.pending_orders}
                    isLoading={isRefreshing}
                  />
                  <QuickActionCard
                    icon={Users}
                    title="Customers"
                    description="Manage customers"
                    onClick={() => router.push("/admin/customers")}
                    color="purple"
                    badge={data.counts.users}
                    isLoading={isRefreshing}
                  />
                  <QuickActionCard
                    icon={Package}
                    title="Products"
                    description="Product management"
                    onClick={() => router.push("/admin/products")}
                    color="orange"
                    badge={data.counts.products}
                    isLoading={isRefreshing}
                  />
                  <QuickActionCard
                    icon={Tag}
                    title="Categories"
                    description="Category management"
                    onClick={() => router.push("/admin/categories")}
                    color="red"
                    badge={data.counts.categories}
                    isLoading={isRefreshing}
                  />
                  <QuickActionCard
                    icon={Star}
                    title="Reviews"
                    description="Review management"
                    onClick={() => router.push("/admin/reviews")}
                    color="yellow"
                    badge={data.counts.pending_reviews}
                    isLoading={isRefreshing}
                  />
                  <QuickActionCard
                    icon={BarChart3}
                    title="Analytics"
                    description="View reports"
                    onClick={() => router.push("/admin/analytics")}
                    color="blue"
                    isLoading={isRefreshing}
                  />
                  <QuickActionCard
                    icon={Settings}
                    title="Settings"
                    description="System settings"
                    onClick={() => router.push("/admin/settings")}
                    color="green"
                    isLoading={isRefreshing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Today's Revenue"
                value={`$${data.sales.today.toLocaleString()}`}
                change={`${todayGrowth > 0 ? "+" : ""}${todayGrowth}%`}
                icon={DollarSign}
                trend={todayGrowth > 0 ? "up" : todayGrowth < 0 ? "down" : "neutral"}
                subtitle="vs yesterday"
                isLoading={isLoadingData}
              />
              <StatCard
                title="Total Orders"
                value={data.counts.orders.toLocaleString()}
                change={`${data.counts.pending_orders} pending`}
                icon={ShoppingCart}
                trend="neutral"
                subtitle="All time"
                isLoading={isLoadingData}
              />
              <StatCard
                title="Total Customers"
                value={data.counts.users.toLocaleString()}
                change={`${data.counts.active_sessions} active`}
                icon={Users}
                trend="up"
                subtitle="Registered users"
                isLoading={isLoadingData}
              />
              <StatCard
                title="Products"
                value={data.counts.products.toLocaleString()}
                change={`${data.counts.low_stock_products} low stock`}
                icon={Package}
                trend={data.counts.low_stock_products > 0 ? "down" : "neutral"}
                subtitle="Total inventory"
                isLoading={isLoadingData}
              />
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 bg-white border shadow-sm rounded-lg p-1">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger value="sales" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Sales
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Customers
                </TabsTrigger>
                <TabsTrigger value="orders" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Orders
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Sales Performance */}
                  <Card className="lg:col-span-2 border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Sales Performance
                      </CardTitle>
                      <CardDescription>Revenue trends and performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 font-medium">Today</p>
                            <p className="text-lg font-bold text-blue-900">${data.sales.today.toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-700 font-medium">This Week</p>
                            <p className="text-lg font-bold text-green-900">${data.sales.weekly.toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-700 font-medium">This Month</p>
                            <p className="text-lg font-bold text-purple-900">${data.sales.monthly.toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-xs text-orange-700 font-medium">This Year</p>
                            <p className="text-lg font-bold text-orange-900">${data.sales.yearly.toLocaleString()}</p>
                          </div>
                        </div>
                        {/* Chart Placeholder */}
                        <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-center text-gray-500">
                            <LineChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p className="font-medium">Sales Trend Chart</p>
                            <p className="text-sm">Interactive chart coming soon</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Latest system activities</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-1 max-h-80 overflow-y-auto">
                        {data.recent_activities.slice(0, 6).map((activity) => (
                          <ActivityItem
                            key={activity.id}
                            icon={activity.icon}
                            title={activity.message.split(" ").slice(0, 4).join(" ")}
                            description={activity.message}
                            time={activity.time}
                            type={
                              activity.color === "green"
                                ? "success"
                                : activity.color === "red"
                                  ? "error"
                                  : activity.color === "orange"
                                    ? "warning"
                                    : "info"
                            }
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Overview Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Order Status Distribution */}
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-purple-600" />
                        Order Status
                      </CardTitle>
                      <CardDescription>Current order distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(data.order_status).map(([status, count]) => {
                          const total = Object.values(data.order_status).reduce((a: number, b: number) => a + b, 0)
                          const percentage = ((count as number) / total) * 100
                          return (
                            <div key={status} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      status === "delivered"
                                        ? "bg-green-500"
                                        : status === "shipped"
                                          ? "bg-blue-500"
                                          : status === "processing"
                                            ? "bg-yellow-500"
                                            : status === "pending"
                                              ? "bg-orange-500"
                                              : status === "cancelled"
                                                ? "bg-red-500"
                                                : "bg-gray-500"
                                    }`}
                                  />
                                  <span className="text-sm font-medium capitalize">{status}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{count as number}</Badge>
                                  <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Products */}
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-600" />
                        Top Products
                      </CardTitle>
                      <CardDescription>Best selling products</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.top_products.slice(0, 5).map((product, index) => (
                          <div key={product.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-white">#{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.sales} sold</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">${product.revenue.toLocaleString()}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs p-1"
                                onClick={() => router.push(`/admin/products/${product.id}`)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Low Stock Alert */}
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Low Stock Alert
                      </CardTitle>
                      <CardDescription>Products requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.low_stock_products.slice(0, 5).map((product) => (
                          <div key={product.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="destructive">{product.stock || 0}</Badge>
                              <p className="text-xs text-gray-600">${product.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Sales Tab */}
              <TabsContent value="sales" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Revenue Breakdown
                      </CardTitle>
                      <CardDescription>Detailed revenue analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: "Today", value: data.sales.today, color: "blue" },
                          { label: "Yesterday", value: data.sales.yesterday, color: "gray" },
                          { label: "This Week", value: data.sales.weekly, color: "green" },
                          { label: "This Month", value: data.sales.monthly, color: "purple" },
                          { label: "This Year", value: data.sales.yearly, color: "orange" },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{item.label}</span>
                            <span className="font-bold text-lg">${item.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        Sales by Category
                      </CardTitle>
                      <CardDescription>Category performance breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.sales_by_category.map((category, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                <span className="font-medium">{category.category}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">${category.sales.toLocaleString()}</span>
                                <span className="text-xs text-gray-500">{category.percentage}%</span>
                              </div>
                            </div>
                            <Progress value={category.percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Sales Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Avg Order Value</p>
                        <p className="text-2xl font-bold text-blue-600">${data.sales.average_order_value}</p>
                        <p className="text-xs text-green-600">+2.1% vs last month</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Conversion Rate</p>
                        <p className="text-2xl font-bold text-green-600">{data.sales.conversion_rate}%</p>
                        <p className="text-xs text-green-600">+0.3% vs last week</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Cart Abandonment</p>
                        <p className="text-2xl font-bold text-orange-600">{data.sales.cart_abandonment_rate}%</p>
                        <p className="text-xs text-red-600">-1.5% improvement</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Return Rate</p>
                        <p className="text-2xl font-bold text-purple-600">{data.sales.return_rate}%</p>
                        <p className="text-xs text-green-600">-0.2% vs last month</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Product Overview
                      </CardTitle>
                      <CardDescription>Inventory summary</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: "Total Products", value: data.counts.products, icon: Package },
                          { label: "Categories", value: data.counts.categories, icon: Tag },
                          { label: "Brands", value: data.counts.brands, icon: Star },
                          { label: "Reviews", value: data.counts.reviews, icon: MessageSquare },
                          { label: "Pending Reviews", value: data.counts.pending_reviews, icon: Clock },
                          { label: "Featured Products", value: data.counts.featured_products, icon: Crown },
                          { label: "New Products", value: data.counts.new_products, icon: Plus },
                          { label: "Sale Products", value: data.counts.sale_products, icon: Percent },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <item.icon className="h-4 w-4 text-gray-600" />
                              <span className="font-medium">{item.label}</span>
                            </div>
                            <Badge variant="outline" className="font-bold">
                              {item.value}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Stock Management
                      </CardTitle>
                      <CardDescription>Inventory alerts and management</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs text-red-700 font-medium">Out of Stock</p>
                            <p className="text-xl font-bold text-red-900">{data.counts.out_of_stock_products}</p>
                          </div>
                          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-xs text-yellow-700 font-medium">Low Stock</p>
                            <p className="text-xl font-bold text-yellow-900">{data.counts.low_stock_products}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Critical Stock Items</h4>
                          {data.low_stock_products.slice(0, 4).map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.category}</p>
                              </div>
                              <Badge variant="destructive">{product.stock || 0}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Customers Tab */}
              <TabsContent value="customers" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Recent Customers
                      </CardTitle>
                      <CardDescription>Latest customer registrations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.recent_users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                                <AvatarFallback className="text-xs">
                                  {user.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                                {user.role}
                              </Badge>
                              <div className="flex gap-1">
                                {user.is_active ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    <UserCheck className="h-2 w-2 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    <UserX className="h-2 w-2 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        Customer Analytics
                      </CardTitle>
                      <CardDescription>Customer base insights</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          {
                            label: "Total Customers",
                            value: data.counts.users,
                            icon: Users,
                            color: "blue",
                          },
                          {
                            label: "Verified Customers",
                            value: data.counts.verified_customers,
                            icon: UserCheck,
                            color: "green",
                          },
                          {
                            label: "Premium Customers",
                            value: data.counts.premium_customers,
                            icon: Crown,
                            color: "yellow",
                          },
                          {
                            label: "Newsletter Subscribers",
                            value: data.counts.newsletter_subscribers,
                            icon: Mail,
                            color: "purple",
                          },
                          {
                            label: "Active Sessions",
                            value: data.counts.active_sessions,
                            icon: Activity,
                            color: "orange",
                          },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                                <item.icon className={`h-4 w-4 text-${item.color}-600`} />
                              </div>
                              <span className="font-medium">{item.label}</span>
                            </div>
                            <Badge className="font-bold">{item.value.toLocaleString()}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Customer Segments */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      Customer Segments
                    </CardTitle>
                    <CardDescription>Customer categorization and value analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {data.customer_segments.map((segment) => (
                        <div key={segment.segment} className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <h4 className="font-semibold text-lg">{segment.segment}</h4>
                            <p className="text-2xl font-bold text-blue-600">{segment.count.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">{segment.percentage}% of customers</p>
                            <p className="text-xs text-green-600 font-medium">
                              ${segment.revenue.toLocaleString()} revenue
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                        Recent Orders
                      </CardTitle>
                      <CardDescription>Latest order activity and management</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.recent_orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <ShoppingCart className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{order.order_number || order.id}</p>
                                <p className="text-sm text-gray-600">{order.user?.name || "Guest Customer"}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(order.created_at).toLocaleDateString()} • {order.items?.[0]?.quantity || 1}{" "}
                                  items • {order.shipping_method}
                                </p>
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                              <div className="flex gap-2">
                                <Badge
                                  variant={
                                    order.status.toLowerCase() === "delivered"
                                      ? "default"
                                      : order.status.toLowerCase() === "shipped"
                                        ? "secondary"
                                        : order.status.toLowerCase() === "processing"
                                          ? "outline"
                                          : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {order.status}
                                </Badge>
                                <Badge
                                  variant={order.payment_status === "paid" ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {order.payment_status}
                                </Badge>
                              </div>
                              <p className="font-bold">${order.total_amount.toFixed(2)}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs p-1"
                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Status Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(data.order_status).map(([status, count]) => (
                    <Card key={status} className="border-0 shadow-sm bg-white">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 capitalize">{status}</p>
                          <p className="text-xl font-bold text-blue-600">{count as number}</p>
                          <div
                            className={`w-full h-2 rounded-full mt-2 ${
                              status === "delivered"
                                ? "bg-green-200"
                                : status === "shipped"
                                  ? "bg-blue-200"
                                  : status === "processing"
                                    ? "bg-yellow-200"
                                    : status === "pending"
                                      ? "bg-orange-200"
                                      : "bg-red-200"
                            }`}
                          >
                            <div
                              className={`h-full rounded-full ${
                                status === "delivered"
                                  ? "bg-green-500"
                                  : status === "shipped"
                                    ? "bg-blue-500"
                                    : status === "processing"
                                      ? "bg-yellow-500"
                                      : status === "pending"
                                        ? "bg-orange-500"
                                        : "bg-red-500"
                              }`}
                              style={{
                                width: `${
                                  ((count as number) /
                                    Object.values(data.order_status).reduce((a: number, b: number) => a + b, 0)) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Traffic Sources */}
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        Traffic Sources
                      </CardTitle>
                      <CardDescription>Where your visitors are coming from</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.traffic_sources.map((source) => (
                          <div key={source.source} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{source.source}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{source.visitors.toLocaleString()}</span>
                                <span className="text-xs text-gray-500">{source.percentage}%</span>
                              </div>
                            </div>
                            <Progress value={source.percentage} className="h-2" />
                            <p className="text-xs text-gray-500">{source.conversions} conversions</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Device Analytics */}
                  <Card className="border-0 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-purple-600" />
                        Device Analytics
                      </CardTitle>
                      <CardDescription>User device preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.device_analytics.map((device) => (
                          <div key={device.device} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {device.device === "Desktop" && <Monitor className="h-4 w-4 text-gray-600" />}
                                {device.device === "Mobile" && <Smartphone className="h-4 w-4 text-gray-600" />}
                                {device.device === "Tablet" && <Tablet className="h-4 w-4 text-gray-600" />}
                                <span className="font-medium">{device.device}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{device.users.toLocaleString()}</span>
                                <span className="text-xs text-gray-500">{device.percentage}%</span>
                              </div>
                            </div>
                            <Progress value={device.percentage} className="h-2" />
                            <p className="text-xs text-gray-500">{device.conversions} conversions</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Geographic Data */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      Geographic Performance
                    </CardTitle>
                    <CardDescription>Sales performance by country</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {data.geographic_data.slice(0, 8).map((country) => (
                        <div key={country.country} className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <h4 className="font-semibold text-sm">{country.country}</h4>
                            <p className="text-lg font-bold text-blue-600">{country.users.toLocaleString()}</p>
                            <p className="text-xs text-gray-600">{country.orders} orders</p>
                            <p className="text-xs text-green-600 font-medium">${country.revenue.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Browser Analytics */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Chrome className="h-5 w-5 text-orange-600" />
                      Browser Analytics
                    </CardTitle>
                    <CardDescription>User browser preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      {data.browser_analytics.map((browser) => (
                        <div key={browser.browser} className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <div className="flex justify-center mb-2">
                              {browser.browser === "Chrome" && <Chrome className="h-6 w-6 text-blue-600" />}
                              {browser.browser === "Safari" && <Safari className="h-6 w-6 text-gray-600" />}
                              {browser.browser === "Firefox" && <Firefox className="h-6 w-6 text-orange-600" />}
                              {browser.browser === "Edge" && <Globe className="h-6 w-6 text-blue-500" />}
                              {browser.browser === "Other" && <Globe className="h-6 w-6 text-gray-500" />}
                            </div>
                            <h4 className="font-semibold text-sm">{browser.browser}</h4>
                            <p className="text-lg font-bold text-blue-600">{browser.users.toLocaleString()}</p>
                            <p className="text-xs text-gray-600">{browser.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
